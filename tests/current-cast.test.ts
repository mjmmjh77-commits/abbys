import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CORAL_CAST, CURRENT_CAST, bossProgress, bossReady, buyGear, completeTrail, defeatBoss,
  fresh, parseSave, pickBaitFish, planCoralCast, planCurrentCast, salePrice, seas, settleCatch, species,
} from '../src/model.ts';

test('해류 상류에서는 먹이터 어종, 먹이터에 직접 던지면 하류의 일반 어종이 문다', () => {
  const upstream = planCurrentCast(CURRENT_CAST.upstream, false);
  assert.deepEqual(upstream.landing, CURRENT_CAST.upstream);
  assert.deepEqual(upstream.driftEnd, CURRENT_CAST.feeding);
  assert.equal(upstream.habitat, 'feeding');
  assert.equal(upstream.range, 600);
  assert.ok(upstream.candidates.every(id => species[id].rank >= 2));
  const direct = planCurrentCast(upstream.driftEnd, false);
  assert.equal(direct.habitat, 'channel');
  assert.ok(direct.candidates.every(id => species[id].rank <= 1));
  const deep = planCurrentCast(CURRENT_CAST.deep, true);
  assert.equal(deep.habitat, 'deepFeeding');
  assert.equal(deep.range, 1000);
  assert.deepEqual(deep.driftEnd, CURRENT_CAST.deepFeeding);
  assert.equal(planCurrentCast(CURRENT_CAST.deep, false).layer, 'shallow');
  assert.equal(new Set([...upstream.candidates, ...direct.candidates,
    ...deep.candidates, ...planCurrentCast({x: 530, y: 405}, true).candidates]).size, 10);

  for (const upgraded of [false, true]) {
    for (let x = 0; x <= 960; x += 60) {
      for (let y = 0; y <= 600; y += 40) {
        const cast = planCurrentCast({ x, y }, upgraded);
        assert.ok(cast.candidates.every(id => seas[1][cast.layer].includes(id)));
        if (!upgraded) assert.equal(cast.layer, 'shallow');
        for (const p of [cast.landing, cast.driftEnd]) {
          assert.ok(p.x >= 0 && p.x <= 960 && p.y >= CURRENT_CAST.waterline && p.y <= 599);
          assert.ok(Math.hypot(p.x - CURRENT_CAST.origin.x, p.y - CURRENT_CAST.origin.y)
            <= cast.range * CURRENT_CAST.pixelsPerMeter + 1e-8);
        }
      }
    }
  }
});

test('등록 전 확정 표본전, 등록 뒤 해초밭 4% 일반 입질과 크기·황금·단일 정산', () => {
  const s = fresh();
  s.line[0] = true;
  s.layer = 'deep';
  for (let n = 0; n < 3; n++) settleCatch(s, 1, false, 'manual');
  const specimen = seas[0].trailId;
  const first = planCoralCast(CORAL_CAST.trail, true, true, false);
  assert.equal(first.habitat, 'trail');
  assert.deepEqual(first.candidates, [specimen]);
  assert.equal(pickBaitFish(first, () => 0.99), specimen);
  assert.ok(!planCoralCast(CORAL_CAST.kelp, true, true, false).candidates.includes(specimen));
  settleCatch(s, specimen, false, 'manual', () => 0);
  assert.ok(completeTrail(s, specimen));
  const before = parseSave(JSON.stringify(s));
  const again = planCoralCast(CORAL_CAST.trail, true, false, s.trailCompleted[0]);
  assert.equal(again.habitat, 'kelp');
  assert.ok(again.candidates.includes(specimen));
  assert.ok(!planCoralCast(CORAL_CAST.shoal, true, false, true).candidates.includes(specimen));
  assert.ok(!planCoralCast(CORAL_CAST.trail, false, false, true).candidates.includes(specimen));
  const bites = Array.from({length: 1000}, (_, n) => pickBaitFish(again, () => n / 1000));
  assert.equal(bites.filter(id => id === specimen).length, 40);
  const { gain, cm } = settleCatch(s, specimen, true, 'manual', () => 1);
  assert.equal(cm, species[specimen].maxCm);
  assert.equal(gain, salePrice(specimen, cm) * 4);
  assert.equal(completeTrail(s, specimen), false);
  assert.equal(s.maxCm[specimen], cm);
  assert.equal(s.shiny[specimen], 1);
  assert.equal(s.counts[specimen], 2);
  assert.equal(s.gold, before.gold + gain);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});

test('빈 지갑으로 입항해 일반 어종 14마리로 줄을 사고 푸른 해류 보스를 연다', () => {
  const s = fresh();
  s.sea = 1;
  s.unlocked[1] = true;
  s.gold = 0;
  const common = planCurrentCast(CURRENT_CAST.feeding, false);
  for (let i = 0; i < 9; i++) {
    const id = pickBaitFish(common, () => 0);
    assert.equal(species[id].rank, 0);
    settleCatch(s, id, false, 'manual', () => 0);
  }
  assert.ok(s.gold >= seas[1].lineCost);
  assert.ok(buyGear(s, 'line'));
  const deep = planCurrentCast({ x: 530, y: 405 }, s.line[1]);
  assert.equal(deep.layer, 'deep');
  s.layer = deep.layer;
  for (let i = 0; i < 5; i++) {
    const id = pickBaitFish(deep, () => 0);
    assert.equal(species[id].rank, 0);
    settleCatch(s, id, false, 'manual', () => 0);
  }
  assert.equal(bossProgress(s), 14);
  assert.equal(s.caught[1], 14);
  assert.equal(s.counts[10], 14);
  assert.equal(s.deepCaught[1], 5);
  assert.ok(bossReady(s));
  assert.equal(defeatBoss(s), seas[1].reward);
  assert.ok(s.unlocked[2]);
});

test('지난 버전 조사·보스·기록을 이어받아 푸른 해류에서만 추가 조사점을 적립한다', () => {
  const prior = fresh();
  prior.survey[0] = 9;
  prior.coralSurveyBonus = 5;
  prior.bosses[0] = true;
  prior.sea = 1;
  prior.unlocked[1] = prior.line[1] = true;
  prior.deepCaught[1] = 2;
  prior.survey[1] = 9;
  prior.layer = 'deep';
  const {currentSurveyBonus, ...lastVersion} = prior;
  const s = parseSave(JSON.stringify(lastVersion));
  assert.equal(bossProgress(s, 0), 14);
  assert.equal(bossProgress(s), 9);
  assert.deepEqual(s.bosses, prior.bosses);
  assert.deepEqual(s.unlocked, prior.unlocked);
  assert.deepEqual(s.deepCaught, prior.deepCaught);
  assert.equal(settleCatch(s, 11, false, 'net').surveyGain, 0);
  assert.equal(settleCatch(s, 19, false, 'expedition').surveyGain, 0);
  assert.equal(settleCatch(s, 17, false, 'manual').surveyGain, 2);
  assert.equal(settleCatch(s, 19, false, 'manual').surveyGain, 3);
  assert.equal(bossProgress(s), 14);
  assert.equal(s.survey[1], 11);
  assert.equal(s.deepCaught[1], 4);
  assert.equal(bossProgress(s, 0), 14);
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});
