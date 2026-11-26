// Run against the local game with a fresh, disposable Chromium context.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { fishingRules, seas, species } from '../src/model.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const start = Date.now();
  const $ = selector => page.locator(selector);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('abyss-fishing-v2')));
  const points = s => s.survey[0] + s.coralSurveyBonus;
  const capture = async name => {
    if (!process.env.CAPTURE_DIR) return;
    await mkdir(process.env.CAPTURE_DIR, { recursive: true });
    await $('.ocean-card').screenshot({ path: join(process.env.CAPTURE_DIR, name + '.png') });
  };
  const reload = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await $('#game canvas').waitFor();
    await $('#trail-panel').waitFor();
  };
  const mapPoint = async (x, y) => {
    const canvas = $('#game canvas');
    await canvas.scrollIntoViewIfNeeded();
    const b = await canvas.boundingBox();
    return { x: b.x + x * b.width / 960, y: b.y + y * b.height / 600 };
  };
  // Read only displayed controls. All actions go through real browser input.
  async function playFight() {
    await $('#track').waitFor();
    await $('#track').scrollIntoViewIfNeeded();
    const deadline = Date.now() + 60_000;
    while (await $('#minigame').isVisible()) {
      assert.ok(Date.now() < deadline, '포획 제한시간');
      const control = await page.evaluate(() => {
        const trackFish = document.querySelector('#fish-dot');
        const hold = document.querySelector('#hold-target');
        const pos = (trackFish || hold)?.getBoundingClientRect();
        if (pos) return { move: [pos.x + pos.width / 2, pos.y + pos.height / 2] };
        const timing = document.querySelector('#timing-dot');
        if (timing && Math.abs(parseFloat(timing.style.left) - 50) < 4) return { hit: true };
        const ring = document.querySelector('#ring');
        if (ring?.textContent === '길게 누르기') return { bossHold: true };
        if (ring?.style.background === 'rgb(80, 118, 91)') return { bossHit: true };
        return { failed: !!document.querySelector('#retry') };
      });
      assert.ok(!control.failed, '자동 입력 중 미니게임 실패');
      if (control.move) await page.mouse.move(...control.move);
      if (control.hit) await page.keyboard.press('Space');
      if (control.bossHold) await page.keyboard.press('Enter', { delay: 800 });
      if (control.bossHit) await page.keyboard.press('Enter');
      await page.waitForTimeout(45);
    }
  }
  async function catchOne(before, pool) {
    await playFight();
    const after = await saved();
    assert.equal(after.caught[0], before.caught[0] + 1);
    assert.equal(after.survey[0], before.survey[0] + 1);
    const changed = after.counts.flatMap((n, i) => n === before.counts[i] ? [] : [i]);
    assert.equal(changed.length, 1);
    const [id] = changed;
    assert.equal(after.counts[id], before.counts[id] + 1);
    assert.ok(pool.includes(id), species[id].name);
    const delta = fishingRules(species[id].rank, 0, 0).rounds;
    assert.equal(points(after) - points(before), delta);
    const toast = await $('#toast').innerText();
    assert.ok(toast.includes('+' + delta + ' 조사점'), toast);
    const sale = Number(toast.match(/자동 판매 ([\d,]+) G/)?.[1].replaceAll(',', ''));
    const extra = Number(toast.match(/추가 ([\d,]+) G/)?.[1].replaceAll(',', '') || 0);
    const levelBonus = Number(toast.match(/Lv\.\d+! \+([\d,]+) G/)?.[1].replaceAll(',', '') || 0);
    assert.equal(after.gold - before.gold, sale + extra + levelBonus, toast);
    console.log('포획', toast, '· 보유', after.gold, 'G · 누적', points(after), '조사점');
    return after;
  }

  await page.goto(process.env.ABYSS_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await $('#game canvas').waitFor();
  await $('#aim-kelp').waitFor();
  const freshSave = await saved();
  assert.equal(freshSave.gold, 100);
  assert.equal(freshSave.caught[0], 0);

  const kelp = async () => mapPoint(790, 450);
  let point = await kelp();
  await page.mouse.move(point.x, point.y);
  const shortPreview = await $('#cast-readout').innerText();
  assert.match(shortPreview, /100\s*m 줄 · 예상 착수 100\s*m.*가장자리.*줄 끝/);
  // Let the opening camera fade finish before saving the visual comparison.
  if (process.env.CAPTURE_DIR) await page.waitForTimeout(700);
  await capture('100m-kelp');
  point = await kelp();
  await page.mouse.dblclick(point.x, point.y);
  await $('#bait-cancel').waitFor();
  let state = await catchOne(freshSave, [0, 1]);
  assert.equal(state.deepCaught[0], 0);
  assert.ok(state.gold >= 120);
  const beforeBuy = state.gold;
  await $('#line').dblclick();
  state = await saved();
  assert.equal(state.gold, beforeBuy - 120);
  assert.equal(state.line[0], true);

  // Reuse exactly the same map coordinates before selecting a point by keyboard.
  point = await kelp();
  await page.mouse.move(point.x, point.y);
  const longPreview = await $('#cast-readout').innerText();
  assert.match(longPreview, /200\s*m 줄 · 예상 착수 14[45]\s*m.*해초밭/);
  assert.notEqual(longPreview, shortPreview);
  console.log('착수 예고', shortPreview, '→', longPreview);
  await capture('200m-kelp');
  await $('#aim-shoal').click();
  await page.keyboard.press('ArrowRight');
  assert.match(await $('#cast-readout').innerText(), /해초/);
  await page.keyboard.press('Enter');
  await $('#bait-cancel').waitFor();
  state = await catchOne(state, [5, 7, 8, 9]);
  assert.equal(state.deepCaught[0], 1);

  await $('#aim-kelp').click();
  await $('#cast-aim').dblclick();
  await $('#bait-cancel').click();
  assert.equal((await saved()).gold, state.gold);
  await $('#cast-aim').click();
  await $('#bait-cancel').waitFor();
  await reload();
  assert.equal((await saved()).gold, state.gold);
  assert.deepEqual((await saved()).counts, state.counts);
  for (let deep = 2; deep <= 3; deep++) {
    assert.notEqual(await $('#trail-panel').getAttribute('data-state'), 'ready');
    await $('#aim-kelp').click();
    await $('#cast-aim').click();
    state = await catchOne(state, [5, 7, 8, 9]);
    assert.equal(state.deepCaught[0], deep);
  }

  assert.equal(await $('#trail-panel').getAttribute('data-state'), 'ready');
  await capture('seahorse-trail');
  // Both entrances must name the same specimen, even after a cancellation and reload.
  await $('#cast-aim:enabled').waitFor();
  const trace = await mapPoint(833, 477);
  await page.mouse.move(trace.x, trace.y);
  await page.mouse.click(trace.x, trace.y);
  await $('#track').waitFor();
  assert.match(await $('.fight-card').innerText(), /분홍해마/);
  assert.match(await $('.fight-card').innerText(), /표본 추적/);
  await $('#escape').click();
  await reload();
  assert.equal((await saved()).gold, state.gold);
  assert.deepEqual((await saved()).counts, state.counts);
  await $('#trail-cast').dblclick();
  await $('#track').waitFor();
  assert.match(await $('.fight-card').innerText(), /분홍해마/);
  // Deliberately leave the fish on the opposite side until the retry screen appears.
  const track = await $('#track').boundingBox();
  await page.mouse.move(track.x + 2, track.y + track.height / 2);
  await $('#retry').waitFor({ timeout: 25_000 });
  assert.equal((await saved()).gold, state.gold);
  await $('#retry').dblclick();
  state = await catchOne(state, [seas[0].trailId]);
  assert.equal(state.trailCompleted[0], true);
  assert.equal(state.deepCaught[0], 4);
  await reload();
  assert.equal((await saved()).gold, state.gold);
  assert.deepEqual((await saved()).counts, state.counts);
  assert.ok(await $('#trail-cast').isDisabled());
  await $('#book').click();
  const card = $('.fish-card').filter({ hasText: '분홍해마' });
  assert.match(await card.innerText(), /해역 관찰 표본/);
  await $('#close-modal').click();
  await $('#boss').click();
  await playFight();
  state = await saved();
  assert.ok(state.bosses[0] && state.unlocked[1]);
  assert.equal(state.caught[0], 5);
  await $('#next').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('abyss-fishing-v2')).sea === 1);
  await reload();
  assert.equal((await saved()).sea, 1);
  assert.ok(await $('#aim-kelp').isHidden());
  assert.deepEqual(errors, []);
  console.log('PASS 새 저장, 줄 구매, 깊은 층 3마리, 흔적 재도전, 표본 도감, 첫 보스, 푸른 해류 출항',
    Math.round((Date.now() - start) / 1000) + '초');
} finally {
  await browser.close();
}
