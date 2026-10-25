// Shared data, save game and small helpers.
THREE.ColorManagement.legacyMode=false;
const T=THREE;
const $=s=>document.querySelector(s);
const V=(x,y,z)=>new T.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function hash(s){let h=7;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))>>>0;return h}
const MOBILE=matchMedia('(pointer:coarse)').matches;
const LOWQ=/[?&]low\b/.test(location.search);
const QUALITY=LOWQ?{grass:.12,trees:.4,pixel:.75,shadow:512,animalRes:56,animalCells:2.5e5}:MOBILE?{grass:.45,trees:.55,pixel:1.25,shadow:1024,animalRes:64,animalCells:4e5}:{grass:1,trees:1,pixel:1.6,shadow:2048,animalRes:80,animalCells:7e5};

const HAB={
  savanna:{name:'Savanna',c:'#e3c46c',i:'🌾'},
  rainforest:{name:'Rainforest',c:'#3f9b55',i:'🌴'},
  jungle:{name:'Bamboo Jungle',c:'#86c062',i:'🎋'},
  woodland:{name:'Woodland',c:'#5e8f47',i:'🌲'},
  outback:{name:'Outback',c:'#dc8645',i:'🌵'},
  polar:{name:'Polar Ice',c:'#d6eef9',i:'🧊'},
};
// how each habitat looks in 3D
const ENV={
  savanna:{zen:'#3d78c2',hor:'#f0d6a8',fog:'#e4cfa2',ground:'#b99a55',patch:'#9c8045',rock:'#8b7a62',water:'#3e7f92',grass:['#8a7a3a','#e0c878'],grassH:1.1,grassN:60000,sunEl:.55},
  rainforest:{zen:'#4f8fb8',hor:'#d6e6d2',fog:'#b5cdb5',ground:'#56732f',patch:'#3f5a24',rock:'#5b6650',water:'#355e4e',grass:['#2f5a1e','#6fa040'],grassH:.7,grassN:45000,sunEl:.75},
  jungle:{zen:'#5f9cd6',hor:'#e6eedb',fog:'#d5e2cb',ground:'#6f8f45',patch:'#587a35',rock:'#7d8576',water:'#4a8798',grass:['#4a7a2a','#9cc860'],grassH:.75,grassN:50000,sunEl:.6},
  woodland:{zen:'#4f86cc',hor:'#dfe9ee',fog:'#c9d8dc',ground:'#5b7d38',patch:'#46652a',rock:'#7a7c78',water:'#3f7896',grass:['#3c6a24','#88b850'],grassH:.55,grassN:55000,sunEl:.5},
  outback:{zen:'#2f74cc',hor:'#f2c99a',fog:'#e3b688',ground:'#b55f32',patch:'#9a4c26',rock:'#9a4a26',water:'#4f8a94',grass:['#8a8040','#d8c070'],grassH:.5,grassN:14000,sunEl:.6},
  polar:{zen:'#6d9fd2',hor:'#eef4fa',fog:'#e4ecf3',ground:'#f2f6f9',patch:'#dde8f0',rock:'#4f5660',water:'#24557a',grass:null,grassN:0,sunEl:.25},
};
// [name, emoji, rarity, walk speed m/s, body plan + look]
const CONT=[
 {id:'africa',name:'Africa',place:'Serengeti savanna',hab:'savanna',deco:['🌳','🦓','🌾'],
  animals:[
   ['Zebra','🦓',1,2.2,{L:1.9,W:.68,Hb:.85,leg:.85,legW:.075,neck:.62,neckW:.16,neckAng:.55,headL:.62,headW:.24,headH:.27,col:'#f2efe8',tex:'stripes',col2:'#151515',freq:19,thin:.0,noBelly:1,mane:'#151515',snout:'#2a2626',nose:'#141212',ears:'pointy',tail:'tuft',graze:1}],
   ['Giraffe','🦒',1,1.8,{L:1.9,W:.72,Hb:.95,leg:1.75,legW:.07,neck:2.1,neckW:.13,neckAng:.28,headL:.58,headW:.2,headH:.24,col:'#e8c98d',tex:'giraffe',col2:'#8e4b1c',ossicones:1,ears:'long',tail:'tuft',tl:.8,graze:0}],
   ['Elephant','🐘',1,1.5,{L:3.2,W:1.6,Hb:2,leg:1.3,legW:.3,neck:.25,neckW:.62,neckAng:1.25,headL:1.05,headW:1,headH:1,col:'#8b8682',hoof:'#6c6864',ears:'big',trunk:1,tusks:1,tail:'tuft',tl:1,eyeS:.7,noBelly:1}],
   ['Hippo','🦛',2,1.6,{L:2.9,W:1.45,Hb:1.25,leg:.45,legW:.24,neck:.2,neckW:.55,neckAng:1.35,headL:.95,headW:.8,headH:.6,muzzle:1.6,col:'#7a6670',belly:'#b4868e',hoof:'#5a4a52',snout:'#8a6e78',ears:'round',tail:'short',hp:.2}],
   ['Rhino','🦏',2,1.8,{L:2.9,W:1.3,Hb:1.3,leg:.7,legW:.22,neck:.3,neckW:.5,neckAng:1.2,headL:.85,headW:.45,headH:.5,col:'#8a857f',hoof:'#5f5a55',horn:1,ears:'pointy',tail:'tuft',tl:.5,noBelly:1,hp:.45}],
   ['Lion','🦁',2,2,{L:1.75,W:.58,Hb:.72,leg:.7,legW:.09,neck:.3,neckW:.24,neckAng:1.05,headL:.45,headW:.4,headH:.4,col:'#c4975a',lionMane:'#5a3518',snout:'#e0c49a',nose:'#8a5a4a',cheeks:1,ears:'round',tail:'tuft',tl:.9,tuftCol:'#3a2210',paws:1}],
   ['Gorilla','🦍',3,1.4,{plan:'ape',col:'#2a2a2c',face:'#3a3634',s:1.6}],
   ['Cheetah','🐆',3,2.4,{L:1.4,W:.42,Hb:.5,leg:.8,legW:.06,neck:.3,neckW:.13,neckAng:1,headL:.32,headW:.26,headH:.24,col:'#dcb066',belly:'#f3e6c8',tex:'dots',col2:'#1e140a',ears:'round',tail:'long',tl:.85,snout:'#ecd8b0',cheeks:1,paws:1}],
  ]},
 {id:'samerica',name:'South America',place:'Amazon rainforest',hab:'rainforest',deco:['🌴','🦜','🌺'],
  animals:[
   ['Parrot','🦜',1,1.5,{plan:'bird',s:.55,body:'#d8251f',wing:'#2a5bd7',head:'#d8251f',beak:'#efe6d0',leg:.14,neck:.06,fly:1,tailL:.6,tailCol:'#2a5bd7',sz:2}],
   ['Monkey','🐒',1,2,{plan:'ape',col:'#7a5232',face:'#d9b38c',s:.65,tail:1,sz:1.4}],
   ['Poison Frog','🐸',1,1.2,{plan:'frog',col:'#2d6fe0',col2:'#111',tex:'spots',s:.45}],
   ['Llama','🦙',1,1.6,{L:1.3,W:.55,Hb:.75,leg:.9,legW:.075,neck:.95,neckW:.14,neckAng:.12,headL:.42,headW:.21,headH:.24,col:'#efe4d0',ears:'long',tail:'short',graze:1,hp:.35}],
   ['Sloth','🦥',2,.5,{plan:'ape',col:'#8a7a62',face:'#e2d3b2',s:.75}],
   ['Anaconda','🐍',2,1.4,{plan:'snake',col:'#4d6b2a',col2:'#1c280e',tex:'spots',s:1.4,n:24}],
   ['Flamingo','🦩',2,1.4,{plan:'bird',s:.7,body:'#f49ab0',wing:'#e8607c',head:'#f49ab0',beak:'#222',leg:1,neck:.85,neckAng:.15,legCol:'#e98aa0',beakL:.9}],
   ['Jaguar','🐆',3,2.2,{L:1.65,W:.56,Hb:.62,leg:.62,legW:.09,neck:.3,neckW:.19,neckAng:1.05,headL:.38,headW:.35,headH:.32,col:'#d29a46',belly:'#f0e2c4',tex:'rosette',col2:'#22150a',ears:'round',tail:'long',tl:.75,snout:'#ecd2a0',cheeks:1,paws:1}],
  ]},
 {id:'asia',name:'Asia',place:'Bamboo forests and plains',hab:'jungle',deco:['🎋','🐼','🌸'],
  animals:[
   ['Peacock','🦚',1,1.3,{plan:'bird',s:.7,body:'#1d5fbf',wing:'#6a5a3a',head:'#1d5fbf',beak:'#777',leg:.45,neck:.4,neckAng:.25,fan:1,crest:1,legCol:'#8a7a6a'}],
   ['Water Buffalo','🐃',1,1.5,{L:2.4,W:1,Hb:1.1,leg:.75,legW:.13,neck:.3,neckW:.45,neckAng:1.25,headL:.62,headW:.4,headH:.4,col:'#3a3737',horns:'buffalo',ears:'round',tail:'tuft',graze:1,noBelly:1}],
   ['Camel','🐫',1,1.6,{L:2.2,W:.8,Hb:1,leg:1.4,legW:.1,neck:1.1,neckW:.18,neckAng:.85,headL:.52,headW:.23,headH:.26,hp:.1,col:'#c49c66',hump:1,ears:'round',tail:'tuft',graze:1,hoof:'#7a6040'}],
   ['Snow Monkey','🐵',1,1.8,{plan:'ape',col:'#b8afa5',face:'#e07a7a',s:.75,sz:1.3}],
   ['Orangutan','🦧',2,1.2,{plan:'ape',col:'#b0501c',face:'#7a5a48',s:1.25,arm:1.25}],
   ['Tiger','🐅',2,2,{L:2.05,W:.64,Hb:.78,leg:.75,legW:.1,neck:.35,neckW:.26,neckAng:1.05,headL:.46,headW:.43,headH:.4,col:'#dd7f26',belly:'#f4ecdf',tex:'stripes',col2:'#120d08',freq:13,thin:.35,ears:'round',tail:'long',tl:.95,snout:'#f4ecdf',cheeks:1,paws:1}],
   ['Red Panda','🦊',2,1.5,{L:.65,W:.32,Hb:.32,leg:.26,legW:.05,neck:.1,neckW:.14,neckAng:1.2,headL:.27,headW:.27,headH:.24,col:'#b5482a',legCol:'#2a1a12',belly:'#3a2014',snout:'#f2ece2',ears:'pointy',earCol:'#f2ece2',tail:'ringed',tl:.5,col2:'#6b2a14',sz:1.6,paws:1}],
   ['Giant Panda','🐼',3,1.2,{L:1.5,W:1,Hb:1,leg:.5,legW:.17,neck:.15,neckW:.45,neckAng:1.25,headL:.6,headW:.62,headH:.56,col:'#f1efe8',panda:1,ears:'round',earCol:'#161616',tail:'short',paws:1,noBelly:1}],
  ]},
 {id:'namerica',name:'North America',place:'Rocky Mountain forests',hab:'woodland',deco:['🌲','🦬','🏔️'],
  animals:[
   ['Bison','🦬',1,1.6,{L:2.6,W:1.1,Hb:1.4,leg:.8,legW:.14,neck:.3,neckW:.6,neckAng:1.3,headL:.62,headW:.55,headH:.5,col:'#4a3324',shag:'#2e1e14',hump:1,horns:'bison',ears:'round',tail:'tuft',graze:1}],
   ['Deer','🦌',1,2,{L:1.45,W:.45,Hb:.6,leg:1,legW:.055,neck:.6,neckW:.12,neckAng:.38,headL:.42,headW:.2,headH:.22,col:'#97653a',belly:'#e8dcc8',antlers:1,ears:'long',tail:'short',tailCol:'#f2ece2',graze:1}],
   ['Raccoon','🦝',1,1.4,{L:.62,W:.36,Hb:.36,leg:.25,legW:.055,neck:.08,neckW:.16,neckAng:1.2,headL:.27,headW:.27,headH:.24,col:'#7d7a76',mask:1,ears:'pointy',tail:'ringed',tl:.42,col2:'#2a2826',snout:'#e8e4dc',sz:1.5,paws:1}],
   ['Skunk','🦨',1,1.1,{L:.55,W:.32,Hb:.3,leg:.18,legW:.05,neck:.08,neckW:.13,neckAng:1.25,headL:.24,headW:.22,headH:.2,col:'#161616',stripe:1,ears:'round',tail:'bushy',tl:.55,tailCol:'#161616',tip:'#f4f4f4',sz:1.6,paws:1,noBelly:1}],
   ['Beaver','🦫',2,1,{L:.85,W:.48,Hb:.45,leg:.16,legW:.07,neck:.06,neckW:.2,neckAng:1.3,headL:.3,headW:.3,headH:.26,col:'#6b4528',ears:'round',tail:'flat',sz:1.4,paws:1}],
   ['Grizzly Bear','🐻',2,1.6,{L:2,W:1.1,Hb:1.1,leg:.7,legW:.19,neck:.3,neckW:.5,neckAng:1.2,headL:.55,headW:.5,headH:.48,col:'#6b4a2b',hump:1,ears:'round',tail:'short',paws:1}],
   ['Bald Eagle','🦅',3,1.4,{plan:'bird',s:.85,body:'#4a2e1a',wing:'#3b2414',head:'#f6f4ee',beak:'#f2c230',leg:.25,neck:.12,fly:1,tailCol:'#f6f4ee',legCol:'#f2c230'}],
  ]},
 {id:'europe',name:'Europe',place:'Old woods and meadows',hab:'woodland',deco:['🌳','🦊','🍄'],
  animals:[
   ['Hedgehog','🦔',1,.8,{plan:'hedgehog',col:'#5a4430',col2:'#e8dcc8',tex:'spots',s:.5,sz:1.6}],
   ['Swan','🦢',1,1,{plan:'bird',s:.8,body:'#f7f6f2',wing:'#efede6',head:'#f7f6f2',beak:'#f07a20',leg:.15,neck:.75,neckAng:-.1,legCol:'#333'}],
   ['Badger','🦡',1,1.2,{L:.85,W:.48,Hb:.38,leg:.2,legW:.06,neck:.08,neckW:.2,neckAng:1.3,headL:.32,headW:.26,headH:.24,col:'#77767a',legCol:'#1d1d1d',head:'#f2f2ee',badger:1,ears:'round',tail:'short',sz:1.4,paws:1}],
   ['Fox','🦊',1,2,{L:.78,W:.3,Hb:.35,leg:.38,legW:.045,neck:.2,neckW:.12,neckAng:1,headL:.33,headW:.24,headH:.22,col:'#cc6128',legCol:'#3a2418',belly:'#f2ece2',snout:'#f2ece2',ears:'pointy',tail:'bushy',tl:.5,tip:'#f4f1ea',sz:1.4,paws:1}],
   ['Wild Boar','🐗',2,2,{L:1.45,W:.62,Hb:.72,leg:.45,legW:.08,neck:.2,neckW:.4,neckAng:1.35,headL:.62,headW:.38,headH:.4,col:'#4a3a2e',tusks:.5,ears:'pointy',snout:'#3a2c24',tail:'short',graze:1,hp:.5}],
   ['Owl','🦉',2,1.2,{plan:'bird',s:.5,body:'#8a6a45',wing:'#6e5233',head:'#8a6a45',beak:'#d9b25a',leg:.1,neck:0,upright:1,owl:1,fly:1,sz:1.6}],
   ['Grey Wolf','🐺',3,2.2,{L:1.35,W:.42,Hb:.52,leg:.72,legW:.065,neck:.35,neckW:.17,neckAng:.9,headL:.42,headW:.26,headH:.25,col:'#878783',belly:'#d8d6d0',snout:'#d8d6d0',ears:'pointy',tail:'bushy',tl:.55,tip:'#3a3a38',paws:1}],
  ]},
 {id:'australia',name:'Australia',place:'Red outback',hab:'outback',deco:['🦘','🪨','🌿'],
  animals:[
   ['Kangaroo','🦘',1,2.5,{plan:'hopper',col:'#a8744a',belly:'#e0c4a0',s:1.3}],
   ['Frilled Lizard','🦎',1,1.4,{plan:'lizard',col:'#8a6a3a',col2:'#5a4428',tex:'spots',frill:'#e06a2a',s:.55,sz:1.8}],
   ['Black Swan','🦢',1,1,{plan:'bird',s:.75,body:'#1d1d22',wing:'#2a2a30',head:'#1d1d22',beak:'#d92a2a',leg:.15,neck:.72,neckAng:-.1,legCol:'#222'}],
   ['Crocodile','🐊',2,1,{plan:'lizard',col:'#4b5a2c',col2:'#2f3a1a',tex:'spots',belly:'#c8c290',s:1.9,croc:1}],
   ['Taipan','🐍',2,1.6,{plan:'snake',col:'#8a6a3a',col2:'#6a4e28',tex:'spots',belly:'#e8d8a8',s:.9,n:20}],
   ['Koala','🐨',3,.7,{L:.62,W:.5,Hb:.52,leg:.26,legW:.09,neck:.08,neckW:.25,neckAng:1.1,headL:.42,headW:.46,headH:.4,col:'#8f9396',belly:'#e8e8e6',ears:'fluffy',nose:'#1d1d1d',muzzle:1.2,tail:'short',sz:1.5,paws:1}],
  ]},
 {id:'poles',name:'The Poles',place:'Arctic and Antarctic ice',hab:'polar',deco:['🧊','🐧','❄️'],
  animals:[
   ['Penguin','🐧',1,.8,{plan:'bird',s:.8,body:'#1b1d22',wing:'#1b1d22',head:'#1b1d22',beak:'#f08a20',leg:.08,neck:0,upright:1,penguin:1,legCol:'#f08a20',sz:1.2}],
   ['Seal','🦭',1,.8,{plan:'seal',col:'#7e7e88',col2:'#5e5e66',tex:'spots',s:1.6}],
   ['Arctic Fox','🦊',1,2,{L:.75,W:.32,Hb:.36,leg:.34,legW:.045,neck:.18,neckW:.13,neckAng:1,headL:.3,headW:.25,headH:.23,col:'#f4f4f2',ears:'pointy',tail:'bushy',tl:.5,sz:1.4,paws:1,noBelly:1}],
   ['Walrus','🦭',2,.8,{plan:'seal',col:'#9a644a',col2:'#8a5440',walrus:1,s:2.4}],
   ['Snowy Owl','🦉',2,1.2,{plan:'bird',s:.55,body:'#f6f6f2',wing:'#e8e8e2',head:'#f6f6f2',beak:'#333',leg:.1,neck:0,upright:1,owl:1,fly:1,sz:1.6}],
   ['Polar Bear','🐻‍❄️',3,1.6,{L:2.3,W:1.05,Hb:1.1,leg:.8,legW:.18,neck:.55,neckW:.36,neckAng:1,headL:.55,headW:.42,headH:.42,col:'#f0ece0',snout:'#f0ece0',ears:'round',tail:'short',paws:1,noBelly:1}],
  ]},
];
const SP={};
CONT.forEach(c=>c.animals.forEach((a,i)=>{SP[c.id+':'+i]={k:c.id+':'+i,n:a[0],e:a[1],r:a[2],s:a[3],def:a[4],cont:c.id,hab:c.hab}}));
const VALUE=[0,20,60,150],RAR=['','Common','Rare','Super rare'],CAP={paddock:4,dome:10},CAGES=4;

/* ---- save game ---- */
function fresh(){return{coins:150,holding:[],cages:[],dex:{},uid:1,aid:4,areas:[
  {id:1,type:'dome',hab:'savanna',animals:[]},
  {id:2,type:'dome',hab:'rainforest',animals:[]},
  {id:3,type:'dome',hab:'polar',animals:[]}]}}
function load(){try{const t=localStorage.getItem('safariZoo1');return t?JSON.parse(t):null}catch(e){return null}}
function save(){try{localStorage.setItem('safariZoo1',JSON.stringify(S))}catch(e){}}
let S=load()||fresh();
S.cages=S.cages||[];
{const ok=x=>SP[x.k];S.holding=S.holding.filter(ok);S.cages=S.cages.filter(ok);S.areas.forEach(a=>a.animals=a.animals.filter(ok));
 for(const k in S.dex)if(!SP[k])delete S.dex[k]}
S.areas.forEach(a=>a.type='dome'); // every area is a big glass dome now
function happy(an,area){return SP[an.k].hab===area.hab}

let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2800)}
function coins(){document.querySelectorAll('.coinTxt').forEach(e=>e.textContent='🪙 '+S.coins);const c=$('#cagesTxt');if(c)c.textContent='🧺 '+S.cages.length+'/'+CAGES}
