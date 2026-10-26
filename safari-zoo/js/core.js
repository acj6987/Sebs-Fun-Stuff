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
  dino:{name:'Dino Zone',c:'#5a7a3a',i:'🦕'},
  carnivore:{name:'Carnivore Dino Zone',c:'#7a3a2a',i:'🦖'},
  ocean:{name:'Deep Blue Sea',c:'#2a9ad0',i:'🐠'},
  dream:{name:'Mummy Dream',c:'#ff7ac0',i:'💖'},
};
// how each habitat looks in 3D
const ENV={
  savanna:{zen:'#3d78c2',hor:'#f0d6a8',fog:'#e4cfa2',ground:'#b99a55',patch:'#9c8045',rock:'#8b7a62',water:'#3e7f92',grass:['#8a7a3a','#e0c878'],grassH:1.1,grassN:60000,sunEl:.55},
  rainforest:{zen:'#4f8fb8',hor:'#d6e6d2',fog:'#b5cdb5',ground:'#56732f',patch:'#3f5a24',rock:'#5b6650',water:'#355e4e',grass:['#2f5a1e','#6fa040'],grassH:.7,grassN:45000,sunEl:.75},
  jungle:{zen:'#5f9cd6',hor:'#e6eedb',fog:'#d5e2cb',ground:'#6f8f45',patch:'#587a35',rock:'#7d8576',water:'#4a8798',grass:['#4a7a2a','#9cc860'],grassH:.75,grassN:50000,sunEl:.6},
  woodland:{zen:'#4f86cc',hor:'#dfe9ee',fog:'#c9d8dc',ground:'#5b7d38',patch:'#46652a',rock:'#7a7c78',water:'#3f7896',grass:['#3c6a24','#88b850'],grassH:.55,grassN:55000,sunEl:.5},
  outback:{zen:'#2f74cc',hor:'#f2c99a',fog:'#e3b688',ground:'#b55f32',patch:'#9a4c26',rock:'#9a4a26',water:'#4f8a94',grass:['#8a8040','#d8c070'],grassH:.5,grassN:14000,sunEl:.6},
  dino:{zen:'#5d8fb8',hor:'#e2d8c0',fog:'#b8b8a0',ground:'#4f6a2c',patch:'#3a5222',rock:'#4a4440',water:'#3a6658',grass:['#2f5a1e','#7aa040'],grassH:.9,grassN:45000,sunEl:.5},
  ocean:{zen:'#2f86d8',hor:'#d8f0f4',fog:'#bfe2ea',ground:'#ead9a6',patch:'#d9c48a',rock:'#8a8478',water:'#1fa3b8',grass:null,grassN:0,sunEl:.7},
  dream:{zen:'#7a8ae8',hor:'#ffd8ec',fog:'#f4d6ea',ground:'#6aa84a',patch:'#5a9a3e',rock:'#b8a0b0',water:'#5ab8e8',grass:['#3f8a2e','#9ad860'],grassH:.6,grassN:50000,sunEl:.6},
  polar:{zen:'#6d9fd2',hor:'#eef4fa',fog:'#e4ecf3',ground:'#f2f6f9',patch:'#dde8f0',rock:'#4f5660',water:'#24557a',grass:null,grassN:0,sunEl:.25},
};
// [name, emoji, rarity, walk speed m/s, body plan + look]
const CONT=[
 {id:'africa',name:'Africa',place:'Serengeti savanna',hab:'savanna',deco:['🌳','🦓','🌾'],
  animals:[
   ['Zebra','🦓',1,2.2,{herd:[4,7],L:1.9,W:.68,Hb:.85,leg:.85,legW:.075,neck:.62,neckW:.16,neckAng:.55,headL:.62,headW:.24,headH:.27,col:'#f2efe8',tex:'stripes',col2:'#151515',freq:19,thin:.0,noBelly:1,mane:'#151515',snout:'#2a2626',nose:'#141212',ears:'pointy',tail:'tuft',graze:1}],
   ['Giraffe','🦒',1,1.8,{herd:[2,4],L:1.9,W:.72,Hb:.95,leg:1.75,legW:.07,neck:2.1,neckW:.13,neckAng:.28,headL:.58,headW:.2,headH:.24,col:'#e8c98d',tex:'giraffe',col2:'#8e4b1c',ossicones:1,ears:'long',tail:'tuft',tl:.8,graze:0}],
   ['Elephant','🐘',1,1.5,{herd:[3,5],L:3.2,W:1.6,Hb:2,leg:1.3,legW:.3,neck:.25,neckW:.62,neckAng:1.25,headL:1.05,headW:1,headH:1,col:'#8b8682',hoof:'#6c6864',ears:'big',trunk:1,tusks:1,tail:'tuft',tl:1,eyeS:.7,noBelly:1}],
   ['Hippo','🦛',2,1.6,{herd:[2,3],L:2.9,W:1.45,Hb:1.25,leg:.45,legW:.24,neck:.2,neckW:.55,neckAng:1.35,headL:.95,headW:.8,headH:.6,muzzle:1.6,col:'#7a6670',belly:'#b4868e',hoof:'#5a4a52',snout:'#8a6e78',ears:'round',tail:'short',hp:.2}],
   ['Rhino','🦏',2,1.8,{herd:[1,2],L:2.9,W:1.3,Hb:1.3,leg:.7,legW:.22,neck:.3,neckW:.5,neckAng:1.2,headL:.85,headW:.45,headH:.5,col:'#8a857f',hoof:'#5f5a55',horn:1,ears:'pointy',tail:'tuft',tl:.5,noBelly:1,hp:.45}],
   ['Lion','🦁',2,2,{hunts:['Zebra', 'Giraffe'],herd:[3,4],L:1.75,W:.58,Hb:.72,leg:.7,legW:.09,neck:.3,neckW:.24,neckAng:1.05,headL:.45,headW:.4,headH:.4,col:'#c4975a',lionMane:'#5a3518',snout:'#e0c49a',nose:'#8a5a4a',cheeks:1,ears:'round',tail:'tuft',tl:.9,tuftCol:'#3a2210',paws:1}],
   ['Gorilla','🦍',3,1.4,{herd:[2,3],plan:'ape',col:'#2a2a2c',face:'#3a3634',s:1.6}],
   ['Cheetah','🐆',3,2.4,{hunts:['Zebra'],herd:[1,2],L:1.4,W:.42,Hb:.5,leg:.8,legW:.06,neck:.3,neckW:.13,neckAng:1,headL:.32,headW:.26,headH:.24,col:'#dcb066',belly:'#f3e6c8',tex:'dots',col2:'#1e140a',ears:'round',tail:'long',tl:.85,snout:'#ecd8b0',cheeks:1,paws:1}],
  ]},
 {id:'samerica',name:'South America',place:'Amazon rainforest',hab:'rainforest',deco:['🌴','🦜','🌺'],
  animals:[
   ['Parrot','🦜',1,1.5,{herd:[2,4],plan:'bird',s:.55,body:'#d8251f',wing:'#2a5bd7',head:'#d8251f',beak:'#efe6d0',leg:.14,neck:.06,fly:1,tailL:.6,tailCol:'#2a5bd7',sz:2}],
   ['Monkey','🐒',1,2,{herd:[3,5],plan:'ape',col:'#7a5232',face:'#d9b38c',s:.65,tail:1,sz:1.4}],
   ['Poison Frog','🐸',1,1.2,{plan:'frog',col:'#2d6fe0',col2:'#111',tex:'spots',s:.45}],
   ['Llama','🦙',1,1.6,{herd:[3,5],L:1.3,W:.55,Hb:.75,leg:.9,legW:.075,neck:.95,neckW:.14,neckAng:.12,headL:.42,headW:.21,headH:.24,col:'#efe4d0',ears:'long',tail:'short',graze:1,hp:.35}],
   ['Sloth','🦥',2,.5,{plan:'ape',col:'#8a7a62',face:'#e2d3b2',s:.75}],
   ['Anaconda','🐍',2,1.4,{plan:'snake',col:'#4d6b2a',col2:'#1c280e',tex:'spots',s:1.4,n:24}],
   ['Flamingo','🦩',2,1.4,{herd:[5,8],plan:'bird',s:.7,body:'#f49ab0',wing:'#e8607c',head:'#f49ab0',beak:'#222',leg:1,neck:.85,neckAng:.15,legCol:'#e98aa0',beakL:.9}],
   ['Jaguar','🐆',3,2.2,{hunts:['Llama', 'Monkey'],L:1.65,W:.56,Hb:.62,leg:.62,legW:.09,neck:.3,neckW:.19,neckAng:1.05,headL:.38,headW:.35,headH:.32,col:'#d29a46',belly:'#f0e2c4',tex:'rosette',col2:'#22150a',ears:'round',tail:'long',tl:.75,snout:'#ecd2a0',cheeks:1,paws:1}],
  ]},
 {id:'asia',name:'Asia',place:'Bamboo forests and plains',hab:'jungle',deco:['🎋','🐼','🌸'],
  animals:[
   ['Peacock','🦚',1,1.3,{herd:[2,3],plan:'bird',s:.7,body:'#1d5fbf',wing:'#6a5a3a',head:'#1d5fbf',beak:'#777',leg:.45,neck:.4,neckAng:.25,fan:1,crest:1,legCol:'#8a7a6a'}],
   ['Water Buffalo','🐃',1,1.5,{herd:[3,5],L:2.4,W:1,Hb:1.1,leg:.75,legW:.13,neck:.3,neckW:.45,neckAng:1.25,headL:.62,headW:.4,headH:.4,col:'#3a3737',horns:'buffalo',ears:'round',tail:'tuft',graze:1,noBelly:1}],
   ['Camel','🐫',1,1.6,{herd:[2,3],L:2.2,W:.8,Hb:1,leg:1.4,legW:.1,neck:1.1,neckW:.18,neckAng:.85,headL:.52,headW:.23,headH:.26,hp:.1,col:'#c49c66',hump:1,ears:'round',tail:'tuft',graze:1,hoof:'#7a6040'}],
   ['Snow Monkey','🐵',1,1.8,{herd:[3,4],plan:'ape',col:'#b8afa5',face:'#e07a7a',s:.75,sz:1.3}],
   ['Orangutan','🦧',2,1.2,{plan:'ape',col:'#b0501c',face:'#7a5a48',s:1.25,arm:1.25}],
   ['Tiger','🐅',2,2,{hunts:['Water Buffalo', 'Peacock', 'Camel'],L:2.05,W:.64,Hb:.78,leg:.75,legW:.1,neck:.35,neckW:.26,neckAng:1.05,headL:.46,headW:.43,headH:.4,col:'#dd7f26',belly:'#f4ecdf',tex:'stripes',col2:'#120d08',freq:13,thin:.35,ears:'round',tail:'long',tl:.95,snout:'#f4ecdf',cheeks:1,paws:1}],
   ['Red Panda','🦊',2,1.5,{L:.65,W:.32,Hb:.32,leg:.26,legW:.05,neck:.1,neckW:.14,neckAng:1.2,headL:.27,headW:.27,headH:.24,col:'#b5482a',legCol:'#2a1a12',belly:'#3a2014',snout:'#f2ece2',ears:'pointy',earCol:'#f2ece2',tail:'ringed',tl:.5,col2:'#6b2a14',sz:1.6,paws:1}],
   ['Giant Panda','🐼',3,1.2,{L:1.5,W:1,Hb:1,leg:.5,legW:.17,neck:.15,neckW:.45,neckAng:1.25,headL:.6,headW:.62,headH:.56,col:'#f1efe8',panda:1,ears:'round',earCol:'#161616',tail:'short',paws:1,noBelly:1}],
  ]},
 {id:'namerica',name:'North America',place:'Rocky Mountain forests',hab:'woodland',deco:['🌲','🦬','🏔️'],
  animals:[
   ['Bison','🦬',1,1.6,{herd:[4,6],L:2.6,W:1.1,Hb:1.4,leg:.8,legW:.14,neck:.3,neckW:.6,neckAng:1.3,headL:.62,headW:.55,headH:.5,col:'#4a3324',shag:'#2e1e14',hump:1,horns:'bison',ears:'round',tail:'tuft',graze:1}],
   ['Deer','🦌',1,2,{herd:[3,5],L:1.45,W:.45,Hb:.6,leg:1,legW:.055,neck:.6,neckW:.12,neckAng:.38,headL:.42,headW:.2,headH:.22,col:'#97653a',belly:'#e8dcc8',antlers:1,ears:'long',tail:'short',tailCol:'#f2ece2',graze:1}],
   ['Raccoon','🦝',1,1.4,{herd:[2,3],L:.62,W:.36,Hb:.36,leg:.25,legW:.055,neck:.08,neckW:.16,neckAng:1.2,headL:.27,headW:.27,headH:.24,col:'#7d7a76',mask:1,ears:'pointy',tail:'ringed',tl:.42,col2:'#2a2826',snout:'#e8e4dc',sz:1.5,paws:1}],
   ['Skunk','🦨',1,1.1,{L:.55,W:.32,Hb:.3,leg:.18,legW:.05,neck:.08,neckW:.13,neckAng:1.25,headL:.24,headW:.22,headH:.2,col:'#161616',stripe:1,ears:'round',tail:'bushy',tl:.55,tailCol:'#161616',tip:'#f4f4f4',sz:1.6,paws:1,noBelly:1}],
   ['Beaver','🦫',2,1,{L:.85,W:.48,Hb:.45,leg:.16,legW:.07,neck:.06,neckW:.2,neckAng:1.3,headL:.3,headW:.3,headH:.26,col:'#6b4528',ears:'round',tail:'flat',sz:1.4,paws:1}],
   ['Grizzly Bear','🐻',2,1.6,{hunts:['Deer'],L:2,W:1.1,Hb:1.1,leg:.7,legW:.19,neck:.3,neckW:.5,neckAng:1.2,headL:.55,headW:.5,headH:.48,col:'#6b4a2b',hump:1,ears:'round',tail:'short',paws:1}],
   ['Bald Eagle','🦅',3,1.4,{plan:'bird',s:.85,body:'#4a2e1a',wing:'#3b2414',head:'#f6f4ee',beak:'#f2c230',leg:.25,neck:.12,fly:1,tailCol:'#f6f4ee',legCol:'#f2c230'}],
   ['Grey Wolf','🐺',2,2.2,{hunts:['Deer', 'Bison', 'Wild Boar'],herd:[4,6],L:1.35,W:.42,Hb:.52,leg:.72,legW:.065,neck:.35,neckW:.17,neckAng:.9,headL:.42,headW:.26,headH:.25,col:'#6f6e6a',belly:'#d0cec8',snout:'#d0cec8',ears:'pointy',tail:'bushy',tl:.55,tip:'#2a2a28',paws:1}],
  ]},
 {id:'europe',name:'Europe',place:'Old woods and meadows',hab:'woodland',deco:['🌳','🦊','🍄'],
  animals:[
   ['Hedgehog','🦔',1,.8,{plan:'hedgehog',col:'#5a4430',col2:'#e8dcc8',tex:'spots',s:.5,sz:1.6}],
   ['Swan','🦢',1,1,{herd:[2,4],plan:'bird',s:.8,body:'#f7f6f2',wing:'#efede6',head:'#f7f6f2',beak:'#f07a20',leg:.15,neck:.75,neckAng:-.1,legCol:'#333'}],
   ['Badger','🦡',1,1.2,{L:.85,W:.48,Hb:.38,leg:.2,legW:.06,neck:.08,neckW:.2,neckAng:1.3,headL:.32,headW:.26,headH:.24,col:'#77767a',legCol:'#1d1d1d',head:'#f2f2ee',badger:1,ears:'round',tail:'short',sz:1.4,paws:1}],
   ['Fox','🦊',1,2,{L:.78,W:.3,Hb:.35,leg:.38,legW:.045,neck:.2,neckW:.12,neckAng:1,headL:.33,headW:.24,headH:.22,col:'#cc6128',legCol:'#3a2418',belly:'#f2ece2',snout:'#f2ece2',ears:'pointy',tail:'bushy',tl:.5,tip:'#f4f1ea',sz:1.4,paws:1}],
   ['Wild Boar','🐗',2,2,{herd:[3,4],L:1.45,W:.62,Hb:.72,leg:.45,legW:.08,neck:.2,neckW:.4,neckAng:1.35,headL:.62,headW:.38,headH:.4,col:'#4a3a2e',tusks:.5,ears:'pointy',snout:'#3a2c24',tail:'short',graze:1,hp:.5}],
   ['Owl','🦉',2,1.2,{plan:'bird',s:.5,body:'#8a6a45',wing:'#6e5233',head:'#8a6a45',beak:'#d9b25a',leg:.1,neck:0,upright:1,owl:1,fly:1,sz:1.6}],
   ['Grey Wolf','🐺',3,2.2,{hunts:['Deer', 'Bison', 'Wild Boar'],herd:[4,6],L:1.35,W:.42,Hb:.52,leg:.72,legW:.065,neck:.35,neckW:.17,neckAng:.9,headL:.42,headW:.26,headH:.25,col:'#878783',belly:'#d8d6d0',snout:'#d8d6d0',ears:'pointy',tail:'bushy',tl:.55,tip:'#3a3a38',paws:1}],
  ]},
 {id:'australia',name:'Australia',place:'Red outback',hab:'outback',deco:['🦘','🪨','🌿'],
  animals:[
   ['Kangaroo','🦘',1,2.5,{herd:[3,5],plan:'hopper',col:'#a8744a',belly:'#e0c4a0',s:1.3}],
   ['Frilled Lizard','🦎',1,1.4,{plan:'lizard',col:'#8a6a3a',col2:'#5a4428',tex:'spots',frill:'#e06a2a',s:.55,sz:1.8}],
   ['Black Swan','🦢',1,1,{herd:[2,4],plan:'bird',s:.75,body:'#1d1d22',wing:'#2a2a30',head:'#1d1d22',beak:'#d92a2a',leg:.15,neck:.72,neckAng:-.1,legCol:'#222'}],
   ['Crocodile','🐊',2,1,{hunts:['Kangaroo', 'Black Swan'],plan:'lizard',col:'#4b5a2c',col2:'#2f3a1a',tex:'spots',belly:'#c8c290',s:1.9,croc:1}],
   ['Taipan','🐍',2,1.6,{plan:'snake',col:'#8a6a3a',col2:'#6a4e28',tex:'spots',belly:'#e8d8a8',s:.9,n:20}],
   ['Koala','🐨',3,.7,{L:.62,W:.5,Hb:.52,leg:.26,legW:.09,neck:.08,neckW:.25,neckAng:1.1,headL:.42,headW:.46,headH:.4,col:'#8f9396',belly:'#e8e8e6',ears:'fluffy',nose:'#1d1d1d',muzzle:1.2,tail:'short',sz:1.5,paws:1}],
  ]},
 {id:'poles',name:'The Poles',place:'Arctic and Antarctic ice',hab:'polar',deco:['🧊','🐧','❄️'],
  animals:[
   ['Penguin','🐧',1,.8,{herd:[5,8],plan:'bird',s:.8,body:'#1b1d22',wing:'#1b1d22',head:'#1b1d22',beak:'#f08a20',leg:.08,neck:0,upright:1,penguin:1,legCol:'#f08a20',sz:1.2}],
   ['Seal','🦭',1,.8,{herd:[3,5],plan:'seal',col:'#7e7e88',col2:'#5e5e66',tex:'spots',s:1.6}],
   ['Arctic Fox','🦊',1,2,{herd:[1,2],L:.75,W:.32,Hb:.36,leg:.34,legW:.045,neck:.18,neckW:.13,neckAng:1,headL:.3,headW:.25,headH:.23,col:'#f4f4f2',ears:'pointy',tail:'bushy',tl:.5,sz:1.4,paws:1,noBelly:1}],
   ['Walrus','🦭',2,.8,{herd:[2,3],plan:'seal',col:'#9a644a',col2:'#8a5440',walrus:1,s:2.4}],
   ['Snowy Owl','🦉',2,1.2,{plan:'bird',s:.55,body:'#f6f6f2',wing:'#e8e8e2',head:'#f6f6f2',beak:'#333',leg:.1,neck:0,upright:1,owl:1,fly:1,sz:1.6}],
   ['Polar Bear','🐻‍❄️',3,1.6,{hunts:['Seal', 'Penguin', 'Walrus'],L:2.3,W:1.05,Hb:1.1,leg:.8,legW:.18,neck:.55,neckW:.36,neckAng:1,headL:.55,headW:.42,headH:.42,col:'#f0ece0',snout:'#f0ece0',ears:'round',tail:'short',paws:1,noBelly:1}],
  ]},
 {id:'dino',name:'🦖 Dino Zone',place:'Dinosaur island with a volcano',hab:'dino',deco:['🦖','🌋','🦕'],
  animals:[
   ['Velociraptor','🦖',1,2.6,{home:'carnivore',hunts:['Parasaurolophus'],herd:[10,12],plan:'theropod',hip:.95,L:1.6,W:.42,Hb:.55,neck:.5,neckW:.13,headL:.48,headW:.18,headH:.2,tail:1.8,arm:.55,legW:.1,col:'#8a6a42',col2:'#3a2a18',belly:'#d8c8a0',tex:'stripes',freq:9,thin:.35,raptor:1}],
   ['Triceratops','🦕',1,1.4,{herd:[3,4],L:4.4,W:2,Hb:2,leg:1.1,legW:.3,neck:.3,neckW:.7,neckAng:1.35,headL:1.6,headW:.9,headH:.9,hp:.45,col:'#7a6a4a',col2:'#a8703a',belly:'#a89878',tri:1,ears:'none',tail:'dino',tl:2.6,scaly:1,graze:1,nose:'#5a4a38'}],
   ['Stegosaurus','🦕',1,1.2,{herd:[2,3],L:4.4,W:1.5,Hb:2,leg:1.25,legW:.27,neck:.6,neckW:.38,neckAng:1.5,headL:.6,headW:.28,headH:.3,hp:.6,col:'#6a7a4a',col2:'#b0583a',belly:'#a8a888',plates:1,ears:'none',tail:'dino',tl:3,scaly:1,graze:1}],
   ['Pteranodon','🦅',2,1.5,{herd:[2,3],plan:'bird',s:1.3,body:'#8a6a4a',wing:'#7a5a3a',head:'#8a6a4a',beak:'#d8c8a0',beakL:2.4,leg:.35,neck:.35,fly:1,crest:1,tailL:.1,legCol:'#5a4a3a'}],
   ['Brachiosaurus','🦕',2,1.2,{herd:[2,3],L:5,W:2.2,Hb:2.6,leg:3,legW:.42,neck:6.5,neckW:.5,neckAng:.32,headL:1,headW:.45,headH:.5,hp:.6,col:'#7a8070',belly:'#a8ab98',ears:'none',tail:'dino',tl:5,scaly:1,hoof:'#5a5a50'}],
   ['Parasaurolophus','🦕',1,1.4,{herd:[4,6],L:3.4,W:1.15,Hb:1.5,leg:1.5,legW:.24,neck:1.1,neckW:.32,neckAng:.65,headL:.8,headW:.3,headH:.34,hp:.55,col:'#7a8a5a',col2:'#4a5a3a',belly:'#c8c8a0',tex:'stripes',freq:3,thin:.6,ears:'none',tail:'dino',tl:3,scaly:1,graze:1,crestTube:1}],
   ['Ankylosaurus','🦕',2,1,{herd:[1,2],L:4.2,W:2.3,Hb:1.4,leg:.75,legW:.3,neck:.3,neckW:.6,neckAng:1.45,headL:.7,headW:.6,headH:.45,hp:.4,col:'#7a6a50',col2:'#5a4a38',belly:'#a89878',tex:'spots',ears:'none',tail:'dino',tl:3,scaly:1,armor:1,club:1}],
   ['Dilophosaurus','🦖',2,2.2,{home:'carnivore',hunts:['Parasaurolophus'],herd:[2,3],plan:'theropod',hip:1.35,L:2.2,W:.6,Hb:.8,neck:.8,neckW:.18,headL:.6,headW:.24,headH:.26,tail:2.6,arm:.6,legW:.16,col:'#7a7a3a',col2:'#2a4a6a',belly:'#d8d0a0',tex:'stripes',freq:7,thin:.4,dcrest:1}],
   ['Spinosaurus','🦖',2,2,{home:'carnivore',hunts:['Velociraptor','Triceratops','Stegosaurus','Brachiosaurus','Parasaurolophus','Ankylosaurus','Dilophosaurus','Diplodocus'],plan:'theropod',hip:2.6,L:4.6,W:1.3,Hb:1.7,neck:1.2,neckW:.42,headL:1.7,headW:.5,headH:.5,tail:5,arm:1.2,legW:.36,col:'#6a5a48',col2:'#a84a2a',belly:'#b8a888',sail:1}],
   ['T-Rex','🦖',3,2.2,{home:'carnivore',hunts:['Velociraptor','Triceratops','Stegosaurus','Brachiosaurus','Parasaurolophus','Ankylosaurus','Dilophosaurus','Diplodocus','Spinosaurus'],plan:'theropod',hip:3,L:4.2,W:1.6,Hb:1.9,neck:1,neckW:.55,headL:1.5,headW:.8,headH:.9,tail:5.5,arm:.8,legW:.45,col:'#5a5040',col2:'#3a3428',belly:'#a89878',tex:'stripes',freq:4,thin:.55,chase:1}],
   ['Diplodocus','🦕',2,1.1,{herd:[2,3],L:6,W:2.1,Hb:2.3,leg:2.5,legW:.4,neck:7.5,neckW:.45,neckAng:1.0,headL:.8,headW:.32,headH:.34,hp:.25,col:'#8a8a72',col2:'#6a6a58',belly:'#b8b8a0',tex:'stripes',freq:2,thin:.7,ears:'none',tail:'dino',tl:9,scaly:1,graze:1,hoof:'#5a5a50'}],
  ]},
];
// the sea: islands, loads of fish, and the one and only Sparkle Zebraffe
const FISHES=['Clownfish','Blue Tang','Yellow Tang','Angelfish','Pufferfish'];
CONT.push({id:'ocean',name:'🌊 Deep Blue Sea',place:'Deep blue sea with islands',hab:'ocean',sea:1,deco:['🏝️','🐠','✨'],
  animals:[
   ['Clownfish','🐠',1,1.6,{swim:1,herd:[4,6],sz:2,plan:'fish',s:.5,tall:.42,wide:.17,col:'#ff7a12',tex:'stripes',col2:'#ffffff',freq:6,thin:.6,noBelly:1,fin:'#ff8a2a'}],
   ['Blue Tang','🐟',1,1.8,{swim:1,herd:[5,8],sz:2,plan:'fish',s:.55,tall:.5,wide:.15,col:'#2a5fe0',tex:'spots',col2:'#0e1a40',noBelly:1,fin:'#ffd23a'}],
   ['Yellow Tang','🐟',1,1.6,{swim:1,herd:[6,9],sz:2,plan:'fish',s:.5,tall:.6,wide:.14,col:'#ffd81f',noBelly:1,fin:'#ffe45a',fin2:1,belly2:1}],
   ['Angelfish','🐟',1,1.3,{swim:1,herd:[3,5],sz:2,plan:'fish',s:.5,tall:.75,wide:.12,col:'#f2ecc0',tex:'stripes',col2:'#1a1a1a',freq:9,thin:.5,noBelly:1,fin:'#e8d070',fin2:1.6,belly2:1}],
   ['Pufferfish','🐡',2,1.1,{swim:1,herd:[1,2],sz:2,plan:'fish',s:.6,tall:.7,wide:.32,col:'#d8c070',tex:'spots',col2:'#5a4a20',spikes:1,fin:'#c8b060',dorsalS:.15}],
   ['Dolphin','🐬',2,3.2,{swim:1,jump:1,herd:[3,5],plan:'fish',s:2.6,tall:.22,wide:.13,col:'#8a98a8',belly:'#eef2f4',beak:1,flukes:1,dorsalS:.14,fin2:1,fin:'#7a8898'}],
   ['Manta Ray','🐟',2,1.5,{swim:1,herd:[1,2],plan:'fish',ray:1,s:3,tall:.16,col:'#2a3038',belly:'#eaeaea'}],
   ['Sea Turtle','🐢',2,.8,{amph:1,plan:'lizard',s:1.1,col:'#7a8a5a',shell:'#6a5232',belly:'#d8c890'}],
   ['Seagull','🕊️',1,1.4,{herd:[3,5],plan:'bird',s:.45,body:'#f4f4f2',wing:'#9aa4ae',head:'#f4f4f2',beak:'#f2c12e',leg:.12,neck:.06,fly:1,tailL:.4,legCol:'#e8a04a'}],
   ['Shark','🦈',3,2.4,{swim:1,hunts:FISHES,plan:'fish',s:4,tall:.2,wide:.12,col:'#7d8a96',belly:'#eef2f4',dorsalS:.13,fin2:1.2,fin:'#6d7a86'}],
   ['Mummy Dream (girl)','💖',3,2,{home:'dream',female:1,mate:'ocean:11',amph:1,soar:1,fly:1,glam:1,L:1.9,W:.72,Hb:.95,leg:1.6,legW:.075,neck:1.7,neckW:.14,neckAng:.32,headL:.6,headW:.24,headH:.27,col:'#ffd83a',col2:'#ff4fa3',lineCol:'#ffd83a',belly:'#fff0a0',freq:16,thin:.1,mane:'#ff3d9a',ossicones:1,ears:'pointy',tail:'tuft',tuftCol:'#ff3d9a',tl:.8,hoof:'#ff2d8a',snout:'#ffc4dc',nose:'#ff6aa8',eyeS:1.8,top:'#9b3fd6',nails:['#ff2d8a','#a23cff'],graze:1}],
  ]});
// the Mummy Dreams: only two in the whole world, a girl and a boy who always stay together
{const girl=CONT.at(-1).animals[10];CONT.at(-1).animals.push(['Mummy Dream (boy)','💙',3,2,Object.assign({},girl[4],{female:0,male:1,mate:'ocean:10',top:'#2f6fe0',nails:['#2fd1ff','#2f6fe0'],tuftCol:'#2f8fff',mane:'#ff3d9a'})])}
// more to catch in the Deep Blue Sea
CONT.at(-1).animals.push(
  ['Seahorse','🦄',1,.8,{swim:1,herd:[2,3],plan:'seahorse',s:.6,sz:2,col:'#ff9a3a',tex:'dots',col2:'#ffd27a',noBelly:1,fin:'#ffd27a'}],
  ['Jellyfish','🪼',1,.6,{swim:1,herd:[3,5],plan:'jelly',s:.9,col:'#ff9ae0',col2:'#c47aff',glow:'#ff7ad8',noBelly:1}],
  ['Octopus','🐙',2,1,{swim:1,plan:'octo',s:1.3,col:'#e2553a',tex:'dots',col2:'#ffb08a',noBelly:1}],
  ['Starfish','⭐',1,.2,{herd:[2,4],plan:'star',s:.5,sz:1.6,col:'#ff7a3a',tex:'dots',col2:'#ffd0a0',noBelly:1}],
  ['Mermaid','🧜‍♀️',3,2.4,{swim:1,herd:[1,2],plan:'mermaid',s:2,sparkle:1,skin:'#f2c4a0',hair:'#ff5aa8',top:'#b45aff',col:'#2fd1c0',tex:'dots',col2:'#7affea',noBelly:1,fin:'#4af0d8'}],
  ['Great White Seal Bear','🦭',3,2.6,{home:'dream',amph:1,chase:1,hunts:[...FISHES,'Dolphin','Sea Turtle','Seagull','Seahorse'],plan:'seal',s:2.6,shark:1,col:'#4a5560',belly:'#f2f4f6',fin:'#3e4852'}]);
// the Great White Seal Bear and the Mummy Dreams can have babies together: Sparkle Seal Bears!
CONT.at(-1).animals.push(
  ['Sparkle Seal Bear','🌟',3,2.2,{bornOnly:1,home:'dream',amph:1,soar:1,fly:1,fairy:1,sparkle:1,plan:'seal',s:2,shark:1,col:'#ffd83a',belly:'#fff0f6',tex:'stripes',col2:'#ff4fa3',freq:9,thin:.4,fin:'#ff4fa3'}],
  ['White Jiggly Hippo','🦛',2,1.4,{amph:1,jiggle:1,herd:[2,3],L:2.9,W:1.45,Hb:1.25,leg:.45,legW:.24,neck:.2,neckW:.55,neckAng:1.35,headL:.95,headW:.8,headH:.6,muzzle:1.6,col:'#f6f4f2',belly:'#ffdbe4',hoof:'#e8c8d0',snout:'#ffe2ea',ears:'round',earCol:'#ffc0d0',tail:'short',hp:.2}],
  ['Bubble Dragon','🐉',3,2,{amph:1,soar:1,fly:1,fairy:1,sparkle:1,plan:'lizard',s:1.6,col:'#3ab8ff',tex:'spots',col2:'#b45aff',belly:'#c8f0ff',frill:'#ff7ad8'}]);
const DREAM=['ocean:10','ocean:11'],DREAM_PRIZE=2000000;
function owns(k){return S.cages.some(c=>c.k===k)||S.holding.some(c=>c.k===k)||S.areas.some(a=>a.animals.some(x=>x.k===k))}
const SP={};
ENV.carnivore=ENV.dino;
CONT.forEach(c=>c.animals.forEach((a,i)=>{SP[c.id+':'+i]={k:c.id+':'+i,n:a[0],e:a[1],r:a[2],s:a[3],def:a[4],cont:c.id,hab:a[4].home||c.hab}}));
const VALUE=[0,20,60,150],RAR=['','Common','Rare','Super rare'],CAP={paddock:9999,dome:9999},CAGES=6,PENS=2,PEN_SIZE=6;

/* ---- save game ---- */
function fresh(){return{coins:150,holding:[],cages:[],dex:{},uid:1,aid:4,areas:[
  {id:1,type:'dome',hab:'savanna',animals:[]},
  {id:2,type:'dome',hab:'rainforest',animals:[]},
  {id:3,type:'dome',hab:'polar',animals:[]}]}}
function load(){try{const t=localStorage.getItem('safariZoo1');return t?JSON.parse(t):null}catch(e){return null}}
function save(){try{localStorage.setItem('safariZoo1',JSON.stringify(S))}catch(e){}}
let S=load()||fresh();
S.cages=S.cages||[];
// 🧬 animals you make in the DNA Lab by mixing two animals' DNA
function mixDef(da,db){
  const d=Object.assign({},da),same=(da.plan||'quad')===(db.plan||'quad');
  for(const k of['herd','hunts','chase','home','mate','female','male','bornOnly'])delete d[k];
  if(same)for(const k of['L','W','Hb','leg','legW','neck','neckW','headL','headW','headH','s','hip','arm','tl','sz'])if(typeof da[k]==='number'&&typeof db[k]==='number')d[k]=(da[k]+db[k])/2;
  // the second animal gives its colours and patterns
  const c=db.col||db.body;if(c){d.col=c;if(d.body)d.body=c}for(const k of['col2','tex','belly','freq','thin','mane','tuftCol'])if(db[k]!=null)d[k]=db[k];else if(k!=='mane'&&k!=='tuftCol')delete d[k];
  if((da.plan||'quad')==='bird'){d.wing=db.col2||db.wing||c;d.head=c}
  if(same)for(const k of['horn','horns','tusks','trunk','lionMane','ossicones','plates','tri','sail','armor','club','crestTube','spikes','raptor','dcrest','shark','shell'])if(db[k]&&!d[k])d[k]=db[k];
  if(db.fly||db.soar||db.fairy){d.fly=1;d.soar=1;d.fairy=1}if(db.sparkle||db.glam)d.sparkle=1;if(db.jiggle)d.jiggle=1;
  if(da.swim!==db.swim){delete d.swim;d.amph=1}
  return d;
}
function mixName(a,b){const x=a.n.replace(/\s*\(.*\)/,'').split(' ').pop(),y=b.n.replace(/\s*\(.*\)/,'').split(' ').pop();return x.slice(0,Math.ceil(x.length/2))+y.slice(Math.floor(y.length/2)).toLowerCase()}
function addMix(m,i){const a=SP[m.a],b=SP[m.b];if(!a||!b)return;const k='mix:'+i;SP[k]={k,n:m.n,e:'🧬',r:3,s:(a.s+b.s)/2,def:mixDef(a.def,b.def),cont:'mix',hab:a.hab}}
S.mixes=S.mixes||[];S.mixes.forEach(addMix);S.dna=S.dna||{};
{const ok=x=>SP[x.k];S.holding=S.holding.filter(ok);S.cages=S.cages.filter(ok);S.areas.forEach(a=>a.animals=a.animals.filter(ok));
 for(const k in S.dex)if(!SP[k])delete S.dex[k]}
S.areas.forEach(a=>a.type='dome'); // every area is a big glass dome now
S.areas.forEach(a=>a.eggs=a.eggs||[]);
// reptiles, birds, frogs and dinosaurs lay eggs; mammals have babies
function laysEggs(sp){const p=sp.def.plan||'quad';return['bird','lizard','snake','frog','theropod','fish'].includes(p)||!!sp.def.scaly||sp.hab==='dino'}
const GROW=8*60*1000; // babies take 8 minutes to grow up
function happy(an,area){return SP[an.k].hab===area.hab}

let toastT;
function toast(m,ms=2800){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,ms)}
// catching both Mummy Dreams wins the giant prize
function checkDream(){
  if(S.dreamBonus||!DREAM.every(owns))return;
  S.dreamBonus=1;S.coins+=DREAM_PRIZE;S.freeDomes=(S.freeDomes||0)+60;save();coins();
  toast('💖💙 YOU CAUGHT BOTH MUMMY DREAMS! You win 2,000,000 coins (1 million for each!), 60 free domes, a giant Mummy Dream Dome where they can have babies, and 6 million visitors are coming to your zoo!',12000);
  const pz=$('#prize');if(pz){pz.hidden=false;clearTimeout(pz.t);pz.t=setTimeout(()=>pz.hidden=true,12000)}}
function smallUsed(){return S.cages.filter(c=>c.pen==null).length}
function pensUsed(){return new Set(S.cages.filter(c=>c.pen!=null).map(c=>c.pen)).size}
function coins(){document.querySelectorAll('.coinTxt').forEach(e=>e.textContent='🪙 '+S.coins);const c=$('#cagesTxt');if(c)c.textContent='🧺 '+smallUsed()+'/'+CAGES+' cages · '+pensUsed()+'/'+PENS+' pens'}
