import Phaser from 'phaser';
import {fishArt, boatArt} from './art';
import {bossArt} from './effects';
import {CORAL_CAST, CURRENT_CAST, planCoralCast, planCurrentCast, pickBaitFish, species, seas, pickFish, type CastPoint, type BaitCast} from './model';
import {goldenChance, type Layer} from './catalog';

type Swimmer = {
 sprite: Phaser.GameObjects.Image;
 id: number;
 shiny: boolean;
 layer: Layer;
 speed: number;
 baseY: number;
 phase: number;
 patrol?: {center: number; radius: number};
};
type BiteHandler = (id: number, shiny: boolean, x: number, y: number) => void;
type Bait = {
 plan: BaitCast;
 elapsed: number;
 onBite: BiteHandler;
 approach?: {
  fish: Swimmer;
  from: CastPoint;
  initialAlpha: number;
  initialDepth: number;
  mouthOffset: number;
  duration: number;
  visitor: boolean;
 };
};
// Resident schools leave a clear corridor through the centre of each marked fishing spot.
const shoalSchool = [
 {id: 0, x: 263, y: 252}, {id: 2, x: 183, y: 292}, {id: 3, x: 425, y: 325},
 {id: 4, x: 457, y: 217}, {id: 0, x: 616, y: 332}, {id: 1, x: 723, y: 298},
];
const kelpSchool = [{id: 5, x: 723, y: 467}, {id: 7, x: 878, y: 487}];
const channelSchool = [
 {id:10,x:840,y:334},{id:11,x:393,y:252},{id:11,x:762,y:281},
 {id:12,x:582,y:283},{id:13,x:686,y:376},{id:14,x:552,y:378},
];
const deepCurrentSchool = [
 {id:10,x:558,y:443},{id:11,x:654,y:412},{id:15,x:437,y:490},
 {id:17,x:778,y:424},{id:18,x:871,y:483},
];
const currentTravelSeconds = 1.2;
const waterline = CORAL_CAST.waterline;
const travelSeconds = .48;
export class Ocean extends Phaser.Scene {
 onReady:()=>void=()=>{};
 layer: "deep"|"shallow"="shallow"; sea=0; locked=false; swimmers:Swimmer[]=[];
 onFishHover:(id:number|null,shiny?:boolean)=>void=()=>{};
 onFish:(id:number,shiny:boolean,x:number,y:number,layer?:Layer)=>void=()=>{};
 onAim:(plan:BaitCast)=>void=()=>{};
 onCast:(plan:BaitCast)=>void=()=>{};
 private castingEnabled=false;
 private coralSpecimenRecorded=false;
 private aimSea=-1;
 private upgraded=false;
 private trailReady=false;
 private revealSeconds=0;
 private lastWaterFrame=-1;
 private aim:CastPoint={...CORAL_CAST.kelp};
 private preview:BaitCast=planCoralCast(this.aim,false,false);
 private guide!:Phaser.GameObjects.Graphics;
 private waterArt!:Phaser.GameObjects.Graphics;
 private upstreamOrShoalLabel!:Phaser.GameObjects.Text;
 private feedingOrKelpLabel!:Phaser.GameObjects.Text;
 private trailLabel!:Phaser.GameObjects.Text;
 private landingLabel!:Phaser.GameObjects.Text;
 private deepFeedingLabel!:Phaser.GameObjects.Text;
 private shadows:Phaser.GameObjects.Image[]=[];
 private bait?:Bait;
 private hooked?:Swimmer;
 private get coral(){return this.sea===0 && this.castingEnabled;}
 private get current(){return this.sea===1 && this.castingEnabled;}
 private get aiming(){return this.coral || this.current;}
 bg!:Phaser.GameObjects.Graphics; decor!:Phaser.GameObjects.Graphics; line!:Phaser.GameObjects.Graphics;
 boat!:Phaser.GameObjects.Image; rod!:Phaser.GameObjects.Graphics;
 bubbles:{x:number;y:number;r:number;s:number}[]=[];
 boss?:Phaser.GameObjects.Image; bossLabel?:Phaser.GameObjects.Text;
 boatLevel=0;rodLevel=0;bossCleared=false;
 constructor(){super('ocean');}
 create(){
  this.bg=this.add.graphics();this.decor=this.add.graphics();this.line=this.add.graphics().setDepth(20);
  for(let level=0;level<5;level++){
   const art=boatArt(),g=art.getContext('2d')!;
   if(level>0){g.fillStyle=['','#668e88','#83aeb0','#9693bb','#e4c378'][level];g.fillRect(20,58,85,7);g.fillRect(30,20,47,4);for(let i=0;i<level;i++){g.fillStyle='#d9e5b6';g.fillRect(24+i*14,52,6,3);}if(level>1){g.fillStyle='#3f626e';g.fillRect(19,38,9,10);g.fillRect(18,32,11,5);}if(level>2){g.fillStyle='#c8d9cb';g.fillRect(52,9,3,12);g.fillRect(43,7,22,3);}if(level===4){g.fillStyle='#ebd89d';g.fillRect(67,13,4,7);g.fillRect(63,10,12,3);}}
   this.textures.addCanvas('boat'+level,art);
  }
  for(const f of species){this.textures.addCanvas('f'+f.id,fishArt(f.shape,f.hue));this.textures.addCanvas('s'+f.id,fishArt(f.shape,f.hue,true));}
  for(const f of kelpSchool){
   const art=fishArt(species[f.id].shape,species[f.id].hue),ctx=art.getContext('2d')!;
   ctx.globalCompositeOperation='source-in';ctx.fillStyle='#103e4b';ctx.fillRect(0,0,art.width,art.height);
   this.textures.addCanvas('shadow'+f.id,art);
  }
  for(let i=0;i<seas.length;i++)this.textures.addCanvas('boss'+i,bossArt(i));
  this.boat=this.add.image(405,120,'boat0').setScale(1.5).setDepth(10);this.rod=this.add.graphics().setDepth(11);
  this.bubbles=Array.from({length:45},(_,i)=>({x:(i*137)%960,y:(i*91)%600,r:1+i%3,s:6+i%7}));
  this.guide=this.add.graphics().setDepth(7);
  this.waterArt=this.add.graphics().setDepth(2);
  this.upstreamOrShoalLabel=this.mapLabel(312,206,'얕은 여울','#e2fff0');
  this.feedingOrKelpLabel=this.mapLabel(762,531,'깊은 해초밭','#c2e8ce');
  this.trailLabel=this.mapLabel(CORAL_CAST.trail.x, CORAL_CAST.trail.y+28,'말린 꼬리 흔적','#ffd2ba');
  this.deepFeedingLabel=this.mapLabel(CURRENT_CAST.deepFeeding.x,CURRENT_CAST.deepFeeding.y+52,'깊은 먹이터','#c1d9f7');
  this.landingLabel=this.mapLabel(0,0,'','#ffe4a4').setOrigin(0, 0.5);
  // The text sits clear of its water marker. Clicking the name should still cast at the named spot.
  this.targetLabel(this.upstreamOrShoalLabel,()=>this.current?CURRENT_CAST.upstream:CORAL_CAST.shoal);
  this.targetLabel(this.feedingOrKelpLabel,()=>this.current?CURRENT_CAST.feeding:CORAL_CAST.kelp);
  this.targetLabel(this.deepFeedingLabel,()=>CURRENT_CAST.deepFeeding);
  this.targetLabel(this.trailLabel,()=>CORAL_CAST.trail);
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{
   if(this.aiming && !this.locked && !pointer.wasTouch && pointer.y>=waterline && (!over.length || this.pointsAtTrail(pointer)))this.aimAt(pointer);
  });
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{
   if(!this.aiming || this.locked || pointer.y<waterline || (over.length && !this.pointsAtTrail(pointer)))return;
   this.aimAt(pointer);
   if(!pointer.wasTouch)this.castAim();
  });
  this.setSea(this.sea);this.game.canvas.style.cursor='default';this.onReady();
 }
 setEquipment(rod:number,boat:number){this.rodLevel=rod;this.boatLevel=boat;if(this.boat)this.boat.setTexture('boat'+boat);}
 setSea(n:number){
  if(this.aimSea!==n && n<=1){
   this.aim=n===0?{...CORAL_CAST.kelp}:{...CURRENT_CAST.feeding};
   this.aimSea=n;
  }
  this.cancelBait();this.releaseHook();this.sea=n;this.onFishHover(null);if(!this.bg)return;this.tweens.killAll();this.line.clear();
  this.children.list.filter(c=>c.getData('temporary')).forEach(c=>c.destroy());
  this.boss?.destroy();this.bossLabel?.destroy();this.boss=undefined;this.bossLabel=undefined;
  this.populate();
  this.cameras.main.fadeIn(650,0,4,12);
 }
 drawBackground(){
  const g=this.bg;g.clear();const sea=this.sea;
  const top=[0x4fabb9,0x145982,0x102c4a,0x1e2638,0x0b122b][sea],bottom=[0x0d435b,0x092d4b,0x09172f,0x11182b,0x050b1d][sea];
  for(let y=0;y<600;y+=4){const a=Phaser.Display.Color.IntegerToColor(top),b=Phaser.Display.Color.IntegerToColor(bottom),c=Phaser.Display.Color.Interpolate.ColorWithColor(a,b,600,y);g.fillStyle(Phaser.Display.Color.GetColor(c.r,c.g,c.b));g.fillRect(0,y,960,4);}
  const polygon=(p:number[][],color:number,alpha=1)=>{g.fillStyle(color,alpha);g.fillPoints(p.map(a=>new Phaser.Math.Vector2(a[0],a[1])),true);};
  if(sea===0){
   g.fillStyle(0x9dd6da);g.fillRect(0,0,960,126);g.fillStyle(0xf3e3ac);g.fillRect(747,26,38,38);
   for(const [x,y,w] of [[40,31,100],[255,57,125],[570,20,92]]){g.fillStyle(0xe8efdc,.6);g.fillRect(x,y,w,7);g.fillRect(x+17,y-8,w/2,10);}
   polygon([[0,126],[0,94],[32,94],[32,76],[78,76],[78,62],[125,62],[125,89],[167,89],[167,113],[220,126]],0x487b78);
   polygon([[830,126],[855,109],[855,81],[884,81],[884,65],[912,65],[912,89],[960,89],[960,126]],0x4f8179);
   for(let i=0;i<6;i++){g.fillStyle(0x36746d);g.fillRect(22+i*24,75-(i%3)*9,5,38);g.fillRect(13+i*24,75-(i%3)*9,22,5);}
  }else{
   g.fillStyle(0x020d20,.25);g.fillRect(0,0,960,145);
   polygon([[0,0],[62,0],[88,78],[64,131],[95,238],[62,351],[80,515],[0,600]],sea===3?0x28283b:0x102339);
   polygon([[960,0],[902,0],[881,94],[908,162],[878,280],[900,442],[867,600],[960,600]],0x102038);
   if(sea===1){for(let i=0;i<8;i++){g.fillStyle(0x7dbec8,.08);g.fillRect(0,180+i*45,960,2);}}
   if(sea===2){for(let i=0;i<7;i++){const x=30+i*145,y=310+i%3*46;g.fillStyle(0x142f43);g.fillRect(x,y,44,600-y);g.fillRect(x-7,y+14,58,11);g.fillStyle(0x477b76,.55);g.fillRect(x-3,y-4,51,8);g.fillRect(x+9,y+65,8,49);}g.fillStyle(0x71d1c4,.15);g.fillRect(705,116,36,10);g.fillRect(712,108,20,8);}
  }
  for(let i=0;i<4;i++){const x=160+i*200;polygon([[x,sea?0:126],[x+30,sea?0:126],[x+150,560],[x+50,560]],0x9fdac9,sea>2?.015:.045);}
  for(let i=0;i<32;i++){const y=548+(i*37)%35;g.fillStyle(i%2?0x12313c:0x102a36);g.fillRect(i*32,y,36,600-y);g.fillStyle(0x244451,.7);g.fillRect(i*32+2,y,28,4);}
  for(let i=0;i<24;i++){const x=(i*157)%960,y=550+(i*23)%31;g.fillStyle([0x3e8b80,0x527c80,0x485d88,0x8c686c,0x48649b][sea],.8);g.fillRect(x,y-13,5,31);g.fillRect(x-8,y-23,4,21);g.fillRect(x+8,y-32,5,31);g.fillRect(x-8,y-4,20,4);if(i%3===0){g.fillStyle(sea<2?0xc78f88:0x84c2cc,.65);g.fillRect(x+17,y+3,14,5);g.fillRect(x+21,y-4,5,16);}}
  if(sea===3){for(let i=0;i<4;i++){const x=115+i*220;g.fillStyle(0x382f3c);g.fillRect(x,443-i%2*25,30,130);g.fillStyle(0x694d53);g.fillRect(x-7,441-i%2*25,44,9);g.fillStyle(0xe2a16b,.6);g.fillRect(x+3,444-i%2*25,24,3);}}
  if(sea===4){polygon([[330,600],[360,489],[390,489],[418,600]],0x142039);polygon([[610,600],[640,473],[677,473],[708,600]],0x142039);g.fillStyle(0xa2b6ff,.12);g.fillCircle(490,490,55);g.fillStyle(0x9fd9e4,.8);g.fillRect(484,486,9,9);}
  if(!this.coral && this.layer==="deep"){g.fillStyle(0x061633,.32);g.fillRect(0,135,960,465);}
  if(this.coral)this.drawShoal();
  this.boat.setTint(sea>1?0xa8c1ce:0xffffff);
 }
 private mapLabel(x:number,y:number,value:string,color:string){
  return this.add.text(x,y,value,{fontFamily:'sans-serif',fontSize:'17px',fontStyle:'bold',color,
   backgroundColor:'#123640',padding:{x:7,y:3}}).setOrigin(.5).setDepth(9).setVisible(false);
 }
 private targetLabel(label:Phaser.GameObjects.Text, point:()=>CastPoint){
  label.setInteractive();
  label.on('pointerover',(pointer:Phaser.Input.Pointer)=>{
   if(!this.locked && !pointer.wasTouch)this.aimAt(point());
  });
  label.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
   if(this.locked)return;
   this.aimAt(point());
   if(!pointer.wasTouch)this.castAim();
  });
 }
 private populate(){
  this.swimmers.forEach(f=>f.sprite.destroy());this.swimmers=[];
  this.shadows.forEach(s=>s.destroy());this.shadows=[];
  this.lastWaterFrame=-1;this.waterArt.clear();this.drawBackground();
  if(this.coral){
   shoalSchool.forEach(f=>this.resident(f.id,f.x,f.y,'shallow'));
   this.populateKelp();
  }else if(this.current)this.populateCurrent();
  else for(let i=0;i<10;i++)this.spawn(65+i*88,235+(i*61)%260);
  if(this.current){
   this.upstreamOrShoalLabel.setPosition(CURRENT_CAST.upstream.x,CURRENT_CAST.upstream.y-56).setText('상류');
   this.feedingOrKelpLabel.setPosition(CURRENT_CAST.feeding.x,CURRENT_CAST.feeding.y+51).setText('먹이터');
  }else{
   this.upstreamOrShoalLabel.setPosition(312,206).setText('얕은 여울');
   this.feedingOrKelpLabel.setPosition(762,531).setText('깊은 해초밭');
  }
  this.upstreamOrShoalLabel.setVisible(this.aiming);this.feedingOrKelpLabel.setVisible(this.aiming);
  this.trailLabel.setVisible(this.coral && this.trailReady);
  this.deepFeedingLabel.setVisible(this.current && this.upgraded);
  this.aimAt(this.aim);
 }
 private populateCurrent(){
  for(const f of channelSchool)this.resident(f.id,f.x,f.y,'shallow');
  if(this.upgraded)for(const f of deepCurrentSchool)this.resident(f.id,f.x,f.y,'deep');
 }
 private populateKelp(){
  for(const f of kelpSchool){
   if(this.upgraded){
    this.resident(f.id,f.x,f.y,'deep');
   }else{
    const shadow=this.add.image(f.x,f.y,'shadow'+f.id).setScale(1.05).setAlpha(.37).setDepth(1);
    this.shadows.push(shadow);
   }
  }
 }
 private resident(id:number,x:number,y:number,layer:Layer){
  const fish=this.makeFish(id,Math.random()<goldenChance,x,y,layer);
  fish.patrol={center:x,radius:layer==='deep'?16:28};
  // Fronds cover the deep school until a bait draws a fish out into the light.
  if(this.coral && layer==='deep')fish.sprite.setDepth(1).setAlpha(.30);
  this.swimmers.push(fish);
  return fish;
 }
 private makeFish(id:number,shiny:boolean,x:number,y:number,layer:Layer):Swimmer{
  const sprite=this.add.image(x,y,(shiny?'s':'f')+id).setScale(.9+species[id].rank*.12);
  // Check opaque pixels, so the empty margins of a fish do not intercept casts onto the water.
  sprite.setInteractive(this.aiming?{pixelPerfect:true}:undefined);
  if(this.aiming)sprite.setDepth(3);
  const swimmer:Swimmer={sprite,id,shiny,layer,speed:(Math.random()<.5?-1:1)*(12+Math.random()*18)*(this.sea===1?1.3:1),baseY:y,phase:Math.random()*7};
  sprite.setFlipX(swimmer.speed<0);
  sprite.on('pointerover',()=>{if(!this.locked)this.onFishHover(id,shiny);});
  sprite.on('pointerout',()=>this.onFishHover(null));
  sprite.on('pointerdown',(p:Phaser.Input.Pointer)=>{
   if(this.locked || this.pointsAtTrail(p))return;
   this.releaseHook();
   if(this.aiming){this.hooked=swimmer;sprite.setDepth(3).setAlpha(1);}
   this.onFish(id,shiny,sprite.x,sprite.y,this.aiming?layer:undefined);
  });
  return swimmer;
 }
 spawn(x?:number,y?:number){
  const id=pickFish(this.sea,this.layer);
  this.swimmers.push(this.makeFish(id,Math.random()<goldenChance,x??Phaser.Math.Between(60,890),y??Phaser.Math.Between(215,510),this.layer));
 }
 setCastingState(enabled:boolean,upgraded:boolean,trailReady:boolean,coralSpecimenRecorded:boolean){
  const modeChanged=this.castingEnabled!==enabled;
  const gearChanged=this.upgraded!==upgraded;
  const trailChanged=this.trailReady!==trailReady;
  const recordedChanged=this.coralSpecimenRecorded!==coralSpecimenRecorded;
  if(!modeChanged && !gearChanged && !trailChanged && !recordedChanged)return;
  this.castingEnabled=enabled;
  this.upgraded=upgraded;
  this.trailReady=trailReady;
  this.coralSpecimenRecorded=coralSpecimenRecorded;
  if(trailChanged)this.revealSeconds=trailReady?3.4:0;
  if(!this.bg || this.sea>1)return;
  if(modeChanged || (gearChanged && (!upgraded || this.current))){this.populate();return;}
  if(this.coral && gearChanged){
   this.shadows.forEach(s=>s.destroy());this.shadows=[];
   this.populateKelp();
  }
  this.trailLabel.setVisible(this.coral && trailReady);
  this.aimAt(this.aim);
 }
 private pointsAtTrail(p:CastPoint){
  return this.coral && this.trailReady && Math.hypot(p.x-CORAL_CAST.trail.x,p.y-CORAL_CAST.trail.y)<=CORAL_CAST.trailRadius;
 }
 aimAt(point:CastPoint){
  this.aim={x:point.x,y:point.y};
  this.preview=this.current
   ? planCurrentCast(this.aim,this.upgraded)
   : planCoralCast(this.aim,this.upgraded,this.trailReady,this.coralSpecimenRecorded);
  if(this.guide)this.drawPreview();
  if(this.aiming)this.onAim(this.preview);
 }
 castAim(){if(this.aiming && !this.locked && !this.bait && this.bg)this.onCast(this.preview);}
 private drawPreview(){
  const g=this.guide.clear();this.landingLabel.setVisible(false);
  if(!this.aiming)return;
  const {aim,landing,range,distance,clipped,driftEnd}=this.preview;
  const geometry=this.current?CURRENT_CAST:CORAL_CAST;
  const origin=geometry.origin;
  const r=range*geometry.pixelsPerMeter;
  g.lineStyle(2,0xbbeecb,.43);
  for(let deg=0;deg<180;deg+=3){
   const a=Phaser.Math.DegToRad(deg),b=Phaser.Math.DegToRad(deg+1.4),y=origin.y+r*Math.sin(a);
   if(y>=waterline)g.lineBetween(origin.x+r*Math.cos(a),y,origin.x+r*Math.cos(b),origin.y+r*Math.sin(b));
  }
  const dashed=(from:CastPoint,to:CastPoint,color:number,alpha:number)=>{
   const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy);
   g.lineStyle(2,color,alpha);
   for(let d=0;d<len;d+=12){const end=Math.min(len,d+5);g.lineBetween(from.x+dx*d/len,from.y+dy*d/len,from.x+dx*end/len,from.y+dy*end/len);}
  };
  dashed(origin,landing,0xf6e6b8,.72);
  if(clipped){
   dashed(landing,aim,0xb3d1d4,.52);
   g.lineStyle(2,0xc5dddf,.8).strokeRect(aim.x-6,aim.y-6,12,12);
  }
  if(this.current){
   // The gold mark is the splash. The blue arrow ends where the fish will actually bite.
   dashed(landing,driftEnd,0x8feafa,.95);
   const angle=Math.atan2(driftEnd.y-landing.y,driftEnd.x-landing.x);
   g.lineStyle(3,0xa8e9ff).strokeCircle(driftEnd.x,driftEnd.y,7);
   const endX=driftEnd.x-11*Math.cos(angle),endY=driftEnd.y-11*Math.sin(angle);
   for(const spread of [-.52,.52]){
    g.lineBetween(endX,endY,endX-11*Math.cos(angle+spread),endY-11*Math.sin(angle+spread));
   }
  }
  const color=this.preview.habitat==='trail'?0xffb9ae:0xffda84;
  g.lineStyle(2,0x143a42,.9).strokeCircle(landing.x,landing.y,10);
  g.lineStyle(2,color).strokeCircle(landing.x,landing.y,8);
  g.fillStyle(color).fillRect(landing.x-2,landing.y-2,4,4);
  const label=this.landingLabel.setText(`착수 ${Math.round(distance)} m / 줄 ${range} m`).setOrigin(0,.5);
  const right=landing.x+14;
  const labelX=right+label.width>954 ? landing.x-14-label.width : right;
  // Keep the readout inside the sea, above the marker and clear of the specimen clue.
  const labelLeft=Phaser.Math.Clamp(labelX,6,954-label.width);
  let labelY=landing.y-16;
  for(const name of [this.upstreamOrShoalLabel,this.feedingOrKelpLabel,this.trailLabel,this.deepFeedingLabel]){
   if(!name.visible)continue;
   const overlapsX=labelLeft<name.x+name.width/2 && labelLeft+label.width>name.x-name.width/2;
   if(overlapsX && Math.abs(labelY-name.y)<(name.height+label.height)/2+3)labelY=name.y-name.height/2-label.height/2-4;
  }
  label.setPosition(labelLeft,labelY).setVisible(!this.locked);
  g.setVisible(!this.locked);
 }
 private drawShoal(){
  const g=this.bg;
  // A stepped shelf puts pale sand in the light and casts a cool shadow below the lip.
  const shelf=[[30,405],[30,365],[89,365],[89,341],[161,341],[161,329],[280,329],[280,336],[359,336],[359,350],[425,350],[425,371],[477,371],[477,408],[434,408],[434,430],[334,430],[334,442],[125,442],[125,425],[64,425],[64,405]];
  g.fillStyle(0x285d60).fillPoints(shelf.map(([x,y])=>new Phaser.Math.Vector2(x,y)),true);
  for(const [x,y,w] of [[30,363,61],[89,339,73],[161,327,120],[280,334,81],[359,348,68],[425,369,51]]){
   g.fillStyle(0x80aaa0).fillRect(x,y+6,w,8);g.fillStyle(0xc4c399).fillRect(x,y,w,6);
   g.fillStyle(0xd7d2a7).fillRect(x+10,y-3,w*.4,3);
  }
  for(let i=0;i<19;i++){
   const x=56+(i*61)%392,y=374+(i*13)%40;
   g.fillStyle(i%3?0x417676:0x63908a).fillRect(x,y,9+(i%4)*4,3);
  }
  // Branching coral clusters on the shelf and a smaller outcrop at the 100 m landing.
  for(const [x,y,h] of [[105,339,27],[139,339,16],[289,334,22],[408,348,16],[663,370,15],[682,370,9]]){
   g.fillStyle(0xb57672).fillRect(x,y-h,6,h).fillRect(x-8,y-h*.67,10,5).fillRect(x+4,y-h*.48,10,5);
   g.fillStyle(0xe4a38a).fillRect(x-9,y-h*.67-7,5,9).fillRect(x+10,y-h*.48-7,5,9).fillRect(x+1,y-h-3,4,9);
  }
  for(const [x,y,w,h] of [[647,382,70,7],[688,388,37,12],[709,397,33,13],[728,408,28,14],[618,372,88,10],[632,366,58,9],[684,376,43,8],[595,543,68,45],[646,532,111,51],[712,522,139,64],[806,529,99,58],[885,539,69,43]]){
   g.fillStyle(0x214951).fillRect(x,y,w,h);g.fillStyle(0x4a7871).fillRect(x+5,y-3,w-13,5);
  }
 }
 private drawCurrent(t:number){
  const g=this.waterArt.clear();
  const {upstream,feeding,deepFeeding,drift}=CURRENT_CAST;
  const slope=drift.y/drift.x;
  // Carry bubbles and their short wake along the same current as the actual bait.
  for(let i=0;i<45;i++){
   const x=(i*109+t*(72+i%4*9))%1030-35;
   const lane=upstream.y+((i%7)-3)*52;
   const y=lane+(x-upstream.x)*slope+Math.sin(t*.8+i)*3;
   if(y<waterline || y>548)continue;
   const opacity=i%7===3?.7:.3;
   g.lineStyle(1,0xb9e8fa,opacity).strokeCircle(x,y,i%3+2);
   g.lineStyle(2,0x7fc5dc,opacity*.7).lineBetween(x-7,y-1,x-15-i%4*2,y-2);
   if(i%5===1)g.fillStyle(0xc6edf3,.65).fillRect(x-6,y-5,2,2);
  }
  // Suspended plankton marks the feeding areas while the fast water runs through them.
  const feedingPatch=(center:CastPoint,deep:boolean)=>{
   const color=deep?0xa7cdf6:0xc0eaae;
   g.fillStyle(deep?0x82aeed:0x94cec3,.08).fillEllipse(center.x,center.y,151,67);
   for(let i=0;i<34;i++){
    const angle=i*2.40;
    const radius=Math.sqrt(i/34);
    const x=Math.round(center.x+Math.cos(angle)*69*radius+Math.sin(t+i)*3);
    const y=Math.round(center.y+Math.sin(angle)*30*radius+Math.cos(t*.8+i)*2);
    g.fillStyle(color,.48+.23*Math.sin(t*1.6+i)).fillRect(x,y,i%3+2,2);
   }
  };
  feedingPatch(feeding,false);
  if(this.upgraded)feedingPatch(deepFeeding,true);
 }
 private drawKelp(t:number){
  const g=this.waterArt.clear();const tremble=this.revealSeconds>0?Math.sin(t*16)*5:0;
  for(let i=0;i<25;i++){
   const x=604+i*13,y=543-Math.round(Math.sin(i/24*Math.PI)*17),height=32+(i*37)%92;
   const wave=Math.sin(t*1.4+i*.63)*5+(Math.abs(x-CORAL_CAST.trail.x)<72?tremble:0);
   const dark=i%3===0?0x245651:0x27695d,light=i%3===0?0x487e66:0x59a077;
   for(let j=0;j<5;j++){
    const bend=Math.round((Math.sin(i*.9+j*.82)*5+wave)*j/5/2)*2;
    const segmentY=Math.round(y-height*(j+1)/5),segmentH=Math.ceil(height/5)+2;
    const w=9-j;
    g.fillStyle(dark).fillRect(x+bend,segmentY,w,segmentH);
    g.fillStyle(light,.9).fillRect(x+bend,segmentY,2,segmentH-2);
    if(j===1 || j===3){const side=(j===1?-1:1)*(i%2?-1:1);
     g.fillStyle(dark).fillRect(x+bend+(side<0?-8:w-1),segmentY+4,9,4).fillRect(x+bend+(side<0?-10:w+5),segmentY,5,6);}
   }
  }
  for(let i=0;i<6;i++){
   const x=689+i*9,y=369+Math.round(i*i*1.3),h=16+(i*13)%27;
   const bend=Math.round(Math.sin(t*1.5+i)*2);
   g.fillStyle(0x407f69).fillRect(x,y-h/2,5,h/2).fillRect(x+bend,y-h,4,h/2+1);
   g.fillStyle(0x6aa485).fillRect(x+3,y-h*.7,6,3).fillRect(x+7,y-h*.7-4,3,5);
  }
  if(this.trailReady){
   const {x,y}=CORAL_CAST.trail,beat=(t%1.7)/1.7;
   g.lineStyle(2,0xffc4af,.8*(1-beat)).strokeEllipse(x,y+2,24+beat*30,12+beat*14);
   for(let i=0;i<3;i++){const h=(beat+i/3)%1;g.fillStyle(0xffd7be,1-h).fillRect(x+15+i*6,y-8-h*22,3,3);}
   if(this.revealSeconds>0){
    const dx=x+Math.round(tremble/2),dy=y+Math.round(Math.sin(t*3)*2);
    g.fillStyle(0xffb9a8).fillRect(dx+7,dy-12,5,11).fillRect(dx+2,dy-1,10,5).fillRect(dx-8,dy+3,13,5)
     .fillRect(dx-12,dy-5,6,12).fillRect(dx-9,dy-9,9,5).fillRect(dx-3,dy-6,5,4);
   }
  }
 }
 playBait(plan:BaitCast,onBite:BiteHandler){
  this.cancelBait();this.releaseHook();
  this.bait={plan,elapsed:0,onBite};
 }
 cancelBait(){
  const approach=this.bait?.approach;
  if(approach){
   if(approach.visitor)approach.fish.sprite.destroy();
   else approach.fish.sprite.setPosition(approach.from.x,approach.from.y)
    .setAlpha(approach.initialAlpha).setDepth(approach.initialDepth);
  }
  if(this.bait)this.line?.clear();
  this.bait=undefined;
 }
 private releaseHook(){
  if(this.hooked && !this.swimmers.includes(this.hooked))this.hooked.sprite.destroy();
  this.hooked=undefined;
 }
 private approachBait(bait:Bait){
  const {driftEnd,layer,habitat}=bait.plan;
  // For blue water the drift selects the school. In registered kelp the model also rolls
  // for a wild seahorse here, even when another eligible resident is already nearby.
  const selected=(bait.plan.sea===1 || bait.plan.specimenRecapture)?pickBaitFish(bait.plan):undefined;
  const candidates=selected===undefined?bait.plan.candidates:[selected];
  const distance=(f:Swimmer)=>Math.hypot(f.sprite.x-driftEnd.x,f.sprite.y-driftEnd.y);
  let fish=this.swimmers.filter(f=>f.layer===layer && candidates.includes(f.id) && distance(f)<184)
   .sort((a,b)=>distance(a)-distance(b))[0];
  const visitor=!fish;
  if(visitor){
   // A fish emerges from the nearest cover when the school is out of view.
   const id=selected??pickBaitFish(bait.plan);
   const x=driftEnd.x+(driftEnd.x>810?-1:1)*(habitat==='trail'?54:87);
   fish=this.makeFish(id,habitat!=='trail' && Math.random()<goldenChance,x,Math.min(560,driftEnd.y+33),layer);
   fish.sprite.disableInteractive();fish.sprite.setAlpha(.15);
  }
  const from={x:fish.sprite.x,y:fish.sprite.y},left=driftEnd.x<from.x;
  bait.approach={
   fish,from,visitor,initialAlpha:fish.sprite.alpha,initialDepth:fish.sprite.depth,
   mouthOffset:(left?-1:1)*19*fish.sprite.scaleX,
   duration:Math.min(1.2,.65+distance(fish)/310),
  };
  fish.sprite.setFlipX(left).setDepth(3);
 }
 private updateCasting(dt:number,t:number){
  if(!this.aiming)return;
  const idle=!this.locked && !this.bait;
  this.guide.setVisible(idle);this.landingLabel.setVisible(idle);
  if(!this.locked)this.revealSeconds=Math.max(0,this.revealSeconds-dt);
  const frame=Math.floor(t*14);
  if(frame!==this.lastWaterFrame){
   if(this.coral)this.drawKelp(t);
   else this.drawCurrent(t);
   this.lastWaterFrame=frame;
  }
  if(idle && this.hooked)this.releaseHook();
  this.shadows.forEach((s,i)=>{s.x=kelpSchool[i].x+Math.sin(t*.55+i)*8;s.y=kelpSchool[i].y+Math.sin(t+i)*4;});
  const bait=this.bait;
  if(!bait)return;
  bait.elapsed+=dt;
  const {landing,driftEnd}=bait.plan;
  const origin=this.current?CURRENT_CAST.origin:CORAL_CAST.origin;
  const flight=Math.min(1,bait.elapsed/travelSeconds);
  const sinceSplash=bait.elapsed-travelSeconds;
  const driftTime=this.current?currentTravelSeconds:0;
  const drift=driftTime ? Phaser.Math.Clamp(sinceSplash/driftTime,0,1) : 1;
  const x=flight<1 ? Phaser.Math.Linear(origin.x,landing.x,flight) : Phaser.Math.Linear(landing.x,driftEnd.x,drift);
  const y=flight<1 ? Phaser.Math.Linear(origin.y,landing.y,flight)-Math.sin(Math.PI*flight)*64
   : Phaser.Math.Linear(landing.y,driftEnd.y,drift)-Math.sin(Math.PI*drift)*3;
  const g=this.line.clear().lineStyle(2,0xf9e5b4,.85).lineBetween(origin.x,origin.y,x,y);
  g.fillStyle(0x513e38).fillRect(x-4,y-5,9,11);g.fillStyle(0xffc17f).fillRect(x-3,y-4,7,7);
  g.fillStyle(0xfff3c3).fillRect(x-2,y-6,4,4).fillRect(x+1,y+3,4,2);
  if(flight<1)return;
  if(sinceSplash<.6)g.lineStyle(2,0xc9f5d5,1-sinceSplash/.6).strokeEllipse(landing.x,landing.y,12+sinceSplash*88,5+sinceSplash*40);
  if(drift<1){
   g.lineStyle(2,0xa7dcec,.85).lineBetween(x-6,y,x-18,y-2).lineBetween(x-21,y-3,x-30,y-4);
   return;
  }
  if(!bait.approach)this.approachBait(bait);
  const a=bait.approach!,age=sinceSplash-driftTime,fraction=Phaser.Math.Clamp((age-.12)/a.duration,0,1);
  const ease=Phaser.Math.Easing.Sine.InOut(fraction),s=a.fish.sprite;
  s.x=Phaser.Math.Linear(a.from.x,x-a.mouthOffset,ease);
  s.y=Phaser.Math.Linear(a.from.y,y,ease)-Math.sin(Math.PI*fraction)*11;
  s.angle=Math.sin(fraction*Math.PI*5)*5;
  if(a.initialAlpha<1)s.setAlpha(Phaser.Math.Linear(a.initialAlpha,1,Math.min(1,age*2.2)));
  if(fraction===1){
   g.lineStyle(2,0xffe4a3).lineBetween(x-8,y-9,x-14,y-17).lineBetween(x+5,y-11,x+9,y-19);
   if(age>=a.duration+.31){
    this.bait=undefined;this.line.clear();
    this.hooked=a.fish;
    bait.onBite(a.fish.id,a.fish.shiny,x,y);
   }
  }
 }
 setBoss(available:boolean,cleared=false){
  this.bossCleared=cleared;if(!this.bg)return;
  if(available&&!this.boss){
   const x=this.coral?472:this.current?310:750,y=this.aiming?455:325;
   this.boss=this.add.image(x,y,'boss'+this.sea).setScale(.76).setAlpha(.85);
   this.bossLabel=this.add.text(x,y-67,'BOSS',{fontFamily:'monospace',fontSize:'17px',fontStyle:'bold',color:'#ff5959',stroke:'#190d21',strokeThickness:4}).setOrigin(.5);
   this.boss.setInteractive().on('pointerdown',(p:Phaser.Input.Pointer)=>{
    if(!this.locked && !this.pointsAtTrail(p))document.getElementById('boss')?.click();
   });
  }
  else if(!available&&this.boss){this.boss.destroy();this.bossLabel?.destroy();this.boss=undefined;this.bossLabel=undefined;}
  this.bossLabel?.setText(cleared?'BOSS · CLEARED':'BOSS');
 }
 hook(x:number,y:number){
  const hook=this.add.text(490,120,'⌁',{fontSize:'22px',color:'#eadbb5'}).setDepth(21).setData('temporary',true),p={x:490,y:120};
  this.tweens.add({targets:p,x,y,duration:500,ease:'Cubic.easeOut',onUpdate:()=>{hook.setPosition(p.x,p.y);this.line.clear().lineStyle(1,0xe5dab1,.8).lineBetween(500,115,p.x,p.y);},onComplete:()=>{hook.destroy();this.line.clear();}});
 }
 reel(id:number,shiny:boolean,x:number,y:number,animate=true){
  const f=this.hooked?.id===id && this.hooked.shiny===shiny ? this.hooked : this.swimmers.filter(f=>f.id===id&&f.shiny===shiny).sort((a,b)=>Math.hypot(a.sprite.x-x,a.sprite.y-y)-Math.hypot(b.sprite.x-x,b.sprite.y-y))[0];
  this.hooked=undefined;
  if(f){
   const resident=this.swimmers.includes(f);
   x=f.sprite.x;y=f.sprite.y;f.sprite.destroy();this.swimmers=this.swimmers.filter(a=>a!==f);
   if(f.patrol){
    const home={x:f.patrol.center,y:f.baseY};
    const next=this.current ? f.id : pickBaitFish(planCoralCast(home,this.upgraded,false));
    this.resident(next,home.x,home.y,f.layer);
   }else if(resident)this.spawn();
  }
  if(!animate)return;
  const fish=this.add.image(x,y,(shiny?'s':'f')+id).setDepth(21).setData('temporary',true),p={x,y};
  this.tweens.add({targets:p,x:448,y:105,duration:850,ease:'Cubic.easeIn',onUpdate:()=>{fish.setPosition(p.x,p.y).setAngle(-30);this.line.clear().lineStyle(1,0xe4d5a5,.8).lineBetween(500,115,p.x,p.y);},onComplete:()=>{fish.destroy();this.line.clear();this.sparkle();}});
 }
 sparkle(){for(let i=0;i<16;i++){const s=this.add.rectangle(420,125,3,3,i%2?0xf5d892:0xb8ead6).setDepth(22).setData('temporary',true);this.tweens.add({targets:s,x:420+Math.cos(i)*60,y:125+Math.sin(i)*40-12,alpha:0,duration:750,onComplete:()=>s.destroy()});}}
 popup(gold:number,combo=0){const t=this.add.text(450,110,`+${gold} G${combo>1?'  ×'+combo+' COMBO':''}`,{fontFamily:'monospace',fontSize:'19px',fontStyle:'bold',color:'#f9dc8e',stroke:'#12333b',strokeThickness:4}).setOrigin(.5).setDepth(25).setData('temporary',true);this.tweens.add({targets:t,y:65,alpha:0,duration:1600,delay:200,onComplete:()=>t.destroy()});}
 celebrate(){this.cameras.main.flash(400,143,197,164);this.sparkle();}
 net(ids:number[]){const g=this.add.graphics().setDepth(19).setData('temporary',true),p={y:126},depth=315+this.boatLevel*45;
  this.tweens.add({targets:p,y:depth,duration:650,yoyo:true,hold:250,onUpdate:()=>{g.clear().lineStyle(1,0xc6d8b7,.7).lineBetween(435,115,350,p.y).lineBetween(440,115,610,p.y);g.strokeRect(350,p.y,260,55);for(let i=0;i<10;i++)g.lineBetween(350+i*29,p.y,350+i*29,p.y+55);for(let i=1;i<4;i++)g.lineBetween(350,p.y+i*14,610,p.y+i*14);},onComplete:()=>{g.destroy();ids.forEach(id=>this.reel(id,false,460,depth));}});
 }
 update(time:number,delta:number){if(!this.bg)return;const dt=Math.min(delta,50)/1000,t=time/1000;
  this.boat.y=120+Math.sin(t*1.4)*3;this.boat.angle=Math.sin(t*.9)*.6;
  this.rod.clear().lineStyle(2,[0x987447,0x77baab,0xa2cee0,0xc3a6e8,0xf4d68a][this.rodLevel]).lineBetween(475,this.boat.y-10,496,this.boat.y-42).lineBetween(496,this.boat.y-42,516,this.boat.y-44);
  this.decor.clear().lineStyle(1,0xa0cfbd,this.sea>1?.25:.18);
  if(!this.current)for(const b of this.bubbles){b.y-=b.s*dt;if(b.y<155)b.y=590;this.decor.strokeCircle(b.x+Math.sin(t+b.x)*4,b.y,b.r);}
  if(this.sea===0)for(let i=0;i<24;i++){this.decor.fillStyle(i%2?0xbad7b4:0x65b4b1,.3);this.decor.fillRect((i*103+t*(i%2?6:-4)+9600)%960,128+(i%4)*4,12+i%5*5,2);}
  if(this.sea===3)for(let i=0;i<24;i++){this.decor.fillStyle(0x968e9c,.06);this.decor.fillRect(110+(i%4)*220+Math.sin(t+i)*12,445-((t*25+i*17)%260),12,11);}
  this.updateCasting(dt,t);
  for(const f of this.swimmers){
   if(f===this.bait?.approach?.fish || (this.locked && f===this.hooked))continue;
   const left=f.patrol ? f.patrol.center-f.patrol.radius : 55, right=f.patrol ? f.patrol.center+f.patrol.radius : 895;
   f.sprite.x+=f.speed*dt;
   f.sprite.setFlipX(f.speed<0);
   if(f.sprite.x>right){f.speed=-Math.abs(f.speed);f.sprite.setFlipX(true);}
   if(f.sprite.x<left){f.speed=Math.abs(f.speed);f.sprite.setFlipX(false);}
   f.sprite.y=Phaser.Math.Linear(f.sprite.y,f.baseY+Math.sin(t*1.3+f.phase)*8,Math.min(1,dt*7));
   f.sprite.angle=Math.sin(t*2+f.phase)*2;
   if(this.sea>1||f.shiny){this.decor.fillStyle(f.shiny?0xf5d58f:0x76c6d4,.09+.035*Math.sin(t*2+f.phase));this.decor.fillCircle(f.sprite.x,f.sprite.y,35);}
  }
  if(this.boss){this.boss.y=(this.aiming?455:330)+Math.sin(t)*9;this.bossLabel?.setY(this.boss.y-66);}
 }
}
