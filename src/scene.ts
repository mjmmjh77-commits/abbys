import Phaser from 'phaser';
import {fishArt,boatArt} from './art';
import {bossArt} from './effects';
import {species,seas,pickFish} from './model';
import {goldenChance} from './catalog';
type Swimmer={sprite:Phaser.GameObjects.Image;id:number;shiny:boolean;speed:number;baseY:number;phase:number;};
export class Ocean extends Phaser.Scene {
 onReady:()=>void=()=>{};
 layer: "deep"|"shallow"="shallow"; sea=0; locked=false; swimmers:Swimmer[]=[];
 onFishHover:(id:number|null,shiny?:boolean)=>void=()=>{};
 onFish:(id:number,shiny:boolean,x:number,y:number)=>void=()=>{};
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
  for(let i=0;i<seas.length;i++)this.textures.addCanvas('boss'+i,bossArt(i));
  this.boat=this.add.image(405,120,'boat0').setScale(1.5).setDepth(10);this.rod=this.add.graphics().setDepth(11);
  this.bubbles=Array.from({length:45},(_,i)=>({x:(i*137)%960,y:(i*91)%600,r:1+i%3,s:6+i%7}));
  this.setSea(this.sea);this.game.canvas.style.cursor='default';this.onReady();
 }
 setEquipment(rod:number,boat:number){this.rodLevel=rod;this.boatLevel=boat;if(this.boat)this.boat.setTexture('boat'+boat);}
 setSea(n:number){
  this.sea=n;this.onFishHover(null);if(!this.bg)return;this.tweens.killAll();this.line.clear();
  this.children.list.filter(c=>c.getData('temporary')).forEach(c=>c.destroy());
  this.swimmers.forEach(f=>f.sprite.destroy());this.swimmers=[];
  this.boss?.destroy();this.bossLabel?.destroy();this.boss=undefined;this.bossLabel=undefined;
  this.drawBackground();for(let i=0;i<10;i++)this.spawn(65+i*88,235+(i*61)%260);
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
  if(this.layer==="deep"){g.fillStyle(0x061633,.32);g.fillRect(0,135,960,465);}
  this.boat.setTint(sea>1?0xa8c1ce:0xffffff);
 }
 spawn(x?:number,y?:number){
  const id=pickFish(this.sea,this.layer),shiny=Math.random()<goldenChance,f=species[id];
  const sprite=this.add.image(x??Phaser.Math.Between(60,890),y??Phaser.Math.Between(215,510),(shiny?'s':'f')+id).setScale(.9+f.rank*.12).setInteractive();
  const swimmer={sprite,id,shiny,speed:(Math.random()<.5?-1:1)*(12+Math.random()*18)*(this.sea===1?1.3:1),baseY:sprite.y,phase:Math.random()*7};sprite.setFlipX(swimmer.speed<0);
  sprite.on('pointerover',()=>{if(!this.locked)this.onFishHover(id,shiny);});
  sprite.on('pointerout',()=>this.onFishHover(null));
  sprite.on('pointerdown',()=>{if(!this.locked)this.onFish(id,shiny,sprite.x,sprite.y);});this.swimmers.push(swimmer);
 }
 setBoss(available:boolean,cleared=false){
  this.bossCleared=cleared;if(!this.bg)return;
  if(available&&!this.boss){this.boss=this.add.image(750,325,'boss'+this.sea).setScale(.76).setAlpha(.85);this.bossLabel=this.add.text(750,258,'BOSS',{fontFamily:'monospace',fontSize:'17px',fontStyle:'bold',color:'#ff5959',stroke:'#190d21',strokeThickness:4}).setOrigin(.5);this.boss.setInteractive().on('pointerdown',()=>document.getElementById('boss')?.click());}
  else if(!available&&this.boss){this.boss.destroy();this.bossLabel?.destroy();this.boss=undefined;this.bossLabel=undefined;}
  this.bossLabel?.setText(cleared?'BOSS · CLEARED':'BOSS');
 }
 hook(x:number,y:number){
  const hook=this.add.text(490,120,'⌁',{fontSize:'22px',color:'#eadbb5'}).setDepth(21).setData('temporary',true),p={x:490,y:120};
  this.tweens.add({targets:p,x,y,duration:500,ease:'Cubic.easeOut',onUpdate:()=>{hook.setPosition(p.x,p.y);this.line.clear().lineStyle(1,0xe5dab1,.8).lineBetween(500,115,p.x,p.y);},onComplete:()=>{hook.destroy();this.line.clear();}});
 }
 reel(id:number,shiny:boolean,x:number,y:number){
  const f=this.swimmers.find(f=>f.id===id&&f.shiny===shiny);if(f){x=f.sprite.x;y=f.sprite.y;f.sprite.destroy();this.swimmers=this.swimmers.filter(a=>a!==f);this.spawn();}
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
  for(const b of this.bubbles){b.y-=b.s*dt;if(b.y<155)b.y=590;this.decor.strokeCircle(b.x+Math.sin(t+b.x)*4,b.y,b.r);}
  if(this.sea===0)for(let i=0;i<24;i++){this.decor.fillStyle(i%2?0xbad7b4:0x65b4b1,.3);this.decor.fillRect((i*103+t*(i%2?6:-4)+9600)%960,128+(i%4)*4,12+i%5*5,2);}
  if(this.sea===3)for(let i=0;i<24;i++){this.decor.fillStyle(0x968e9c,.06);this.decor.fillRect(110+(i%4)*220+Math.sin(t+i)*12,445-((t*25+i*17)%260),12,11);}
  for(const f of this.swimmers){f.sprite.x+=f.speed*dt;if(f.sprite.x>895){f.sprite.x=895;f.speed=-Math.abs(f.speed);f.sprite.setFlipX(true);}if(f.sprite.x<55){f.sprite.x=55;f.speed=Math.abs(f.speed);f.sprite.setFlipX(false);}f.sprite.y=f.baseY+Math.sin(t*1.3+f.phase)*8;f.sprite.angle=Math.sin(t*2+f.phase)*2;if(this.sea>1||f.shiny){this.decor.fillStyle(f.shiny?0xf5d58f:0x76c6d4,.09+.035*Math.sin(t*2+f.phase));this.decor.fillCircle(f.sprite.x,f.sprite.y,35);}}
  if(this.boss){this.boss.y=330+Math.sin(t)*9;this.bossLabel?.setY(this.boss.y-66);}
 }
}
