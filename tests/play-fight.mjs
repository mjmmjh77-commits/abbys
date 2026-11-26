import assert from 'node:assert/strict';

export async function mapPoint(page, x, y) {
  const canvas = page.locator('#game canvas');
  await canvas.scrollIntoViewIfNeeded();
  const b = await canvas.boundingBox();
  return { x: b.x + x * b.width / 960, y: b.y + y * b.height / 600 };
}

// Read the same markers, target zones and cues shown to a player. Send browser
// input; do not call game functions, set progress, or advance the game clock.
export async function playFight(page, { tracking = 'mouse' } = {}) {
  const overlay = page.locator('#minigame');
  await overlay.waitFor();
  await overlay.scrollIntoViewIfNeeded();
  const deadline = Date.now() + 70000;
  const phases = [];
  let heldKey = null;
  async function holdKey(next) {
    if (next === heldKey) return;
    if (heldKey) await page.keyboard.up(heldKey);
    if (next) await page.keyboard.down(next);
    heldKey = next;
  }
  try {
    while (await overlay.isVisible()) {
      assert.ok(Date.now() < deadline, '포획 제한시간');
      const control = await page.evaluate(() => {
        const track = document.querySelector('#track');
        const fish = document.querySelector('#fish-dot');
        const hold = document.querySelector('#hold-target');
        const pos = (fish || hold)?.getBoundingClientRect();
        if (pos) return {
          move: [pos.x + pos.width / 2, pos.y + pos.height / 2],
          offset: fish ? parseFloat(fish.style.left) - Number(track.getAttribute('aria-valuenow')) : null,
          phase: track?.dataset.phase,
          cue: document.querySelector('#dash-cue')?.textContent,
          acquireHold: !!hold && !hold.classList.contains('holding'),
        };
        const tension = document.querySelector('#tension-meter');
        if (tension) return { reel: parseFloat(tension.style.left) < 52 };
        const timing = document.querySelector('#timing-dot');
        if (timing) {
          // Act on the displayed frame. A round trip to the test process can
          // outlast a narrow timing window when several browsers share a CPU.
          const zone = timing.parentElement.querySelector('.target-zone');
          if (Math.abs(parseFloat(timing.style.left) - 50) <= parseFloat(zone.style.width) / 2) {
            document.querySelector('#timing-hit').click();
          }
          return {};
        }
        const rhythm = document.querySelector('#rhythm-hit');
        if (rhythm) return { hit: rhythm.textContent.includes('지금 당기기') };
        const ring = document.querySelector('#ring');
        if (ring?.textContent === '길게 누르기') return { bossHold: true };
        if (ring?.style.background === 'rgb(80, 118, 91)') return { bossHit: true };
        return { failed: document.querySelector('#retry') ? document.querySelector('.fight-card p')?.textContent || '실패' : null };
      });
      assert.ok(!control.failed, '자동 입력 중 미니게임 실패 · ' + control.failed);
      if (control.phase && phases.at(-1)?.phase !== control.phase) {
        phases.push({ phase: control.phase, cue: control.cue });
      }
      if (Object.hasOwn(control, 'reel')) {
        await holdKey(control.reel ? 'Space' : null);
      } else if (control.move && tracking === 'keyboard' && control.offset !== null) {
        const { offset } = control;
        await holdKey(Math.abs(offset) <= 2.5 ? null : offset > 0 ? 'ArrowRight' : 'ArrowLeft');
      } else {
        await holdKey(null);
        if (control.acquireHold) await page.mouse.click(...control.move);
        else if (control.move) await page.mouse.move(...control.move);
      }
      if (control.hit) await page.keyboard.press('Space');
      if (control.bossHold) await page.keyboard.press('Enter', { delay: 800 });
      if (control.bossHit) await page.keyboard.press('Enter');
      await page.waitForTimeout(35);
    }
    return phases;
  } finally {
    await holdKey(null);
  }
}
