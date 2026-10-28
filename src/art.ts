export function fishArt(shape:number,hue:number,shiny=false,boss=false):HTMLCanvasElement {
 const c=document.createElement('canvas');c.width=80;c.height=48;const x=c.getContext('2d')!;
 const base=shiny?'#f9d471':`hsl(${hue} 48% 62%)`,dark=shiny?'#ac6b42':`hsl(${hue} 42% 35%)`,light=shiny?'#fff6c8':`hsl(${hue} 55% 82%)`;
 const rect=(a:number,b:number,w:number,h:number,col:string)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
 if(shape===0){rect(22,14,35,22,dark);rect(18,19,45,12,base);rect(28,11,20,27,base);rect(12,15,6,22,dark);rect(7,11,6,30,base);rect(25,10,20,4,dark);rect(28,29,22,6,light);rect(32,16,4,14,light);rect(43,16,3,14,dark);}
 if(shape===1){rect(19,20,45,12,base);rect(26,16,29,19,base);rect(31,10,8,7,dark);rect(24,31,23,4,light);rect(13,18,7,16,dark);rect(8,13,6,26,base);rect(60,23,11,5,light);}
 if(shape===2){rect(22,11,34,23,base);rect(28,7,22,29,base);rect(19,16,42,12,base);for(let i=0;i<5;i++){rect(20+i*8,31,4,8+i%2*4,dark);rect(17+i*9,37,6,3,base);}rect(26,27,26,5,light);}
 if(shape===3){rect(17,19,47,12,base);rect(22,15,32,19,base);rect(10,23,8,13,dark);rect(6,29,8,7,base);rect(28,29,25,4,light);rect(39,7,3,9,dark);rect(41,5,14,3,dark);rect(53,6,4,7,light);rect(57,25,8,8,dark);rect(59,25,2,4,light);}
 if(shape===4){rect(28,15,26,20,base);rect(18,18,44,12,base);rect(12,15,8,8,dark);rect(7,10,10,7,base);rect(12,30,15,6,base);rect(6,35,12,5,dark);rect(40,8,8,9,dark);rect(38,32,11,8,dark);rect(27,26,26,6,light);}
 if(shape===5){for(let i=0;i<12;i++){const yy=22+Math.round(Math.sin(i*.6)*6);rect(7+i*5,yy,7,7,i>8?light:base);rect(7+i*5,yy+6,7,2,dark);}rect(57,15,14,10,base);rect(64,23,7,2,light);}
 if(shape===6){rect(25,7,27,33,base);rect(18,15,41,18,base);rect(32,4,14,4,dark);rect(17,20,5,10,dark);rect(9,13,7,24,base);rect(30,31,21,5,light);for(let i=0;i<4;i++)rect(28+i*6,12,2,17,dark);rect(39,38,9,4,dark);}
 if(shape===7){rect(37,10,17,13,base);rect(48,14,15,5,light);rect(35,22,10,15,base);rect(29,31,11,7,dark);rect(26,37,11,4,base);rect(24,32,4,8,base);rect(28,28,4,5,light);rect(31,23,5,5,dark);rect(37,5,4,7,dark);rect(45,6,4,7,dark);}
 if(shape===8){rect(26,7,27,33,base);rect(19,14,41,20,base);rect(14,20,6,10,dark);rect(8,16,6,18,base);rect(30,31,20,6,light);for(let i=0;i<5;i++){rect(25+i*7,5+i%2*3,2,5,dark);rect(27+i*6,19+i%2*5,2,2,dark);}rect(35,40,10,3,dark);}
 if(shape===9){rect(16,19,47,12,base);rect(24,13,30,21,base);rect(35,6,6,10,dark);rect(40,8,5,9,base);rect(11,13,7,23,dark);rect(6,9,6,31,base);rect(24,28,33,5,light);rect(61,22,15,3,light);rect(30,34,10,5,dark);}
 if(shape===10){rect(23,10,35,19,base);rect(28,6,24,6,light);rect(20,17,42,9,base);for(let i=0;i<7;i++){rect(23+i*5,28,2,11+i%3*3,base);rect(25+i*5,36+i%3*3,3,2,light);}rect(27,26,27,3,dark);}
 if(shape===11){for(let i=0;i<8;i++){rect(18+i*5,20+(i%2)*2,6,9,i%2?light:base);rect(20+i*5,30,2,7,dark);}rect(52,17,10,12,base);rect(58,13,8,2,light);rect(62,10,7,2,light);rect(10,17,8,14,dark);rect(6,14,5,6,base);}
 if(shape===12){rect(25,17,29,18,base);rect(30,13,19,4,light);for(let i=0;i<4;i++){rect(16-i*3,17+i*6,12,3,dark);rect(53,17+i*6,12+i*2,3,dark);}rect(14,9,8,9,base);rect(56,7,9,9,base);rect(14,5,4,5,light);rect(61,3,4,5,light);rect(31,12,3,5,base);rect(46,12,3,5,base);}
 const eyeX=shape===7?48:shape===12?44:shape===2?44:shape===10?45:shape===5?62:52;
 rect(eyeX,18,5,5,'#102b35');rect(eyeX+1,18,2,2,'#f7f0cc');if(boss){rect(29,4,4,7,'#e8bd73');rect(39,1,4,10,'#e8bd73');rect(49,4,4,7,'#e8bd73');rect(29,9,24,4,'#e8bd73');}
 if(shiny){rect(29,9,4,5,'#fff6c8');rect(33,7,3,4,'#fff6c8');rect(39,35,3,6,'#fff6c8');}
 if(shiny){rect(67,7,3,9,'#fff5bf');rect(64,10,9,3,'#fff5bf');rect(8,3,2,5,'#fff5bf');}
 return c;
}
export function boatArt():HTMLCanvasElement {const c=document.createElement('canvas');c.width=128;c.height=80;const x=c.getContext('2d')!;const r=(a:number,b:number,w:number,h:number,col:string)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};r(14,51,99,9,'#e5d6ac');r(20,60,87,6,'#9c5c40');r(27,66,69,6,'#6b4037');r(37,72,51,3,'#423b38');r(9,47,108,5,'#f3e6ba');r(32,23,43,25,'#ddd8b9');r(29,20,49,5,'#b95d4a');r(36,28,13,12,'#517984');r(54,28,13,12,'#517984');r(39,28,3,10,'#9bc3c0');r(34,41,37,6,'#b7b79b');r(79,12,3,36,'#92734c');r(81,12,17,3,'#d7cbaa');r(81,15,14,8,'#ce7c59');r(81,23,10,3,'#c65d43');r(89,36,9,11,'#e3b786');r(87,32,13,4,'#e8ce8b');r(91,28,7,5,'#9f8552');r(88,46,5,8,'#344950');r(97,41,10,3,'#e3b786');r(107,24,2,21,'#4c4b38');r(107,22,13,2,'#826c42');r(120,24,1,42,'#d4dbb7');r(18,49,7,7,'#638986');r(67,52,9,5,'#65827d');return c;}
export function gearArt(kind:'rod'|'net',level:number):HTMLCanvasElement {
 const c=document.createElement('canvas');c.width=48;c.height=48;const g=c.getContext('2d')!,color=['#ac7f4c','#75b4a0','#92c6d8','#b19ad9','#efcf81'][level];
 g.fillStyle='#192e3a';g.fillRect(1,1,46,46);
 if(kind==='rod'){for(let i=0;i<31;i++){g.fillStyle=i<10?'#795338':color;g.fillRect(9+Math.floor(i*.65),38-i,3,3);}g.fillStyle='#dbd9bc';g.fillRect(31,7,8,2);g.fillRect(38,9,1,19);g.fillRect(35,28,4,2);g.fillRect(34,25,2,4);g.fillStyle='#c4bb96';g.fillRect(15,27,7,7);g.fillStyle='#284550';g.fillRect(17,29,3,3);}
 else{for(let i=0;i<24;i++){g.fillStyle=i<10?'#795338':color;g.fillRect(9+i,39-i,3,3);}g.strokeStyle=color;g.lineWidth=2;g.strokeRect(19,7,21,20);g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();g.moveTo(20+i*5,8);g.lineTo(20+i*5,26);g.stroke();g.beginPath();g.moveTo(20,8+i*4);g.lineTo(39,8+i*4);g.stroke();}}
 if(level>0){g.fillStyle='#f3df9e';for(let i=0;i<level;i++)g.fillRect(3+i*4,43,2,2);}return c;
}
