import {test} from 'node:test';
import assert from 'node:assert/strict';
import {species,fresh,recordCatch,parseSave,upgrade,upgradePrice,canTravel,defeatBoss,claimResearch,fishingRules,comboBonus,pickFish} from '../src/model.ts';

for(const fish of species){
 for(const variant of [false,true]){
  test(`${fish.name}: ${variant?'변종':'일반'} 포획 후 저장 복원·도감·서식지 기록 일치`,()=>{
   const s=fresh(),before=s.gold;recordCatch(s,fish.id,variant);
   const restored=parseSave(JSON.stringify(s));
   assert.equal(restored.counts.reduce((a,b)=>a+b,0),1);
   assert.equal(restored.counts[fish.id],1);
   assert.equal(restored.caught.reduce((a,b)=>a+b,0),1);
   assert.equal(restored.caught[fish.sea],1);
   assert.equal(restored.shiny.reduce((a,b)=>a+b,0),variant?1:0);
   assert.equal(restored.gold,s.gold);
   assert.ok(s.gold>before);
   assert.equal(restored.bosses.filter(Boolean).length,0);
   assert.equal(restored.claimed.filter(Boolean).length,0);
  });
 }
}
test('전체 항해: 5개 해역 도달, 강화, 연구, 보스 재도전이 서로 기록을 훼손하지 않음',()=>{
 const s=fresh();
 for(let sea=0;sea<5;sea++){
  assert.equal(canTravel(s,sea),true);s.sea=sea;
  for(let n=0;n<10;n++)recordCatch(s,sea*10+n);
  assert.ok(claimResearch(s)>0);assert.equal(claimResearch(s),0);
  const beforeBoss=s.gold;const reward=defeatBoss(s);assert.ok(reward>0);
  for(let replay=0;replay<5;replay++)assert.equal(defeatBoss(s),0);
  assert.equal(s.gold,beforeBoss+reward);
  if(sea<4){
   // Additional fishing funds the later equipment tiers without artificial currency.
   while(s.gold<upgradePrice(s,'rod')+upgradePrice(s,'boat'))recordCatch(s,sea*10+5);
   assert.equal(upgrade(s,'rod'),true);assert.equal(upgrade(s,'boat'),true);
   assert.equal(canTravel(s,sea+1),true);
  }
  assert.deepEqual(parseSave(JSON.stringify(s)),s);
 }
 assert.equal(s.bosses.filter(Boolean).length,5);
 assert.equal(s.counts.filter(n=>n>0).length,50);
});
test('희귀도가 높을수록 모든 해역에서 라운드와 이동 난도가 증가함',()=>{
 for(let sea=0;sea<5;sea++)for(let rank=1;rank<5;rank++){
  const previous=fishingRules(rank-1,sea,0),current=fishingRules(rank,sea,0);
  assert.ok(current.rounds>previous.rounds);assert.ok(current.zone<previous.zone);
  assert.ok(current.speed>previous.speed);assert.ok(current.holdSeconds>previous.holdSeconds);
 }
});
test('장비 강화는 각 희귀도에서 포획 구역을 넓힘',()=>{
 for(let rank=0;rank<5;rank++)for(let level=1;level<5;level++)assert.ok(fishingRules(rank,0,level).zone>=fishingRules(rank,0,level-1).zone);
});
test('연속 포획 추가 보상은 50% 상한이며 첫 포획에는 추가 지급하지 않음',()=>{
 assert.equal(comboBonus(100,1),0);assert.equal(comboBonus(100,2),5);
 assert.equal(comboBonus(100,11),50);assert.equal(comboBonus(100,10000),50);
});
test('심해의 희귀종 출현 이점이 실제 어종 추첨에 반영됨',()=>{
 const rolls=[.33,.59,.82,.96];
 for(const roll of rolls){let step=0;const sample=()=>step++===0?roll:0;const deep=species[pickFish(2,sample)];step=0;const surface=species[pickFish(0,sample)];assert.ok(deep.rank>surface.rank);}
});
test('불법 이동과 보스 미해금 상태는 저장 가져오기에서도 정상화됨',()=>{
 const s=fresh();s.sea=4;s.rod=4;s.boat=4;assert.equal(parseSave(JSON.stringify(s)).sea,0);
});
