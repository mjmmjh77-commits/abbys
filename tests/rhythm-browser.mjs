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

  // React to the actual rendered frame. A round trip to the runner between
  // spotting green and clicking can outlast the narrowest window on a busy CI host.
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = performance.now() + 60000;
    const scores = [];
    let reeling = false, sawTitle = false, wasGreen = false, windows = 0;
    function space(target, type, repeat = false) {
      target.dispatchEvent(new KeyboardEvent(type, { code: 'Space', key: ' ', repeat, bubbles: true, cancelable: true }));
    }
    function act() {
      if (document.querySelector('.fight-card h2')?.textContent.includes('왕관심해어')) sawTitle = true;
      if (windows === 5 && document.getElementById('minigame').hidden) return resolve({ scores, sawTitle });
      if (document.querySelector('#retry') || performance.now() > deadline) {
        return reject(new Error('왕관심해어 라운드 실패 · ' + windows + '개 리듬 기회 · ' + scores.join(', ')));
      }

      const reel = document.querySelector('#tension-reel');
      if (reel) {
        const pull = parseFloat(document.querySelector('#tension-meter').style.left) < 52;
        if (pull !== reeling) {
          reel.dispatchEvent(new PointerEvent(pull ? 'pointerdown' : 'pointerup', { pointerType: 'mouse' }));
          reeling = pull;
        }
      }
      const hold = document.querySelector('#hold-target');
      if (hold && !hold.classList.contains('holding')) {
        hold.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      }

      const hit = document.querySelector('#rhythm-hit');
      if (hit) {
        const green = hit.textContent.includes('지금 당기기');
        if (green && !wasGreen) {
          windows++;
          switch (windows) {
            case 1:
              for (let i = 0; i < 4; i++) hit.click();
              break;
            case 2:
              space(hit, 'keydown'); // Hold until the next whole green window.
              break;
            case 3:
              space(hit, 'keydown', true);
              space(hit, 'keyup');
              break;
            case 4:
              space(hit, 'keydown');
              space(hit, 'keyup');
              break;
            case 5:
              hit.click();
              break;
          }
          if (windows < 5) scores.push(document.getElementById('rhythm-score').textContent);
        }
        // The credited marker '명중 ✓' still belongs to this same crossing.
        wasGreen = green || hit.textContent.includes('명중');
      }
      requestAnimationFrame(act);
    }
    document.getElementById('cast').click();
    requestAnimationFrame(act);
  }));
  assert.ok(result.sawTitle);
  assert.deepEqual(result.scores, [1, 2, 2, 3].map(n => '명중 ' + n + '/4 · 빗나감 0/2'));
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.equal(saved.counts[49], 1);
  assert.equal(saved.misses, 0);
  assert.deepEqual(errors, []);
  console.log('PASS 왕관심해어 기본 장비 · 초록 한 번에 4연타=1점, 누른 채 다음 기회 통과=0점, 다섯 기회 중 네 번 명중·실제 포획');
} finally {
  await browser.close();
}
