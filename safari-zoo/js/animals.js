// Animal shapes, coats, skeletons and walk cycles. Every model faces +Z with its feet on y=0.
(function(){
const T=THREE,{noise3,fbm,voronoi}=MESHER;
const ad=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sc=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const ad3=(...v)=>v.reduce(ad,[0,0,0]);

function kit(){
  const k={bones:[],prims:[],extras:[]};
  k.bone=(name,parent,pos)=>{k.bones.push({name,parent:parent==null?-1:k.bones.findIndex(b=>b.name===parent),pos});return name};
  k.cap=(a,b,r1,r2,bone,o={})=>k.prims.push(Object.assign({t:'c',a,b,r1,r2,bone},o));
  k.ell=(c,r,bone,o={})=>k.prims.push(Object.assign({t:'e',c,r,bone},o));
  // thin parts that are too fine for the body mesh: horns, beaks, eyes, thin tails
  k.extra=(bone,kind,pos,o={})=>k.extras.push(Object.assign({bone,kind,pos},o));
  return k;
}

/* ---------- four-legged animals ---------- */
function quad(p){
  const k=kit(),{L,W,Hb,leg}=p,lw=p.legW||W*.15,by=leg+Hb*.42;
  k.bone('root',null,[0,by,0]);
  k.ell([0,by+Hb*.04,L*.2],[W*.5,Hb*.52,L*.34],'root',{k:Hb*.4,pat:1});
  k.ell([0,by,-L*.22],[W*.48,Hb*.48,L*.33],'root',{k:Hb*.4,pat:1});
  k.ell([0,by-Hb*.06,0],[W*.45,Hb*.44,L*.32],'root',{k:Hb*.35,pat:1});
  if(p.hump)k.ell([0,by+Hb*.46,p.shag?L*.18:0],[W*.3,Hb*.36,L*.22],'root',{k:Hb*.3,pat:1,col:p.shag,rough:p.shag?.03:0,rf:10});
  if(p.shag)k.ell([0,by+Hb*.06,L*.22],[W*.6,Hb*.62,L*.3],'root',{k:Hb*.25,col:p.shag,rough:.04,rf:9});
  if(p.panda)k.ell([0,by+Hb*.04,L*.17],[W*.53,Hb*.55,L*.15],'root',{k:.02,col:'#161616'});
  if(p.stripe)k.ell([0,by+Hb*.4,-L*.05],[W*.15,Hb*.18,L*.48],'root',{k:.03,col:'#f2f2f0'});
  const hipY=by+Hb*.02;
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz],i)=>{
    const front=sz>0,x=sx*W*.3,z=sz*L*(front?.31:.29);
    const top=[x,hipY,z],knee=[x*1.02,leg*(front?.5:.56),z+(front?.02:-.07)*L],foot=[x*1.02,.07,z+(front?.03:-.01)*L];
    k.bone('leg'+i,'root',top);k.bone('low'+i,'leg'+i,knee);
    const lc=p.legCol||null;
    k.ell([x*.92,hipY-Hb*.08,z],[lw*1.9,Hb*.42,lw*(front?2.2:2.8)],'leg'+i,{k:Hb*.3,pat:1,col:p.panda?'#161616':null});
    k.cap(top,knee,lw*1.45,lw*.92,'leg'+i,{k:lw*.9,pat:1,col:lc||(p.panda?'#161616':null)});
    k.cap(knee,foot,lw*.86,lw*.64,'low'+i,{k:lw*.5,pat:p.tex==='giraffe'?0:1,col:lc||(p.panda?'#161616':p.tex==='giraffe'?'#efe0bd':null)});
    k.cap([foot[0],.1,foot[2]],[foot[0],.03,foot[2]+lw*.25],lw*.74,lw*.8,'low'+i,{k:lw*.3,col:p.hoof||(p.paws?(lc||null):'#2b2420'),pat:p.paws?1:0});
  });
  // neck and head
  const na=p.neckAng,nd=[0,Math.cos(na),Math.sin(na)],up=[0,Math.sin(na),-Math.cos(na)];
  const nb=[0,by+Hb*.22,L*.4],ne=ad(nb,sc(nd,p.neck));
  k.bone('neck','root',nb);k.bone('head','neck',ne);
  k.cap(ad(nb,sc(nd,-p.neckW*.3)),ne,p.neckW*1.3,p.neckW*.85,'neck',{k:p.neckW*.9,pat:1});
  if(p.mane)k.cap(ad(nb,sc(up,p.neckW*.9)),ad(ne,sc(up,p.neckW*.75)),.06,.05,'neck',{k:.04,col:p.mane,rough:.012,rf:30});
  const hp=p.hp!=null?p.hp:.15+(1-na/1.3)*.5,f=[0,-Math.sin(hp),Math.cos(hp)],u=[0,Math.cos(hp),Math.sin(hp)];
  const {headL:hl,headW:hw,headH:hh}=p,mz=p.muzzle||1,X=[1,0,0];
  const at=(df,du,dx=0)=>ad3(ne,sc(f,df),sc(u,du),sc(X,dx));
  const hcol=p.head||null;
  k.ell(at(hl*.12,hh*.06),[hw*.5,hh*.5,hl*.32],'head',{k:hh*.35,rot:[hp,0,0],pat:1,col:hcol});
  k.cap(at(hl*.3,-hh*.02),at(hl*.86,-hh*.12),hh*.37*mz,hh*.25*mz,'head',{k:hh*.3,pat:1,col:p.snout||hcol});
  k.ell(at(hl*.93,-hh*.1),[hh*.2*mz,hh*.15*mz,hh*.08],'head',{k:.02,col:p.nose||'#2a2220',detail:1});
  if(p.cheeks)for(const s of[-1,1])k.ell(at(hl*.45,-hh*.12,s*hw*.25),[hw*.25,hh*.25,hl*.2],'head',{k:hh*.2,pat:1,col:p.snout||hcol});
  const er=hw*.2,ec=p.earCol||hcol;
  for(const s of[-1,1]){
    const base=at(-hl*.02,hh*.42,s*hw*.3);
    if(p.ears==='pointy')k.cap(base,ad3(base,sc(u,er*2.3),[s*er*.5,0,0]),er*.6,er*.12,'head',{k:er*.4,col:ec,pat:ec?0:1,detail:1});
    if(p.ears==='round')k.ell(ad(base,[s*er*.3,er*.2,0]),[er*1.05,er,er*.45],'head',{k:er*.3,col:ec,pat:ec?0:1,detail:1});
    if(p.ears==='long')k.ell(ad3(base,sc(u,er*1.1),[s*er*.9,0,-er*.3]),[er*.55,er*1.6,er*.32],'head',{k:er*.3,rot:[0,0,-s*.7],col:ec,pat:ec?0:1,detail:1});
    if(p.ears==='fluffy')k.ell(ad(base,[s*er*.9,0,0]),[er*1.45,er*1.45,er*.65],'head',{k:er*.3,col:'#d4d6d8',rough:.02,rf:25,detail:1});
    if(p.ears==='big')k.extra('head','ear',at(-hl*.08,-hh*.05,s*hw*.55),{s,size:[.06,hh*.85,hl*.62],col:p.col});
    // eyes
    k.extra('head','eye',at(hl*.32,hh*.16,s*hw*.4),{r:Math.max(.018,hw*.075)*(p.eyeS||1),s});
  }
  if(p.panda)for(const s of[-1,1])k.ell(at(hl*.3,hh*.12,s*hw*.27),[hw*.15,hh*.17,hl*.1],'head',{k:.02,col:'#161616',detail:1});
  if(p.mask)k.ell(at(hl*.27,hh*.12),[hw*.53,hh*.14,hl*.18],'head',{k:.02,col:'#1d1d1d',detail:1});
  if(p.badger)for(const s of[-1,1])k.ell(at(hl*.2,hh*.22,s*hw*.2),[hw*.1,hh*.18,hl*.5],'head',{k:.02,col:'#1d1d1d',detail:1,rot:[hp,0,0]});
  if(p.lionMane){k.ell(at(-hl*.08,-hh*.1),[hw*.98,hh*1.12,hl*.5],'head',{k:hh*.2,col:p.lionMane,rough:.06,rf:7,rot:[hp,0,0]});
    k.cap(ad(nb,sc(nd,p.neck*.2)),ne,p.neckW*1.7,p.neckW*1.6,'neck',{k:p.neckW*.6,col:p.lionMane,rough:.06,rf:7})}
  if(p.trunk){const t0=at(hl*.8,-hh*.2),t1=ad(t0,[0,-.55,.18]),t2=ad(t1,[0,-.55,.06]),t3=ad(t2,[0,-.35,.12]);
    k.bone('trunk','head',t0);k.bone('trunk2','trunk',t1);
    k.cap(t0,t1,.2,.15,'trunk',{k:.1,pat:1});k.cap(t1,t2,.15,.11,'trunk2',{k:.06,pat:1});k.cap(t2,t3,.11,.08,'trunk2',{k:.05,pat:1})}
  if(p.tusks)for(const s of[-1,1])k.extra('head','tusk',at(hl*.6,-hh*.32,s*hw*.27),{s,len:.65*p.tusks,r:.055*Math.min(1,p.tusks+.3)});
  if(p.horn){k.extra('head','horn',at(hl*.78,hh*.08),{len:.55,r:.09,tilt:.35});k.extra('head','horn',at(hl*.5,hh*.2),{len:.28,r:.07,tilt:.2})}
  if(p.horns)for(const s of[-1,1])k.extra('head','horns',at(0,hh*.4,s*hw*.38),{s,kind2:p.horns});
  if(p.antlers)for(const s of[-1,1])k.extra('head','antler',at(-hl*.05,hh*.42,s*hw*.22),{s});
  if(p.ossicones)for(const s of[-1,1])k.extra('head','ossicone',at(-hl*.05,hh*.5,s*.07),{});
  // tail
  const tb=[0,by+Hb*.15,-L*.5],tl=p.tl||.4;k.bone('tail','root',tb);
  const tcol=p.tailCol||null;
  if(p.tail==='bushy'){const end=ad(tb,p.stripe?[0,tl*.8,-tl*.4]:[0,-tl*.35,-tl*.85]);
    k.cap(tb,end,W*.12,W*.24,'tail',{k:W*.15,col:tcol,pat:1,rough:.02,rf:20});
    if(p.tip)k.ell(ad(end,sc([0,end[1]-tb[1],end[2]-tb[2]],.12)),[W*.2,W*.2,W*.2],'tail',{k:W*.12,col:p.tip,rough:.02,rf:20})}
  else if(p.tail==='ringed')k.cap(tb,ad(tb,[0,-tl*.3,-tl*.95]),W*.14,W*.16,'tail',{k:W*.1,pat:'rings'});
  else if(p.tail==='short')k.ell(ad(tb,[0,-.02,-.04]),[W*.13,W*.15,W*.12],'tail',{k:W*.1,col:tcol,pat:1,detail:1});
  else if(p.tail==='flat')k.ell(ad(tb,[0,-by+.12,-.32]),[W*.32,.05,.3],'tail',{k:.04,col:'#3a2a1e',detail:1});
  else k.extra('tail','tail',tb,{len:tl,r:p.tail==='long'?.045:.025,tuft:p.tail==='tuft'?(p.tuftCol||p.mane||'#2a1d14'):null,col:p.tail==='long'?p.col:shade(p.col,-.1),ang:p.tail==='long'?2.1:2.75,tip:p.tail==='long'?(p.col2||p.col):null});
  k.anim={kind:'quad',stride:Math.max(.5,leg*1.5),graze:p.graze};
  return k;
}

/* ---------- birds ---------- */
function bird(p){
  const k=kit(),s=p.s,by=p.leg+s*.3,tilt=p.upright?-1.25:-.15;
  k.bone('root',null,[0,by,0]);
  const front=p.penguin?'#f4f3ee':p.owl?shade(p.body,.15):null;
  k.ell([0,by,0],[s*.36,s*.34,s*.56],'root',{k:s*.2,rot:[tilt,0,0],col:p.body,front});
  const nb=p.upright?[0,by+s*.5,s*.05]:[0,by+s*.16,s*.4];
  const na=p.neckAng!=null?p.neckAng:.3,nd=[0,Math.cos(na),Math.sin(na)],ne=ad(nb,sc(nd,p.neck||0));
  k.bone('neck','root',nb);k.bone('head','neck',ne);
  if(p.neck)k.cap(ad(nb,sc(nd,-s*.1)),ne,s*.1,s*.075,'neck',{k:s*.08,col:p.head});
  const hr=p.owl?s*.3:s*.17,hc=ad(ne,[0,p.upright&&!p.neck?hr*.6:hr*.3,0]);
  k.ell(hc,[hr,hr*.95,hr*1.05],'head',{k:s*.08,col:p.head,front:p.owl?shade(p.head,.18):null});
  for(const sx of[-1,1]){
    k.bone('wing'+(sx>0?'R':'L'),'root',[sx*s*.28,by+s*.12,s*.1]);
    k.ell([sx*s*.33,by+s*.02,-s*.08],[s*.08,s*.24,s*.48],'wing'+(sx>0?'R':'L'),{k:s*.06,rot:[tilt*.6,0,sx*.15],col:p.wing});
    k.bone('leg'+(sx>0?0:1),'root',[sx*s*.12,p.leg+s*.05,0]);
    k.extra('leg'+(sx>0?0:1),'birdleg',[sx*s*.12,p.leg+s*.05,0],{len:p.leg+s*.05,r:s*.025+.008,col:p.legCol||'#c9a26a',s:sx});
    k.extra('head','eye',ad(hc,p.owl?[sx*hr*.38,hr*.12,hr*.88]:[sx*hr*.62,hr*.22,hr*.48]),{r:p.owl?hr*.17:s*.035,owl:p.owl});
  }
  k.extra('head','beak',ad(hc,[0,p.owl?-hr*.15:0,hr*.92]),{len:s*.22*(p.beakL||1),r:s*.055,col:p.beak});
  if(p.crest)k.extra('head','crest',ad(hc,[0,hr,0]),{col:p.head});
  if(p.owl&&!p.penguin)for(const sx of[-1,1])k.ell(ad(hc,[sx*hr*.55,hr*.85,0]),[hr*.18,hr*.38,hr*.12],'head',{k:hr*.1,col:p.head,detail:1});
  k.bone('tail','root',[0,by-(p.upright?s*.3:0),-s*.5]);
  const tl=p.tailL||.3;
  k.ell([0,by-(p.upright?s*.35:s*.02),-s*.5-tl*s*.4],[s*.16,s*.05,tl*s*.9],'tail',{k:s*.05,col:p.tailCol||p.wing,detail:1,rot:[-.25,0,0]});
  if(p.fan)k.extra('tail','fan',[0,by+.05,-s*.55],{s});
  k.anim={kind:'bird',stride:.35,fly:p.fly,penguin:p.penguin};
  return k;
}

/* ---------- apes and monkeys ---------- */
function ape(p){
  const k=kit(),s=p.s,arm=p.arm||1;
  k.bone('root',null,[0,s*.5,0]);
  k.ell([0,s*.78,s*.02],[s*.3,s*.42,s*.26],'root',{k:s*.15,rot:[.5,0,0],pat:1});
  k.ell([0,s*.97,s*.14],[s*.34,s*.28,s*.25],'root',{k:s*.15,pat:1});
  k.bone('neck','root',[0,s*1.05,s*.2]);k.bone('head','neck',[0,s*1.12,s*.24]);
  k.ell([0,s*1.13,s*.25],[s*.19,s*.19,s*.18],'head',{k:s*.06,pat:1});
  k.ell([0,s*1.08,s*.39],[s*.13,s*.11,s*.09],'head',{k:s*.05,col:p.face});
  k.ell([0,s*1.2,s*.36],[s*.15,s*.04,s*.05],'head',{k:s*.03,col:p.face,detail:1});
  for(const sx of[-1,1]){
    k.ell([sx*s*.18,s*1.14,s*.22],[s*.05,s*.06,s*.03],'head',{k:s*.02,col:p.face,detail:1});
    k.extra('head','eye',[sx*s*.06,s*1.14,s*.44],{r:s*.024});
    const sh=[sx*s*.32,s*1.0,s*.14],el=[sx*s*.36,s*(1-.45*arm),s*.24],ha=[sx*s*.34,Math.max(.05,s*(1-.92*arm)),s*.3];
    const i=sx>0?0:1;k.bone('arm'+i,'root',sh);k.bone('fore'+i,'arm'+i,el);
    k.cap(sh,el,s*.09,s*.07,'arm'+i,{k:s*.06,pat:1});k.cap(el,ha,s*.07,s*.06,'fore'+i,{k:s*.04,pat:1});
    k.ell(ha,[s*.06,s*.04,s*.08],'fore'+i,{k:s*.03,col:p.face,detail:1});
    const hip=[sx*s*.16,s*.52,-s*.08],kn=[sx*s*.19,s*.26,s*.04],ft=[sx*s*.19,s*.04,-s*.02];
    k.bone('leg'+i,'root',hip);k.bone('low'+i,'leg'+i,kn);
    k.cap(hip,kn,s*.1,s*.08,'leg'+i,{k:s*.07,pat:1});k.cap(kn,ft,s*.075,s*.06,'low'+i,{k:s*.04,pat:1});
    k.ell(ad(ft,[0,0,s*.06]),[s*.06,s*.035,s*.1],'low'+i,{k:s*.03,col:p.face,detail:1});
  }
  if(p.tail)k.extra('root','tail',[0,s*.5,-s*.25],{len:s*.9,r:s*.03,col:p.col,ang:2.3});
  k.anim={kind:'ape',stride:s*.7};
  return k;
}

/* ---------- kangaroo ---------- */
function hopper(p){
  const k=kit(),s=p.s;
  k.bone('root',null,[0,s*.55,0]);
  k.ell([0,s*.8,s*.04],[s*.24,s*.42,s*.27],'root',{k:s*.12,rot:[.55,0,0],pat:1});
  k.ell([0,s*.58,-s*.08],[s*.25,s*.25,s*.27],'root',{k:s*.12,pat:1});
  k.bone('head','root',[0,s*1.2,s*.28]);
  k.ell([0,s*1.25,s*.32],[s*.11,s*.12,s*.15],'head',{k:s*.06,pat:1});
  k.cap([0,s*1.24,s*.38],[0,s*1.19,s*.52],s*.08,s*.05,'head',{k:s*.04,pat:1});
  k.ell([0,s*1.19,s*.55],[s*.035,s*.025,s*.02],'head',{k:.01,col:'#2a2220',detail:1});
  for(const sx of[-1,1]){
    k.ell([sx*s*.07,s*1.42,s*.26],[s*.04,s*.11,s*.025],'head',{k:s*.03,rot:[0,0,-sx*.25],pat:1,detail:1});
    k.extra('head','eye',[sx*s*.075,s*1.29,s*.42],{r:s*.02});
    k.cap([sx*s*.1,s*.95,s*.28],[sx*s*.12,s*.78,s*.4],s*.04,s*.03,'root',{k:s*.03,pat:1,detail:1});
    const i=sx>0?0:1;k.bone('leg'+i,'root',[sx*s*.17,s*.55,0]);k.bone('low'+i,'leg'+i,[sx*s*.18,s*.3,-s*.12]);
    k.ell([sx*s*.17,s*.48,-s*.02],[s*.11,s*.22,s*.2],'leg'+i,{k:s*.08,pat:1});
    k.cap([sx*s*.18,s*.32,-s*.12],[sx*s*.18,s*.06,-s*.2],s*.06,s*.045,'low'+i,{k:s*.04,pat:1});
    k.cap([sx*s*.18,s*.04,-s*.22],[sx*s*.18,s*.03,s*.25],s*.045,s*.035,'low'+i,{k:s*.03,pat:1});
  }
  k.bone('tail','root',[0,s*.5,-s*.25]);k.bone('tail2','tail',[0,s*.2,-s*.7]);
  k.cap([0,s*.5,-s*.22],[0,s*.2,-s*.7],s*.1,s*.065,'tail',{k:s*.06,pat:1});k.cap([0,s*.2,-s*.7],[0,s*.05,-s*1.05],s*.065,s*.03,'tail2',{k:s*.04,pat:1});
  k.anim={kind:'hop',stride:s*.9};
  return k;
}
function frog(p){
  const k=kit(),s=p.s;
  k.bone('root',null,[0,s*.28,0]);
  k.ell([0,s*.28,0],[s*.4,s*.24,s*.5],'root',{k:s*.12,rot:[-.25,0,0],pat:1});
  k.bone('head','root',[0,s*.32,s*.3]);
  k.ell([0,s*.32,s*.38],[s*.33,s*.18,s*.25],'head',{k:s*.1,pat:1});
  for(const sx of[-1,1]){
    k.ell([sx*s*.18,s*.45,s*.38],[s*.11,s*.1,s*.11],'head',{k:s*.05,pat:1});
    k.extra('head','eye',[sx*s*.22,s*.5,s*.43],{r:s*.07});
    const i=sx>0?0:1;k.bone('leg'+i,'root',[sx*s*.3,s*.25,-s*.25]);k.bone('low'+i,'leg'+i,[sx*s*.42,s*.15,-s*.1]);
    k.ell([sx*s*.36,s*.2,-s*.22],[s*.14,s*.12,s*.3],'leg'+i,{k:s*.08,pat:1});
    k.cap([sx*s*.42,s*.12,-s*.08],[sx*s*.4,s*.04,-s*.45],s*.07,s*.05,'low'+i,{k:s*.05,pat:1});
    k.cap([sx*s*.25,s*.22,s*.3],[sx*s*.3,s*.03,s*.42],s*.06,s*.045,'root',{k:s*.04,pat:1});
  }
  k.anim={kind:'hop',stride:s*1.4};
  return k;
}
function snake(p){
  const k=kit(),s=p.s,n=p.n,seg=s*.2,nb=7;
  for(let b=0;b<nb;b++)k.bone('b'+b,b?'b'+(b-1):null,[0,s*.1,-b*n/nb*seg]);
  let prev=null;
  for(let i=0;i<=n;i++){const r=s*.1*(i<2?.9:1-Math.pow(i/n,1.6)*.82),pt=[Math.sin(i*.55)*s*.12,r,-i*seg];
    if(prev)k.cap(prev.pt,pt,prev.r,r,'b'+Math.min(nb-1,Math.floor(i/n*nb)),{k:s*.06,pat:1});prev={pt,r}}
  k.ell([0,s*.1,s*.12],[s*.11,s*.075,s*.17],'b0',{k:s*.06,pat:1});
  for(const sx of[-1,1])k.extra('b0','eye',[sx*s*.075,s*.14,s*.18],{r:s*.022});
  k.anim={kind:'snake',stride:s*.6,nb};
  return k;
}
function lizard(p){
  const k=kit(),s=p.s,c=p.croc;
  k.bone('root',null,[0,s*.2,0]);
  k.ell([0,s*.2,0],[s*.25,s*.14,s*.56],'root',{k:s*.1,pat:1,rough:c?.012:0,rf:22});
  k.bone('head','root',[0,s*.2,s*.48]);
  k.ell([0,s*.22,s*.62],[s*.15,s*.1,s*.2],'head',{k:s*.08,pat:1});
  k.cap([0,s*.2,s*.7],[0,s*.16,s*(c?1.05:.84)],s*.1,s*(c?.06:.045),'head',{k:s*.05,pat:1});
  for(const sx of[-1,1])k.extra('head','eye',[sx*s*.09,s*.3,s*.66],{r:s*.026});
  k.bone('tail','root',[0,s*.18,-s*.5]);k.bone('tail2','tail',[0,s*.13,-s*1.05]);
  k.cap([0,s*.18,-s*.45],[0,s*.13,-s*1.05],s*.17,s*.09,'tail',{k:s*.08,pat:1,rough:c?.01:0,rf:22});
  k.cap([0,s*.13,-s*1.05],[0,s*.09,-s*1.7],s*.09,s*.02,'tail2',{k:s*.05,pat:1});
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz],i)=>{const a=[sx*s*.2,s*.18,sz*s*.32],b=[sx*s*.4,s*.14,sz*s*.34],f=[sx*s*.44,s*.03,sz*s*.38];
    k.bone('leg'+i,'root',a);k.bone('low'+i,'leg'+i,b);
    k.cap(a,b,s*.065,s*.05,'leg'+i,{k:s*.05,pat:1});k.cap(b,f,s*.05,s*.04,'low'+i,{k:s*.03,pat:1})});
  if(p.frill)k.extra('head','frill',[0,s*.25,s*.5],{s,col:p.frill});
  k.anim={kind:'lizard',stride:s*.45};
  return k;
}
function seal(p){
  const k=kit(),s=p.s;
  k.bone('root',null,[0,s*.25,0]);
  k.ell([0,s*.26,0],[s*.3,s*.26,s*.6],'root',{k:s*.15,pat:1});
  k.bone('tail','root',[0,s*.18,-s*.45]);
  k.cap([0,s*.2,-s*.4],[0,s*.12,-s*.78],s*.2,s*.08,'tail',{k:s*.12,pat:1});
  k.bone('head','root',[0,s*.4,s*.45]);
  k.ell([0,s*.45,s*.58],[s*.17,s*.15,s*.18],'head',{k:s*.12,pat:1});
  k.ell([0,s*.41,s*.73],[s*.11,s*.08,s*.08],'head',{k:s*.06,col:p.walrus?'#c9a084':null,pat:1});
  k.ell([0,s*.43,s*.8],[s*.03,s*.02,s*.015],'head',{k:.01,col:'#1e1a18',detail:1});
  for(const sx of[-1,1]){
    k.extra('head','eye',[sx*s*.08,s*.5,s*.7],{r:s*.026});
    k.ell([sx*s*.29,s*.08,s*.25],[s*.15,s*.03,s*.09],'root',{k:s*.05,rot:[0,sx*.4,0],pat:1,detail:1});
    k.ell([sx*s*.09,s*.08,-s*.85],[s*.1,s*.025,s*.15],'tail',{k:s*.04,rot:[0,sx*.5,0],pat:1,detail:1});
    if(p.walrus)k.extra('head','tusk',[sx*s*.05,s*.36,s*.76],{s:sx,len:s*.28,r:s*.022,down:1});
  }
  k.anim={kind:'seal',stride:s*.5};
  return k;
}
function hedgehog(p){
  const k=kit(),s=p.s;
  k.bone('root',null,[0,s*.15,0]);
  k.ell([0,s*.13,0],[s*.25,s*.15,s*.34],'root',{k:s*.08,col:'#c9a882'});
  k.ell([0,s*.17,-s*.03],[s*.3,s*.24,s*.38],'root',{k:s*.05,col:p.col,rough:s*.05,rf:38/s,pat:1});
  k.bone('head','root',[0,s*.15,s*.3]);
  k.cap([0,s*.14,s*.3],[0,s*.11,s*.5],s*.1,s*.04,'head',{k:s*.04,col:'#c9a882'});
  k.ell([0,s*.11,s*.52],[s*.03,s*.025,s*.02],'head',{k:.01,col:'#1a1614',detail:1});
  for(const sx of[-1,1])k.extra('head','eye',[sx*s*.07,s*.19,s*.4],{r:s*.022});
  k.anim={kind:'quad0',stride:s*.4};
  return k;
}
/* ---------- zoo visitors ---------- */
function person(p){
  const k=kit(),s=p.s,sk=p.skin,sh=p.shirt,pa=p.pants;
  k.bone('root',null,[0,.95*s,0]);
  k.ell([0,.97*s,0],[.17*s,.13*s,.11*s],'root',{k:.05*s,col:pa});
  k.ell([0,1.22*s,0],[.19*s,.28*s,.12*s],'root',{k:.07*s,col:sh});
  k.bone('neck','root',[0,1.47*s,0]);k.bone('head','neck',[0,1.55*s,0]);
  k.cap([0,1.45*s,0],[0,1.56*s,.01*s],.055*s,.05*s,'neck',{k:.03*s,col:sk});
  k.ell([0,1.66*s,.01*s],[.095*s,.115*s,.105*s],'head',{k:.03*s,col:sk});
  k.ell([0,1.705*s,-.02*s],[.106*s,.1*s,.115*s],'head',{k:.015*s,col:p.hair,rough:.006*s,rf:60});
  if(p.long)k.ell([0,1.58*s,-.07*s],[.09*s,.13*s,.05*s],'head',{k:.03*s,col:p.hair,detail:1});
  if(p.hat)k.cap([0,1.75*s,-.01*s],[0,1.8*s,-.01*s],.13*s,.11*s,'head',{k:.01*s,col:p.hat,detail:1});
  for(const sx of[-1,1]){
    const i=sx>0?0:1;k.extra('head','eye',[sx*.035*s,1.68*s,.1*s],{r:.012*s});
    const shd=[sx*.22*s,1.44*s,0],el=[sx*.25*s,1.17*s,0],ha=[sx*.25*s,.93*s,.02*s];
    k.bone('arm'+i,'root',shd);k.bone('fore'+i,'arm'+i,el);
    k.cap(shd,el,.055*s,.045*s,'arm'+i,{k:.03*s,col:sh});k.cap(el,ha,.042*s,.035*s,'fore'+i,{k:.02*s,col:p.short?sk:sh});
    k.ell(ha,[.035*s,.05*s,.025*s],'fore'+i,{k:.02*s,col:sk,detail:1});
    const hip=[sx*.09*s,.93*s,0],kn=[sx*.1*s,.5*s,.01*s],an=[sx*.1*s,.09*s,0];
    k.bone('leg'+i,'root',hip);k.bone('low'+i,'leg'+i,kn);
    k.cap(hip,kn,.075*s,.058*s,'leg'+i,{k:.04*s,col:pa});k.cap(kn,an,.055*s,.045*s,'low'+i,{k:.03*s,col:p.shorts?sk:pa});
    k.ell([sx*.1*s,.045*s,.04*s],[.05*s,.045*s,.11*s],'low'+i,{k:.02*s,col:p.shoes,detail:1});
  }
  k.anim={kind:'person',stride:.45*s};
  return k;
}
const PLANS={quad,bird,ape,hopper,frog,snake,lizard,seal,hedgehog,person};

/* ---------- coat colours ---------- */
const colCache={};
function C(hex){return colCache[hex]||(colCache[hex]=new T.Color(hex).toArray())}
function shade(hex,f){const c=new T.Color(hex);c.offsetHSL(0,0,f);return '#'+c.getHexString()}
function mixc(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function painter(p){
  const base=C(p.col||p.body||'#888'),c2=C(p.col2||'#111'),belly=C(p.belly||shade(p.col||p.body||'#888',.16));
  return(pr,x,y,z,nx,ny,nz)=>{
    let c=pr.col?C(pr.col):base;
    const pat=pr.pat==='rings'?'rings':(pr.pat&&!pr.col?p.tex:null);
    if(!pr.col&&ny<-.2&&!p.noBelly)c=mixc(c,belly,Math.min(1,(-ny-.2)*1.8));
    if(pr.front&&nz>.15)c=mixc(c,C(pr.front),Math.min(1,(nz-.15)*4));
    if(pat){
      let t;
      if(pr.t==='c')t=(x-pr.a[0])*pr.dir[0]+(y-pr.a[1])*pr.dir[1]+(z-pr.a[2])*pr.dir[2];
      else{const m=pr.m;t=x*m[6]+y*m[7]+z*m[8]}
      if(pat==='stripes'){const w=Math.sin(t*(p.freq||17)+(fbm(x*2.2,y*2.2,z*2.2)-.5)*4);
        const tiger=p.belly&&ny<-.45;if(w>(p.thin||0)&&!tiger)c=mixc(c,c2,Math.min(1,(w-(p.thin||0))*14))}
      if(pat==='giraffe'){const[f1,f2]=voronoi(x*4.2,y*4.2,z*4.2);c=f2-f1<.13?C('#f1e4c4'):mixc(c2,C(shade(p.col2,-.06)),fbm(x*6,y*6,z*6))}
      if(pat==='dots'){const[f1]=voronoi(x*10,y*10,z*10);if(f1<.24)c=c2}
      if(pat==='rosette'){const[f1]=voronoi(x*6,y*6,z*6);if(f1>.2&&f1<.34)c=c2;else if(f1<=.2)c=mixc(c,c2,.18)}
      if(pat==='spots'){if(fbm(x*5,y*5,z*5)>.6)c=c2}
      if(pat==='rings'){if(Math.sin(t*16)>.1)c=C(p.col2||'#222')}
    }
    const v=.86+.28*fbm(x*9,y*9,z*9);
    return[c[0]*v,c[1]*v,c[2]*v];
  };
}

/* ---------- surface detail textures ---------- */
function normalTexture(size,draw,strength,repeat){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
  g.fillStyle='#808080';g.fillRect(0,0,size,size);draw(g,size);
  const d=g.getImageData(0,0,size,size),h=new Float32Array(size*size);
  for(let i=0;i<size*size;i++)h[i]=d.data[i*4]/255;
  const out=g.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const l=h[y*size+(x-1+size)%size],r=h[y*size+(x+1)%size],u=h[((y-1+size)%size)*size+x],dn=h[((y+1)%size)*size+x];
    let nx=(l-r)*strength,ny=(u-dn)*strength,nz=1;const len=Math.hypot(nx,ny,nz);
    const o=(y*size+x)*4;out.data[o]=(nx/len*.5+.5)*255;out.data[o+1]=(ny/len*.5+.5)*255;out.data[o+2]=(nz/len*.5+.5)*255;out.data[o+3]=255}
  g.putImageData(out,0,0);
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);return t;
}
let MATS=null;
function mats(){
  if(MATS)return MATS;
  const r=rngA(11);
  const furN=normalTexture(256,(g,S)=>{for(let i=0;i<9000;i++){const x=r()*S,y=r()*S,l=4+r()*9;g.strokeStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},.18)`;g.strokeStyle=r()<.5?'rgba(0,0,0,.22)':'rgba(255,255,255,.22)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+(r()-.5)*2,y+l);g.stroke()}},3,6);
  const scaleN=normalTexture(256,(g,S)=>{for(let y=0;y<S;y+=10)for(let x=0;x<S;x+=12){const ox=(y/10)%2?6:0;const gr=g.createRadialGradient(x+ox,y,1,x+ox,y,7);gr.addColorStop(0,'#fff');gr.addColorStop(1,'#000');g.fillStyle=gr;g.beginPath();g.ellipse(x+ox,y,6,5,0,0,7);g.fill()}},2.2,10);
  const featherN=normalTexture(256,(g,S)=>{for(let i=0;i<500;i++){const x=r()*S,y=r()*S;g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.arc(x,y,7+r()*4,0,Math.PI);g.stroke()}},2,6);
  MATS={
    fur:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.9,sheen:.35,sheenRoughness:.6,sheenColor:new T.Color(.18,.17,.15),normalMap:furN,normalScale:new T.Vector2(.7,.7)}),
    feather:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.75,sheen:.6,sheenRoughness:.4,sheenColor:new T.Color(.25,.25,.25),normalMap:featherN,normalScale:new T.Vector2(.4,.4)}),
    scale:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.55,clearcoat:.25,clearcoatRoughness:.5,normalMap:scaleN,normalScale:new T.Vector2(.6,.6)}),
    cloth:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.85,sheen:.5,sheenRoughness:.7,sheenColor:new T.Color(.2,.2,.2),normalMap:furN,normalScale:new T.Vector2(.25,.25)}),
    wet:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.35,clearcoat:.7,clearcoatRoughness:.2,normalMap:furN,normalScale:new T.Vector2(.15,.15)}),
    eye:new T.MeshPhysicalMaterial({color:'#0b0806',roughness:.08,clearcoat:1,clearcoatRoughness:.02}),
    owlEye:new T.MeshPhysicalMaterial({color:'#f2b821',roughness:.1,clearcoat:1}),
    ivory:new T.MeshStandardMaterial({color:'#efe6cf',roughness:.45}),
    horn:new T.MeshStandardMaterial({color:'#3a332c',roughness:.6}),
    antler:new T.MeshStandardMaterial({color:'#bfa983',roughness:.8}),
  };
  return MATS;
}
function rngA(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function matFor(p){const plan=p.plan||'quad',m=mats();
  if(plan==='person')return m.cloth;
  if(plan==='bird')return m.feather;if(plan==='lizard'||plan==='snake')return m.scale;if(plan==='frog'||plan==='seal')return m.wet;return m.fur}

/* ---------- extras (thin parts attached to bones) ---------- */
const xm={};
function smat(col,o={}){const k=col+JSON.stringify(o);return xm[k]||(xm[k]=new T.MeshStandardMaterial(Object.assign({color:col,roughness:.8},o)))}
function extraMesh(e,p){
  const m=mats(),g=new T.Group();
  const add=(geo,mat,pos,rot,scl)=>{const o=new T.Mesh(geo,mat);if(pos)o.position.set(...pos);if(rot)o.rotation.set(...rot);if(scl)o.scale.set(...scl);o.castShadow=true;g.add(o);return o};
  switch(e.kind){
    case'eye':add(new T.SphereGeometry(e.r,14,10),e.owl?m.owlEye:m.eye);if(e.owl)add(new T.SphereGeometry(e.r*.5,10,8),m.eye,[0,0,e.r*.6]);break;
    case'tusk':{const geo=new T.ConeGeometry(e.r,e.len,10);geo.translate(0,e.len/2,0);add(geo,m.ivory,null,e.down?[Math.PI*.95,0,0]:[1.25,e.s*.12,0]);break}
    case'horn':{const geo=new T.ConeGeometry(e.r,e.len,12);geo.translate(0,e.len/2,0);add(geo,smat('#9b948a',{roughness:.6}),null,[e.tilt,0,0]);break}
    case'horns':{const big=e.kind2==='buffalo',curve=new T.QuadraticBezierCurve3(new T.Vector3(0,0,0),new T.Vector3(e.s*(big?.55:.2),big?.05:.12,-.05),new T.Vector3(e.s*(big?.7:.22),big?.4:.28,-.15));
      add(new T.TubeGeometry(curve,12,big?.06:.045,8),m.horn);break}
    case'antler':{const am=m.antler,mk=(a,b,r)=>{const c=new T.LineCurve3(new T.Vector3(...a),new T.Vector3(...b));add(new T.TubeGeometry(c,2,r,6),am)};const s=e.s;
      mk([0,0,0],[s*.12,.35,-.08],.028);mk([s*.12,.35,-.08],[s*.28,.62,-.02],.022);mk([s*.12,.35,-.08],[s*.1,.6,.12],.018);mk([s*.28,.62,-.02],[s*.42,.78,-.1],.016);mk([s*.28,.62,-.02],[s*.3,.85,.05],.015);mk([s*.06,.18,-.04],[s*.06,.32,.12],.016);break}
    case'ossicone':add(new T.CylinderGeometry(.03,.035,.22,8),smat(p.col2||'#7a4a20'),[0,.11,0]);add(new T.SphereGeometry(.045,8,6),smat('#2a1d14'),[0,.23,0]);break;
    case'ear':{const geo=new T.SphereGeometry(1,16,12);add(geo,smat(shade(p.col,-.04),{roughness:.95}),[e.s*.05,0,0],[0,-e.s*.35,0],e.size);break}
    case'tail':{const geo=new T.CylinderGeometry(e.r*.55,e.r,e.len,8);geo.translate(0,e.len/2,0);const tm=smat(e.col,{roughness:.95});
      const pivot=new T.Group();pivot.rotation.x=-e.ang;g.add(pivot);const o=new T.Mesh(geo,tm);o.castShadow=true;pivot.add(o);
      if(e.tuft){const t=new T.Mesh(new T.SphereGeometry(e.r*2.6,10,8),smat(e.tuft,{roughness:1}));t.scale.set(1,1.7,1);t.position.y=e.len;t.castShadow=true;pivot.add(t)}
      if(e.tip){const t=new T.Mesh(new T.SphereGeometry(e.r*.75,8,6),smat(e.tip));t.position.y=e.len;pivot.add(t)}break}
    case'birdleg':{const geo=new T.CylinderGeometry(e.r,e.r*.8,e.len,6);geo.translate(0,-e.len/2,0);const lm=smat(e.col,{roughness:.6});add(geo,lm);
      for(const a of[-.4,0,.4]){const toe=new T.CylinderGeometry(e.r*.6,e.r*.4,e.r*7,5);toe.rotateX(Math.PI/2);toe.translate(0,0,e.r*3);const o=add(toe,lm,[0,-e.len+e.r,0],[0,a,0])}break}
    case'beak':{const geo=new T.ConeGeometry(e.r,e.len,10);geo.rotateX(Math.PI/2);geo.translate(0,0,e.len/2-.01);add(geo,smat(e.col,{roughness:.4}),null,null,[1,.8,1]);break}
    case'crest':for(let i=-2;i<=2;i++){const geo=new T.CylinderGeometry(.004,.006,.16,4);geo.translate(0,.08,0);add(geo,smat(e.col),[i*.018,0,0],[-.3,0,i*.18]);add(new T.SphereGeometry(.018,6,5),smat('#2a6fd6'),[i*.018+Math.sin(i*.18)*-.16,.15,-.05])}break;
    case'fan':{const tex=fanTexture();const f=add(new T.CircleGeometry(e.s*1.5,40,0,Math.PI),new T.MeshStandardMaterial({map:tex,side:T.DoubleSide,roughness:.6,alphaTest:.5,transparent:false}));f.rotation.x=.3;break}
    case'frill':{const f=add(new T.CircleGeometry(e.s*.3,24),smat(e.col,{side:T.DoubleSide}));break}
  }
  return g;
}
let fanTex=null;
function fanTexture(){if(fanTex)return fanTex;const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  g.translate(256,256);
  for(let i=0;i<120;i++){const a=Math.PI*(i/119),r=230;g.strokeStyle='#2e6a3e';g.lineWidth=2;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*r,-Math.sin(a)*r);g.stroke()}
  for(let ring=0;ring<4;ring++)for(let i=0;i<14+ring*6;i++){const a=Math.PI*((i+.5)/(14+ring*6)),r=90+ring*45,x=Math.cos(a)*r,y=-Math.sin(a)*r;
    g.fillStyle='#1d5a3a';g.beginPath();g.ellipse(x,y,22,26,a,0,7);g.fill();g.fillStyle='#c9a83a';g.beginPath();g.ellipse(x,y,15,18,a,0,7);g.fill();
    g.fillStyle='#2a9a8a';g.beginPath();g.ellipse(x,y,10,12,a,0,7);g.fill();g.fillStyle='#14246a';g.beginPath();g.ellipse(x,y,6,7,a,0,7);g.fill()}
  fanTex=new T.CanvasTexture(c);fanTex.encoding=T.sRGBEncoding;return fanTex}

/* ---------- build + cache ---------- */
const cache={};
function species(sp){
  if(cache[sp.k])return cache[sp.k];
  const p=sp.def,plan=p.plan||'quad',k=PLANS[plan](p);
  const opts={bones:k.bones.length,paint:painter(Object.assign({},p,{col:p.col||p.body}))};
  const prims=()=>k.prims.map(o=>Object.assign({},o,{a:o.a&&o.a.slice(),b:o.b&&o.b.slice(),c:o.c&&o.c.slice(),r:o.r&&o.r.slice(),bone:k.bones.findIndex(b=>b.name===o.bone)}));
  const geo=MESHER.build(prims(),Object.assign({res:QUALITY.animalRes,maxCells:QUALITY.animalCells},opts));
  const geoLow=MESHER.build(prims(),Object.assign({res:30,maxCells:5e4,maxRes:40,low:1},opts));
  const bb=geo.boundingBox,sz=p.sz||1;
  return cache[sp.k]={k,geo,geoLow,mat:matFor(p),h:(bb.max.y)*sz,rad:Math.max(bb.max.x-bb.min.x,bb.max.z-bb.min.z)/2*sz,len:(bb.max.z-bb.min.z)*sz,sz};
}
function isBuilt(sp){return!!cache[sp.k]}
function make(sp){
  const S=species(sp),k=S.k,p=sp.def;
  const bones=k.bones.map(()=>new T.Bone());
  k.bones.forEach((b,i)=>{bones[i].name=b.name;if(b.parent<0)bones[i].position.set(...b.pos);
    else{const pp=k.bones[b.parent].pos;bones[i].position.set(b.pos[0]-pp[0],b.pos[1]-pp[1],b.pos[2]-pp[2]);bones[b.parent].add(bones[i])}});
  const g=new T.Group(),inner=new T.Group();inner.scale.setScalar(S.sz);g.add(inner);
  const mesh=new T.SkinnedMesh(S.geo,S.mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
  mesh.add(bones[0]);inner.add(mesh);inner.updateMatrixWorld(true);mesh.bind(new T.Skeleton(bones));
  const low=new T.SkinnedMesh(S.geoLow,S.mat);low.castShadow=true;low.frustumCulled=false;inner.add(low);low.bind(mesh.skeleton,mesh.bindMatrix);low.visible=false;
  const B={};bones.forEach(b=>B[b.name]=b);if(!B.root)B.root=bones[0];
  for(const e of k.extras){const b=B[e.bone],bp=k.bones.find(x=>x.name===e.bone).pos;const m=extraMesh(e,p);
    // bone world position at rest = sum of chain; extras are placed relative to their bone
    m.position.set(e.pos[0]-bp[0],e.pos[1]-bp[1],e.pos[2]-bp[2]);b.add(m)}
  return{g,inner,mesh,low,B,A:k.anim,h:S.h,rad:S.rad,len:S.len,ph:Math.random()*6,seed:Math.random()*10,rest:B.root.position.y};
}
function setLOD(a,far){a.mesh.visible=!far;a.low.visible=far;a.B.root.traverse(o=>{if(o.isMesh)o.visible=!far})}
function animate(a,dt,spd,time,o={}){
  const B=a.B,A=a.A;a.ph+=dt*spd/A.stride*Math.PI;
  const ph=a.ph,amp=Math.min(.6,spd*.28),sd=a.seed;
  const breath=1+Math.sin(time*2.2+sd)*.01;B.root.scale.set(breath,breath,1);
  a.hop=0;
  if(A.kind==='quad'){
    const off=[0,Math.PI,Math.PI*1.08,Math.PI*.08];
    for(let i=0;i<4;i++){const u=B['leg'+i],l=B['low'+i],q=ph+off[i],front=i<2;
      u.rotation.x=Math.sin(q)*amp;l.rotation.x=Math.max(0,-Math.cos(q))*amp*(front?1.3:-.9)}
    B.root.position.y=a.rest+Math.abs(Math.sin(ph))*amp*.03;
    if(B.neck)B.neck.rotation.x+=((o.graze?.95:Math.sin(ph*2)*amp*.05)-B.neck.rotation.x)*Math.min(1,dt*2.5);
    if(B.head)B.head.rotation.y=Math.sin(time*.4+sd)*.25*(spd<.2?1:.2);
    if(B.tail)B.tail.rotation.z=Math.sin(time*2.4+sd)*.3;
    if(B.trunk){B.trunk.rotation.x=Math.sin(time*1.1+sd)*.18;B.trunk2.rotation.x=Math.sin(time*1.1+sd+1)*.25}
  }else if(A.kind==='quad0'){B.root.position.y=a.rest+Math.abs(Math.sin(ph*2))*.01*spd}
  else if(A.kind==='bird'){
    for(let i=0;i<2;i++){const l=B['leg'+i];if(l)l.rotation.x=Math.sin(ph+i*Math.PI)*amp*1.2}
    const fl=o.alt>.4;
    for(const s of['L','R']){const w=B['wing'+s],sg=s==='R'?1:-1;w.rotation.z=fl?sg*Math.sin(time*13)*.9:A.penguin?sg*(.25+Math.sin(ph)*.15*Math.min(1,spd)):0;w.rotation.y=fl?-sg*.2:0}
    if(B.neck)B.neck.rotation.x=Math.sin(ph*2)*amp*.25+(o.graze?.7:0);
    if(A.penguin)a.inner.rotation.z=Math.sin(ph)*.12*Math.min(1,spd);
    if(B.head)B.head.rotation.y=Math.sin(time*.9+sd)*.4*(spd<.2?1:.2);
    if(B.tail)B.tail.rotation.x=Math.sin(time*3+sd)*.08;
  }else if(A.kind==='ape'){
    for(let i=0;i<2;i++){const q=ph+i*Math.PI;B['arm'+i].rotation.x=Math.sin(q)*amp*.8;B['fore'+i].rotation.x=-Math.max(0,Math.cos(q))*amp*.5;
      B['leg'+i].rotation.x=-Math.sin(q)*amp*.8;B['low'+i].rotation.x=Math.max(0,Math.cos(q))*amp}
    B.root.position.y=a.rest+Math.abs(Math.sin(ph))*amp*.04;B.head.rotation.y=Math.sin(time*.6+sd)*.35;
  }else if(A.kind==='hop'){
    const moving=spd>.2,hp=Math.sin(ph*.55);
    a.hop=moving?Math.max(0,hp)*A.stride*.4:0;
    for(let i=0;i<2;i++){B['leg'+i].rotation.x=moving?-hp*.6:0;B['low'+i].rotation.x=moving?hp*.5:0}
    if(B.tail)B.tail.rotation.x=moving?hp*.25:Math.sin(time+sd)*.05;
  }else if(A.kind==='snake'){
    for(let i=0;i<A.nb;i++)B['b'+i].rotation.y=Math.sin(ph*.7-i*.9+(spd<.1?time*.6:0))*(spd>.1?.42:.12);
  }else if(A.kind==='lizard'){
    for(let i=0;i<4;i++){const q=ph+[0,Math.PI,Math.PI,0][i];B['leg'+i].rotation.y=Math.sin(q)*amp*1.3;B['low'+i].rotation.z=Math.max(0,Math.cos(q))*amp*.4}
    B.root.rotation.y=Math.sin(ph)*amp*.25;B.tail.rotation.y=-Math.sin(ph)*amp*.5+Math.sin(time*.8+sd)*.08;B.tail2.rotation.y=-Math.sin(ph-.8)*amp*.6;
  }else if(A.kind==='person'){
    for(let i=0;i<2;i++){const q=ph+i*Math.PI;B['leg'+i].rotation.x=Math.sin(q)*amp;B['low'+i].rotation.x=Math.max(0,-Math.cos(q))*amp*1.2;
      B['arm'+i].rotation.x=-Math.sin(q)*amp*.7;B['fore'+i].rotation.x=-.15-Math.max(0,Math.sin(q))*amp*.4}
    B.root.position.y=a.rest+Math.abs(Math.cos(ph))*amp*.03;B.head.rotation.y=o.look||Math.sin(time*.5+sd)*.3*(spd<.2?1:.3);
  }else if(A.kind==='seal'){
    B.root.position.y=a.rest+Math.abs(Math.sin(ph))*.05*Math.min(1,spd);B.tail.rotation.x=Math.sin(ph*2)*.2*Math.min(1,spd)+Math.sin(time+sd)*.05;
    B.head.rotation.x=-.15+Math.sin(time*.7+sd)*.1;
  }
}
window.ANIMALS={make,species,isBuilt,animate,setLOD,shade};
})();
