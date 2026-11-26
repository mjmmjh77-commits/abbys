import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kelpDash, rhythmBeat, rhythmRules } from '../src/fight.ts';

test('해마와 수호자의 몸 돌리기 신호 뒤 한 번만 돌진하고 키보드로 따라잡을 시간을 준다', () => {
  const phases: string[] = [];
  let turnStart = 0, dashStart = 0, restStart = 0;
  for (let step = 0; step < 1200; step++) {
    const time = step / 60;
    const movement = kelpDash(time);
    assert.ok(movement.x >= 0 && movement.x <= 1);
    if (movement.phase === phases.at(-1)) continue;
    phases.push(movement.phase);
    if (movement.phase === 'turn') turnStart = time;
    if (movement.phase === 'dash') dashStart = time;
    if (movement.phase === 'rest') restStart = time;
  }
  assert.deepEqual(phases, ['swim', 'turn', 'dash', 'rest']);
  assert.ok(dashStart - turnStart >= 1);
  const leap = kelpDash(restStart).x - kelpDash(dashStart).x;
  assert.ok(leap > 0.45);
  assert.ok(restStart - dashStart < 0.6);
  // Even starting at the windup position after the leap, arrow speed 0.75/s reaches cover in a second.
  assert.ok(kelpDash(restStart + 1).x - kelpDash(dashStart).x < 0.75);
});

test('리듬 판정은 가운데 통과 한 번에 하나의 박을 배정하며 제한 시간에는 예비 박도 들어간다', () => {
  for (let rank = 0; rank <= 9; rank++) {
    for (let sea = 0; sea < 5; sea++) {
      const rules = rhythmRules(rank, sea, 0);
      const windows: number[] = [];
      let openBeat: number | undefined;
      for (let elapsed = 0; elapsed < rules.deadline; elapsed += 5) {
        const beat = rhythmBeat(elapsed, rules);
        if (!beat.open) {
          openBeat = undefined;
          continue;
        }
        if (openBeat === undefined) windows.push(beat.index);
        else assert.equal(beat.index, openBeat);
        openBeat = beat.index;
      }
      assert.ok(windows.length >= rules.target + 1);
      assert.equal(new Set(windows).size, windows.length);
      assert.equal(rhythmBeat(0, rules).open, false);
    }
  }
});
