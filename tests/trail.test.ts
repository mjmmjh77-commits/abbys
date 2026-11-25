import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canFollowTrail, completeTrail, fresh, parseSave, seas, settleCatch } from '../src/model.ts';

test('해역별 대표종은 서로 다른 깊은 층 어종이며 흔적 단서가 있다', () => {
  assert.equal(new Set(seas.map(area => area.trailId)).size, seas.length);
  for (const area of seas) {
    assert.ok(area.deep.includes(area.trailId));
    assert.ok(area.trailClue.trim().length > 0);
  }
});

test('깊은 층 수동 포획 세 번 이후 같은 층에서만 흔적을 따라갈 수 있다', () => {
  const s = fresh(), fish = seas[0].deep[0];
  settleCatch(s, fish, false, 'manual', () => 0);
  s.line[0] = true;
  s.layer = 'deep';
  settleCatch(s, fish, false, 'net', () => 0);
  settleCatch(s, fish, false, 'expedition', () => 0);
  for (let i = 0; i < 3; i++) {
    assert.equal(canFollowTrail(s), false);
    settleCatch(s, fish, false, 'manual', () => 0);
  }
  assert.ok(canFollowTrail(s));
  s.layer = 'shallow';
  assert.equal(canFollowTrail(s), false);
  s.sea = 1;
  s.unlocked[1] = s.line[1] = true;
  s.layer = 'deep';
  assert.equal(canFollowTrail(s), false);
});

test('흔적 승리는 이미 정산된 대표종만 1회 기록하고 골드와 진행을 중복 지급하지 않는다', () => {
  const s = fresh();
  s.line[0] = true;
  s.layer = 'deep';
  for (let i = 0; i < 3; i++) settleCatch(s, seas[0].deep[0], false, 'manual', () => 0);
  assert.equal(completeTrail(s, seas[0].trailId), false);
  assert.equal(completeTrail(s, seas[1].trailId), false);
  settleCatch(s, seas[0].trailId, false, 'manual', () => 0);
  const expected = parseSave(JSON.stringify(s));
  expected.trailCompleted[0] = true;
  assert.equal(completeTrail(s, seas[0].trailId), true);
  assert.equal(completeTrail(s, seas[0].trailId), false);
  assert.equal(canFollowTrail(s), false);
  assert.deepEqual(parseSave(JSON.stringify(s)), expected);
});

test('이전 v2와 v1은 미완료로 시작하고 잘못된 신규 기록을 거절한다', () => {
  const {trailCompleted, ...older} = fresh();
  assert.deepEqual(parseSave(JSON.stringify(older)).trailCompleted, trailCompleted);
  assert.deepEqual(parseSave(JSON.stringify({...older, version: 1})).trailCompleted, trailCompleted);
  assert.throws(() => parseSave(JSON.stringify({...older, trailCompleted: [1]})));
});
