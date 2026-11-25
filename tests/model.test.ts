import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fresh,
  species,
  seas,
  canFish,
  pickFish,
  salePrice,
  buyGear,
  reelGrace,
  settleCatch,
  fishCopies,
  sellFish,
  buyFish,
  enhanceFish,
  claimResearch,
  bossReady,
  defeatBoss,
  canTravel,
  netCooldown,
  netHaul,
} from '../src/model.ts';

test('50개 기존 ID, 경계 수심과 선택한 층, 낮은 난도의 공통종', () => {
  assert.deepEqual(
    species.map((f) => f.id),
    Array.from({ length: 50 }, (_, i) => i),
  );
  for (const [i, area] of seas.entries()) {
    const s = fresh();
    s.sea = i;
    assert.ok(canFish(s, 'shallow', area.boundary));
    assert.equal(canFish(s, 'deep', area.boundary), false);
    s.gold = area.lineCost;
    assert.ok(buyGear(s, 'line'));
    assert.ok(canFish(s, 'deep', area.boundary));
    assert.ok(!canFish(s, 'shallow', area.boundary + 1));
    assert.ok(!canFish(s, 'deep', area.end + 1));
    for (const layer of ['deep', 'shallow'] as const) {
      const drawn = new Set(
        Array.from({ length: 10000 }, (_, n) => pickFish(i, layer, () => n / 10000)),
      );
      assert.deepEqual(drawn, new Set(area[layer]));
      assert.ok(area[layer].some((id) => species[id].rank <= 1));
    }
  }
});
test('장비 가격, 확정 강화, 중복 입력과 릴 보정 상한', () => {
  const s = fresh();
  assert.equal(buyGear(s, 'line'), false);
  assert.equal(s.gold, 100);
  for (const [i, area] of seas.entries()) {
    s.sea = i;
    s.gold = area.lineCost + area.reelCost;
    assert.ok(buyGear(s, 'line'));
    assert.ok(!buyGear(s, 'line'));
    assert.ok(buyGear(s, 'reel'));
    assert.ok(!buyGear(s, 'reel'));
    assert.equal(s.gold, 0);
    assert.equal(reelGrace(s), Math.min(0.8, (i + 1) * 0.2));
  }
});
test('크기·최저가·황금 판매와 개인 기록', () => {
  const s = fresh(),
    f = species[0];
  assert.equal(salePrice(0, f.minCm), 20);
  assert.equal(salePrice(0, f.maxCm), 33);
  assert.equal(salePrice(0, f.minCm + (f.maxCm - f.minCm) * 0.4), 25);
  const large = settleCatch(s, 0, true, 'manual', () => 1);
  assert.equal(large.gain, 132);
  assert.equal(s.shiny[0], 1);
  settleCatch(s, 0, false, 'manual', () => 0);
  assert.equal(s.maxCm[0], large.cm);
  assert.equal(s.counts[0], 2);
  assert.equal(s.gold, 252);
});
test('그물·원정·시장 및 판매·카드 소모의 경계', () => {
  const s = fresh();
  s.gold = 100000;
  for (let i = 0; i < 10; i++) {
    settleCatch(s, 0, false, 'net');
    settleCatch(s, 0, false, 'expedition');
  }
  assert.deepEqual(
    s.survey,
    seas.map(() => 0),
  );
  assert.equal(bossReady(s), false);
  assert.equal(sellFish(s, 0), null);
  assert.ok(buyFish(s, 0, 3));
  assert.ok(sellFish(s, 0, 2));
  assert.equal(sellFish(s, 0, 2), null);
  while (fishCopies(s, 0) > 0) assert.ok(enhanceFish(s, 0, [0], () => 1));
  assert.equal(sellFish(s, 0), null);
  assert.ok(s.tradable[0] <= 1);
  assert.equal(fishCopies(s, 0), 0);
});
test('연구는 서로 다른 직접 포획 다섯 종, 한 번만 지급', () => {
  const s = fresh();
  s.gold = 100000;
  for (const id of seas[0].shallow) buyFish(s, id);
  assert.equal(claimResearch(s), 0);
  for (const id of seas[0].shallow) settleCatch(s, id, false, 'manual');
  assert.equal(claimResearch(s), 150);
  assert.equal(claimResearch(s), 0);
});
test('그물 분당 직접 수입은 보통 수동 낚시(15초) 하한의 30% 이내', () => {
  for (const [i, area] of seas.entries())
    for (let boat = 0; boat < 5; boat++) {
      const s = fresh();
      s.sea = i;
      s.boat = boat;
      const { gain: total } = netHaul(s, () => 0);
      assert.ok(total / netCooldown(s) <= (0.3 * area.floor) / 15);
    }
});
test('보스 조건과 첫 보상, 영구 출항', () => {
  const s = fresh();
  for (let i = 0; i < 6; i++) settleCatch(s, 0, false, 'manual');
  assert.equal(defeatBoss(s), 0);
  assert.ok(!canTravel(s, 1));
  buyGear(s, 'line');
  s.layer = 'deep';
  settleCatch(s, 1, false, 'manual');
  assert.equal(defeatBoss(s), 40);
  assert.equal(defeatBoss(s), 0);
  assert.ok(canTravel(s, 1));
  assert.ok(!canTravel(s, 5));
});
