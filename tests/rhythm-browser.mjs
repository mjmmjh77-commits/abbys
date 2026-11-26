// Run this alongside test:coral against the same development server or build.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { fresh, KEY } from '../src/model.ts';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const save = fresh();
  save.sea = 4;
  save.unlocked.fill(true);
  save.bosses = [true, true, true, true, false];
  save.line.fill(true);
  await page.goto(process.env.ABYSS_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [KEY, save]);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#game canvas').waitFor();
  await page.waitForFunction(() => document.getElementById('cast-aim')?.disabled === false);
  // Choose the rare school deterministically when entering the deepest sea.
  // Timing, key repeat, collision and settlement use the ordinary game clock and RNG.
  await page.evaluate(() => {
    const random = Math.random;
    try {
      Math.random = () => 0.999;
      document.getElementById('deep').click();
    } finally {
      Math.random = random;
    }
  });

  // Play the two prerequisite rounds using their normal DOM controls on each
  // displayed frame, so setup doesn't depend on test-runner round trip latency.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = performance.now() + 45000;
    let reeling = false;
    let sawTitle = false;
    function act() {
      const title = document.querySelector('.fight-card h2')?.textContent;
      if (title?.includes('왕관심해어')) sawTitle = true;
      if (document.querySelector('#rhythm-hit') && sawTitle) return resolve();
      if (document.querySelector('#retry') || performance.now() > deadline) {
        return reject(new Error('왕관심해어의 리듬 라운드에 도달하지 못했습니다.'));
      }
      const reel = document.querySelector('#tension-reel');
      if (reel) {
        const tension = parseFloat(document.querySelector('#tension-meter').style.left);
        const pull = tension < 52;
        if (pull !== reeling) {
          reel.dispatchEvent(new PointerEvent(pull ? 'pointerdown' : 'pointerup', { pointerType: 'mouse' }));
          reeling = pull;
        }
      }
      const hold = document.querySelector('#hold-target');
      if (hold && !hold.classList.contains('holding')) {
        hold.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      }
      requestAnimationFrame(act);
    }
    document.querySelector('#cast').click();
    requestAnimationFrame(act);
  }));

  const hit = page.locator('#rhythm-hit'), score = page.locator('#rhythm-score');
  const rect = await hit.boundingBox();
  const click = count => page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2, { clickCount: count });
  const waitGreen = () => page.waitForFunction(
    () => document.getElementById('rhythm-hit')?.textContent.includes('지금 당기기'));
  const waitOutside = () => page.waitForFunction(
    () => document.getElementById('rhythm-hit')?.textContent.includes('박자에 맞춰'));
  const checkHits = async n => assert.equal(await score.innerText(), '명중 ' + n + '/4 · 빗나감 0/2');

  await waitGreen();
  await click(4);
  await checkHits(1);
  await waitOutside();

  await waitGreen();
  await page.keyboard.down('Space');
  await checkHits(2);
  await waitOutside();
  await waitGreen();
  await page.keyboard.down('Space'); // Browser auto-repeat while still held.
  await checkHits(2);
  await waitOutside();
  await page.keyboard.up('Space');
  await checkHits(2);

  await waitGreen();
  await page.keyboard.press('Space');
  await checkHits(3);
  await waitOutside();
  await waitGreen();
  await click(1);
  await hit.waitFor({ state: 'detached' });
  await page.waitForFunction(() => document.querySelector('#minigame').hidden);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.equal(saved.counts[49], 1);
  assert.equal(saved.misses, 0);
  assert.deepEqual(errors, []);
  console.log('PASS 왕관심해어 기본 장비 · 초록 한 번에 4연타=1점, 누른 채 다음 기회 통과=0점, 다섯 기회 중 네 번 명중·실제 포획');
} finally {
  await browser.close();
}
