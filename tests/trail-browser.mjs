// Run against the local PC game with CHROME_PATH set to a Chromium executable.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fresh, salePrice, seas } from '../src/model.ts';
import { playFight } from './play-fight.mjs';

const key = 'abyss-fishing-v2';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.ABYSS_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  const panel = page.locator('#trail-panel');
  const cast = page.locator('#trail-cast');
  const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const reload = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#game canvas').waitFor();
    await panel.waitFor();
  };
  await panel.waitFor();
  assert.equal(await panel.getAttribute('data-state'), 'locked');

  const before = fresh();
  delete before.trailCompleted;
  before.line[0] = true;
  before.layer = 'deep';
  before.survey[0] = before.deepCaught[0] = before.caught[0] = before.counts[1] = 3;
  await page.evaluate(([k, record]) => localStorage.setItem(k, JSON.stringify(record)), [key, before]);
  await reload();
  assert.equal(await panel.getAttribute('data-state'), 'ready');
  await cast.click();
  await page.locator('#track').waitFor();
  await page.locator('#escape').click();
  assert.equal((await saved()).gold, before.gold);
  assert.equal((await saved()).deepCaught[0], 3);
  await reload();
  assert.equal(await panel.getAttribute('data-state'), 'ready');

  await page.locator('#trail-cast:enabled').waitFor();
  await page.evaluate(() => {
    const button = document.getElementById('trail-cast');
    button.click();
    button.click();
  });
  await page.locator('#track').waitFor();
  await playFight(page);
  assert.equal(await panel.getAttribute('data-state'), 'complete');
  const after = await saved();
  const id = seas[0].trailId;
  assert.equal(after.trailCompleted[0], true);
  assert.equal(after.counts[id], 1);
  assert.equal(after.deepCaught[0], 4);
  assert.equal(after.survey[0], 4);
  assert.equal(after.gold - before.gold, salePrice(id, after.maxCm[id], after.shiny[id] > 0));
  assert.deepEqual(after.unlocked, before.unlocked);
  assert.deepEqual(after.bosses, before.bosses);

  await reload();
  assert.equal(await panel.getAttribute('data-state'), 'complete');
  await page.evaluate(() => document.getElementById('trail-cast').click());
  await page.waitForTimeout(550);
  assert.equal((await saved()).gold, after.gold);
  assert.equal((await saved()).counts[id], 1);
  assert.deepEqual(errors, []);
  console.log('PASS 구형 v2의 흔적 낚시, 취소와 재시도, 연속 클릭, 표본과 판매금 1회, 새로고침 복원');
} finally {
  await browser.close();
}
