import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CORAL_CAST, bossProgress, bossReady, buyGear, coralTrailVisible, fresh, parseSave,
  pickCoralFish, planCoralCast, seas, settleCatch, species,
} from '../src/model.ts';

test('같은 해초밭을 겨누면 첫 판매로 산 줄이 착수점과 입질 어종을 바꾼다', () => {
  const s = fresh();
  const first = planCoralCast(CORAL_CAST.kelp, s.line[0], false);
  assert.equal(first.clipped, true);
  assert.equal(first.distance, 100);
  assert.equal(first.habitat, 'edge');
  assert.equal(first.layer, 'shallow');
  assert.ok(first.candidates.every(id => species[id].rank < 2));
  const atEdge = planCoralCast(first.landing, true, false);
  assert.deepEqual(atEdge.candidates, first.candidates);
  assert.equal(atEdge.habitat, first.habitat);

  const { gain } = settleCatch(s, pickCoralFish(first, () => 0), false, 'manual', () => 0);
  assert.equal(gain, 20);
  assert.equal(s.gold, 120);
  assert.ok(buyGear(s, 'line'));
  assert.equal(s.gold, 0);
  const second = planCoralCast(CORAL_CAST.kelp, s.line[0], false);
  assert.equal(second.range, 200);
  assert.equal(second.clipped, false);
  assert.deepEqual(second.landing, first.aim);
  assert.equal(second.habitat, 'kelp');
  assert.equal(second.layer, 'deep');
  assert.ok(second.candidates.every(id => seas[0].deep.includes(id) && !seas[0].shallow.includes(id)));
  assert.ok(!second.candidates.includes(seas[0].trailId));
  assert.equal(planCoralCast(CORAL_CAST.shoal, true, true).layer, 'shallow');
});

test('수면 안에서 실제 줄 길이를 지키고 빗나간 짧은 줄에도 일반 어종이 남는다', () => {
  for (const upgraded of [false, true]) {
    for (let x = 0; x <= 960; x += 60) {
      for (let y = 0; y <= 600; y += 40) {
        const cast = planCoralCast({ x, y }, upgraded, true);
        const meters = Math.hypot(cast.landing.x - CORAL_CAST.origin.x,
          cast.landing.y - CORAL_CAST.origin.y) / CORAL_CAST.pixelsPerMeter;
        assert.ok(cast.landing.y > 126 && cast.landing.y < 600);
        assert.ok(Math.abs(meters - cast.distance) < 1e-9);
        assert.ok(meters <= cast.range + 1e-9);
        assert.ok(cast.candidates.length > 0);
        assert.ok(cast.candidates.every(id => seas[0][cast.layer].includes(id)));
        if (!upgraded) {
          assert.equal(cast.layer, 'shallow');
          if (cast.clipped) assert.ok(cast.candidates.every(id => species[id].rank < 2));
        }
      }
    }
  }
});

test('기본 라운드 수만큼 산호해 조사점을 받고 실제 마릿수로 표본을 연다', () => {
  const s = fresh();
  s.line[0] = true;
  assert.equal(settleCatch(s, 0, false, 'manual').surveyGain, 1);
  s.layer = 'deep';
  assert.equal(settleCatch(s, 5, false, 'manual').surveyGain, 2);
  assert.equal(settleCatch(s, 9, false, 'manual').surveyGain, 3);
  assert.equal(bossReady(s), true);
  assert.equal(bossProgress(s), 6);
  assert.equal(s.survey[0], 3);
  assert.equal(s.caught[0], 3);
  assert.equal(s.deepCaught[0], 2);
  assert.equal(settleCatch(s, 1, true, 'net').surveyGain, 0);
  assert.equal(settleCatch(s, 9, false, 'expedition').surveyGain, 0);
  assert.equal(s.deepCaught[0], 2);
  assert.equal(coralTrailVisible(s), false);
  assert.equal(planCoralCast(CORAL_CAST.trail, true, coralTrailVisible(s)).habitat, 'kelp');
  settleCatch(s, 1, false, 'manual');
  s.layer = 'shallow';
  assert.equal(coralTrailVisible(s), true);
  const trace = planCoralCast(CORAL_CAST.trail, true, coralTrailVisible(s));
  assert.equal(trace.habitat, 'trail');
  assert.deepEqual(trace.candidates, [seas[0].trailId]);
  assert.equal(planCoralCast(CORAL_CAST.kelp, true, true).habitat, 'kelp');
  assert.notEqual(planCoralCast(CORAL_CAST.trail, false, true).habitat, 'trail');
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
});

test('기존 조사량과 보스·해역을 보존하고 다른 해역의 수동 포획은 1씩 센다', () => {
  const old = fresh();
  old.survey[0] = 8;
  old.line[0] = true;
  old.deepCaught[0] = 4;
  old.bosses[0] = old.unlocked[1] = true;
  const { coralSurveyBonus, ...previous } = old;
  const s = parseSave(JSON.stringify(previous));
  assert.equal(bossProgress(s), 8);
  assert.deepEqual(s.bosses, old.bosses);
  assert.deepEqual(s.unlocked, old.unlocked);
  assert.deepEqual(s.deepCaught, old.deepCaught);
  assert.equal(bossReady(s), true);
  s.sea = 1;
  s.layer = 'deep';
  s.line[1] = true;
  assert.equal(settleCatch(s, 19, false, 'manual').surveyGain, 1);
  assert.equal(bossProgress(s), 1);
  assert.equal(bossProgress(s, 0), 8);
});
