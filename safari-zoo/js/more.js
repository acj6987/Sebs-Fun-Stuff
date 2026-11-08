// About 850 more real and extinct animals, made from body types. Each line is:
// name, emoji, body type, rarity (1-3), size, colour, second colour, then optional extras.
// New animals are always added to the end of each list, so saved games keep working.
function moreAnimals(CONT){
const hx=(c,f)=>{const n=parseInt(c.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=f<0?0:255,k=Math.abs(f);r=Math.round(r+(t-r)*k);g=Math.round(g+(t-g)*k);b=Math.round(b+(t-b)*k);return'#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)};
const MK={
  cat:(m,a,b)=>({real:1,headType:'cat',lean:1,L:1.6*m,W:.5*m,Hb:.6*m,leg:.6*m,legW:.08*m,neck:.3*m,neckW:.2*m,neckAng:1,headL:.38*m,headW:.34*m,headH:.3*m,col:a,col2:b,back:hx(a,-.12),belly:hx(a,.45),snout:hx(a,.4),cheeks:1,ears:'round',tail:'long',tl:1*m,paws:1}),
  dog:(m,a,b)=>({real:1,L:1.1*m,W:.36*m,Hb:.44*m,leg:.6*m,legW:.055*m,neck:.3*m,neckW:.15*m,neckAng:.95,headL:.37*m,headW:.22*m,headH:.21*m,col:a,col2:b,back:b,belly:hx(a,.35),snout:hx(a,.3),ears:'pointy',tail:'bushy',tl:.5*m,paws:1}),
  deer:(m,a,b)=>({real:1,headType:'horse',lean:1,L:1.4*m,W:.42*m,Hb:.6*m,leg:.9*m,legW:.045*m,neck:.5*m,neckW:.11*m,neckAng:.55,headL:.36*m,headW:.16*m,headH:.18*m,col:a,col2:b,back:b,belly:'#f2ece0',ears:'pointy',tail:'short',hoof:'#1e1712',graze:1}),
  bovid:(m,a,b)=>({real:1,L:2.3*m,W:.95*m,Hb:1.1*m,leg:.75*m,legW:.13*m,neck:.3*m,neckW:.45*m,neckAng:1.25,headL:.6*m,headW:.4*m,headH:.42*m,col:a,col2:b,back:b,ears:'round',tail:'tuft',graze:1,noBelly:1,horns:'buffalo'}),
  bear:(m,a,b)=>({real:1,L:2*m,W:.95*m,Hb:1*m,leg:.68*m,legW:.17*m,neck:.42*m,neckW:.32*m,neckAng:1.05,headL:.5*m,headW:.4*m,headH:.4*m,col:a,col2:b,back:b,snout:hx(a,.25),hump:1,ears:'round',tail:'short',paws:1,noBelly:1}),
  rodent:(m,a,b)=>({real:1,L:.5*m,W:.24*m,Hb:.24*m,leg:.12*m,legW:.035*m,neck:.06*m,neckW:.1*m,neckAng:1.2,headL:.2*m,headW:.14*m,headH:.13*m,col:a,col2:b,back:b,belly:hx(a,.4),ears:'round',tail:'long',tl:.4*m,paws:1,sz:1.3}),
  weasel:(m,a,b)=>({real:1,L:.8*m,W:.22*m,Hb:.22*m,leg:.14*m,legW:.04*m,neck:.15*m,neckW:.1*m,neckAng:1,headL:.2*m,headW:.14*m,headH:.12*m,col:a,col2:b,back:b,belly:hx(a,.4),ears:'round',tail:'long',tl:.4*m,paws:1,sz:1.3}),
  pig:(m,a,b)=>({real:1,L:1.3*m,W:.55*m,Hb:.62*m,leg:.4*m,legW:.07*m,neck:.15*m,neckW:.34*m,neckAng:1.35,headL:.58*m,headW:.36*m,headH:.34*m,hp:.55,col:a,col2:b,back:b,snout:hx(a,-.05),ears:'pointy',tail:'short',graze:1}),
  horse:(m,a,b)=>({real:1,headType:'horse',L:1.9*m,W:.66*m,Hb:.85*m,leg:.85*m,legW:.075*m,neck:.62*m,neckW:.16*m,neckAng:.55,headL:.62*m,headW:.24*m,headH:.27*m,col:a,col2:b,back:hx(a,-.1),mane:b,ears:'pointy',earS:1.2,tail:'tuft',tuftCol:b,graze:1}),
  ape:(m,a,b)=>({plan:'ape',col:a,face:b,s:m,tail:1}),
  apeN:(m,a,b)=>({plan:'ape',col:a,face:b,s:m}),
  bird:(m,a,b,c)=>({plan:'bird',s:.5*m,body:a,wing:b,head:c||a,beak:'#2a2a2a',leg:.14*m,neck:.06*m,fly:1,tailCol:b,legCol:'#6a5a4a',sz:1.4}),
  wader:(m,a,b,c)=>({plan:'bird',s:.6*m,body:a,wing:b,head:c||a,beak:'#3a3a2a',beakL:1.6,leg:.9*m,neck:.7*m,neckAng:.2,legCol:'#4a4a3a',fly:1}),
  hawk:(m,a,b,c)=>({plan:'bird',s:.8*m,body:a,wing:b,head:c||a,beak:'#e8b830',leg:.22*m,neck:.1*m,fly:1,tailCol:b,legCol:'#e8b830'}),
  owl:(m,a,b)=>({plan:'bird',s:.5*m,body:a,wing:b,head:a,beak:'#d9b25a',leg:.1*m,neck:0,upright:1,owl:1,fly:1,sz:1.6}),
  parrot:(m,a,b,c)=>({plan:'bird',s:.5*m,body:a,wing:b,head:c||a,beak:'#2a2a2a',leg:.14*m,neck:.05*m,fly:1,tailL:.6,tailCol:b,legCol:'#5a5a5a',sz:1.6}),
  fowl:(m,a,b,c)=>({plan:'bird',s:.6*m,body:a,wing:b,head:c||a,beak:'#c8a040',leg:.3*m,neck:.2*m,legCol:'#c8a040'}),
  duck:(m,a,b,c)=>({plan:'bird',s:.55*m,body:a,wing:b,head:c||a,beak:'#e8a030',leg:.12*m,neck:.25*m,neckAng:.3,fly:1,legCol:'#e8a030',nearWater:1}),
  ratite:(m,a,b,c)=>({plan:'bird',s:1.2*m,body:a,wing:b,head:c||a,beak:'#4a4a4a',leg:1*m,neck:.9*m,neckAng:.12,legCol:'#5a5048',beakL:.4}),
  penguin:(m,a,b)=>({plan:'bird',s:.8*m,body:a,wing:a,head:a,beak:b||'#f08a20',leg:.08*m,neck:0,upright:1,penguin:1,legCol:'#f08a20',sz:1.2}),
  lizard:(m,a,b)=>({plan:'lizard',s:.6*m,col:a,col2:b,tex:'spots',belly:hx(a,.35),sz:1.4}),
  croc:(m,a,b)=>({plan:'lizard',s:1.9*m,col:a,col2:b,tex:'spots',belly:'#c8c294',croc:1,nearWater:1,amph:1}),
  turtle:(m,a,b)=>({plan:'lizard',s:.8*m,col:a,shell:b,belly:'#d8c890',amph:1}),
  snake:(m,a,b)=>({plan:'snake',col:a,col2:b,tex:'spots',belly:hx(a,.4),s:1*m,n:20}),
  frog:(m,a,b)=>({plan:'frog',col:a,col2:b,tex:'spots',s:.4*m}),
  fish:(m,a,b)=>({swim:1,plan:'fish',s:.5*m,tall:.4,wide:.15,col:a,col2:b,tex:'stripes',freq:6,thin:.6,belly:hx(a,.4),fin:b,sz:1.6}),
  shark:(m,a)=>({swim:1,plan:'fish',s:3*m,tall:.2,wide:.12,col:a,belly:'#eef2f4',dorsalS:.14,fin2:1.3,fin:hx(a,-.1)}),
  whale:(m,a,b)=>({swim:1,plan:'fish',s:6*m,tall:.22,wide:.15,col:a,belly:b||'#d8dce0',flukes:1,dorsalS:.06,fin2:.7,fin:a}),
  dolphin:(m,a,b)=>({swim:1,jump:1,plan:'fish',s:2.4*m,tall:.22,wide:.13,col:a,belly:b||'#eef2f4',beak:1,flukes:1,dorsalS:.14,fin2:1,fin:a}),
  ray:(m,a)=>({swim:1,plan:'fish',ray:1,s:1.5*m,tall:.16,col:a,belly:'#eaeaea'}),
  seal:(m,a,b)=>({plan:'seal',col:a,col2:b,tex:'spots',s:1.4*m,amph:1}),
  hopper:(m,a)=>({plan:'hopper',col:a,belly:hx(a,.4),s:1*m}),
  spiny:(m,a,b)=>({plan:'hedgehog',col:a,col2:b,tex:'spots',s:.5*m,sz:1.4}),
  // extinct animals
  rex:(m,a,b)=>({home:'carnivore',chase:1,plan:'theropod',hip:2.2*m,L:3.2*m,W:1*m,Hb:1.3*m,neck:.8*m,neckW:.38*m,headL:1*m,headW:.45*m,headH:.5*m,tail:4*m,arm:.8*m,legW:.3*m,real:1,skin:1,dim:.8,col:a,back:hx(a,-.12),col2:b,belly:hx(a,.3),tex:'stripes',freq:7,thin:.6}),
  raptor:(m,a,b)=>({home:'carnivore',plan:'theropod',hip:.95*m,L:1.6*m,W:.42*m,Hb:.55*m,neck:.5*m,neckW:.13*m,headL:.48*m,headW:.18*m,headH:.2*m,tail:1.8*m,arm:.55*m,legW:.1*m,real:1,skin:1,dim:.8,raptor:1,feathers:1,featherCol:hx(a,-.15),tipCol:hx(a,.3),col:a,col2:b,belly:hx(a,.35),tex:'stripes',freq:14,thin:.5}),
  orni:(m,a,b)=>({plan:'theropod',gentle:1,hip:1.6*m,L:2*m,W:.6*m,Hb:.75*m,neck:.7*m,neckW:.18*m,headL:.45*m,headW:.2*m,headH:.22*m,tail:2.2*m,arm:.45*m,legW:.18*m,real:1,skin:1,col:a,col2:b,belly:hx(a,.3),tex:'stripes',freq:6,thin:.7,graze:1}),
  sauropod:(m,a,b)=>({L:5*m,W:2*m,Hb:2.3*m,leg:2.4*m,legW:.4*m,neck:6*m,neckW:.45*m,neckAng:.6,headL:.8*m,headW:.32*m,headH:.34*m,hp:.25,real:1,heavy:1,skin:1,spines:1,col:a,col2:b,back:hx(a,-.12),belly:hx(a,.3),tex:'stripes',freq:4,thin:.6,ears:'none',tail:'dino',tl:8*m,scaly:1,graze:1,dim:.8}),
  cerat:(m,a,b)=>({L:4*m,W:1.8*m,Hb:1.8*m,leg:1*m,legW:.28*m,neck:.3*m,neckW:.65*m,neckAng:1.35,headL:1.4*m,headW:.85*m,headH:.85*m,hp:.45,real:1,heavy:1,skin:1,col:a,col2:b,belly:hx(a,.3),tri:1,ears:'none',tail:'dino',tl:2.4*m,scaly:1,graze:1}),
  stego:(m,a,b)=>({L:4*m,W:1.4*m,Hb:1.8*m,leg:1.15*m,legW:.26*m,neck:.55*m,neckW:.36*m,neckAng:1.5,headL:.55*m,headW:.26*m,headH:.28*m,hp:.6,real:1,heavy:1,skin:1,col:a,col2:b,belly:hx(a,.3),plates:1,ears:'none',tail:'dino',tl:2.8*m,scaly:1,graze:1}),
  ankylo:(m,a,b)=>({L:4*m,W:2.2*m,Hb:1.3*m,leg:.7*m,legW:.3*m,neck:.3*m,neckW:.6*m,neckAng:1.45,headL:.7*m,headW:.6*m,headH:.45*m,hp:.4,real:1,heavy:1,skin:1,col:a,col2:b,belly:hx(a,.3),tex:'spots',ears:'none',tail:'dino',tl:3*m,scaly:1,armor:1,club:1}),
  hadro:(m,a,b)=>({L:3.4*m,W:1.15*m,Hb:1.5*m,leg:1.5*m,legW:.24*m,neck:1.1*m,neckW:.32*m,neckAng:.65,headL:.8*m,headW:.3*m,headH:.34*m,hp:.55,real:1,heavy:1,skin:1,col:a,col2:b,belly:hx(a,.3),tex:'stripes',freq:3,thin:.6,ears:'none',tail:'dino',tl:3*m,scaly:1,graze:1}),
  ptero:(m,a,b)=>({plan:'ptero',s:2*m,body:a,wing:b,head:a,beak:'#c8b48a',crestCol:'#8a2a1a',legCol:'#3a2e26',fly:1}),
  marine:(m,a,b)=>({swim:1,plan:'fish',s:3*m,tall:.2,wide:.14,col:a,belly:b||'#e0e4e8',flukes:1,dorsalS:.1,fin2:1,fin:a,beak:1}),
};
const EMO={cat:'🐈',dog:'🐕',deer:'🦌',bovid:'🐃',bear:'🐻',rodent:'🐀',weasel:'🦦',pig:'🐗',horse:'🐎',ape:'🐒',apeN:'🦍',bird:'🐦',wader:'🦩',hawk:'🦅',owl:'🦉',parrot:'🦜',fowl:'🐓',duck:'🦆',ratite:'🪶',penguin:'🐧',lizard:'🦎',croc:'🐊',turtle:'🐢',snake:'🐍',frog:'🐸',fish:'🐟',shark:'🦈',whale:'🐋',dolphin:'🐬',ray:'🐟',seal:'🦭',hopper:'🦘',spiny:'🦔',rex:'🦖',raptor:'🦖',orni:'🦖',sauropod:'🦕',cerat:'🦕',stego:'🦕',ankylo:'🦕',hadro:'🦕',ptero:'🦅',marine:'🌊'};
const PRED=['cat','dog','bear','croc','shark','hawk','rex','raptor','weasel'],PREY=['deer','rodent','pig','fowl','fish','orni','hadro','bird','duck','hopper'];
// extras: rosette/stripes/spots/dots = coat pattern; antlers; h:<kind> horns; noh = no horns; tusk; trunk; mane; hump; shag=<colour>; water; nofly; big = a little bigger on screen
function make(line){
  const f=line.split(',').map(x=>x.trim());const[name,emo,tpl,r,m,a,b,c]=f;const d=MK[tpl](+m,a,b,c);
  for(const t of f.slice(7)){if(!t||t[0]==='#')continue;
    if(['rosette','stripes','spots','dots'].includes(t)){d.tex=t;d.col2=b;if(t==='stripes'){d.freq=d.freq||12;d.thin=.4}}
    else if(t==='antlers')d.antlers=1;else if(t==='h:none')delete d.horns;else if(t.startsWith('h:'))d.horns=t.slice(2);else if(t==='noh')delete d.horns;
    else if(t==='tusk')d.tusks=.5;else if(t==='trunk')d.trunk=1;else if(t==='mane')d.mane=b;else if(t==='hump')d.hump=1;
    else if(t.startsWith('shag='))d.shag=t.slice(5);else if(t==='water'){d.nearWater=1;d.amph=1}else if(t==='nofly')delete d.fly;else if(t==='big')d.sz=(d.sz||1)*1.3}
  d.x=1;d.tpl=tpl;return[name,emo||EMO[tpl],+r,{cat:2.2,dog:2.2,deer:2.4,rodent:1.8,bird:1.6,hawk:1.5,parrot:1.5,fish:1.6,raptor:2.6,orni:2.6}[tpl]||1.4,d]}
const DATA={
africa:`
Serval,,cat,2,.7,#d8a858,#2a1e12,spots
Caracal,,cat,2,.75,#c8945a,#3a2a1a
African Wildcat,,cat,1,.5,#b8a080,#5a4a3a,stripes
Black-footed Cat,,cat,3,.4,#c8b090,#3a2a1a,spots
African Golden Cat,,cat,3,.6,#b87a4a,#4a2a1a
African Wild Dog,,dog,2,1,#8a6a3a,#1e1a14,spots
Black-backed Jackal,,dog,1,.8,#b8844a,#2a2420
Side-striped Jackal,,dog,1,.8,#9a8a6a,#3a3228
Bat-eared Fox,,dog,1,.55,#a8987a,#3a3028
Fennec Fox,,dog,2,.4,#e8d0a0,#c8a070
Aardwolf,,dog,2,.7,#c8b080,#2a2018,stripes
Striped Hyena,,dog,2,1.1,#b8aa90,#2a241e,stripes
Brown Hyena,,dog,2,1.1,#5a4a3a,#3a3028
Honey Badger,,weasel,2,1.2,#1e1c1a,#d8d6d0
African Clawless Otter,,weasel,1,1.3,#5a4434,#3a2c22,water
Banded Mongoose,,weasel,1,.7,#8a7a62,#3a3228,stripes
Dwarf Mongoose,,weasel,1,.5,#6a5040,#4a3a2e
Yellow Mongoose,,weasel,1,.6,#c8984a,#a8783a
Slender Mongoose,,weasel,1,.6,#8a5a3a,#6a4228
African Civet,,weasel,2,1.3,#9a9488,#1e1c1a,spots
Genet,,weasel,1,.8,#c8b89a,#2a221a,spots
Zorilla,,weasel,2,.6,#1e1c1a,#f0eee8,stripes
Topi,,deer,1,1.3,#9a5a3a,#5a2e1e,h:impala
Hartebeest,,deer,1,1.4,#b8885a,#8a5e3a,h:impala
Blesbok,,deer,1,1.2,#8a4a2a,#5a2e1a,h:impala
Springbok,,deer,1,.95,#c8945a,#5a3a22,h:gazelle
Grant's Gazelle,,deer,1,1,#c89a62,#8a6a42,h:gazelle
Dik-dik,,deer,1,.45,#a8845a,#7a5a3a,h:gazelle
Klipspringer,,deer,1,.55,#8a7a5a,#6a5a3a,h:gazelle
Steenbok,,deer,1,.55,#c8844a,#a86a3a,h:gazelle
Common Duiker,,deer,1,.6,#8a7a5a,#5a4a32,h:gazelle
Blue Duiker,,deer,2,.45,#5a5a6a,#3a3a4a,h:gazelle
Bushbuck,,deer,1,1,#8a5a32,#5a3a1e,stripes,h:impala
Nyala,,deer,2,1.3,#6a5a4a,#f0e8d8,stripes,h:impala
Greater Kudu,,deer,2,1.6,#9a8a7a,#f2eee6,stripes,h:impala
Lesser Kudu,,deer,2,1.3,#9a8070,#f2eee6,stripes,h:impala
Sitatunga,,deer,2,1.3,#6a4a32,#4a3220,h:impala,water
Bongo,,deer,3,1.4,#a8502a,#f4f0e8,stripes,h:impala
Eland,,bovid,1,1.2,#b8946a,#8a6a4a,h:gazelle
Gemsbok,,deer,2,1.5,#c8bca8,#1e1c1a,h:gazelle
Sable Antelope,,deer,2,1.5,#1e1a18,#f0ece4,h:impala
Roan Antelope,,deer,2,1.5,#a8846a,#3a2e26,h:impala
Waterbuck,,deer,1,1.5,#7a6a5a,#4a3e32,h:impala,water
Lechwe,,deer,1,1.2,#c8844a,#3a2a1a,h:impala,water
Puku,,deer,1,1.1,#c88a4a,#a86a3a,h:impala
Reedbuck,,deer,1,1.1,#b8945a,#8a6a42,h:gazelle
Oribi,,deer,1,.7,#c8945a,#a8743a,h:gazelle
Gerenuk,,deer,2,1.1,#b8845a,#8a5a3a,h:gazelle
Okapi,,deer,3,1.6,#3a2218,#f4f0e8,h:none
Plains Zebra,,horse,1,1,#ecebe3,#17171a,stripes
Grevy's Zebra,,horse,2,1.1,#f2f0ea,#17171a,stripes
Mountain Zebra,,horse,2,.95,#ecebe3,#1e1c1a,stripes
African Wild Ass,,horse,3,.9,#a8a098,#3a3632
Red River Hog,,pig,1,.8,#b85a2a,#1e1a18
Giant Forest Hog,,pig,2,1.2,#2a2420,#1e1a18,tusk
Bushpig,,pig,1,.9,#7a4a2a,#3a2a1e,tusk
Pygmy Hippo,,pig,3,1.2,#4a4048,#6a5a60
Rock Hyrax,,rodent,1,.9,#7a6a5a,#5a4a3e
Springhare,,rodent,1,.9,#c8a070,#1e1a18
Crested Porcupine,,spiny,1,1.6,#2a2420,#f0ece4
Cape Ground Squirrel,,rodent,1,.7,#a8886a,#f0ece4
Naked Mole Rat,,rodent,2,.4,#e8b8a8,#d8a898
Giant Pouched Rat,,rodent,1,1,#7a6a5a,#f0ece4
Bush Baby,,ape,1,.35,#a8988a,#d8c8b8
Vervet Monkey,,ape,1,.6,#8a8a6a,#2a2a2a
Colobus Monkey,,ape,2,.65,#1e1c1a,#f4f4f2
Mandrill,,ape,3,.85,#4a4a3a,#d84a3a
Gelada,,ape,2,.8,#7a5a3a,#d84a4a
Patas Monkey,,ape,1,.7,#c8643a,#2a2a2a
Drill,,apeN,2,.8,#4a4a40,#1e1c1a
Bonobo,,apeN,3,1,#1e1a18,#3a2e2a
Mountain Gorilla,,apeN,3,1.7,#1e1c1c,#2c2726
Aye-aye,,ape,3,.4,#3a3430,#7a6a5a
Sifaka,,ape,2,.55,#f0ece4,#1e1a18
Fossa,,cat,2,.8,#8a5a3a,#6a4228
Secretary Bird,,ratite,2,.8,#c8c8c4,#1e1c1a,#c8c8c4
Kori Bustard,,fowl,2,1.3,#a8987a,#4a4038
Helmeted Guineafowl,,fowl,1,.8,#3a3a44,#2a2a34,spots
Ground Hornbill,,fowl,2,1.3,#1e1c1a,#1e1c1a,#c8302a
Marabou Stork,,wader,1,1.3,#4a4a4a,#2a2a2a,#e8b8a8
Saddle-billed Stork,,wader,2,1.3,#f0f0ec,#1e1c1a,#1e1c1a
Shoebill,,wader,3,1.3,#7a8a96,#5a6a76
Grey Crowned Crane,,wader,2,1.1,#8a8e92,#f0ece4,#1e1c1a
Great White Pelican,,duck,1,1.6,#f4f0ec,#2a2a2a
African Fish Eagle,,hawk,2,1,#5a3a22,#3a2414,#f4f4f2
Bateleur,,hawk,2,1,#1e1c1a,#8a4a2a,#1e1c1a
Martial Eagle,,hawk,3,1.1,#4a4440,#2a2622,#4a4440
Lappet-faced Vulture,,hawk,1,1.2,#4a3a30,#3a2e26,#e8a8a0
Lilac-breasted Roller,,bird,1,.6,#4aa8e8,#2a6ac8,#c8a0d8
Superb Starling,,bird,1,.5,#2a7ae8,#1e5ab8,#1e1c1a
Weaver Bird,,bird,1,.4,#f0d020,#3a3a1a
Southern Carmine Bee-eater,,bird,1,.5,#d83a5a,#2a8ac8
Hamerkop,,wader,1,.8,#7a5a3a,#5a4028
African Grey Parrot,,parrot,2,.7,#8a8e92,#c8302a
Lovebird,,parrot,1,.4,#4ac84a,#2a8a3a,#e86a3a
Greater Flamingo,,wader,1,1.2,#f4b0c0,#e85a7a
Egyptian Goose,,duck,1,1,#b8a080,#7a5a3a
Ostrich (Somali),,ratite,2,1.3,#2a2420,#3a5a8a,#5a7aa8
Nile Monitor,,lizard,1,1.6,#3a3a2a,#e8d070,spots
Rainbow Agama,,lizard,1,.7,#2a4ac8,#e86a2a
Chameleon,,lizard,2,.6,#4ab84a,#c8d84a,stripes
Veiled Chameleon,,lizard,2,.7,#4ac87a,#e8c84a,stripes
Leopard Tortoise,,turtle,1,1,#c8a868,#3a2a1a
African Spurred Tortoise,,turtle,2,1.5,#b8986a,#8a6a42
Pancake Tortoise,,turtle,2,.6,#8a6a3a,#c8a060
Puff Adder,,snake,1,1,#a8885a,#3a2a1a
Gaboon Viper,,snake,2,1.3,#a8845a,#4a3a6a
Green Mamba,,snake,2,1.2,#4ad84a,#3ab83a
Boomslang,,snake,2,1.1,#4a9a3a,#2a5a2a
African Rock Python,,snake,2,2.2,#7a6a4a,#3a2e1e
Cape Cobra,,snake,2,1.1,#c8944a,#8a5a2a
African Bullfrog,,frog,1,1.4,#6a8a3a,#e8c84a
Tomato Frog,,frog,2,.8,#e85a2a,#c84a1a
Goliath Frog,,frog,3,1.6,#6a7a4a,#3a4a2a
Nile Tilapia (Blue),,fish,1,1,#5a7a9a,#3a5a7a
Tigerfish,,fish,2,1.3,#c8ccd0,#1e1c1a,stripes
Lungfish,,fish,2,1.6,#5a5a4a,#3a3a2a
Electric Catfish,,fish,2,1,#9a8a7a,#3a2e26,spots
Elephant Shrew,,rodent,1,.5,#a8846a,#6a5a4a
Pangolin (Giant),,weasel,3,1.6,#8c6a44,#6a4a2a
Sand Cat,,cat,2,.4,#d8c49a,#a8946a
Ethiopian Wolf,,dog,3,.9,#c8642a,#f0e8d8
Cape Fox,,dog,1,.55,#9a8a7a,#5a4a3a
Meerkat (Kalahari),,weasel,1,.45,#b8a07a,#4a3a2a,stripes
Cape Clawless Otter,,weasel,2,1.2,#4a3a2a,#e8e0d0,water
Impala (Black-faced),,deer,2,1.05,#b8743a,#2a1e14,h:impala
Thomson's Gazelle,,deer,1,.85,#c8945a,#1e1a14,stripes,h:gazelle
Dama Gazelle,,deer,3,1,#b8542a,#f4f0e8,h:gazelle
Addax,,deer,3,1.3,#e8e0d0,#8a7a6a,h:gazelle
Scimitar Oryx,,deer,2,1.4,#f0ece4,#a8542a,h:gazelle
Barbary Sheep,,bovid,2,.7,#b8844a,#8a5e3a,h:bison
Dromedary Camel,🐪,horse,1,1.3,#c8a070,#a8804a,hump
Mantled Guereza,,ape,2,.7,#1e1c1a,#f0eee8
Chimpanzee (Western),,apeN,2,.9,#2a2420,#c8a888
Ring-tailed Lemur,,ape,2,.5,#9a9a9a,#1e1c1a
Cape Pangolin,,spiny,2,1,#8a6a4a,#6a4a32
Southern Ground Hornbill,,fowl,2,1.2,#1e1c1a,#1e1c1a,#c8242a
Lesser Flamingo,,wader,1,1,#f4a8b0,#e86a7a,#f4a8b0
Wattled Crane,,wader,3,1.2,#d8d8d8,#4a4a4a,#f0f0f0
Goliath Heron,,wader,2,1.3,#7a7a8a,#5a5a6a,#a8542a
Verreaux's Eagle,,hawk,3,1.2,#1e1c1a,#2a2826,#1e1c1a
Hooded Vulture,,hawk,1,.9,#5a4a3a,#3a2e26,#d8a8a8
Fischer's Lovebird,,parrot,2,.4,#5ac83a,#3a8a2a,#e8742a
Turaco,,parrot,2,.6,#2a8a3a,#c8242a,#2a8a3a
Sunbird,,bird,1,.3,#2a8a5a,#1a4a6a,#3aa86a
Red-billed Quelea,,bird,1,.3,#a8845a,#6a5a3a,#c8242a
African Penguin,,penguin,2,.7,#1e1c1a,#f4f4f2
Black Mamba,,snake,3,1.3,#5a5a50,#4a4a40
Spitting Cobra,,snake,2,1,#5a4a3a,#3a2e26
Armadillo Lizard,,lizard,2,.5,#a8743a,#5a3a1e
Sudan Plated Lizard,,lizard,1,.6,#8a6a4a,#5a4430
Nile Soft-shell Turtle,,turtle,2,1,#6a6a4a,#5a5a3a
Reed Frog,,frog,1,.3,#e8c84a,#c84a2a
Killifish,,fish,1,.25,#3a8ac8,#e8642a
Nile Perch,,fish,2,1.5,#8a9a9a,#5a6a6a
`,
samerica:`
Ocelot,,cat,2,.75,#d8a858,#1e140c,rosette
Margay,,cat,2,.55,#c8984a,#1e140c,rosette
Puma (Andean),,cat,2,1,#b8945a,#8a6a3a
Jaguarundi,,cat,2,.65,#5a4e44,#3a322a
Oncilla,,cat,3,.45,#c8a060,#1e140c,rosette
Andean Mountain Cat,,cat,3,.55,#b8b0a0,#5a4a3a,stripes
Geoffroy's Cat,,cat,2,.5,#a8987a,#1e1a14,spots
Maned Wolf,,dog,2,1.2,#c8642a,#1e1a18
Bush Dog,,dog,2,.6,#7a4a2a,#3a2418
Crab-eating Fox,,dog,1,.75,#8a7a6a,#3a2e26
Andean Fox,,dog,1,.85,#a8885a,#5a5048
Spectacled Bear,,bear,3,.75,#1e1a18,#e8d8b8
Giant Otter,,weasel,3,2,#4a3a2e,#e8dcc8,water
Neotropical Otter,,weasel,2,1.4,#5a4434,#3a2c22,water
Tayra,,weasel,1,1.2,#2a2420,#c8a060
Grison,,weasel,1,.8,#8a8a84,#1e1c1a
Coati,,weasel,1,1,#a8745a,#3a2a1e,stripes
Kinkajou,,weasel,2,.9,#c8945a,#a8743a
Olingo,,weasel,2,.8,#a8845a,#7a5a3a
Agouti,,rodent,1,1.3,#a8744a,#7a5432
Paca,,rodent,1,1.5,#7a5a3a,#f0ece4,spots
Chinchilla,,rodent,2,.7,#a8a8a8,#7a7a7a
Guinea Pig,,rodent,1,.6,#c8945a,#f0ece4
Mara,,rodent,1,1.6,#a8907a,#5a4a3a
Viscacha,,rodent,1,1.1,#9a9088,#5a524a
Brazilian Porcupine,,spiny,1,1.2,#6a5a4a,#d8c8a8
Red-rumped Agouti,,rodent,1,1.2,#c87a3a,#8a5a2a
Nine-banded Armadillo,,spiny,1,1,#9a8a7a,#c8b89a
Giant Armadillo,,spiny,3,1.8,#7a6a5a,#a8988a
Pink Fairy Armadillo,,spiny,3,.4,#e8b8c0,#f4e8e8
Silky Anteater,,rodent,2,.6,#c8a860,#a8884a
Southern Tamandua,,rodent,1,1.4,#d8c08a,#1e1a18
Two-toed Sloth,,apeN,1,.75,#8a7a62,#e2d3b2
Pygmy Marmoset,,ape,2,.25,#a8946a,#5a4a3a
Golden Lion Tamarin,,ape,3,.35,#e88a2a,#c8642a
Emperor Tamarin,,ape,2,.35,#4a4440,#f4f4f2
Squirrel Monkey,,ape,1,.4,#c8a04a,#f0ece4
Howler Monkey,,ape,1,.8,#1e1a18,#2a2420
Spider Monkey,,ape,1,.8,#2a2420,#5a4a3e
Capuchin Monkey,,ape,1,.6,#3a2e26,#f0e4d0
Uakari,,ape,3,.6,#c8743a,#e83a3a
Woolly Monkey,,ape,2,.75,#5a4a40,#2a2420
Night Monkey,,ape,2,.45,#8a7a6a,#f0ece4
Saki Monkey,,ape,2,.6,#2a2420,#e8dcc8
Vicuna,,deer,2,1.2,#c8945a,#f4ece0,h:none
Guanaco,,deer,1,1.3,#b8844a,#f2ece0,h:none
Alpaca,,deer,1,1.15,#f2ece0,#d8c8a8,h:none
Pampas Deer,,deer,1,1,#b8945a,#8a6a42,antlers
Marsh Deer,,deer,2,1.3,#a8643a,#1e1a18,antlers,water
Red Brocket Deer,,deer,1,.85,#a8542a,#7a3a1e
Southern Pudu,,deer,2,.45,#7a5a3a,#5a3e26,antlers
Huemul,,deer,3,1.1,#7a6a5a,#4a3e32,antlers
White-lipped Peccary,,pig,1,.85,#2a2420,#f0ece4
Collared Peccary,,pig,1,.75,#4a4440,#c8c4b8
Baird's Tapir,,pig,2,1.6,#3a3434,#d8d0c8
Scarlet Macaw,,parrot,2,.9,#d82a2a,#2a5ae8,#d82a2a
Blue-and-yellow Macaw,,parrot,2,.9,#2a7ae8,#2a5ac8,#f0c82a
Hyacinth Macaw,,parrot,3,1,#2a3ab8,#1e2a98,#2a3ab8
Hoatzin,,fowl,2,.7,#a8643a,#5a3a22,#3a5a8a
Harpy Eagle,,hawk,3,1.2,#4a4a4a,#2a2a2a,#d8d8d4
Andean Condor,,hawk,2,1.4,#1e1c1a,#f0ece4,#e8a8a0
King Vulture,,hawk,2,1.1,#f4f0ec,#1e1c1a,#e8843a
Keel-billed Toucan,,bird,1,.8,#111216,#111216,#f2d01a
Quetzal,,parrot,3,.7,#2ab86a,#d82a2a,#2ab86a
Hummingbird,,bird,1,.25,#2ad87a,#2a9a5a
Cock-of-the-rock,,bird,2,.6,#f0742a,#1e1c1a
Rhea,,ratite,1,1.1,#9a9490,#7a7470
Jabiru,,wader,2,1.4,#f4f4f2,#1e1c1a,#1e1c1a
Scarlet Ibis,,wader,1,.9,#e8402a,#c82a1a
Roseate Spoonbill,,wader,1,1,#f0a0b8,#e86a8a,#f0f0ec
Harpy Owl,,owl,2,1,#8a7a5a,#5a4a3a
Burrowing Owl,,owl,1,.6,#a8845a,#7a5a3a
Green Iguana,,lizard,1,1.5,#5ab84a,#3a7a2a,stripes
Basilisk Lizard,,lizard,1,.9,#4ab84a,#2a6a2a
Tegu,,lizard,1,1.4,#2a2a2a,#f0ece4,stripes
Black Caiman,,croc,2,1.1,#1e201a,#3a3a2a
Spectacled Caiman,,croc,1,.8,#5a5a3a,#3a3a2a
Matamata Turtle,,turtle,2,1,#5a4a3a,#3a2e22
Red-footed Tortoise,,turtle,1,.9,#3a2a1e,#e8a83a
Galapagos Tortoise,,turtle,3,2.6,#4a4a44,#3a3a34
Marine Iguana,,lizard,2,1.1,#2a2a2a,#5a5a50
Boa Constrictor,,snake,1,1.8,#a8946a,#5a2a1e
Green Anaconda,,snake,2,3,#4d6b2a,#1c280e,water
Emerald Tree Boa,,snake,2,1.3,#2ab84a,#f4f4f2
Fer-de-lance,,snake,2,1.3,#8a7a5a,#3a2e22
Coral Snake,,snake,2,.8,#d82a2a,#1e1c1a,stripes
Golden Poison Frog,,frog,3,.9,#f0c82a,#d8a81a
Strawberry Poison Frog,,frog,1,.8,#e82a2a,#2a3ac8
Glass Frog,,frog,2,.7,#9ad87a,#e8f0d8
Red-eyed Tree Frog,,frog,1,.9,#4ac84a,#e85a2a
Cane Toad,,frog,1,1.3,#8a7a4a,#5a4a2a
Red-bellied Piranha,,fish,1,.9,#7a8a8a,#e04a2a
Arapaima,,fish,3,4,#5a6a5a,#c84a3a
Electric Eel,,fish,2,2.4,#3a3a2a,#e8a83a
Neon Tetra,,fish,1,.3,#2a7ae8,#e82a2a,stripes
Discus Fish,,fish,1,.7,#e87a2a,#2a7ae8,stripes
Oscar Fish,,fish,1,.8,#3a3a2a,#e86a2a,spots
Amazon River Dolphin,,dolphin,3,.9,#e8a8b8,#f0d0d8
Giant Anteater (Pampas),,bear,2,1,#5a4a3a,#1e1c1a
Lowland Tapir,,pig,2,1.5,#3a3430,#2a2420
Capybara (Wetland),,rodent,1,2.6,#8a6a4a,#6a4a32,water
Hoary Fox,,dog,1,.7,#9a8a7a,#5a4a3a
Short-eared Dog,,dog,3,.8,#3a3430,#2a2420
Kodkod,,cat,3,.4,#a8845a,#2a1e14,spots
Pampas Cat,,cat,2,.55,#a89a7a,#6a4a32,stripes
Golden-headed Lion Tamarin,,ape,3,.35,#1e1c1a,#e8a82a
Black Spider Monkey,,ape,2,.75,#1e1c1a,#2a2420
Red Howler Monkey,,ape,2,.75,#a8442a,#3a2a1e
Toco Toucan,,parrot,2,.7,#1e1c1a,#f4f4f2,#f4f4f2
Sun Conure,,parrot,2,.4,#f8b02a,#3a9a3a,#f87a2a
Blue-throated Macaw,,parrot,3,.8,#3a7ac8,#e8c82a,#3a7ac8
Andean Cock-of-the-rock,,bird,2,.5,#e8442a,#1e1c1a,#e8442a
Horned Screamer,,fowl,2,1,#3a3a3a,#d8d8d8,#5a5a5a
Magellanic Penguin,,penguin,1,.7,#1e1c1a,#f4f4f2
Andean Flamingo,,wader,2,1,#f4b8c0,#1e1c1a,#f4b8c0
Crested Caracara,,hawk,1,.9,#2a2826,#f0e8d8,#f0e8d8
Great Potoo,,owl,2,.5,#8a7a62,#5a4a3a
Yellow Anaconda,,snake,2,1.8,#a89a3a,#2a2420
Bushmaster,,snake,3,1.3,#a8845a,#3a2a1e
Yellow-footed Tortoise,,turtle,1,.8,#3a3430,#c8a83a
Caiman Lizard,,lizard,2,1,#4a8a3a,#c8642a
Horned Frog,,frog,2,.45,#6a8a3a,#a8542a
Blue Poison Dart Frog,,frog,2,.25,#2a5ac8,#1e1c1a
Pacu,,fish,1,1,#5a5a5a,#c8542a
Red-tailed Catfish,,fish,2,1.6,#3a3430,#c8442a
Freshwater Stingray,,ray,2,.6,#6a5a3a
`,
asia:`
Bengal Tiger,,cat,2,1.25,#dd7f26,#120d08,stripes
Siberian Tiger,,cat,3,1.35,#e0903a,#120d08,stripes
Clouded Leopard,,cat,3,.85,#b8a07a,#2a2018,rosette
Asian Golden Cat,,cat,2,.7,#c8843a,#3a2418
Fishing Cat,,cat,2,.65,#9a9488,#1e1c1a,spots,water
Leopard Cat,,cat,1,.5,#c8a060,#1e140c,spots
Pallas's Cat,,cat,2,.5,#a8a098,#3a3632,stripes
Asiatic Lion,,cat,3,1.3,#c4975a,#5a3518
Amur Leopard,,cat,3,1,#e0b060,#1e140c,rosette
Dhole,,dog,2,.95,#c8642a,#3a2418
Raccoon Dog,,dog,1,.8,#7a6a5a,#1e1c1a
Indian Wolf,,dog,2,1.1,#a8946a,#5a4a3a
Tibetan Fox,,dog,2,.75,#c8945a,#9a9088
Golden Jackal,,dog,1,.85,#c8a060,#5a4a3a
Sloth Bear,,bear,2,.85,#1e1a18,#e8dcc8
Sun Bear,,bear,2,.65,#1e1a18,#e8b84a
Asiatic Black Bear,,bear,2,.9,#1e1a18,#f0ece4
Giant Panda (Qinling),,bear,3,.8,#d8c8b0,#5a4030
Binturong,,weasel,2,1.3,#2a2420,#8a7a6a
Yellow-throated Marten,,weasel,1,1,#3a2a1e,#f0c84a
Smooth-coated Otter,,weasel,1,1.4,#7a5a3a,#c8b090,water
Asian Small-clawed Otter,,weasel,1,.9,#7a5a3a,#d8c8a8,water
Masked Palm Civet,,weasel,1,1.1,#8a7a6a,#f0ece4
Indian Grey Mongoose,,weasel,1,.8,#9a948a,#6a645a
Pangolin (Chinese),,weasel,3,1.2,#8c6a44,#6a4a2a
Malayan Tapir,,pig,2,1.6,#1e1a18,#f4f4f2
Babirusa,,pig,3,1,#6a6260,#4a4240,tusk
Bearded Pig,,pig,1,1.1,#8a7a6a,#f0ece4
Indian Rhinoceros,,bovid,3,1.5,#6a6460,#4a4440,noh
Gaur,,bovid,2,1.4,#2a2018,#f0ece4
Banteng,,bovid,2,1.2,#8a4a2a,#f0ece4
Takin,,bovid,2,1.1,#c8a85a,#8a6a3a,h:bison
Wild Water Buffalo,,bovid,2,1.3,#2a2828,#1e1c1c
Nilgai,,deer,1,1.5,#6a6a70,#f0ece4,h:gazelle
Blackbuck,,deer,1,1,#2a2420,#f4f0e8,h:impala
Chital,,deer,1,1.1,#c8743a,#f4f0e8,spots,antlers
Sambar Deer,,deer,1,1.5,#6a5040,#4a3a2e,antlers
Muntjac,,deer,1,.6,#a8643a,#7a4a2a,antlers
Sika Deer,,deer,1,1,#a8643a,#f4f0e8,spots,antlers
Chinese Water Deer,,deer,1,.65,#c8945a,#a8744a,tusk
Saiga Antelope,,deer,3,.9,#d8c8a8,#a89878,h:gazelle
Markhor,,bovid,3,.8,#a8987a,#7a6a5a,h:impala
Himalayan Tahr,,bovid,2,.75,#7a5a3a,#5a3e26,h:bison
Bharal,,bovid,2,.7,#9a9490,#5a5450,h:buffalo
Przewalski's Horse,,horse,3,.9,#c8a06a,#3a2a1e
Onager,,horse,2,.85,#c8b090,#5a4a3a
Bactrian Camel,,bovid,2,1.4,#a8845a,#8a6a42,noh,hump
Proboscis Monkey,,ape,2,.75,#c8844a,#e8a08a
Japanese Macaque,,ape,1,.65,#8a8480,#e8a0a0
Rhesus Macaque,,ape,1,.6,#a8946a,#e8b0a0
Golden Snub-nosed Monkey,,ape,3,.7,#e8a84a,#7ab8e8
Hanuman Langur,,ape,1,.75,#c8c0b0,#1e1c1a
White-handed Gibbon,,apeN,2,.7,#3a2e26,#f4f0e8
Siamang,,apeN,2,.8,#1e1a18,#2a2420
Slow Loris,,ape,2,.35,#c8a87a,#5a3e26
Tarsier,,ape,2,.25,#a8946a,#7a6a5a
Sumatran Orangutan,,apeN,3,1.2,#c8602a,#7a5a48
Indian Peafowl,,fowl,1,.9,#1d5fbf,#6a5a3a,#1d5fbf
Green Peafowl,,fowl,2,1,#2a8a5a,#6a5a3a,#2a8a5a
Golden Pheasant,,fowl,2,.7,#e8302a,#f0c82a,#f0c82a
Red Junglefowl,,fowl,1,.6,#c8402a,#2a5a3a,#e8842a
Mandarin Duck,,duck,1,.7,#e8842a,#4a3a8a,#e8e0d0
Sarus Crane,,wader,2,1.4,#a8acb0,#8a8e92,#d84a3a
Red-crowned Crane,,wader,3,1.3,#f4f4f2,#1e1c1a,#1e1c1a
Great Hornbill,,bird,2,1.1,#1e1c1a,#f0e8d8,#f0c82a
Kingfisher,,bird,1,.4,#2a8ae8,#e8742a
Himalayan Monal,,fowl,3,.75,#2a8a8a,#c84a2a,#2ab86a
Steller's Sea Eagle,,hawk,3,1.2,#2a2420,#f4f4f2,#2a2420
Philippine Eagle,,hawk,3,1.2,#a8845a,#5a4028,#e8d8b8
Blakiston's Fish Owl,,owl,3,1.1,#8a7a5a,#5a4a3a
Indian Cobra,,snake,1,1.2,#8a6a3a,#3a2a1a
King Cobra,,snake,3,1.8,#5a5a3a,#e8d8a8,stripes
Reticulated Python,,snake,2,2.8,#a8946a,#3a2e1e
Krait,,snake,2,1,#1e1c1a,#f0e8d0,stripes
Flying Dragon,,lizard,1,.5,#8a7a5a,#e8742a
Tokay Gecko,,lizard,1,.6,#5a7aa8,#e8742a,spots
Water Monitor,,lizard,1,1.8,#3a3a2a,#c8b86a,spots
Gharial,,croc,3,1.2,#7a7a5a,#5a5a3a
Saltwater Crocodile,,croc,2,1.4,#4a4a2a,#2a2a1a
Mugger Crocodile,,croc,1,1,#5a5a3a,#3a3a2a
Chinese Giant Salamander,,lizard,3,1.5,#5a4a3a,#3a2e22
Indian Star Tortoise,,turtle,2,.7,#2a2420,#e8d070
Asian Leaf Turtle,,turtle,1,.7,#8a6a3a,#5a4a2a
Asian Arowana,,fish,3,1.5,#e8b84a,#c8302a
Koi,,fish,1,1,#f0742a,#f4f4f2,spots
Giant Mekong Catfish,,fish,3,4,#8a8e92,#5a5e62
Betta Fish,,fish,1,.4,#2a3ae8,#e82a5a
Snakehead,,fish,1,1.4,#5a5a3a,#3a3a2a,spots
Snow Leopard (Himalayan),,cat,3,1,#d8d4c8,#4a4a48,rosette
Marbled Cat,,cat,3,.5,#8a6a4a,#2a1e14,spots
Sunda Clouded Leopard,,cat,3,.9,#7a6a4a,#2a221a,rosette
Red Panda (Himalayan),,weasel,2,1,#b8442a,#2a1e14
Asian Elephant Calf,,bovid,1,.7,#6a6460,#4a4440,noh,trunk
Javan Rhinoceros,,bovid,3,1.6,#6a6a64,#4a4a44,noh
Sumatran Rhinoceros,,bovid,3,1.3,#5a4a3a,#3a2e26,noh,shag=#4a3a2a
Yak (Wild),,bovid,2,1.4,#2a2420,#1e1a16,h:bison,shag=#2a2420
Tibetan Antelope,,deer,3,1,#c8b090,#5a4a3a,h:gazelle
Mongolian Gazelle,,deer,1,.9,#c8a070,#f0e8d8,h:gazelle
Mouse Deer,,deer,2,.35,#8a6a4a,#5a4430
Bornean Orangutan,,apeN,3,1,#a8542a,#5a3a2a
Lar Gibbon,,ape,2,.6,#c8a87a,#2a2420
Douc Langur,,ape,3,.65,#7a7a7a,#c8842a
Silver Pheasant,,fowl,2,.8,#f0f0f0,#1e1c1a,#c8242a
Lady Amherst's Pheasant,,fowl,2,.8,#2a5a3a,#f0f0f0,#c8242a
Rhinoceros Hornbill,,parrot,3,.9,#1e1c1a,#f4f4f2,#1e1c1a
Black-necked Crane,,wader,3,1.2,#d8d8d8,#1e1c1a,#1e1c1a
Oriental Pied Hornbill,,parrot,2,.7,#1e1c1a,#f4f4f2,#1e1c1a
Komodo Dragon (Young),,lizard,2,2,#6a6a4a,#4a4a34,spots
Burmese Python,,snake,2,2,#a8945a,#5a4430
Many-banded Krait,,snake,3,1,#1e1c1a,#f0f0e8
Chinese Alligator,,croc,3,.8,#4a4a3a,#3a3a2a
Big-headed Turtle,,turtle,2,.6,#5a4a3a,#3a2e22
Japanese Giant Salamander,,lizard,3,1.2,#5a4a3a,#3a2e22,water
Mudskipper,,fish,1,.3,#7a6a4a,#5a4a32
Giant Gourami,,fish,1,1,#8a8a7a,#5a5a4a
Clown Loach,,fish,1,.35,#f8a82a,#1e1c1a,stripes
`,
namerica:`
Bobcat,,cat,1,.75,#b8946a,#3a2a1a,spots
Canada Lynx,,cat,2,.85,#a8a098,#3a3632
Jaguar (Arizona),,cat,3,1.1,#d8a040,#1e140c,rosette
Red Wolf,,dog,3,1,#a8643a,#3a2e26
Arctic Wolf (Yukon),,dog,2,1.1,#e8e6e0,#a8a6a0
Red Fox (American),,dog,1,.75,#cc6128,#2a1e14
Grey Fox,,dog,1,.7,#8a8a88,#c8642a
Swift Fox,,dog,2,.55,#c8a070,#3a2e26
Kit Fox,,dog,2,.5,#c8b090,#3a2e26
American Black Bear,,bear,1,.9,#1e1a18,#a87a5a
Kodiak Bear,,bear,3,1.25,#5a3e26,#4a321e
Wolverine,,weasel,2,1.2,#3a2a1e,#a8743a,stripes
American Badger,,weasel,1,1,#8a8478,#f0ece4,stripes
American Mink,,weasel,1,.7,#3a2418,#2a1a10,water
River Otter,,weasel,1,1.3,#5a4434,#c8b090,water
Fisher,,weasel,2,1,#2a2018,#4a3a2e
Black-footed Ferret,,weasel,3,.7,#e8d8b8,#1e1a18
Striped Skunk,,weasel,1,.7,#161616,#f4f4f4,stripes
Raccoon (Desert),,weasel,1,.8,#8a8278,#1e1c1a,stripes
Ringtail,,weasel,2,.6,#a8946a,#1e1c1a,stripes
Opossum,,rodent,1,1.3,#c8c4bc,#f4f4f2
Porcupine (North American),,spiny,1,1.3,#3a3028,#e8dcc8
Groundhog,,rodent,1,1.1,#7a5a3a,#5a3e26
Prairie Dog,,rodent,1,.8,#c8a070,#a8804a
Eastern Grey Squirrel,,rodent,1,.7,#8a8a88,#f0ece4
Red Squirrel (American),,rodent,1,.6,#a8542a,#f0ece4
Chipmunk,,rodent,1,.5,#a8743a,#1e1a18,stripes
Flying Squirrel,,rodent,1,.55,#8a7a6a,#f0ece4
North American Beaver,,rodent,1,1.8,#6b4528,#4a2e18,water
Muskrat,,rodent,1,.9,#5a3e26,#3a2a1a,water
Snowshoe Hare,,hopper,1,.5,#f0ece4
Black-tailed Jackrabbit,,hopper,1,.55,#a8946a
Desert Cottontail,,hopper,1,.45,#a8987a
Pika,,rodent,1,.45,#a8988a,#7a6a5a
Nine-banded Armadillo (Texas),,spiny,1,1,#9a8a7a,#c8b89a
Elk,,deer,1,1.7,#8a6a4a,#4a3426,antlers
White-tailed Deer,,deer,1,1.2,#a8744a,#7a5432,antlers
Mule Deer,,deer,1,1.25,#8a7a6a,#5a4a3a,antlers
Caribou,,deer,1,1.4,#7a6a5a,#e8e2d8,antlers
Bighorn Sheep,,bovid,2,.7,#8a6a4a,#f0ece4,h:bison
Mountain Goat,,bovid,2,.65,#f4f4f0,#e0e0d8,h:gazelle
Dall Sheep,,bovid,2,.65,#f4f4f0,#e8e2d0,h:bison
American Bison (Plains),,bovid,1,1.15,#4a3324,#2e1e14,h:bison,hump,shag=#2e1e14
Mustang,,horse,1,1,#8a5a3a,#2a1e14
Burro,,horse,1,.8,#8a8480,#3a3632
Javelina,,pig,1,.7,#4a4440,#c8c4b8
Bald Eagle (Alaskan),,hawk,2,1.1,#4a2e1a,#3b2414,#f6f4ee
Red-tailed Hawk,,hawk,1,.8,#8a5a3a,#5a3a22,#a8743a
Peregrine Falcon,,hawk,2,.6,#4a5060,#2a3040,#1e1c1a
Osprey,,hawk,2,.9,#3a2e26,#2a2018,#f4f4f2
Great Horned Owl,,owl,2,.9,#8a6a45,#6e5233
Barn Owl,,owl,1,.75,#e8d0a0,#c8a070
Snowy Egret,,wader,1,.9,#f4f4f2,#e8e8e4
Great Blue Heron,,wader,1,1.2,#6a7a8a,#4a5a6a
Sandhill Crane,,wader,1,1.2,#9a9690,#7a7670,#c83a2a
Whooping Crane,,wader,3,1.3,#f4f4f2,#1e1c1a,#c83a2a
Wild Turkey,,fowl,1,1.1,#4a3a2e,#2a2018,#c83a3a
Greater Roadrunner,,fowl,1,.6,#7a6a5a,#3a2e26
Mallard,,duck,1,.8,#4a3a2e,#6a5a4a,#2a8a4a
Wood Duck,,duck,2,.7,#4a2a1e,#2a5a6a,#2a6a4a
Canada Goose,,duck,1,1.1,#7a6a5a,#4a3e32,#1e1c1a
Common Loon,,duck,2,1,#1e1c1a,#f4f4f2,#1e1c1a
American Flamingo,,wader,2,1.15,#f0705a,#e84a3a
Blue Jay,,bird,1,.45,#3a6ae8,#2a4ab8,#f0f0f0
Northern Cardinal,,bird,1,.4,#d81e1e,#b81414
American Robin,,bird,1,.45,#c8642a,#4a4440,#2a2420
Ruby-throated Hummingbird,,bird,1,.22,#2ab86a,#1e8a4a
California Condor,,hawk,3,1.4,#1e1c1a,#f0ece4,#e8743a
American Alligator (Florida),,croc,2,1.1,#2e3428,#1e2218
American Crocodile,,croc,2,1.1,#6a6a4a,#4a4a3a
Gila Monster,,lizard,2,.9,#e8743a,#1e1a18,spots
Horned Lizard,,lizard,1,.5,#c8a87a,#7a5a3a,spots
Desert Iguana,,lizard,1,.7,#c8b8a0,#8a7a6a,spots
Western Diamondback Rattlesnake,,snake,1,1.3,#a8946a,#4a3a2a
Copperhead,,snake,1,.9,#b8743a,#7a4a2a
Corn Snake,,snake,1,.9,#e8742a,#c83a2a
Eastern Box Turtle,,turtle,1,.6,#5a3a22,#e8a83a
Snapping Turtle,,turtle,2,1.2,#4a4a3a,#3a3a2a
Gopher Tortoise,,turtle,1,.9,#7a6a5a,#5a4a3e
American Bullfrog,,frog,1,1.3,#5a7a3a,#3a5a2a
Spring Peeper,,frog,1,.5,#a8845a,#5a3e26
Hellbender,,lizard,2,1.2,#5a4a3a,#3a2e22
Axolotl,,lizard,3,.6,#f0b0b8,#e88a98
Largemouth Bass,,fish,1,1,#5a7a3a,#2a3a1a,stripes
Rainbow Trout,,fish,1,.9,#8a9a8a,#e85a7a,spots
Chinook Salmon,,fish,1,1.3,#8a9aa8,#3a4a58,spots
Paddlefish,,fish,2,2,#6a7a8a,#4a5a6a
Alligator Gar,,fish,2,2.4,#6a6a4a,#3a3a2a,spots
Ocelot (Texas),,cat,3,.8,#c8a060,#2a1e12,rosette
Coyote (Prairie),,dog,1,.95,#a8946a,#6a5a42
Grizzly Bear (Yellowstone),,bear,2,1.3,#8a6438,#5a4024
Sea Otter (Alaskan),,weasel,2,1.1,#5a4434,#c8b8a0,water
Pronghorn,,deer,1,1,#c8844a,#f4f0e8,h:gazelle
Moose (Alaskan),,deer,2,2,#3a2a1e,#2a1e14,antlers
Mountain Lion (Rockies),,cat,2,1.25,#b8946a,#7a5a3a
Bald Eagle (Mississippi),,hawk,2,1.1,#4a3020,#3a2418,#f4f4f2
American Kestrel,,hawk,1,.5,#c8642a,#3a5a8a,#d8d8d8
Northern Mockingbird,,bird,1,.4,#8a8a8a,#5a5a5a,#9a9a9a
Painted Bunting,,bird,2,.3,#e8442a,#3a9a3a,#3a5ac8
Scarlet Tanager,,bird,2,.35,#e8242a,#1e1c1a,#e8242a
Atlantic Puffin (Maine),,penguin,2,.5,#1e1c1a,#f4f4f2
Trumpeter Swan,,duck,2,1.5,#f4f4f2,#f0f0ee,#f4f4f2
Canvasback,,duck,1,.7,#d8d8d8,#5a5a5a,#a8442a
Prairie Chicken,,fowl,2,.6,#a8845a,#6a5a3a,#a8845a
Eastern Coral Snake,,snake,3,.7,#c8242a,#1e1c1a,stripes
Timber Rattlesnake,,snake,2,1.1,#8a7a5a,#2a2420
Alligator Snapping Turtle,,turtle,3,1.1,#4a4a3a,#3a3a2a
Green Anole,,lizard,1,.3,#5ac83a,#e8642a
Tiger Salamander,,lizard,2,.4,#1e1c1a,#d8c84a,water
Red-spotted Newt,,lizard,1,.25,#c8742a,#c8242a,water
Bluegill,,fish,1,.4,#4a6a5a,#e8842a
Lake Sturgeon,,fish,3,1.8,#5a5a50,#3a3a32
Brook Trout,,fish,2,.6,#4a5a3a,#c8442a
`,
europe:`
European Wildcat,,cat,1,.6,#9a8a72,#3a3028,stripes
Iberian Lynx,,cat,3,.8,#c8a060,#1e140c,spots
Eurasian Wolf,,dog,2,1.1,#8a8278,#4a4440
Golden Jackal (European),,dog,1,.85,#b8945a,#5a4a3a
European Badger,,weasel,1,1,#77767a,#f2f2ee,stripes
Pine Marten,,weasel,1,.9,#5a3a22,#e8c84a
Stoat,,weasel,1,.5,#a8743a,#f4f0e8
Least Weasel,,weasel,1,.35,#a8743a,#f4f0e8
Polecat,,weasel,1,.65,#2a2018,#e8d8b8
Eurasian Otter,,weasel,1,1.2,#5a4434,#c8b090,water
Red Squirrel,,rodent,1,.6,#c8542a,#f0ece4
Edible Dormouse,,rodent,1,.5,#8a8a88,#f0ece4
Hazel Dormouse,,rodent,1,.35,#d8944a,#f0e8d8
Wood Mouse,,rodent,1,.3,#8a6a4a,#f0ece4
Harvest Mouse,,rodent,1,.25,#c8844a,#f4f0e8
Bank Vole,,rodent,1,.3,#a8643a,#c8b8a8
Water Vole,,rodent,1,.45,#5a4434,#7a6a5a,water
Alpine Marmot,,rodent,1,1,#8a7a5a,#5a4a3a
European Hamster,,rodent,2,.5,#c8844a,#1e1a18
Eurasian Beaver,,rodent,1,1.8,#6b4528,#4a2e18,water
European Hare,,hopper,1,.6,#a8845a
European Rabbit,,hopper,1,.45,#8a7a6a
Mountain Hare,,hopper,1,.55,#d8d4cc
European Hedgehog,,spiny,1,1,#5a4430,#e8dcc8
Roe Deer,,deer,1,.95,#a8643a,#7a4a2a,antlers
Fallow Deer,,deer,1,1.1,#b8743a,#f4f0e8,spots,antlers
Sika Deer (European),,deer,1,1,#8a5a3a,#f4f0e8,spots,antlers
Eurasian Elk,,deer,2,1.7,#3e2e22,#2e2218,antlers
Chamois,,bovid,2,.6,#7a5a3a,#f0ece4,h:gazelle
Alpine Ibex,,bovid,2,.7,#8a7a6a,#5a4a3a,h:impala
Mouflon,,bovid,2,.65,#8a5a3a,#f0ece4,h:bison
European Bison,,bovid,3,1.15,#5a3e26,#3a2818,h:bison,hump,shag=#3a2818
Highland Cattle,,bovid,1,1,#b8643a,#a8542a,h:buffalo,shag=#a8542a
Camargue Horse,,horse,1,.95,#e8e6e0,#c8c4bc
Exmoor Pony,,horse,1,.75,#7a5a3a,#3a2a1e
Wild Boar (Iberian),,pig,1,1,#4a3a2e,#3a2c22,tusk
Barbary Macaque,,ape,2,.65,#a8946a,#e8c8b0
Eurasian Eagle-Owl,,owl,2,1,#a8845a,#7a5a3a
Tawny Owl,,owl,1,.7,#8a6a45,#6e5233
Golden Pheasant (Wild),,fowl,1,.7,#e8302a,#f0c82a
Common Pheasant,,fowl,1,.8,#a8642a,#2a6a4a,#2a6a4a
Capercaillie,,fowl,2,.9,#2a2a2a,#5a4a3a,#1e1c1a
Red Kite,,hawk,1,.9,#a8542a,#7a3a1e,#d8d8d4
Common Buzzard,,hawk,1,.85,#7a5a3a,#5a4028
White Stork,,wader,1,1.2,#f4f4f2,#1e1c1a,#f4f4f2
Grey Heron,,wader,1,1.1,#9a9ea2,#6a6e72,#f0f0ec
Mute Swan (Wild),,duck,1,1.4,#f8f8f6,#e8e8e4
Puffin,,penguin,1,.5,#1e1c1a,#e8742a
Robin,,bird,1,.35,#8a6a4a,#e8742a,#e8742a
Blue Tit,,bird,1,.3,#e8d82a,#2a6ac8,#2a6ac8
Goldfinch,,bird,1,.3,#c8a87a,#f0d02a,#d82a2a
Kingfisher (Common),,bird,1,.35,#2a8ae8,#e8742a
Magpie,,bird,1,.5,#1e1c1a,#f4f4f2
Hoopoe,,bird,2,.45,#e8a85a,#1e1c1a,stripes
Bee-eater,,bird,1,.45,#e8c82a,#2a9ac8
Fire Salamander,,lizard,2,.6,#1e1c1a,#f0c82a,spots
Great Crested Newt,,lizard,2,.5,#3a3a2a,#e8742a,spots
Sand Lizard,,lizard,1,.5,#7a8a4a,#4a3a2a,spots
Slow Worm,,snake,1,.6,#a8845a,#7a5a3a
Grass Snake,,snake,1,1,#5a7a4a,#1e1c1a
European Adder,,snake,1,.8,#8a8070,#1e1c1a,stripes
Hermann's Tortoise,,turtle,2,.6,#c8a868,#3a2a1a
Common Toad,,frog,1,.8,#8a6a4a,#5a4a3a
Common Frog,,frog,1,.7,#8a7a4a,#3a3a2a
Northern Pike,,fish,1,1.6,#5a7a4a,#e8e0a0,spots
Brown Trout,,fish,1,.9,#a8845a,#3a2a1a,spots
Atlantic Salmon,,fish,1,1.3,#a8b0b8,#3a4048,spots
European Eel,,fish,1,1.2,#4a4a3a,#3a3a2a
Wels Catfish,,fish,2,3,#4a4a3a,#3a3a2a,spots
Sturgeon,,fish,2,2.6,#6a7a8a,#4a5a6a
Red Fox (British),,dog,1,.85,#c8642a,#2a1e14
Eurasian Lynx,,cat,2,1,#b8946a,#5a3e26,spots
Brown Bear (Carpathian),,bear,2,1.2,#6a4a2e,#4a321e
Red Deer (Highland),,deer,1,1.5,#8a5a3a,#5a3a22,antlers
Reindeer (Lapland),,deer,1,1.4,#8a7a6a,#f0ece4,antlers
Water Buffalo (Italian),,bovid,1,1.2,#2a2420,#1e1a16,h:buffalo
Konik Horse,,horse,1,.9,#8a7a6a,#4a4038
Shetland Pony,,horse,1,.6,#5a3a22,#3a2418
Golden Eagle (Alpine),,hawk,2,1.1,#5a3e26,#3a2818,#a8844a
Lammergeier,,hawk,3,1.3,#3a3430,#c8844a,#e8c890
Peregrine Falcon (Cliff),,hawk,2,.6,#5a6a7a,#3a4a5a,#1e1c1a
Barn Swallow,,bird,1,.3,#2a3a6a,#1e2a4a,#c8442a
European Starling,,bird,1,.35,#2a2a3a,#3a4a3a,#2a2a3a
Bullfinch,,bird,1,.3,#e8746a,#1e1c1a,#1e1c1a
Common Crane,,wader,2,1.2,#9a9a9a,#5a5a5a,#1e1c1a
Little Owl,,owl,1,.35,#8a6a4a,#e8e0d0
Great Bustard,,fowl,3,1.1,#a8845a,#d8d8d8,#9a9a9a
Black Grouse,,fowl,2,.7,#1e1c2a,#f4f4f2,#c8242a
Gannet,,duck,1,1,#f4f4f2,#1e1c1a,#e8d8a8
Smooth Snake,,snake,2,.7,#8a7a6a,#4a3a2e
Aesculapian Snake,,snake,2,1,#5a5a3a,#3a3a2a
European Pond Turtle,,turtle,2,.6,#2a2a22,#c8b84a
Green Lizard,,lizard,1,.45,#4ac83a,#3a8ac8
Olm,,lizard,3,.35,#f4d8d0,#e8c8c0,water
Natterjack Toad,,frog,2,.35,#6a7a4a,#d8c84a
Common Carp,,fish,1,.8,#a8945a,#7a6a3a
Grayling,,fish,1,.6,#8a8a9a,#5a5a6a
`,
australia:`
Red Kangaroo,,hopper,1,1.5,#b8643a
Eastern Grey Kangaroo,,hopper,1,1.4,#8a8278
Wallaroo,,hopper,1,1.2,#5a4a3e
Red-necked Wallaby,,hopper,1,1,#9a8a7a
Quokka,,hopper,2,.55,#8a7a62
Tree Kangaroo,,hopper,2,.9,#a8542a
Bilby,,rodent,2,.8,#a8a4a0,#f0ece4
Sugar Glider,,rodent,1,.4,#9a9a9a,#1e1c1a,stripes
Common Brushtail Possum,,rodent,1,.9,#7a7a78,#3a3a38
Numbat,,rodent,3,.7,#a8643a,#f0ece4,stripes
Quoll,,weasel,2,.8,#7a5a3a,#f4f4f2,spots
Tasmanian Tiger (Thylacine),,dog,3,1,#b8945a,#3a2a1a,stripes
Dingo (Desert),,dog,1,1,#d8a46a,#f2e6d2
Koala (Southern),,bear,2,.3,#8f9396,#e8e8e6
Common Wombat,,bear,1,.45,#7a6a5a,#5e5044
Short-beaked Echidna,,spiny,1,1,#3a2e24,#e8dcb8
Cassowary,,ratite,2,1.1,#1e1c1a,#2a2a2a,#2a6ae8
Emu (Coastal),,ratite,1,1.1,#5a4a3a,#4a3e32,#3a4a6a
Kookaburra,,bird,1,.6,#8a6a4a,#5a4a3a,#e8e0d0
Galah,,parrot,1,.6,#e87a9a,#8a8a8a,#f0b0c0
Sulphur-crested Cockatoo,,parrot,1,.75,#f4f4f2,#e8e8e4,#f0d82a
Rainbow Lorikeet,,parrot,1,.5,#2ab84a,#2a5ae8,#2a3ac8
Budgerigar,,parrot,1,.35,#6ad84a,#3a8a2a,#f0e82a
Red-tailed Black Cockatoo,,parrot,2,.8,#1e1c1a,#1e1c1a,#1e1c1a
Superb Lyrebird,,fowl,2,.8,#7a5a3a,#5a4028
Wedge-tailed Eagle,,hawk,2,1.1,#3a2a1e,#2a1e14,#5a3e26
Brolga,,wader,1,1.2,#9a9ea2,#7a7e82,#c83a2a
Australian Pelican,,duck,1,1.6,#f4f4f2,#1e1c1a
Black Swan (Wild),,duck,1,1.3,#1e1c1a,#2a2a2a
Lace Monitor,,lizard,1,1.5,#2a2a2a,#e8d070,stripes
Perentie,,lizard,2,2,#a8743a,#3a2a1a,spots
Thorny Devil,,lizard,2,.4,#c8843a,#7a4a2a,spots
Blue-tongued Skink,,lizard,1,.7,#8a7a6a,#4a3a2e,stripes
Bearded Dragon,,lizard,1,.6,#c8a060,#8a6a3a
Inland Taipan,,snake,3,1.3,#a8843a,#7a5a2a
Eastern Brown Snake,,snake,2,1.2,#8a5a3a,#7a4a2a
Carpet Python,,snake,1,1.6,#7a6a3a,#3a2e1e
Saltwater Crocodile (Top End),,croc,2,1.4,#4a4a2a,#2a2a1a
Freshwater Crocodile,,croc,1,.9,#6a6a4a,#3a3a2a
Green Tree Frog,,frog,1,.8,#6ad84a,#4ab83a
Corroboree Frog,,frog,3,.5,#f0e02a,#1e1c1a,stripes
Barramundi,,fish,1,1.5,#a8b0b8,#7a8088
Murray Cod,,fish,2,2,#5a7a4a,#3a4a2a,spots
Australian Lungfish,,fish,3,1.6,#5a5a4a,#3a3a2a
Spotted-tailed Quoll,,weasel,2,1,#8a5a3a,#f4f4f2,spots
Bandicoot,,rodent,1,.7,#8a7a5a,#5a4a3a
Platypus (Tasmanian),,rodent,3,.8,#6a4a32,#2a2a2a,water
Water Rat (Rakali),,rodent,1,.8,#3a2a1e,#e8c84a,water
Fruit Bat (Flying Fox),,bird,1,.8,#3a2a1e,#2a1e14,#a8642a
Southern Cassowary Chick,,ratite,1,.6,#a8845a,#7a5a3a,stripes
Western Grey Kangaroo,,hopper,1,1,#7a6a5a
Swamp Wallaby,,hopper,1,.7,#3a3028
Rock Wallaby,,hopper,2,.6,#8a7a6a
Tasmanian Devil (Wild),,weasel,2,1,#1e1c1a,#f4f4f2
Feathertail Glider,,rodent,2,.3,#8a7a6a,#d8d0c0
Hairy-nosed Wombat,,bear,3,.75,#9a8a7a,#6a5a4a
Spinifex Hopping Mouse,,rodent,1,.3,#c8a07a,#f4f0e8
Gang-gang Cockatoo,,parrot,2,.5,#5a5a5a,#3a3a3a,#c8242a
Major Mitchell's Cockatoo,,parrot,3,.55,#f4d0d0,#f4f0f0,#f4a8a8
Crimson Rosella,,parrot,1,.45,#c8242a,#2a5ac8,#c8242a
Satin Bowerbird,,bird,2,.45,#1e1e3a,#2a2a4a,#1e1e3a
Superb Fairywren,,bird,1,.25,#3a6ac8,#5a4a3a,#3aa8e8
Tawny Frogmouth,,owl,1,.5,#8a8a8a,#5a5a5a
Powerful Owl,,owl,2,.65,#5a4a3a,#e8e0d0
Jabiru (Australian),,wader,2,1.3,#f4f4f2,#1e1c1a,#2a3a4a
Little Penguin,,penguin,2,.45,#3a5a8a,#f4f4f2
Magpie Goose,,duck,1,.9,#1e1c1a,#f4f4f2,#1e1c1a
Frilled Lizard,,lizard,2,.8,#8a6a4a,#c8642a
Shingleback Lizard,,lizard,1,.5,#5a4a3a,#d8c8a0
Sand Goanna,,lizard,1,1.2,#a8945a,#5a4a32,spots
Mulga Snake,,snake,2,1.2,#8a5a2a,#5a3a1e
Death Adder,,snake,3,.7,#8a6a4a,#3a2a1e,stripes
Pig-nosed Turtle,,turtle,3,.8,#6a6a5a,#4a4a3a,water
Leatherback (Coral Sea),,turtle,3,2,#2a2a2a,#1e1e1e,water
Green Tree Python,,snake,2,1,#3ac83a,#f4f4f2
Rainbowfish,,fish,1,.25,#3a8ac8,#e8642a
Saratoga,,fish,2,.9,#8a8a6a,#c8a83a
`,
poles:`
Arctic Fox (Blue Morph),,dog,2,.75,#5a5e66,#3a3e46
Arctic Wolf,,dog,2,1.15,#f4f4f2,#d8d8d4
Polar Bear Cub,,bear,2,.6,#f0ece0,#f0ece0
Ermine,,weasel,1,.5,#f4f4f2,#1e1c1a
Lemming,,rodent,1,.35,#a8743a,#1e1a18
Arctic Ground Squirrel,,rodent,1,.6,#a8845a,#f0ece4
Svalbard Reindeer,,deer,2,1.2,#e0dcd4,#a89e94,antlers
Muskox Calf,,bovid,1,.6,#3a2a1e,#2a2018,shag=#3a2a1e
Walrus Bull,,seal,2,2.2,#9a644a,#8a5440
Harp Seal,,seal,1,1.1,#d8d8d4,#3a3a3a
Leopard Seal,,seal,2,2,#8a8e92,#3a3e42
Weddell Seal,,seal,1,1.8,#6a6e76,#c8ccd4
Elephant Seal,,seal,2,2.6,#7a6a5a,#5a4a3e
Ringed Seal,,seal,1,1,#8a8e92,#d8dce0
Bearded Seal,,seal,1,1.5,#8a7a6a,#5a4a3e
Emperor Penguin,,penguin,1,1.4,#1b1d22,#f0a020
King Penguin,,penguin,1,1.2,#1b1d22,#f08a20
Adelie Penguin,,penguin,1,.85,#1b1d22,#2a2a2a
Chinstrap Penguin,,penguin,1,.85,#1b1d22,#2a2a2a
Gentoo Penguin,,penguin,1,.9,#1b1d22,#e85a2a
Macaroni Penguin,,penguin,2,.85,#1b1d22,#e8742a
Rockhopper Penguin,,penguin,2,.7,#1b1d22,#e85a2a
Snowy Owl (Arctic),,owl,2,1,#f6f6f2,#e8e8e2
Gyrfalcon,,hawk,2,.8,#f0f0ec,#9a9ea2,#f0f0ec
Ptarmigan,,fowl,1,.6,#f4f4f2,#e8e8e4
Arctic Tern,,bird,1,.5,#f4f4f2,#c8ccd0,#1e1c1a
Wandering Albatross,,hawk,2,1.3,#f4f4f2,#3a3a3a,#f4f4f2
Snow Petrel,,bird,1,.5,#f8f8f6,#ececea
Skua,,hawk,1,.8,#5a4a3a,#3a2e26
Narwhal,,whale,3,.8,#9a9ea8,#d8dce0
Beluga Whale,,whale,2,.75,#f4f4f2,#ececea
Bowhead Whale,,whale,3,2.2,#1e1c1a,#e8e8e4
Arctic Char,,fish,1,.8,#8a9aa8,#e85a3a,spots
Antarctic Toothfish,,fish,2,1.6,#5a5e66,#3a3e46
Icefish,,fish,1,.8,#d8dce0,#a8acb0
Krill Swarm,,fish,1,.25,#e86a5a,#c84a3a
Greenland Shark,,shark,3,1.6,#4a4e56
Southern Right Whale,,whale,2,2,#1e1c1a,#f4f4f2
Sea Butterfly,,fish,1,.2,#c8d8e8,#a8b8c8
Arctic Hare (Greenland),,hopper,1,.55,#f8f8f6
Lemming (Collared),,rodent,1,.35,#d8d0c8,#7a6a5a
Snow Goose,,duck,1,1,#f4f4f2,#1e1c1a
Common Eider,,duck,1,.9,#f4f4f2,#1e1c1a,#2a2a2a
Little Auk,,penguin,1,.4,#1e1c1a,#2a2a2a
Antarctic Fur Seal,,seal,1,1.2,#5a4a3e,#7a6a5a
Ross Seal,,seal,3,1.5,#5a5e66,#c8ccd4
Crabeater Seal,,seal,1,1.6,#c8c0b0,#8a8070
Sea Spider,,fish,2,.3,#e8a8a0,#c8887a
Arctic Fox (White),,dog,1,.55,#f4f4f2,#d8d8d8
Norway Lemming,,rodent,1,.35,#8a6a4a,#1e1c1a
Snowshoe Hare (Arctic),,rodent,1,.7,#f4f4f2,#d8d8d8
Musk Ox (Greenland),,bovid,2,1,#3a2a1e,#2a1e14,h:bison,shag=#3a2a1e
Hooded Seal,,seal,2,1.2,#8a8a8a,#3a3a3a
Spotted Seal,,seal,1,.9,#a8a8a0,#3a3a3a
South Georgia Pipit,,bird,3,.3,#8a7a5a,#5a4a3a,#8a7a5a
Arctic Redpoll,,bird,1,.25,#f0ece4,#d8d0c8,#c8242a
Snow Bunting,,bird,1,.3,#f4f4f2,#1e1c1a,#f4f4f2
Black-browed Albatross,,duck,2,1.1,#f4f4f2,#3a3a3a,#f4f4f2
Emperor Goose,,duck,2,.9,#9a9aa8,#5a5a6a,#f4f4f2
Southern Giant Petrel,,hawk,2,1,#6a6a6a,#4a4a4a,#8a8a8a
Royal Penguin,,penguin,2,.85,#1e1c1a,#f4f4f2
Little Blue Penguin (Antarctic),,penguin,1,.4,#3a5a8a,#f4f4f2
Atlantic Walrus,,seal,2,2,#a8745a,#8a5a42,tusk
Ribbon Seal,,seal,3,1,#2a2420,#f4f4f2,stripes
Polar Cod,,fish,1,.3,#8a9aa8,#c8d0d8
Antarctic Krill Fish,,fish,1,.25,#d88a7a,#c86a5a
Greenland Halibut,,fish,2,1,#5a5a5a,#3a3a3a
Orca (Antarctic),🐋,dolphin,3,2,#121418,#f4f4f2
`,
ocean:`
Great White Shark,,shark,3,1.8,#6e7a86
Tiger Shark,,shark,2,1.4,#7a7a6a
Bull Shark,,shark,2,1.1,#8a8e86
Whale Shark,,shark,3,4,#3a4a5a
Basking Shark,,shark,2,3,#5a5e66
Blacktip Reef Shark,,shark,1,.6,#9aa4ae
Lemon Shark,,shark,1,1,#b8a86a
Mako Shark,,shark,2,1.2,#3a5a8a
Thresher Shark,,shark,2,1.3,#6a6e7a
Nurse Shark,,shark,1,1,#a8946a
Goblin Shark,,shark,3,1.2,#d8a8a8
Megamouth Shark,,shark,3,1.8,#3a3a3a
Sperm Whale,,whale,3,2.6,#4a4a4e,#6a6a6e
Fin Whale,,whale,2,3,#5a5e66,#e8e8e4
Minke Whale,,whale,1,1.3,#5a6270,#f0f0ec
Grey Whale,,whale,2,2,#8a8e92,#a8acb0
Pilot Whale,,dolphin,2,2,#1e1c1a,#3a3a3a
Bottlenose Dolphin,,dolphin,1,1,#8a98a8
Spinner Dolphin,,dolphin,1,.8,#5a6a7a
Common Dolphin,,dolphin,1,.85,#3a4a5a,#e8d8a8
Risso's Dolphin,,dolphin,2,1.3,#9aa0a8,#d8dce0
Harbour Porpoise,,dolphin,1,.7,#4a5a6a
Vaquita,,dolphin,3,.6,#7a8a96
Giant Manta Ray,,ray,2,3,#2a3038
Spotted Eagle Ray,,ray,2,1.4,#2a3a4a
Stingray,,ray,1,1,#a8946a
Sawfish,,shark,3,1.6,#a8946a
Hammerhead (Great),,shark,3,1.6,#8a8e86
Blue Marlin,,fish,3,4,#2a4a8a,#8ab8e8
Swordfish,,fish,2,3.6,#3a4a5a,#a8b0b8
Sailfish,,fish,2,3.4,#2a3a8a,#5a8ae8
Bluefin Tuna,,fish,2,3,#2a3a5a,#c8d0d8
Yellowfin Tuna,,fish,1,2.4,#2a3a5a,#f0d82a
Mahi-mahi,,fish,1,1.8,#4ab84a,#f0d82a,spots
Barracuda,,fish,1,2,#a8b0b8,#3a4048,stripes
Moray Eel,,fish,1,2,#5a6a3a,#e8d870,spots
Ocean Sunfish,,fish,3,3,#a8acb0,#8a8e92
Lionfish,,fish,1,.7,#c84a2a,#f4f0e8,stripes
Parrotfish,,fish,1,1,#2ab8a8,#e85a9a
Mandarinfish,,fish,2,.4,#2a5ae8,#e8742a,stripes
Butterflyfish,,fish,1,.6,#f0e82a,#1e1c1a,stripes
Triggerfish,,fish,1,.7,#2a3a5a,#f0d82a,spots
Grouper,,fish,1,2,#7a6a4a,#4a3a2a,spots
Napoleon Wrasse,,fish,3,2.4,#2a8a8a,#5ab8b8
Flying Fish,,fish,1,.6,#3a5a8a,#a8c8e8
Anglerfish,,fish,3,.8,#3a2e26,#e8c84a
Oarfish,,fish,3,4,#c8ccd0,#e83a3a
Coelacanth,,fish,3,1.6,#3a4a6a,#f4f4f2,spots
Seadragon,,fish,2,.5,#e8a83a,#c8642a
Pufferfish (Spotted),,fish,1,.6,#d8c070,#5a4a20,spots
Green Sea Turtle,,turtle,1,1.4,#7a8a5a,#6a5232
Leatherback Turtle,,turtle,2,2,#2a2a2e,#3a3a3e
Hawksbill Turtle,,turtle,2,1.1,#8a6a3a,#c8944a
Loggerhead Turtle,,turtle,1,1.3,#a8643a,#8a5a2a
Sea Lion,,seal,1,1.6,#8a6a4a,#6a4e34
Harbour Seal,,seal,1,1.1,#8a8e92,#4a4e52,spots
Dugong,,seal,2,2,#8a8a8a,#6a6a6a
Manatee,,seal,2,2.2,#6a6a6a,#4a4a4a
Marine Iguana (Sea),,lizard,2,1.1,#2a2a2a,#5a5a50
Sea Snake,,snake,2,1,#2a3a5a,#f0f0ec,stripes
Saltwater Crocodile (Ocean),,croc,3,1.5,#4a4a2a,#2a2a1a
Blue-footed Booby,,bird,1,.7,#a8845a,#5a4a3a,#f0ece4
Frigatebird,,hawk,1,.9,#1e1c1a,#2a2a2a,#d82a2a
Brown Pelican,,duck,1,1.4,#7a6a5a,#4a3e32,#f0e8d8
Cormorant,,duck,1,.9,#1e1c1a,#2a2a2a
Atlantic Puffin,,penguin,1,.5,#1e1c1a,#e8742a
Galapagos Penguin,,penguin,2,.7,#1b1d22,#2a2a2a
Giant Squid,,fish,3,4,#c8442a,#e86a4a
Box Jellyfish,,fish,2,.6,#d8e8f0,#a8c8e0
Cuttlefish,,fish,1,.8,#a8946a,#e8d8b8,stripes
Nautilus,,fish,2,.5,#f4f0e8,#c8642a,stripes
Lobster,,fish,1,.6,#2a3a5a,#c8442a
Horseshoe Crab,,turtle,2,.6,#6a5a3a,#5a4a2a
Great Barracuda,,fish,2,1.2,#8a9aa8,#3a4a5a,stripes
Clownfish,,fish,1,.2,#f8742a,#f4f4f2,stripes
Blue Tang,,fish,1,.3,#2a5ac8,#f8d82a
Moorish Idol,,fish,2,.3,#f4f4f2,#1e1c1a,stripes
Emperor Angelfish,,fish,2,.4,#2a3ac8,#f8d82a,stripes
Giant Trevally,,fish,2,1,#8a9aa8,#3a4a5a
Atlantic Cod,,fish,1,.9,#8a8a6a,#5a5a3a
Halibut,,fish,2,1.3,#5a4a3a,#3a2e22
Wolf Eel,,fish,2,1,#6a6a6a,#4a4a4a
Spotted Eagle Ray (Atlantic),,ray,2,1
Electric Ray,,ray,2,.7,#8a6a4a
Blue Shark,,shark,2,1,#2a4a8a
Oceanic Whitetip,,shark,3,1.1,#7a7e7a
Greenland Shark (Deep),,shark,3,1.5,#5a5a5a
Wobbegong,,shark,2,.8,#8a7a5a
Zebra Shark,,shark,2,.9,#d8c8a0
Dusky Dolphin,,dolphin,1,.8,#3a3a44,#f4f4f2
Hector's Dolphin,,dolphin,3,.6,#7a7a84,#f4f4f2
Beaked Whale,,whale,3,.9,#5a5a5a,#8a8a8a
Bryde's Whale,,whale,2,1.4,#3a4048,#d8dce0
Olive Ridley Turtle,,turtle,1,1,#6a7a4a,#5a6a3a,water
Elephant Seal (Northern),,seal,2,2,#8a7a6a,#6a5a4a
Australian Sea Lion,,seal,2,1.4,#8a6a4a,#c8b08a
Albatross (Laysan),,duck,2,1,#f4f4f2,#3a3a3a,#f4f4f2
Tropicbird,,bird,2,.6,#f4f4f2,#1e1c1a,#f4f4f2
`,
dino:`
Tyrannosaurus (Juvenile),,rex,2,.55,#5a4a3a,#3a2e22
Albertosaurus,,rex,2,.8,#6a5a44,#3a2e22
Gorgosaurus,,rex,2,.8,#7a5a3a,#4a3220
Daspletosaurus,,rex,2,.9,#5a4a3a,#2e241a
Tarbosaurus,,rex,2,.95,#6a5a46,#3a2e22
Giganotosaurus,,rex,3,1.25,#7a6a54,#4a3e30
Carcharodontosaurus,,rex,3,1.2,#8a6a4a,#5a3e26
Mapusaurus,,rex,3,1.15,#6a5a4a,#4a3a2a
Acrocanthosaurus,,rex,2,1,#6a5a44,#3a2e22
Torvosaurus,,rex,2,.95,#7a4a2a,#4a2a18
Ceratosaurus,,rex,2,.75,#7a5a3a,#2e1e12
Megalosaurus,,rex,2,.85,#6a5a44,#3a2e22
Majungasaurus,,rex,2,.75,#8a4a2a,#3a2214
Suchomimus,,rex,2,.95,#5a6a50,#3a4630
Irritator,,rex,2,.7,#6a7a5a,#3a4630
Yutyrannus,,rex,2,.85,#8a6a4a,#c8b090
Deinonychus,,raptor,1,1.6,#6a5a44,#2e241a
Utahraptor,,raptor,2,2.6,#8a6a4a,#3a2a1a
Microraptor,,raptor,1,.45,#2a2a3a,#2a5ae8
Dakotaraptor,,raptor,2,2.2,#7a5a3a,#2e1e12
Troodon,,raptor,1,1.1,#a8845a,#5a3e26
Oviraptor,,orni,1,.8,#8a6a5a,#c8442a
Struthiomimus,,orni,1,1,#a8946a,#7a6a4a
Ornithomimus,,orni,1,.95,#a8946a,#5a4a3a
Compsognathus,,raptor,1,.4,#6a8a4a,#3a5a2a
Coelophysis,,raptor,1,1.1,#a8743a,#5a3a1a
Herrerasaurus,,raptor,2,1.6,#8a5a3a,#3a2a1a
Eoraptor,,raptor,1,.6,#a8845a,#5a4a3a
Apatosaurus,,sauropod,2,1.05,#7a7a6a,#5a5a4e
Brontosaurus,,sauropod,2,1,#7a6a5a,#5a4e44
Argentinosaurus,,sauropod,3,1.5,#6a6a5e,#4e4e44
Patagotitan,,sauropod,3,1.45,#7a7466,#58544a
Camarasaurus,,sauropod,1,.8,#8a7a62,#6a5a46
Mamenchisaurus,,sauropod,2,1.1,#6a7a62,#4a5a44
Amargasaurus,,sauropod,2,.6,#8a6a4a,#5a3e26
Dreadnoughtus,,sauropod,3,1.35,#5a5a50,#3e3e36
Styracosaurus,,cerat,2,.9,#7a6a4a,#c8642a
Pachyrhinosaurus,,cerat,2,.95,#6a5a4a,#a8743a
Centrosaurus,,cerat,1,.85,#8a6a4a,#a8543a
Chasmosaurus,,cerat,1,.9,#7a7a5a,#d86a4a
Protoceratops,,cerat,1,.45,#c8a87a,#8a6a4a
Torosaurus,,cerat,2,1.1,#6a5a44,#c84a2a
Kentrosaurus,,stego,1,.7,#7a6a4a,#c8642a
Huayangosaurus,,stego,2,.6,#6a7a4a,#c84a2a
Euoplocephalus,,ankylo,2,.95,#7a6a50,#5a4a38
Nodosaurus,,ankylo,1,.9,#8a6a4a,#5a4a32
Borealopelta,,ankylo,3,.85,#a8542a,#7a3a1e
Edmontosaurus,,hadro,1,1.2,#6a7a5a,#4a5a3a
Maiasaura,,hadro,1,1,#7a6a4a,#5a4a32
Corythosaurus,,hadro,1,1,#6a7a5a,#c8642a
Lambeosaurus,,hadro,2,1.1,#7a6a5a,#c84a2a
Shantungosaurus,,hadro,3,1.5,#6a6a5a,#4a4a3e
Quetzalcoatlus,,ptero,3,1.8,#4a3a30,#5e3e2c
Rhamphorhynchus,,ptero,1,.5,#6a5a4a,#7a5a3a
Dimorphodon,,ptero,1,.5,#3a3a3a,#c8642a
Tapejara,,ptero,2,.8,#5a4a3a,#d84a2a
Plesiosaurus,,marine,2,1.2,#4e6a5c,#d8e0d0
Elasmosaurus,,marine,3,1.8,#5a6a7a,#d8dce0
Liopleurodon,,marine,3,2.2,#3a4a5a,#c8d0d8
Kronosaurus,,marine,3,2.4,#4a4a5a,#d0d4d8
Ichthyosaurus,,marine,1,.8,#5a7088,#e8eef2
Dunkleosteus,,shark,3,1.6,#7a7a6a
Helicoprion,,shark,2,1.2,#6a6e76
Sarcosuchus,,croc,3,2.4,#4a4a3a,#2e2e22
Deinosuchus,,croc,3,2.2,#3a3a2a,#2a2a1a
Postosuchus,,croc,2,1,#7a4a2a,#3a2a1a
Smilodon,,cat,2,1.2,#b08a5a,#7a5a34
American Lion,,cat,3,1.4,#c4975a,#8a6a40
Cave Bear,,bear,2,1.2,#5a3e26,#3a281a
Short-faced Bear,,bear,3,1.35,#6a4a2e,#4a321e
Dire Wolf,,dog,2,1.2,#7a7470,#4a4440
Irish Elk,,deer,2,1.8,#8a6a4a,#5a4430,antlers
Woolly Mammoth Calf,,bovid,1,.6,#5a3a22,#4a2e1a,noh,trunk,shag=#4a2e1a
Mastodon,,bovid,2,1.4,#4a3020,#3a2418,noh,trunk,tusk,shag=#3a2418
Megatherium,,bear,3,1.6,#7a5a3a,#5a3e26
Glyptodon,,spiny,2,2.8,#8a7a5a,#6a5a3e
Paraceratherium,,bovid,3,2,#8a8478,#6a645a,noh
Doedicurus,,spiny,2,2.6,#7a6a4a,#5a4a32
Moa,,ratite,2,1.8,#7a5a3a,#5a3e26,#7a5a3a
Dodo,,fowl,2,.9,#8a8a8a,#6a6a6a,#d8c870
Terror Bird,,ratite,3,1.4,#5a4a3a,#3a2e22,#c8a040
Haast's Eagle,,hawk,3,1.4,#5a3e26,#3a2818,#5a3e26
Arsinoitherium,,bovid,2,1.2,#6a5a4a,#4a3e32,h:bison
Andrewsarchus,,bear,3,1.2,#4a3a2e,#2e241c
Dimetrodon (Grandis),,lizard,2,2.6,#7a5a3a,#b04a2a
Archelon,,turtle,3,3,#4a5a5a,#3a4a4a
Titanoboa,,snake,3,4,#4a5a3a,#2a3a1a
Megalania,,lizard,3,3,#5a5040,#3a3428,spots
Allosaurus (Jimbo),,rex,2,.95,#7a5a3a,#4a3220
Baryonyx,,rex,2,.85,#6a6a4a,#4a4a32
Carnotaurus (Young),,rex,2,.7,#8a3a22,#5a2214
Velociraptor (Wild),,raptor,2,.5,#a8743a,#5a3a1e
Pyroraptor,,raptor,2,.6,#c8442a,#5a2214
Atrociraptor,,raptor,3,.7,#5a3a2a,#c8642a
Gallimimus (Plains),,orni,1,1,#8a7a5a,#5a4a32
Dryosaurus,,orni,1,.7,#6a7a4a,#4a5a32
Iguanodon,,hadro,1,1,#6a7a5a,#4a5a3a
Parasaurolophus (Wild),,hadro,2,1.1,#8a6a3a,#c8642a
Brachiosaurus (Young),,sauropod,2,.6,#6a6a5a,#4a4a3e
Diplodocus,,sauropod,2,1,#7a7a6a,#5a5a4a
Nasutoceratops,,cerat,2,.9,#8a5a3a,#c8a07a
Sinoceratops,,cerat,3,1,#6a5a4a,#c8442a
Miragaia,,stego,3,1,#6a6a4a,#c8642a
Ankylosaurus (Tarchia),,ankylo,2,.9,#6a5a4a,#4a3e32
Pteranodon (Wild),,ptero,2,1.2,#5a4a3a,#7a5a3a
Dimorphodon (Island),,ptero,1,.5,#4a3a2a,#c8442a
Mosasaurus (Juvenile),,marine,2,1.4,#3a4a5a,#d0d8e0
Megalodon Pup,,shark,3,1.4,#6a6e76
`};
for(const[id,txt]of Object.entries(DATA)){const c=CONT.find(c=>c.id===id);if(!c)continue;const have=new Set(c.animals.map(a=>a[0]));
  for(const line of txt.trim().split('\n')){const a=make(line);if(have.has(a[0]))continue;have.add(a[0]);c.animals.push(a)}}
// Seb's own made-up animals (always added after everything else so saved games keep working)
{const af=CONT.find(c=>c.id==='africa'),po=CONT.find(c=>c.id==='poles');
 // the Sarah: part lion, tiger, panther and cheetah, very fit, kind, fluffy and fast; eats plants; fawn with blue eyes
 if(af&&!af.animals.some(a=>a[0]==='Sarah'))af.animals.push(['Sarah','🦁',3,3.4,Object.assign(MK.cat(1.1,'#b8864e','#6a4422'),{
   tex:'stripes',freq:9,thin:.6,dim:.9,mane:'#c8955a',shag:'#c08a50',eyeCol:'#2a8cff',eyeS:1.35,graze:1,herd:[1,2],belly:'#efe0c4'})]);
 // the Coldness: an orange horse with purple eagle wings that lives at the North Pole, very fluffy, and can turn invisible
 if(po&&!po.animals.some(a=>a[0]==='The Coldness'))po.animals.push(['The Coldness','🐎',3,2.4,Object.assign(MK.horse(1.25,'#e8842a','#f4a85a'),{
   shag:'#f09a48',fairy:1,fly:1,soar:1,wingCol:'#2a6ae8',wingCol2:'#9a3ae0',wingS:1.5,invis:1,herd:[1,1],belly:'#f6c08a'})]);}
// hunters hunt the smaller animals that live in the same place
for(const c of CONT){const prey=c.animals.filter(a=>PREY.includes(a[4].tpl)).map(a=>a[0]);
  for(const a of c.animals){const d=a[4];if(d.x&&PRED.includes(d.tpl)&&!d.hunts&&prey.length)d.hunts=prey.filter(n=>n!==a[0]).sort(()=>Math.random()-.5).slice(0,8)}}
}
