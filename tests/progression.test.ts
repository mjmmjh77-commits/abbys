import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fresh,
  species,
  seas,
  settleCatch,
  buyGear,
  defeatBoss,
  canTravel,
  fishingRules,
  comboBonus,
  parseSave,
  syncDailyQuests,
  upgrade,
  upgradePrice,
} from '../src/model.ts';
for (const f of species)
  for (const shiny of [false, true]) {
    test(f.name + ' · ' + (shiny ? '황금' : '일반') + ' 포획 기록 왕복', () => {
      const s = fresh();
      s.sea = f.sea;
      s.unlocked[f.sea] = true;
      s.line[f.sea] = true;
      s.layer = seas[f.sea].shallow.includes(f.id) ? 'shallow' : 'deep';
      const { gain, cm } = settleCatch(s, f.id, shiny, 'manual', () => 0.5);
      assert.equal(s.counts[f.id], 1);
      assert.equal(s.shiny[f.id], Number(shiny));
      assert.equal(s.maxCm[f.id], cm);
      assert.equal(s.gold, 100 + gain);
      assert.deepEqual(parseSave(JSON.stringify(s)), s);
    });
  }
for (const optional of [false, true])
  test('일반 어종만으로 마지막 보스 · 선택 릴 ' + optional, () => {
    const s = fresh();
    for (const [i, area] of seas.entries()) {
      assert.ok(canTravel(s, i));
      s.sea = i;
      s.layer = 'shallow';
      while (!s.line[i]) {
        settleCatch(s, area.shallow[0], false, 'manual', () => 0);
        buyGear(s, 'line');
      }
      if (!i) assert.equal(s.survey[0], 1);
      s.layer = 'deep';
      do {
        settleCatch(s, area.deep[0], false, 'manual', () => 0);
      } while (s.survey[i] < area.target);
      syncDailyQuests(s, '다음 날');
      assert.equal(defeatBoss(s), area.reward);
      assert.equal(defeatBoss(s), 0);
      if (optional) assert.ok(buyGear(s, 'reel'));
      assert.deepEqual(parseSave(JSON.stringify(s)), s);
    }
    assert.ok(s.bosses.every(Boolean));
    assert.ok(canTravel(s, 0));
  });
test('최소 판매금 검산과 선택 상위 장비 경로', () => {
  let gold = 100;
  for (const [i, z] of seas.entries()) {
    assert.ok((i === 0 ? 100 : 0) + (z.target - 1) * z.floor >= z.lineCost);
    gold += z.target * z.floor - z.lineCost;
    assert.ok(gold >= 0);
    gold += z.reward - z.reelCost;
    assert.equal(gold, [40, 100, 180, 380, 880][i]);
  }
  const s = fresh();
  for (const kind of ['rod', 'boat'] as const) {
    for (let n = 0; n < 4; n++) {
      while (s.gold < upgradePrice(s, kind)) settleCatch(s, 0, false, 'manual', () => 0);
      assert.ok(upgrade(s, kind));
    }
    assert.ok(!upgrade(s, kind));
  }
  assert.ok(!canTravel(s, 1));
});
test('난도·장비와 기존 콤보 상한', () => {
  for (let rank = 0; rank < 10; rank++) {
    const a = fishingRules(rank, 0, 0);
    assert.equal(a.rounds, rank === 9 ? 3 : rank >= 4 ? 2 : 1);
    assert.ok(fishingRules(rank, 0, 4).zone >= a.zone);
    if (rank) assert.ok(a.speed > fishingRules(rank - 1, 0, 0).speed);
  }
  assert.equal(comboBonus(100, 1), 0);
  assert.equal(comboBonus(100, 2), 5);
  assert.equal(comboBonus(100, 1000), 50);
});
