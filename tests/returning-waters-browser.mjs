// Exercise a boss-first old save, then play both seas through their real controls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { buyGear, fresh, KEY, salePrice, seas, settleCatch, species } from '../src/model.ts';
import { mapPoint, playFight } from './play-fight.mjs';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--disable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const $ = selector => page.locator(selector);
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const ready = () => $('#cast-aim:enabled').waitFor();
  const reload = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
  };

  // This older save has earned the first boss but is one deep fish short of a trail.
  const before = fresh();
  for (let i = 0; i < 4; i++) settleCatch(before, 0, false, 'manual');
  assert.ok(buyGear(before, 'line'));
  before.layer = 'deep';
  for (let i = 0; i < 2; i++) settleCatch(before, 5, false, 'manual');
  delete before.coralSurveyBonus;
  delete before.currentSurveyBonus;
  delete before.trailCompleted;
  await page.goto(process.env.ABYSS_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [KEY, before]);
  await reload();
  assert.equal((await saved()).survey[0], 6);
  assert.ok(await $('#boss').isEnabled());
  await $('#boss').click();
  await playFight(page);
  const won = await saved();
  assert.ok(won.bosses[0] && won.unlocked[1]);
  assert.equal(won.deepCaught[0], 2);
  assert.equal(won.trailCompleted[0], false);
  await reload();
  assert.match(await $('#goal').innerText(), /푸른 해류.*출항/);
  assert.match(await $('#coral-specimen').innerText(), /2\s*\/\s*3/);
  assert.ok(await $('#next').isEnabled());
  console.log('산호의 수호자 첫 승리 · 출항 가능 · 선택 표본 2/3마리');
  await $('#goal').click();
  await $('#aim-upstream:visible').waitFor();
  await ready();
  assert.equal((await saved()).sea, 1);

  // Aim at the food itself with the mouse and upstream of the same food with the keyboard.
  async function blueCatch(pool) {
    const beforeBite = await saved();
    await $('#timing-hit').waitFor();
    const name = await $('.fight-card h2').innerText();
    const id = pool.find(i => name.includes(species[i].name));
    assert.notEqual(id, undefined, name);
    await playFight(page);
    const after = await saved();
    assert.equal(after.counts[id], beforeBite.counts[id] + 1);
    assert.equal(after.survey[1], beforeBite.survey[1] + 1);
    assert.equal(after.caught[1], beforeBite.caught[1] + 1);
    assert.equal(after.deepCaught[1], 0);
    await ready();
    return name;
  }
  const feeder = await mapPoint(page, 628, 325);
  await page.mouse.move(feeder.x, feeder.y);
  const pastFood = await $('#cast-readout').innerText();
  await page.mouse.click(feeder.x, feeder.y);
  await $('#bait-cancel').waitFor();
  const passFish = await blueCatch([10, 11]);
  await $('#aim-feeder').click();
  await page.keyboard.press('ArrowLeft');
  assert.equal(await $('#aim-upstream').getAttribute('aria-pressed'), 'true');
  const onFood = await $('#cast-readout').innerText();
  assert.notEqual(onFood, pastFood);
  await page.keyboard.press('Enter');
  await $('#bait-cancel').waitFor();
  const feedingFish = await blueCatch([12, 13, 14]);
  console.log('푸른 해류', pastFood, '→', passFish, '|', onFood, '→', feedingFish);

  // Returning from blue keeps the unlocked departure and the unfinished side objective side by side.
  await $('#prev').click();
  await $('#aim-kelp:visible').waitFor();
  await ready();
  assert.match(await $('#goal').innerText(), /푸른 해류.*출항/);
  await $('#aim-kelp').click();
  await $('#cast-aim').click();
  await playFight(page);
  await ready();
  assert.match(await $('#goal').innerText(), /푸른 해류.*출항/);
  assert.equal(await $('#trail-panel').getAttribute('data-state'), 'ready');
  assert.ok(await $('#next').isEnabled());
  await $('#trail-cast').click();
  await $('.fight-card h2').filter({hasText:'분홍해마'}).waitFor();

  // Only the edge-case specimen sizes and its rare natural return use controlled randomness.
  async function fixedRoll(value) {
    await page.evaluate(value => {
      window.originalEncounterRng ??= Math.random;
      Math.random = () => value;
    }, value);
  }
  async function randomRolls() {
    await page.evaluate(() => { Math.random = window.originalEncounterRng; });
  }
  await fixedRoll(0);
  await playFight(page);
  await randomRolls();
  await ready();
  const id = seas[0].trailId, fish = species[id], stamped = await saved();
  assert.equal(stamped.trailCompleted[0], true);
  assert.equal(stamped.counts[id], 1);
  assert.equal(stamped.maxCm[id], fish.minCm);
  assert.equal(stamped.shiny[id], 0);
  assert.equal(stamped.deepCaught[0], 4);
  await reload();

  await $('#aim-kelp').click();
  // A rare post-registration kelp roll, followed by the independent golden roll.
  await fixedRoll(0);
  await $('#cast-aim').dblclick();
  await $('.fight-card h2').filter({hasText:'분홍해마'}).waitFor();
  assert.match(await $('.fight-card h2').innerText(), /황금/);
  assert.doesNotMatch(await $('.fight-card .eyebrow').innerText(), /표본 추적/);
  await fixedRoll(0.999999);
  await playFight(page);
  await randomRolls();
  const repeat = await saved(), receipt = await $('#toast').innerText();
  assert.equal(repeat.counts[id], stamped.counts[id] + 1);
  assert.equal(repeat.maxCm[id], fish.maxCm);
  assert.equal(repeat.shiny[id], 1);
  assert.equal(repeat.survey[0], stamped.survey[0] + 1);
  assert.equal(repeat.deepCaught[0], stamped.deepCaught[0] + 1);
  assert.deepEqual(repeat.trailCompleted, stamped.trailCompleted);
  const sale = salePrice(id, fish.maxCm, true);
  assert.ok(receipt.includes('자동 판매 ' + sale + ' G'), receipt);
  assert.doesNotMatch(receipt, /관찰 표본 기록/);
  const extra = Number(receipt.match(/추가 ([\d,]+) G/)?.[1].replaceAll(',', '') || 0);
  const bonus = Number(receipt.match(/Lv\.\d+! \+([\d,]+) G/)?.[1].replaceAll(',', '') || 0);
  assert.equal(repeat.gold - stamped.gold, sale + extra + bonus);
  await reload();
  assert.deepEqual(await saved(), repeat);
  assert.ok(await $('#trail-cast').isDisabled());
  await $('#book').click();
  const card = $('.fish-card').filter({hasText:fish.name});
  assert.match(await card.innerText(), new RegExp('최대 ' + fish.maxCm + ' cm.*포획 2마리'));
  assert.equal(await card.getByText('✓ 해역 관찰 표본', {exact:true}).count(), 1);
  assert.equal(await card.getByTitle('발견한 황금 변종').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS 구형 저장의 보스 우선 승리·출항·귀항, 뒤늦은 표본 등록, 해초밭 일반 인카운터의 황금 재포획', receipt);
} finally {
  await browser.close();
}
