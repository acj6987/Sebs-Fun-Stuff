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
  k.ell([0,by+Hb*.04,L*.2],[W*.5,Hb*.52,L*.34],'root',{k:Hb*.4,pat:1,rough:p.armor?.06:0,rf:7});
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
  if(p.tri){k.extra('head','trifrill',at(-hl*.15,hh*.35),{r:hw*1.15,col:p.col2||p.col,tilt:hp});
    for(const sx of[-1,1])k.extra('head','horn',at(hl*.15,hh*.45,sx*hw*.25),{len:.9,r:.09,tilt:1.1-hp,col:'#e8dcc0'});k.extra('head','horn',at(hl*.78,hh*.05),{len:.35,r:.08,tilt:.6,col:'#e8dcc0'})}
  if(p.plates)for(let i=0;i<9;i++){const z=L*(.42-i*.11),y=by+Hb*(.45-Math.abs(i-3.5)*.02)+Hb*.12*Math.sin(Math.PI*i/8.5);k.extra('root','plate',[i%2?.08:-.08,y,z],{size:(.45+Math.sin(Math.PI*i/8.5)*.5)*Hb*.55,col:p.col2||'#a85a3a'})}
  if(p.crestTube)k.extra('head','crestTube',at(hl*.05,hh*.45),{len:hl*1.6,r:hh*.16,tilt:hp,col:p.col2||p.col});
  if(p.armor)for(let i=0;i<7;i++)for(const sx of[-1,1])k.extra('root','spike',[sx*W*.5,by+Hb*.05,L*(.38-i*.12)],{s:-sx,len:.45,r:.1});
  if(p.ossicones)for(const s of[-1,1])k.extra('head','ossicone',at(-hl*.05,hh*.5,s*.07),{});
  // tail
  const tb=[0,by+Hb*.15,-L*.5],tl=p.tl||.4;k.bone('tail','root',tb);
  const tcol=p.tailCol||null;
  if(p.tail==='bushy'){const end=ad(tb,p.stripe?[0,tl*.8,-tl*.4]:[0,-tl*.35,-tl*.85]);
    k.cap(tb,end,W*.12,W*.24,'tail',{k:W*.15,col:tcol,pat:1,rough:.02,rf:20});
    if(p.tip)k.ell(ad(end,sc([0,end[1]-tb[1],end[2]-tb[2]],.12)),[W*.2,W*.2,W*.2],'tail',{k:W*.12,col:p.tip,rough:.02,rf:20})}
  else if(p.tail==='dino'){const t1=ad(tb,[0,-Hb*.15,-tl*.5]),t2=ad(tb,[0,-Hb*.35,-tl]);k.bone('tail2','tail',t1);
    k.cap(ad(tb,[0,0,L*.08]),t1,W*.32,W*.17,'tail',{k:W*.15,pat:1});k.cap(t1,t2,W*.17,W*.035,'tail2',{k:W*.08,pat:1});
    if(p.club)k.extra('tail2','club',t2,{r:W*.22});
    if(p.plates)for(let i=0;i<4;i++)k.extra(i<2?'tail':'tail2','spike',ad(i<2?ad(tb,[0,-Hb*.1,-tl*(.7+i*.08)]):t1,i<2?[0,0,0]:[0,-Hb*.05*(i-1),-tl*.12*(i-1)]),{s:i%2?1:-1,len:.6,r:.07})}
  else if(p.tail==='ringed')k.cap(tb,ad(tb,[0,-tl*.3,-tl*.95]),W*.14,W*.16,'tail',{k:W*.1,pat:'rings'});
  else if(p.tail==='short')k.ell(ad(tb,[0,-.02,-.04]),[W*.13,W*.15,W*.12],'tail',{k:W*.1,col:tcol,pat:1,detail:1});
  else if(p.tail==='flat')k.ell(ad(tb,[0,-by+.12,-.32]),[W*.32,.05,.3],'tail',{k:.04,col:'#3a2a1e',detail:1});
  else k.extra('tail','tail',tb,{len:tl,r:p.tail==='long'?.045:.025,tuft:p.tail==='tuft'?(p.tuftCol||p.mane||'#2a1d14'):null,col:p.tail==='long'?p.col:shade(p.col,-.1),ang:p.tail==='long'?2.1:2.75,tip:p.tail==='long'?(p.col2||p.col):null});
  k.anim={kind:'quad',stride:Math.max(.5,leg*1.5),graze:p.graze,fly:p.fly,jiggle:p.jiggle};
  if(p.glam)glam(k,p,{by,at,nb,nd,na,hl,hw,hh});else if(p.fairy)fairyWings(k,[0,by+Hb*.45,L*.1],L*.8);
  if(p.eagle)for(const sx of[-1,1]){const wn='wing'+(sx>0?'R':'L'),q=[sx*W*.3,by+Hb*.42,L*.12];k.bone(wn,'root',q);k.extra(wn,'ewing',q,{s:sx,size:L*1.25})}
  return k;
}
/* ---------- the Sparkle Zebraffe: zebra + giraffe + jaguar, with arms, wings, make-up and a handbag ---------- */
function glam(k,p,{by,at,nb,nd,na,hl,hw,hh}){
  const {L,W,Hb}=p;
  // giraffe patches on the body, zebra stripes on the legs and tail, jaguar spots on the neck and head
  for(const pr of k.prims){if(pr.col)continue;pr.tex=pr.bone==='root'?'giraffe':/^(leg|low|tail)/.test(pr.bone)?'stripes':'rosette'}
  // a sparkly purple top with puffy sleeves
  k.ell([0,by+Hb*.12,L*.36],[W*.56,Hb*.56,L*.2],'root',{k:Hb*.15,col:p.top});
  for(const s of[-1,1])k.ell(at(hl*.42,-hh*.12,s*hw*.42),[hw*.13,hh*.13,hl*.1],'head',{k:.02,col:'#ff8fc0',detail:1}); // blusher
  // two arms with painted nails; the left hand holds her handbag
  for(const sx of[-1,1]){const i=sx>0?0:1,sh=[sx*W*.36,by+Hb*.3,L*.5],el=[sx*W*.5,by-Hb*.18,L*.66],ha=[sx*W*.42,by-Hb*.52,L*.8];
    k.bone('arm'+i,'root',sh);k.bone('fore'+i,'arm'+i,el);
    k.cap(sh,el,W*.11,W*.085,'arm'+i,{k:W*.06,col:p.top});k.cap(el,ha,W*.08,W*.065,'fore'+i,{k:W*.04,col:p.col});
    k.extra('fore'+i,'hand',ha,{s:sx,size:W*.13,nail:p.nails[i]});
    if(i&&!p.male)k.extra('fore'+i,'bag',ad(ha,[0,-W*.12,0]),{size:W*.55,col:p.col2});
    // fairy wings so she can fly
    const wn='wing'+(sx>0?'R':'L');k.bone(wn,'root',[sx*W*.3,by+Hb*.45,L*.1]);k.extra(wn,'fwing',[sx*W*.3,by+Hb*.45,L*.1],{s:sx,size:L*.85});
    k.extra('head','peye',at(hl*.32,hh*.16,sx*hw*.4),{r:Math.max(.018,hw*.075)*(p.eyeS||1),s:sx,iris:p.male?'#3ad16a':'#2fa8ff',shadow:p.male?'#2f8fff':'#b14ad8',lash:p.male?.5:1})}
  if(p.male){
    // the boy wears a sparkly bow tie and a little crown
    k.extra('neck','bow',ad(nb,ad(sc(nd,p.neck*.12),[0,0,p.neckW*1.3])),{size:hh*.5,col:'#2f6fe0'});
    k.extra('head','crown',at(-hl*.02,hh*.52),{size:hh*.6})}
  else{
    k.extra('head','lips',at(hl*.9,-hh*.27),{w:hh*.34});
    k.extra('head','bow',at(-hl*.02,hh*.55),{size:hh*.55,col:'#ff3d9a'});
    k.extra('neck','pearls',ad(nb,sc(nd,p.neck*.12)),{r:p.neckW*1.45,na});
    k.extra('root','tutu',[0,by-Hb*.05,-L*.05],{rx:W*.62,ry:Hb*.62,len:L*.55,col:'#ff7ec4'})}
  k.extra('root','sparkles',[0,by,0],{size:[W*1.6,Hb*2.4,L*1.4]});
  // her big pretty eyes replace the plain ones
  k.extras=k.extras.filter(e=>e.kind!=='eye');
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
  if(p.shell){k.ell([0,s*.27,-s*.02],[s*.4,s*.2,s*.55],'root',{k:s*.08,col:p.shell,rough:.015,rf:9});k.ell([0,s*.15,0],[s*.36,s*.06,s*.5],'root',{k:s*.04,col:p.belly||'#d8c890'})}
  if(p.fairy)fairyWings(k,[0,s*.32,s*.05],s*1.1);
  k.anim={kind:'lizard',stride:s*.45,fly:p.fly};
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
    // the Great White Seal: a bear's head with round ears and a shark's sharp teeth
    if(p.shark){k.ell([sx*s*.11,s*.6,s*.52],[s*.055,s*.055,s*.03],'head',{k:s*.02,pat:1,detail:1});k.extra('head','teeth',[sx*s*.07,s*.38,s*.64],{s:sx,len:s*.16,size:s*.035})}
  }
  if(p.shark){k.ell([0,s*.47,s*.6],[s*.2,s*.17,s*.2],'head',{k:s*.1,pat:1});k.extra('root','dfin',[0,s*.5,-s*.05],{size:s*.32,tall:1.1,col:p.fin||p.col})}
  if(p.fairy)fairyWings(k,[0,s*.48,s*.1],s*.9);
  k.anim={kind:'seal',stride:s*.5,fly:p.fly};
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
/* ---------- dinosaurs on two legs ---------- */
function theropod(p){
  const k=kit(),s=p.s||1,hip=p.hip*s,L=p.L*s,W=p.W*s,Hb=p.Hb*s,lw=p.legW*s;
  k.bone('root',null,[0,hip,0]);
  k.ell([0,hip+Hb*.08,L*.12],[W*.5,Hb*.52,L*.36],'root',{k:Hb*.35,rot:[-.12,0,0],pat:1});
  k.ell([0,hip,-L*.18],[W*.46,Hb*.46,L*.28],'root',{k:Hb*.35,pat:1});
  const nb=[0,hip+Hb*.3,L*.38],ne=[0,hip+Hb*.45+p.neck*s*.55,L*.4+p.neck*s*.6];
  k.bone('neck','root',nb);k.bone('head','neck',ne);
  k.cap(nb,ne,p.neckW*s*1.2,p.neckW*s*.85,'neck',{k:p.neckW*s*.7,pat:1});
  const hl=p.headL*s,hw=p.headW*s,hh=p.headH*s,at=(f,u,x=0)=>[ne[0]+x,ne[1]+u,ne[2]+f];
  k.ell(at(hl*.2,hh*.08),[hw*.5,hh*.5,hl*.34],'head',{k:hh*.3,pat:1});
  k.cap(at(hl*.35,hh*.05),at(hl*.95,-hh*.05),hh*.36,hh*.24,'head',{k:hh*.25,pat:1});
  k.cap(at(hl*.25,-hh*.3),at(hl*.85,-hh*.32),hh*.24,hh*.14,'head',{k:hh*.15,pat:1,col:p.belly||null});
  for(const sx of[-1,1]){
    k.extra('head','eye',at(hl*.3,hh*.22,sx*hw*.4),{r:Math.max(.03,hw*.08)});
    k.extra('head','teeth',at(hl*.35,-hh*.18,sx*hw*.3),{s:sx,len:hl*.6,size:hh*.09});
    const i=sx>0?0:1,sh=[sx*W*.35,hip+Hb*.1,L*.36];
    k.cap(sh,ad(sh,[sx*W*.05,-p.arm*s*.5,p.arm*s*.45]),Math.max(.04,W*.07),Math.max(.03,W*.05),'root',{k:.04*s,pat:1,detail:1});
    const top=[sx*W*.32,hip,-L*.08],knee=[sx*W*.36,hip*.52,L*.06],ank=[sx*W*.36,hip*.15,-L*.08],toe=[sx*W*.36,.06*s,L*.12];
    k.bone('leg'+i,'root',top);k.bone('low'+i,'leg'+i,knee);
    k.ell([sx*W*.33,hip-Hb*.05,-L*.06],[lw*1.6,Hb*.55,lw*2.6],'leg'+i,{k:Hb*.3,pat:1});
    k.cap(top,knee,lw*1.25,lw*.85,'leg'+i,{k:lw*.7,pat:1});
    k.cap(knee,ank,lw*.75,lw*.55,'low'+i,{k:lw*.4,pat:1});k.cap(ank,toe,lw*.55,lw*.45,'low'+i,{k:lw*.3,pat:1});
    if(p.raptor)k.extra('low'+i,'claw',ad(ank,[0,-hip*.08,L*.1]),{size:.12*s});
  }
  const tb=[0,hip+Hb*.08,-L*.4],t1=[0,hip-Hb*.05,-L*.4-p.tail*s*.45],t2=[0,hip-Hb*.25,-L*.4-p.tail*s];
  k.bone('tail','root',tb);k.bone('tail2','tail',t1);
  k.cap(tb,t1,Hb*.4,Hb*.2,'tail',{k:Hb*.2,pat:1});k.cap(t1,t2,Hb*.2,Math.max(.03,Hb*.03),'tail2',{k:Hb*.1,pat:1});
  if(p.sail)k.extra('root','sail',[0,hip+Hb*.35,L*.02],{len:L*.95,ht:Hb*1.4,col:p.col2});
  if(p.dcrest)for(const sx of[-1,1])k.extra('head','dcrest',at(hl*.45,hh*.42,sx*hw*.12),{len:hl*.75,ht:hh*.7,col:p.col2});
  if(p.raptor)for(let i=0;i<6;i++)k.extra('neck','quill',ad(nb,[0,Hb*.3+i*p.neck*s*.09,i*p.neck*s*.1-.05]),{size:.15*s,col:p.col2});
  if(p.fairy)fairyWings(k,[0,hip+Hb*.4,0],L*.9);
  k.anim={kind:'biped',stride:hip*1.1,fly:p.fly};
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
// sparkly fairy wings on any animal's back
function fairyWings(k,at,size){for(const sx of[-1,1]){const wn='wing'+(sx>0?'R':'L'),p=[at[0]+sx*size*.12,at[1],at[2]];k.bone(wn,'root',p);k.extra(wn,'fwing',p,{s:sx,size})}}
/* ---------- fish, dolphins, sharks and rays ---------- */
function fish(p){
  const k=kit(),s=p.s,th=s*(p.tall||.34),w=s*(p.wide||.16),y=th*.55;
  k.bone('root',null,[0,y,0]);k.bone('tail','root',[0,y,-s*.22]);
  if(p.ray){
    k.ell([0,y,0],[s*.75,th*.2,s*.42],'root',{k:s*.12,pat:1});k.ell([0,y+th*.1,s*.08],[s*.28,th*.35,s*.34],'root',{k:s*.1,pat:1});
    for(const sx of[-1,1]){k.extra('root','eye',[sx*s*.2,y+th*.25,s*.36],{r:s*.025});k.cap([sx*s*.12,y,s*.4],[sx*s*.14,y-th*.1,s*.55],s*.04,s*.025,'root',{k:s*.02,pat:1,detail:1})}
    k.extra('tail','tail',[0,y,-s*.38],{len:s*.9,r:s*.018,col:p.col,ang:1.62});
    k.anim={kind:'fish',stride:s*.5,ray:1};return k}
  k.ell([0,y,s*.06],[w,th*.5,s*.42],'root',{k:th*.3,pat:1});
  k.ell([0,y+th*.02,s*.3],[w*.92,th*.42,s*.22],'root',{k:th*.25,pat:1});
  k.cap([0,y,-s*.1],[0,y,-s*.44],th*.3,th*.07,'tail',{k:th*.15,pat:1});
  if(p.beak)k.cap([0,y-th*.06,s*.44],[0,y-th*.12,s*.62],th*.15,th*.08,'root',{k:th*.08,pat:1});
  for(const sx of[-1,1]){k.extra('root','eye',[sx*w*.8,y+th*.12,s*(p.beak?.4:.36)],{r:Math.max(.012,th*.09)});
    k.extra('root','pfin',[sx*w*.85,y-th*.18,s*.16],{s:sx,size:th*.75,col:p.fin||p.col})}
  k.extra('tail',p.flukes?'flukes':'tfin',[0,y,-s*.43],{size:th*(p.flukes?1:1.15),col:p.fin||p.col});
  if(p.dorsalS!==0)k.extra('root','dfin',[0,y+th*.45,-s*.02],{size:s*(p.dorsalS||.34),tall:p.fin2||.8,col:p.fin||p.col});
  if(p.belly2)k.extra('root','dfin',[0,y-th*.45,-s*.06],{size:s*.3,tall:-(p.fin2||.8)*.8,col:p.fin||p.col});
  if(p.spikes)k.extra('root','spikes',[0,y,s*.06],{r:Math.min(w,th*.5),len:th*.18,col:p.col2});
  k.anim={kind:'fish',stride:s*.5,flukes:p.flukes};
  return k;
}
/* ---------- more sea creatures ---------- */
function seahorse(p){
  const k=kit(),s=p.s;k.bone('root',null,[0,s*.5,0]);k.bone('tail','root',[0,s*.35,-s*.05]);
  k.cap([0,s*.85,s*.02],[0,s*.45,-s*.04],s*.13,s*.15,'root',{k:s*.08,pat:1});
  k.cap([0,s*.45,-s*.04],[0,s*.2,-s*.12],s*.12,s*.07,'tail',{k:s*.05,pat:1});k.cap([0,s*.2,-s*.12],[0,s*.07,-s*.02],s*.07,s*.04,'tail',{k:s*.03,pat:1});
  k.cap([0,s*.07,-s*.02],[0,s*.12,s*.07],s*.04,s*.025,'tail',{k:s*.02,pat:1});
  k.ell([0,s*.96,s*.06],[s*.1,s*.11,s*.12],'root',{k:s*.05,pat:1});k.cap([0,s*.94,s*.12],[0,s*.88,s*.32],s*.045,s*.035,'root',{k:s*.02,pat:1});
  k.ell([0,s*1.05,s*.02],[s*.04,s*.06,s*.04],'root',{k:s*.02,pat:1,detail:1});
  for(const sx of[-1,1])k.extra('root','eye',[sx*s*.08,s*.98,s*.1],{r:s*.025});
  k.extra('root','dfin',[0,s*.62,-s*.13],{size:s*.2,tall:.9,col:p.fin||p.col});
  k.anim={kind:'fish',stride:s*.4};return k;
}
function jelly(p){
  const k=kit(),s=p.s,y=s*.9;k.bone('root',null,[0,y,0]);
  k.ell([0,y,0],[s*.5,s*.32,s*.5],'root',{k:s*.1,pat:1});k.ell([0,y-s*.12,0],[s*.42,s*.12,s*.42],'root',{k:s*.05,col:p.col2,detail:1});
  for(let i=0;i<10;i++){const a=i/10*6.28;k.extra('root','tentacle',[Math.cos(a)*s*.3,y-s*.15,Math.sin(a)*s*.3],{len:s*(.9+(i*7%3)*.3),r:s*.022,col:p.col2})}
  k.anim={kind:'jelly',stride:s};return k;
}
function octo(p){
  const k=kit(),s=p.s,y=s*.35;k.bone('root',null,[0,y,0]);
  k.ell([0,y+s*.35,-s*.1],[s*.3,s*.35,s*.38],'root',{k:s*.12,pat:1,rot:[-.4,0,0]});k.ell([0,y+s*.05,s*.1],[s*.26,s*.2,s*.24],'root',{k:s*.1,pat:1});
  for(const sx of[-1,1])k.extra('root','eye',[sx*s*.17,y+s*.15,s*.26],{r:s*.045});
  for(let i=0;i<8;i++){const a=i/8*6.28+.2,c=Math.cos(a),n=Math.sin(a),p0=[c*s*.15,y-s*.05,n*s*.15+s*.1],p1=[c*s*.55,y*.45,n*s*.55+s*.1],p2=[c*s*.9,s*.05,n*s*.9+s*.1];
    k.cap(p0,p1,s*.08,s*.05,'root',{k:s*.05,pat:1});k.cap(p1,p2,s*.05,s*.02,'root',{k:s*.03,pat:1})}
  k.anim={kind:'jelly',stride:s};return k;
}
function star(p){
  const k=kit(),s=p.s;k.bone('root',null,[0,s*.06,0]);k.ell([0,s*.06,0],[s*.18,s*.07,s*.18],'root',{k:s*.05,pat:1});
  for(let i=0;i<5;i++){const a=i/5*6.28;k.cap([0,s*.06,0],[Math.sin(a)*s*.5,s*.04,Math.cos(a)*s*.5],s*.12,s*.03,'root',{k:s*.05,pat:1})}
  k.anim={kind:'quad0',stride:s*.3};return k;
}
// a mermaid swims flat like a fish: head forward, tail behind
function mermaid(p){
  const k=kit(),s=p.s,y=s*.2;k.bone('root',null,[0,y,0]);k.bone('tail','root',[0,y,-s*.08]);k.bone('head','root',[0,y+s*.03,s*.3]);
  k.ell([0,y,s*.15],[s*.1,s*.07,s*.17],'root',{k:s*.04,col:p.skin});
  k.ell([0,y-s*.035,s*.21],[s*.105,s*.05,s*.075],'root',{k:s*.02,col:p.top,detail:1});
  k.ell([0,y,-s*.02],[s*.1,s*.065,s*.1],'root',{k:s*.04,pat:1});
  k.cap([0,y,-s*.05],[0,y,-s*.32],s*.085,s*.05,'tail',{k:s*.04,pat:1});k.cap([0,y,-s*.32],[0,y,-s*.5],s*.05,s*.025,'tail',{k:s*.03,pat:1});
  k.ell([0,y+s*.03,s*.4],[s*.065,s*.07,s*.075],'head',{k:s*.03,col:p.skin});
  k.ell([0,y+s*.07,s*.37],[s*.075,s*.06,s*.1],'head',{k:s*.02,col:p.hair});k.cap([0,y+s*.065,s*.33],[0,y+s*.05,s*.05],s*.065,s*.03,'head',{k:s*.03,col:p.hair});
  for(const sx of[-1,1]){k.extra('head','eye',[sx*s*.026,y+s*.04,s*.47],{r:s*.009});
    k.cap([sx*s*.1,y,s*.25],[sx*s*.17,y-s*.02,s*.07],s*.03,s*.022,'root',{k:s*.015,col:p.skin})}
  k.extra('tail','flukes',[0,y,-s*.5],{size:s*.15,col:p.fin});
  k.anim={kind:'fish',stride:s*.5,flukes:1};return k;
}
const PLANS={quad,bird,ape,hopper,frog,snake,lizard,seal,hedgehog,person,theropod,fish,seahorse,jelly,octo,star,mermaid};

/* ---------- coat colours ---------- */
const colCache={};
function C(hex){return colCache[hex]||(colCache[hex]=new T.Color(hex).toArray())}
function shade(hex,f){const c=new T.Color(hex);c.offsetHSL(0,0,f);return '#'+c.getHexString()}
function mixc(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
function painter(p){
  const base=C(p.col||p.body||'#888'),c2=C(p.col2||'#111'),belly=C(p.belly||shade(p.col||p.body||'#888',.16));
  return(pr,x,y,z,nx,ny,nz)=>{
    let c=pr.col?C(pr.col):base;
    const pat=pr.pat==='rings'?'rings':(pr.pat&&!pr.col?(pr.tex||p.tex):null);
    if(!pr.col&&ny<-.2&&!p.noBelly)c=mixc(c,belly,Math.min(1,(-ny-.2)*1.8));
    if(pr.front&&nz>.15)c=mixc(c,C(pr.front),Math.min(1,(nz-.15)*4));
    if(pat){
      let t;
      if(pr.t==='c')t=(x-pr.a[0])*pr.dir[0]+(y-pr.a[1])*pr.dir[1]+(z-pr.a[2])*pr.dir[2];
      else{const m=pr.m;t=x*m[6]+y*m[7]+z*m[8]}
      if(pat==='stripes'){const w=Math.sin(t*(p.freq||17)+(fbm(x*2.2,y*2.2,z*2.2)-.5)*4);
        const tiger=p.belly&&ny<-.45;if(w>(p.thin||0)&&!tiger)c=mixc(c,c2,Math.min(1,(w-(p.thin||0))*14))}
      if(pat==='giraffe'){const gf=p.giraF||4.2,[f1,f2]=voronoi(x*gf,y*gf,z*gf);c=f2-f1<(p.real?.08:.13)?C(p.lineCol||'#f1e4c4'):mixc(c2,C(shade(p.col2,-.06)),fbm(x*6,y*6,z*6))}
      if(pat==='dots'){const f=p.dotF||10,[f1]=voronoi(x*f,y*f,z*f);if(f1<(p.dotR||.24))c=c2}
      if(pat==='rosette'){const[f1]=voronoi(x*6,y*6,z*6);if(f1>.2&&f1<.34)c=c2;else if(f1<=.2)c=mixc(c,c2,.18)}
      if(pat==='spots'){if(fbm(x*5,y*5,z*5)>.6)c=c2}
      if(pat==='rings'){if(Math.sin(t*16)>.1)c=C(p.col2||'#222')}
    }
    // real animals: darker along the back, paler underneath, dusty legs and mottled skin like in the photos
    if(p.real&&!pr.col){if(ny>.25)c=mixc(c,p.back?C(p.back):[c[0]*.8,c[1]*.8,c[2]*.8],Math.min(1,(ny-.25)*1.6)*(p.back?.7:.5));
      if(p.dust&&/^(low|leg)/.test(pr.bone))c=mixc(c,C(p.dust),(/^low/.test(pr.bone)?.55:.25)*(.7+.6*fbm(x*3,y*3,z*3)));
      if(p.skin){const m=.88+.24*fbm(x*22,y*22,z*22);c=[c[0]*m,c[1]*m,c[2]*m]}}
    const v=p.real?(.9+.2*fbm(x*9,y*9,z*9))*(p.dim||.74):.86+.28*fbm(x*9,y*9,z*9);
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
  const skinN=normalTexture(256,(g,S)=>{for(let i=0;i<2600;i++){let x=r()*S,y=r()*S;g.strokeStyle=r()<.5?'rgba(0,0,0,.5)':'rgba(0,0,0,.3)';g.lineWidth=1+r();g.beginPath();g.moveTo(x,y);
      for(let j=0;j<5;j++){x+=(r()-.5)*14;y+=(r()-.5)*5+3;g.lineTo(x,y)}g.stroke()}},3.2,5);
  MATS={
    skin:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.92,normalMap:skinN,normalScale:new T.Vector2(2.4,2.4)}),
    wetSkin:new T.MeshPhysicalMaterial({vertexColors:true,roughness:.5,clearcoat:.35,clearcoatRoughness:.45,normalMap:skinN,normalScale:new T.Vector2(1,1)}),
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
// glitter: tiny twinkling sparkles stuck to the surface, plus a rainbow shimmer
const GLT={value:0};
function addSparkle(m,dens=55,amt=2.2){
  m.onBeforeCompile=sh=>{sh.uniforms.uGlT=GLT;sh.uniforms.uGlD={value:dens};sh.uniforms.uGlA={value:amt};
    sh.vertexShader='varying vec3 vGlP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlP=position;');
    sh.fragmentShader='uniform float uGlT,uGlD,uGlA;varying vec3 vGlP;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec3 gq=vGlP*uGlD,gc=floor(gq);float gh=fract(sin(dot(gc,vec3(12.9898,78.233,45.164)))*43758.5453);
      float gd=length(fract(gq)-.5),gtw=.5+.5*sin(uGlT*3.+gh*60.);
      totalEmissiveRadiance+=vec3(1.,.92,1.)*step(.8,gh)*smoothstep(.4,.05,gd)*pow(gtw,5.)*uGlA;`)};
  m.customProgramCacheKey=()=>'glitter';return m}
const glitM={};
function glitterMat(col,o={}){const k=col+JSON.stringify(o);return glitM[k]||(glitM[k]=addSparkle(new T.MeshPhysicalMaterial(Object.assign({color:col,roughness:.35,metalness:.25,clearcoat:.8,clearcoatRoughness:.1,iridescence:1,iridescenceIOR:1.5,sheen:.6,sheenColor:new T.Color('#ffd0ff')},o)),o.dens||60))}
const glossM={};
function gloss(col){return glossM[col]||(glossM[col]=new T.MeshPhysicalMaterial({color:col,roughness:.06,clearcoat:1,clearcoatRoughness:.02,sheen:.5,sheenColor:new T.Color('#ffffff')}))}
function rngA(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
let glamBody=null;
function matFor(p){const plan=p.plan||'quad',m=mats();
  if(p.glow)return new T.MeshPhysicalMaterial({vertexColors:true,roughness:.15,clearcoat:1,transparent:true,opacity:.72,emissive:p.glow,emissiveIntensity:.35});
  if(p.glam||p.sparkle)return glamBody||(glamBody=addSparkle(new T.MeshPhysicalMaterial({vertexColors:true,roughness:.45,clearcoat:.6,clearcoatRoughness:.2,iridescence:.6,iridescenceIOR:1.4,sheen:.8,sheenColor:new T.Color('#ffb0e0'),normalMap:m.fur.normalMap,normalScale:new T.Vector2(.3,.3)}),50,2.6));
  if(p.skin)return p.skin==='wet'?m.wetSkin:m.skin;
  if(plan==='fish')return m.wet;
  if(plan==='person')return m.cloth;
  if(plan==='theropod'||p.scaly)return m.scale;
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
    case'horn':{const geo=new T.ConeGeometry(e.r,e.len,12);geo.translate(0,e.len/2,0);add(geo,smat(e.col||'#9b948a',{roughness:.6}),null,[e.tilt,0,0]);break}
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
    case'trifrill':{const f=add(new T.CircleGeometry(e.r,28,0,Math.PI),smat(e.col,{side:T.DoubleSide,roughness:.7}));f.rotation.x=-.5+e.tilt*.5;f.position.y=e.r*.1;break}
    case'plate':{const geo=new T.CircleGeometry(e.size,4);geo.rotateY(Math.PI/2);geo.scale(1,1.2,.9);const o=add(geo,smat(e.col,{side:T.DoubleSide,roughness:.6}));o.position.y=e.size*.7;break}
    case'spike':{const geo=new T.ConeGeometry(e.r,e.len,8);geo.translate(0,e.len/2,0);add(geo,m.ivory,null,[0,0,e.s*1.1]);break}
    case'teeth':for(let i=0;i<9;i++){const geo=new T.ConeGeometry(e.size*.35,e.size,5);geo.rotateX(Math.PI);add(geo,m.ivory,[0,0,i*e.len/9])}break;
    case'claw':{const geo=new T.ConeGeometry(e.size*.25,e.size,6);add(geo,m.horn,null,[-.8,0,0]);break}
    case'quill':{const geo=new T.ConeGeometry(e.size*.15,e.size,5);geo.translate(0,e.size/2,0);add(geo,smat(e.col||'#3a2a1a'),null,[-.6,0,0]);break}
    case'sail':{const geo=new T.CircleGeometry(1,40,0,Math.PI);geo.scale(e.len/2,e.ht,1);geo.rotateY(Math.PI/2);add(geo,smat(e.col,{side:T.DoubleSide,roughness:.6}));break}
    case'dcrest':{const geo=new T.CircleGeometry(1,24,0,Math.PI);geo.scale(e.len/2,e.ht,1);geo.rotateY(Math.PI/2);add(geo,smat(e.col,{side:T.DoubleSide,roughness:.5}),null,[0,0,0]);break}
    case'crestTube':{const geo=new T.CylinderGeometry(e.r*.7,e.r,e.len,10);geo.translate(0,e.len/2,0);add(geo,smat(e.col,{roughness:.6}),null,[-1.9+e.tilt,0,0]);break}
    case'club':{const o=add(new T.SphereGeometry(e.r,16,12),smat('#5a4a38',{roughness:.7}));o.scale.set(1.4,.8,1.1);break}
    case'tentacle':{const pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push(V3(Math.sin(t*9)*e.r*4,-t*e.len,Math.cos(t*7)*e.r*3))}
      add(new T.TubeGeometry(new T.CatmullRomCurve3(pts),16,e.r,5),smat(e.col,{transparent:true,opacity:.7,emissive:e.col,emissiveIntensity:.4}));break}
    case'frill':{const f=add(new T.CircleGeometry(e.s*.3,24),smat(e.col,{side:T.DoubleSide}));break}
    // fish fins
    case'tfin':{const a=e.size,sh=new T.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(a*.5,a*.3,a,a*.8);sh.lineTo(a*.72,0);sh.lineTo(a,-a*.8);sh.quadraticCurveTo(a*.5,-a*.3,0,0);
      const geo=new T.ShapeGeometry(sh,8);geo.rotateY(Math.PI/2);add(geo,smat(e.col,{side:T.DoubleSide,roughness:.45,transparent:true,opacity:.9}));break}
    case'flukes':{const a=e.size,sh=new T.Shape();sh.moveTo(0,0);sh.quadraticCurveTo(a*.5,a*.2,a*.9,a*.9);sh.quadraticCurveTo(a*.3,a*.55,0,a*.6);sh.quadraticCurveTo(-a*.3,a*.55,-a*.9,a*.9);sh.quadraticCurveTo(-a*.5,a*.2,0,0);
      const geo=new T.ShapeGeometry(sh,8);geo.rotateX(Math.PI/2);add(geo,smat(e.col,{side:T.DoubleSide,roughness:.4}));break}
    case'dfin':{const a=e.size,t=e.tall,sh=new T.Shape();sh.moveTo(-a*.35,0);sh.lineTo(a*.6,0);sh.quadraticCurveTo(a*.45,a*t*.4,a*.55,a*t);sh.quadraticCurveTo(a*.05,a*t*.55,-a*.35,0);
      const geo=new T.ShapeGeometry(sh,8);geo.rotateY(Math.PI/2);add(geo,smat(e.col,{side:T.DoubleSide,roughness:.45}));break}
    case'pfin':add(new T.SphereGeometry(1,12,8),smat(e.col,{roughness:.45,transparent:true,opacity:.9}),[e.s*e.size*.35,0,-e.size*.2],[.3,e.s*.6,e.s*.5],[e.size*.5,e.size*.05,e.size*.28]);break;
    case'spikes':for(let i=0;i<46;i++){const yv=1-(i+.5)/46*2,rr=Math.sqrt(1-yv*yv),a=i*2.39996,d=V3(Math.cos(a)*rr,yv,Math.sin(a)*rr);if(d.z<-.7)continue;
      const geo=new T.ConeGeometry(e.len*.25,e.len,5);geo.translate(0,e.len/2,0);const o=add(geo,smat(e.col,{roughness:.6}),[d.x*e.r*.95,d.y*e.r*.95,d.z*e.r*.95]);o.quaternion.setFromUnitVectors(V3(0,1,0),d)}break;
    // the Sparkle Zebraffe's pretty face, hands, clothes and bag
    case'peye':{const r=e.r,dir=V3(e.s*.55,.08,.83).normalize(),at=f=>[dir.x*r*f,dir.y*r*f,dir.z*r*f];
      add(new T.SphereGeometry(r,18,14),smat('#ffffff',{roughness:.15}));
      add(new T.SphereGeometry(r*.6,16,12),gloss(e.iris),at(.5));add(new T.SphereGeometry(r*.32,12,10),m.eye,at(.75));
      add(new T.SphereGeometry(r*.12,8,6),new T.MeshBasicMaterial({color:'#ffffff'}),[dir.x*r*.85,r*.3,dir.z*r*.85]);
      const lid=add(new T.SphereGeometry(r*1.1,18,10,0,Math.PI*2,0,Math.PI*.4),glitterMat(e.shadow));lid.rotation.set(dir.z*.35,0,-dir.x*.35);
      const lm=smat('#120a10',{roughness:.5}),el=.75,az0=Math.atan2(dir.x,dir.z);
      for(let i=0;i<9;i++){const az=az0+(i-4)/4*.95,bp=V3(Math.sin(az)*Math.cos(el)*r*1.08,Math.sin(el)*r*1.08,Math.cos(az)*Math.cos(el)*r*1.08),n=bp.clone().normalize(),L=r*(1.5+.5*Math.cos((i-4)/4*1.4));
        if(!(e.lash>=1)&&i%2)continue;const L2=L*(e.lash||1);
        const c=new T.QuadraticBezierCurve3(bp,bp.clone().addScaledVector(n,L2*.6),bp.clone().addScaledVector(n,L2*.75).add(V3(0,L2*.55,0)));add(new T.TubeGeometry(c,6,r*.035,4),lm)}break}
    case'lips':{const w=e.w,lm=gloss('#ff3d8e');add(new T.SphereGeometry(1,20,14),lm,[0,w*.16,0],null,[w,w*.32,w*.42]);add(new T.SphereGeometry(1,20,14),lm,[0,-w*.18,-w*.02],null,[w*.9,w*.36,w*.44]);
      for(const sx of[-1,1])add(new T.SphereGeometry(1,12,10),lm,[sx*w*.35,w*.26,w*.05],null,[w*.38,w*.22,w*.3]);
      add(new T.SphereGeometry(w*.16,10,8),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.75}),[w*.3,w*.3,w*.32],null,[1,.4,.4]);break}
    case'hand':{const z=e.size,skin=smat(p.col,{roughness:.6}),nail=gloss(e.nail);add(new T.SphereGeometry(z,14,10),skin,null,null,[1,.75,1.1]);
      for(let f=0;f<5;f++){const thumb=f===4,a=thumb?-e.s*1.1:(f-1.5)*.32,len=z*(thumb?1:1.35),geo=new T.CylinderGeometry(z*.2,z*.24,len,8);geo.translate(0,-len/2,0);
        const fg=new T.Group();fg.position.set(Math.sin(a)*z*.7,-z*.4,Math.cos(a)*z*.5+(thumb?z*.3:0));fg.rotation.set(.5,0,thumb?e.s*.9:-a*.4);g.add(fg);
        const fm=new T.Mesh(geo,skin);fm.castShadow=true;fg.add(fm);const nl=new T.Mesh(new T.SphereGeometry(z*.24,10,8),nail);nl.scale.set(1,1.5,.6);nl.position.set(0,-len,z*.1);fg.add(nl)}break}
    case'bag':{const z=e.size,bm=glitterMat(e.col,{metalness:.4}),gold=new T.MeshStandardMaterial({color:'#f2c14e',metalness:1,roughness:.25});
      const hd=add(new T.TorusGeometry(z*.28,z*.03,8,20,Math.PI),gold,[0,-z*.08,0]);hd.rotation.y=Math.PI/2;
      const bx=new T.Group();bx.position.y=-z*.45;g.add(bx);const B=(geo,mat,pp,sc2)=>{const o=new T.Mesh(geo,mat);o.position.set(...pp);if(sc2)o.scale.set(...sc2);o.castShadow=true;bx.add(o);return o};
      B(new T.BoxGeometry(z*.4,z*.05,z*.62),bm,[0,-z*.25,0]);for(const sx of[-1,1])B(new T.BoxGeometry(z*.04,z*.5,z*.62),bm,[sx*z*.18,0,0]);for(const sz of[-1,1])B(new T.BoxGeometry(z*.4,z*.5,z*.04),bm,[0,0,sz*z*.3]);
      B(new T.SphereGeometry(z*.05,10,8),gold,[z*.21,z*.1,0]);B(new T.BoxGeometry(z*.03,z*.3,z*.62),bm,[-z*.3,z*.36,0]).rotation.z=.9;
      // inside: nail polish, lip balm, lipstick, a mirror and a make-up brush
      const pol=['#ff2d8a','#a23cff','#2fd1ff','#ffd400'];pol.forEach((c,i)=>{B(new T.CylinderGeometry(z*.055,z*.06,z*.16,10),new T.MeshPhysicalMaterial({color:c,roughness:.05,clearcoat:1,transmission:.2}),[-z*.08+(i%2)*z*.13,z*.22,-z*.2+Math.floor(i/2)*z*.14]);B(new T.CylinderGeometry(z*.02,z*.025,z*.1,8),smat('#151515'),[-z*.08+(i%2)*z*.13,z*.35,-z*.2+Math.floor(i/2)*z*.14])});
      B(new T.CylinderGeometry(z*.035,z*.035,z*.16,10),gold,[z*.06,z*.24,z*.12]);B(new T.CylinderGeometry(z*.03,z*.03,z*.08,10),gloss('#e0163c'),[z*.06,z*.36,z*.12]);
      B(new T.CylinderGeometry(z*.03,z*.03,z*.2,10),gloss('#ffb3d1'),[-z*.08,z*.28,z*.15]).rotation.z=.25;
      const mir=B(new T.CylinderGeometry(z*.11,z*.11,z*.02,20),gold,[0,z*.32,z*.2]);mir.rotation.x=1.2;B(new T.CircleGeometry(z*.095,20),new T.MeshStandardMaterial({color:'#e8f4ff',metalness:1,roughness:0}),[0,z*.33,z*.21]).rotation.x=1.2-Math.PI/2;
      B(new T.CylinderGeometry(z*.015,z*.02,z*.3,6),smat('#2a1a10'),[z*.12,z*.3,-z*.05]).rotation.z=-.3;B(new T.SphereGeometry(z*.05,10,8),smat('#e8b8a0',{roughness:1}),[z*.17,z*.45,-z*.05],[1,1.6,1]);break}
    case'crown':{const z=e.size,gold=new T.MeshStandardMaterial({color:'#f2c14e',metalness:1,roughness:.2});const band=add(new T.CylinderGeometry(z*.38,z*.42,z*.25,20,1,true),gold);band.material=gold;
      for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(new T.ConeGeometry(z*.08,z*.3,6),gold,[Math.cos(a)*z*.4,z*.25,Math.sin(a)*z*.4]);add(new T.SphereGeometry(z*.05,8,6),gloss(i%2?'#2fd1ff':'#ff2d8a'),[Math.cos(a)*z*.41,0,Math.sin(a)*z*.41])}break}
    case'bow':{const z=e.size,bm=glitterMat(e.col);for(const sx of[-1,1]){const l=add(new T.ConeGeometry(z*.35,z*.6,12),bm,[sx*z*.3,0,0],[0,0,sx*Math.PI/2]);l.scale.set(1,1,.45)}add(new T.SphereGeometry(z*.14,10,8),bm);break}
    case'pearls':{const pm=new T.MeshPhysicalMaterial({color:'#fff4f8',roughness:.15,clearcoat:1,iridescence:1,sheen:1,sheenColor:new T.Color('#ffd0e8')}),up=V3(0,Math.sin(e.na),-Math.cos(e.na));
      for(let i=0;i<20;i++){const a=i/20*Math.PI*2;add(new T.SphereGeometry(e.r*.13,10,8),pm,[Math.cos(a)*e.r,up.y*Math.sin(a)*e.r,up.z*Math.sin(a)*e.r])}break}
    case'tutu':{const geo=new T.CylinderGeometry(1,1.35,1,60,4,true),pp=geo.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),z=pp.getZ(i),a=Math.atan2(z,x),k2=1+Math.sin(a*22)*.05*(pp.getY(i)+.5);pp.setX(i,x*k2);pp.setZ(i,z*k2)}
      geo.computeVertexNormals();geo.rotateX(Math.PI/2);const o=add(geo,glitterMat(e.col,{side:T.DoubleSide,transparent:true,opacity:.85}),null,null,[e.rx,e.ry,e.len]);o.castShadow=false;break}
    // big brown feathered eagle wings
    case'ewing':{const z=e.size,sh=new T.Shape();sh.moveTo(0,0);sh.bezierCurveTo(z*.4,-z*.18,z*.85,-z*.12,z*1.05,z*.05);
      for(let i=0;i<7;i++){const t=i/6,x=z*(1.05-t*.95),y=z*(.05+.45*Math.sin(t*1.4));sh.lineTo(x+z*.06,y+z*.12);sh.lineTo(x,y)}sh.lineTo(0,z*.25);sh.lineTo(0,0);
      const geo=new T.ShapeGeometry(sh,12);if(e.s<0)geo.scale(-1,1,1);geo.rotateX(Math.PI/2);
      const o=add(geo,smat('#6a4424',{side:T.DoubleSide,roughness:.85}),null,[.3,0,e.s*.2]);
      const tips=new T.ShapeGeometry(sh,12);if(e.s<0)tips.scale(-1,1,1);tips.rotateX(Math.PI/2);tips.scale(.55,1,.55);const t2=add(tips,smat('#c8a070',{side:T.DoubleSide,roughness:.85}),[0,.02,0],[.3,0,e.s*.2]);break}
    case'fwing':{const z=e.size,sh=new T.Shape();sh.moveTo(0,0);sh.bezierCurveTo(z*.5,-z*.25,z*1.05,-z*.05,z*.9,z*.35);sh.bezierCurveTo(z*.75,z*.6,z*.3,z*.35,z*.15,z*.3);sh.bezierCurveTo(z*.5,z*.6,z*.55,z*1,z*.25,z*.95);sh.bezierCurveTo(z*.05,z*.85,0,z*.4,0,0);
      const geo=new T.ShapeGeometry(sh,16);if(e.s<0)geo.scale(-1,1,1);geo.rotateX(Math.PI/2);
      const wm=new T.MeshPhysicalMaterial({color:'#ffb8e8',emissive:'#ff7ad8',emissiveIntensity:.25,roughness:.15,iridescence:1,iridescenceIOR:1.6,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false});
      const o=add(geo,addSparkle(wm,30,3),null,[.35,0,e.s*.25]);o.castShadow=false;break}
    case'sparkles':{const n=90,pos=new Float32Array(n*3),[sx,sy,sz]=e.size;for(let i=0;i<n;i++){const u=Math.random()*6.28,v=Math.acos(2*Math.random()-1),r=.6+Math.random()*.5;pos.set([Math.sin(v)*Math.cos(u)*sx*r,Math.cos(v)*sy*r*.5,Math.sin(v)*Math.sin(u)*sz*r],i*3)}
      const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
      const pm=new T.PointsMaterial({size:.12,map:starTex(),color:'#fff2ff',transparent:true,depthWrite:false,blending:T.AdditiveBlending});const pts=new T.Points(geo,pm);pts.userData.spark=1;g.add(pts);break}
  }
  return g;
}
const V3=(x,y,z)=>new T.Vector3(x,y,z);
let starT=null;
function starTex(){if(starT)return starT;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,30);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,200,240,.8)');gr.addColorStop(1,'rgba(255,150,220,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
  g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();g.moveTo(32,2);g.lineTo(32,62);g.moveTo(2,32);g.lineTo(62,32);g.stroke();
  starT=new T.CanvasTexture(c);starT.encoding=T.sRGBEncoding;return starT}
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
  const B={};bones.forEach(b=>B[b.name]=b);if(!B.root)B.root=bones[0];let spark=null;
  for(const e of k.extras){const b=B[e.bone],bp=k.bones.find(x=>x.name===e.bone).pos;const m=extraMesh(e,p);
    // bone world position at rest = sum of chain; extras are placed relative to their bone
    m.position.set(e.pos[0]-bp[0],e.pos[1]-bp[1],e.pos[2]-bp[2]);b.add(m);if(e.kind==='sparkles')spark=m}
  return{g,inner,mesh,low,B,A:k.anim,h:S.h,rad:S.rad,len:S.len,ph:Math.random()*6,seed:Math.random()*10,rest:B.root.position.y,spark};
}
function setLOD(a,far){a.mesh.visible=!far;a.low.visible=far;a.B.root.traverse(o=>{if(o.isMesh)o.visible=!far})}
function animate(a,dt,spd,time,o={}){
  const B=a.B,A=a.A;a.ph+=dt*spd/A.stride*Math.PI;
  const ph=a.ph,amp=Math.min(.6,spd*.28),sd=a.seed;
  const breath=1+Math.sin(time*2.2+sd)*.01;B.root.scale.set(breath,breath,1);
  a.hop=0;GLT.value=time;
  if(a.spark){a.spark.rotation.y=time*.35;a.spark.children[0].material.opacity=.65+.35*Math.sin(time*4+sd)}
  if(B.wingR){const f=o.alt>.4?Math.sin(time*12)*.75:.3+Math.sin(time*1.6+sd)*.08;B.wingR.rotation.z=f;B.wingL.rotation.z=-f}
  if(B.arm0){B.arm0.rotation.x=Math.sin(time*1.2+sd)*.15-Math.sin(ph)*amp*.3;B.fore0.rotation.x=-.2+Math.sin(time*1.7+sd)*.15;B.arm1.rotation.x=-.25;B.fore1.rotation.x=.25}
  if(A.kind==='quad'){
    const off=[0,Math.PI,Math.PI*1.08,Math.PI*.08];
    for(let i=0;i<4;i++){const u=B['leg'+i],l=B['low'+i],q=ph+off[i],front=i<2;
      u.rotation.x=Math.sin(q)*amp;l.rotation.x=Math.max(0,-Math.cos(q))*amp*(front?1.3:-.9)}
    B.root.position.y=a.rest+Math.abs(Math.sin(ph))*amp*.03;
    if(B.neck)B.neck.rotation.x+=((o.graze?.95:Math.sin(ph*2)*amp*.05)-B.neck.rotation.x)*Math.min(1,dt*2.5);
    if(B.head)B.head.rotation.y=Math.sin(time*.4+sd)*.25*(spd<.2?1:.2);
    if(B.tail)B.tail.rotation.z=Math.sin(time*2.4+sd)*.3;
    if(B.tail2)B.tail2.rotation.y=Math.sin(time*1.5+sd-.6)*.2+Math.sin(ph)*amp*.15;
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
  }else if(A.kind==='biped'){
    for(let i=0;i<2;i++){const q=ph+i*Math.PI;B['leg'+i].rotation.x=Math.sin(q)*amp*.8;B['low'+i].rotation.x=-Math.max(0,-Math.cos(q))*amp}
    B.root.position.y=a.rest+Math.abs(Math.cos(ph))*amp*.06;B.root.rotation.x=Math.sin(ph*2)*amp*.03;
    B.tail.rotation.y=Math.sin(ph)*amp*.15+Math.sin(time*.8+sd)*.12;B.tail2.rotation.y=Math.sin(ph-.6)*amp*.2+Math.sin(time*.8+sd-.5)*.15;
    B.neck.rotation.x=Math.sin(ph*2)*amp*.06;B.head.rotation.y=Math.sin(time*.7+sd)*.3*(spd<.2?1:.2);B.head.rotation.x=o.roar?-.35:0;
  }else if(A.kind==='person'){
    for(let i=0;i<2;i++){const q=ph+i*Math.PI;B['leg'+i].rotation.x=Math.sin(q)*amp;B['low'+i].rotation.x=Math.max(0,-Math.cos(q))*amp*1.2;
      B['arm'+i].rotation.x=-Math.sin(q)*amp*.7;B['fore'+i].rotation.x=-.15-Math.max(0,Math.sin(q))*amp*.4}
    B.root.position.y=a.rest+Math.abs(Math.cos(ph))*amp*.03;B.head.rotation.y=o.look||Math.sin(time*.5+sd)*.3*(spd<.2?1:.3);
  }else if(A.kind==='jelly'){const q=Math.sin(time*2.2+sd);B.root.scale.set(1+q*.08,1-q*.1,1+q*.08);B.root.position.y=a.rest+q*.08
  }else if(A.kind==='fish'){
    const w=Math.sin(time*(5+spd*4)+sd)*(.25+Math.min(.35,spd*.15));
    if(A.ray){a.inner.rotation.z=Math.sin(time*1.6+sd)*.12;B.root.position.y=a.rest+Math.sin(time*1.6+sd)*.05;B.root.scale.x=1+Math.sin(time*2+sd)*.06}
    else if(A.flukes){B.tail.rotation.x=w*.8;B.root.rotation.x=-w*.08}else{B.tail.rotation.y=w*1.3;B.root.rotation.y=-w*.25}
  }else if(A.kind==='seal'){if(A.fly&&o.alt>.4)B.root.rotation.x=-.15;
    B.root.position.y=a.rest+Math.abs(Math.sin(ph))*.05*Math.min(1,spd);B.tail.rotation.x=Math.sin(ph*2)*.2*Math.min(1,spd)+Math.sin(time+sd)*.05;
    B.head.rotation.x=-.15+Math.sin(time*.7+sd)*.1;
  }
  // the White Jiggly Hippo wobbles like jelly
  if(A.jiggle){const j=Math.sin(time*9+sd)*(.035+Math.min(.05,spd*.02));B.root.scale.set(1+j,1-j*1.2,1+j*.6)}
}
window.ANIMALS={make,species,isBuilt,animate,setLOD,shade};
})();
