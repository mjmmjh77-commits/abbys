import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fresh, loadSave, storeSave, parseSave, KEY, LEGACY_KEY } from '../src/model.ts';
class Memory {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
for (const cleared of [0, 2, 5])
  test('v1 이관·재시작·재가져오기 · 격파 ' + cleared, () => {
    const disk = new Memory();
    const old = {
      ...fresh(),
      version: 1,
      sea: Math.min(4, cleared),
      rod: Math.min(4, cleared),
      boat: Math.min(4, cleared),
      gold: 441,
    };
    for (let i = 0; i < cleared; i++) old.bosses[i] = true;
    old.counts[0] = 10;
    old.shiny[0] = 1;
    old.fishBought[0] = 3;
    old.fishSpent[0] = 2;
    old.runClears = cleared === 5 ? 2 : 0;
    old.fishLevel[0] = 3;
    old.rodFish = 0;
    old.caught[0] = 10;
    old.questFish = 4;
    old.claimed[0] = true;
    const source = JSON.stringify(old);
    disk.setItem(LEGACY_KEY, source);
    const s = loadSave(disk);
    assert.equal(disk.getItem(LEGACY_KEY), source);
    assert.equal(s.gold, 441);
    assert.equal(s.sea, old.sea);
    assert.ok(s.unlocked[s.sea]);
    assert.equal(s.tradable[0], 10);
    assert.equal(s.rodFish, 0);
    assert.equal(s.survey[0], 0);
    assert.equal(s.maxCm[0], 0);
    assert.deepEqual(s.line, old.bosses);
    assert.equal(s.runClears, old.runClears);
    assert.deepEqual(loadSave(disk), s);
    assert.deepEqual(parseSave(source), s);
    assert.deepEqual(parseSave(JSON.stringify(s)), s);
  });
test('잘못된 JSON, 미지원 버전, 쓰기 실패, 읽기 검증 실패', () => {
  const disk = new Memory();
  const original = JSON.stringify({ ...fresh(), version: 1 });
  disk.setItem(LEGACY_KEY, original);
  const s = loadSave(disk);
  const before = disk.getItem(KEY);
  for (const bad of [
    '{',
    '{}',
    '{"version":7}',
    JSON.stringify({ ...s, counts: [] }),
    JSON.stringify({ ...s, sea: 3 }),
    JSON.stringify({ ...s, gold: -1 }),
  ]) {
    assert.throws(() => storeSave(disk, parseSave(bad)));
    assert.equal(disk.getItem(KEY), before);
  }
  disk.removeItem(KEY);
  disk.setItem = () => {
    throw Error('quota');
  };
  assert.throws(() => loadSave(disk));
  assert.equal(disk.getItem(LEGACY_KEY), original);
  disk.setItem = () => {};
  assert.throws(() => loadSave(disk));
  assert.equal(disk.getItem(LEGACY_KEY), original);
  assert.equal(disk.getItem(KEY), null);
});
