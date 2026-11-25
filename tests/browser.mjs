// Run against a locally running development server and a disposable browser profile.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { fresh } from '../src/model.ts';
const base = process.env.ABYSS_URL ?? 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
const errors = [];
async function open(options = {}) {
  const context = await browser.newContext(options),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#game canvas').waitFor();
  return page;
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('abyss-fishing-v2')));
async function fixture(page, state) {
  await page.evaluate((s) => localStorage.setItem('abyss-fishing-v2', JSON.stringify(s)), state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#game canvas').waitFor();
}
async function waitForGold(page, old) {
  await page.waitForFunction((n) => JSON.parse(localStorage.getItem('abyss-fishing-v2')).gold > n, old);
}
try {
  const page = await open();
  const original = await saved(page);
  await page.keyboard.press('Space');
  await page.locator('#escape').click();
  await page.evaluate(() => {
    document.getElementById('cast').click();
    document.getElementById('cast').click();
  });
  await page.locator('#track').waitFor();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  assert.ok(Number(await page.locator('#track').getAttribute('aria-valuenow')) > 50);
  await page.locator('#escape').click();
  await page.waitForTimeout(650);
  assert.equal((await saved(page)).gold, original.gold);
  console.log('PASS 키보드 캐스팅, 방향키, 빠른 연속 입력과 취소');

  const state = fresh();
  state.gold = 120;
  await fixture(page, state);
  await page.evaluate(() => {
    document.getElementById('line').click();
    document.getElementById('line').click();
  });
  assert.equal((await saved(page)).gold, 0);
  await page.locator('#deep').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#game canvas').waitFor();
  assert.equal(await page.locator('#deep').getAttribute('aria-pressed'), 'true');
  await page.locator('#net').click();
  await waitForGold(page, 0);
  assert.equal((await saved(page)).deepCaught[0], 0);
  await page.waitForTimeout(2600);
  await page.locator('#cast').click();
  await page.locator('#escape').waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.hidden;
  });
  assert.ok(await page.locator('#minigame').isHidden());
  console.log('PASS 장비 연속 구매, 깊은 층 새로고침, 그물, 화면 전환 취소');

  const timing = fresh();
  timing.unlocked[1] = true;
  timing.sea = 1;
  await fixture(page, timing);
  await page.locator('#cast').click();
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('#timing-hit').waitFor();
    await page.waitForFunction(() => parseFloat(document.getElementById('timing-dot').style.left) > 85);
    await page.locator('#timing-hit').dispatchEvent('click');
    await page.locator('#retry').waitFor();
    assert.equal((await saved(page)).misses, attempt + 1);
    await page.locator('#retry').click();
  }
  assert.match(await page.locator('.fight-card').innerText(), /도움 적용/);
  await page.locator('#escape').click();
  assert.equal((await saved(page)).gold, 100);
  console.log('PASS 실패 사유, 즉시 재도전, 3회 실패 도움, 자산 유지');

  const boss = fresh();
  boss.line[0] = true;
  boss.survey[0] = 6;
  boss.deepCaught[0] = 1;
  boss.bossMisses[0] = 2;
  await fixture(page, boss);
  await page.locator('#boss').click();
  await page.locator('#track').waitFor();
  await page.locator('#track').dispatchEvent('pointerdown', { clientX: 0 });
  await page.locator('#practice').waitFor({ timeout: 35000 });
  await page.locator('#practice').click();
  assert.equal((await saved(page)).bossMisses[0], 3);
  await page.locator('#escape').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#boss-help').click();
  await page.locator('#track').waitFor();
  const deadline = Date.now() + 45000;
  while (!(await saved(page)).bosses[0]) {
    assert.ok(Date.now() < deadline, '도움 적용 보스 첫 승리');
    const point = await page
      .locator('#fish-dot')
      .boundingBox({ timeout: 100 })
      .catch(() => null);
    if (point) await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    else
      await page.evaluate(() => {
        const ring = document.getElementById('ring');
        if (ring && (ring.textContent === '길게 누르기' || ring.style.background === 'rgb(80, 118, 91)'))
          ring.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      });
    await page.waitForTimeout(55);
  }
  assert.ok((await saved(page)).unlocked[1]);
  await page.locator('#next').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('abyss-fishing-v2')).sea === 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal((await saved(page)).sea, 1);
  console.log('PASS 보스 실패·취소·새로고침 후 도움 재선택·첫 승리 출항');

  if (process.env.RANKING_QA === '1') {
    const name = '선장' + Date.now().toString().slice(-7);
    await page.locator('#ranking').click();
    await page.locator('.leaderboard input').fill(name);
    await page.locator('.leaderboard button').click();
    await page.getByText(name + ' (나)', { exact: false }).waitFor({ timeout: 20000 });
    const second = await open();
    await second.locator('#ranking').click();
    await second.getByText(name, { exact: false }).waitFor({ timeout: 20000 });
    console.log('PASS Firebase 익명 등록, 독립 브라우저 순위 조회');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
