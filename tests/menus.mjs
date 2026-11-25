import { chromium } from 'playwright-core';
import { fresh } from '../src/model.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('abyss-fishing-v2')));
  await page.goto(process.env.ABYSS_URL ?? 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.locator('#game canvas').waitFor();
  const canvas = await page.locator('#game canvas').boundingBox();
  await page.mouse.click(canvas.x + (65 * canvas.width) / 960, canvas.y + (235 * canvas.height) / 600);
  await page.locator('#escape').click();
  assert.equal((await read()).gold, 100);
  console.log('PASS 바다 물고기 직접 클릭과 취소');
  const sample = { ...fresh(), version: 1, gold: 10000, captainLevel: 3, runClears: 1, rodFish: 0 };
  sample.counts[0] = 9;
  sample.caught[0] = 9;
  sample.fishLevel[0] = 2;
  sample.questDay = new Date().toLocaleDateString('sv-SE');
  sample.questFish = 5;
  await page.locator('#help').click();
  async function upload(body, accept) {
    if (accept !== undefined) page.once('dialog', (d) => (accept ? d.accept() : d.dismiss()));
    await page
      .locator('#save-file')
      .setInputFiles({ name: 'save.json', mimeType: 'application/json', buffer: Buffer.from(body) });
    await page.waitForTimeout(150);
  }
  const previous = await read();
  await upload('bad');
  assert.deepEqual(await read(), previous);
  await upload(JSON.stringify(sample), false);
  assert.deepEqual(await read(), previous);
  await upload(JSON.stringify(sample), true);
  assert.equal((await read()).gold, sample.gold);
  await page.locator('#help').click();
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await download,
    record = await fs.readFile(await file.path(), 'utf8');
  assert.deepEqual(JSON.parse(record), await read());
  await upload(record, true);
  assert.equal((await read()).gold, 10000);
  console.log('PASS 가져오기 거절·확인·검증·v1 이관·v2 내보내기와 재가져오기');
  await page.locator('[data-quest="0"]').click();
  assert.equal((await read()).questClaimed[0], true);
  await page.locator('#fish-forge').click();
  await page.getByRole('button', { name: '결합 해제' }).click();
  assert.equal((await read()).rodFish, -1);
  await page.getByRole('button', { name: '낚싯대에 결합' }).click();
  assert.equal((await read()).rodFish, 0);
  await page.locator('.forge-target-select').first().click();
  await page.locator('.forge-material').first().click();
  await page.locator('#forge-attempt').click();
  await page.locator('.reveal-continue').click();
  assert.equal((await read()).fishSpent[0], 1);
  await page.locator('#close-modal').click();
  await page.locator('#market').click();
  await page.locator('#market-search').fill('흰동가리');
  await page.locator('.market-buy').first().click();
  await page.locator('.market-sell').first().click();
  await page.locator('#close-modal').click();
  assert.equal((await read()).fishBought[0], 1);
  assert.equal((await read()).fishSpent[0], 2);
  console.log('PASS 일일 보상, 미페 강화·결합, 어시장 매입·매도');
  const before = await read();
  await page.locator('#expedition').click();
  await page.locator('[data-loadout="steady"]').click();
  for (let area = 0; area < 5; area++) {
    for (let stop = 0; stop < 2; stop++) {
      await page.locator('[data-route="wreck"]').click();
      await page.locator('[data-relic]').first().click();
    }
    await page.locator('#run-boss').click();
    await page.locator('#ring').waitFor();
    const limit = Date.now() + 75000;
    while (await page.locator('#ring').count()) {
      assert.ok(Date.now() < limit, '원정 보스 제한시간');
      await page.evaluate(() => {
        const ring = document.getElementById('ring');
        if (!ring) return;
        const active =
          ring.textContent === '원 안에서 클릭' && ring.style.background === 'rgb(80, 118, 91)';
        if (active || ring.textContent === '길게 누르기')
          ring.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });
      await page.waitForTimeout(70);
    }
    if (area < 4) await page.locator('[data-relic]').first().click();
  }
  await page.locator('#run-again').waitFor();
  const after = await read();
  assert.equal(after.runClears, 2);
  assert.ok(after.bestRun > 0);
  assert.deepEqual(after.survey, before.survey);
  assert.deepEqual(after.bosses, before.bosses);
  assert.deepEqual(after.unlocked, before.unlocked);
  console.log('PASS 원정 5해역 유물·보스·완주·복귀 및 본편 분리');
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
