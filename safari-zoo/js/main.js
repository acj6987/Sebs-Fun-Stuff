// Screens, controls and the zoo panel.
const cv=$('#cv');
let R=null,cam=null,lastT=0,curView="map";
function initRenderer(){
  if(R)return true;
  try{R=new T.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'})}catch(e){toast('Your browser could not start 3D graphics.');return false}
  R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1;
  R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.physicallyCorrectLights=false;
  cam=new T.PerspectiveCamera(72,1,.04,2000);cam.rotation.order='YXZ';resize();requestAnimationFrame(loop);return true;
}
function resize(){if(!R)return;R.setPixelRatio(Math.min(devicePixelRatio||1,QUALITY.pixel));R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
addEventListener('resize',resize);
function loop(t){
  const dt=Math.min(.05,(t-lastT)/1000||0);lastT=t;const time=t/1000;
  if(curView==='drive'&&safari.running)safari.frame(dt,time);
  else if(curView==='zoo'&&zoo.running)zooFrame(dt,time);
  requestAnimationFrame(loop);
}
function show(id){
  curView=id;['map','drive','zoo'].forEach(s=>$('#'+s).hidden=s!==id);cv.hidden=id==='map';coins();
  if(id!=='drive'){safari.running=false;for(const k in keys)keys[k]=false}
  if(id!=='zoo')zoo.running=false;
  if(id==='map')renderMap();
}
function loading(on,txt){$('#loading').hidden=!on;if(txt)$('#loadTxt').textContent=txt}

/* ---------- world map ---------- */
function renderMap(){
  $('#conts').innerHTML=CONT.map(c=>{
    const sp=c.animals.map((a,i)=>SP[c.id+':'+i]),found=sp.filter(s=>S.dex[s.k]).length;
    return `<button class="cont" data-c="${c.id}" style="--g:linear-gradient(180deg,${ENV[c.hab].zen},${ENV[c.hab].hor} 60%,${ENV[c.hab].ground})">
      <div class="sky">${c.deco.join('')}</div>
      <div class="info"><span class="place">${c.place}</span><h3>${c.name}</h3>
      <div class="dex">${sp.map(s=>`<span class="${S.dex[s.k]?'':'no'}" title="${S.dex[s.k]?s.n:'Not found yet'}">${s.e}</span>`).join('')}</div>
      <div class="bar"><i style="width:${found/sp.length*100}%"></i></div>
      <span style="font-size:13px;font-weight:800">${found} of ${sp.length} animals found</span></div></button>`}).join('');
}
$('#conts').addEventListener('click',e=>{const b=e.target.closest('.cont');if(b)startSafari(CONT.find(c=>c.id===b.dataset.c))});

async function startSafari(c){
  if(!initRenderer())return;
  show('drive');loading(true,'Driving to '+c.name+'…');await nextFrame();
  me.leash=null;me.rope=null;car.x=0;car.z=0;car.yaw=0;car.v=0;car.steer=0;me.x=me.z=0;mode='car';look.yaw=0;look.pitch=-.12;
  try{await buildSafari(c,t=>$('#loadTxt').textContent=t)}catch(e){console.error(e);loading(false);toast('Something went wrong building '+c.name+'.');show('map');return}
  footRig.visible=false;setDriveUI();$('#where').textContent=c.name+' · '+c.place;$('#cagesTxt').hidden=false;$('#toZoo2').textContent='🏛️ Drive to zoo';
  loading(false);safari.running=true;
}
async function openZoo(){
  if(!initRenderer())return;
  show('zoo');loading(true,'Opening your zoo…');await nextFrame();
  await enterZoo(t=>$('#loadTxt').textContent=t);
  loading(false);zoo.running=true;renderZooUI();
}

/* ---------- controls ---------- */
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'run',ShiftRight:'run'};
addEventListener('keydown',e=>{
  if(curView!=='drive'||!safari.running)return;
  if(KM[e.code]){keys[KM[e.code]]=true;e.preventDefault()}
  if(e.repeat)return;
  if(e.code==='KeyE'){pressE();e.preventDefault()}
  if(e.code==='KeyF'){throwNet();e.preventDefault()}
  if(e.code==='Space'){e.preventDefault();jump()}
  if(e.code==='Escape')goMap()});
addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
const ptrs=new Map();let downAt=null,pinch=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});downAt={x:e.clientX,y:e.clientY,t:performance.now(),btn:e.button,shift:e.shiftKey};
  if(curView==='drive')look.drag=true;
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2}}});
cv.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(curView==='drive'){look.yaw-=dx*.005;look.pitch=clamp(look.pitch-dy*.004,-1.2,1.1);look.idle=0;return}
  if(curView!=='zoo')return;const w=zoo.cam.w;
  if(ptrs.size>=2&&pinch){const[a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    w.dist=clamp(w.dist*pinch.d/Math.max(d,1),14,280);panZoo(mx-pinch.mx,my-pinch.my);pinch={d,mx,my};return}
  if(downAt&&(downAt.btn===2||downAt.shift))panZoo(dx,dy);
  else{w.yaw-=dx*.006;w.pitch=clamp(w.pitch+dy*.004,.12,1.4)}});
function panZoo(dx,dy){const w=zoo.cam.w,s=w.dist*.0016,c=Math.cos(w.yaw),n=Math.sin(w.yaw);
  w.tx=clamp(w.tx-c*dx*s-n*dy*s,-170,170);w.tz=clamp(w.tz+n*dx*s-c*dy*s,-80-zooRows()*SLOT,60)}
const endPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;look.drag=false;look.idle=0;
  if(curView==='zoo'&&downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)<7&&performance.now()-downAt.t<500&&ptrs.size===0){const id=zooPick(e.clientX,e.clientY);if(id!=null)tapArea(id)}
  if(ptrs.size===0)downAt=null};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{if(curView!=='zoo')return;e.preventDefault();const w=zoo.cam.w;w.dist=clamp(w.dist*Math.pow(1.0015,e.deltaY),14,280)},{passive:false});
document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{keys[k]=true;b.setPointerCapture(e.pointerId);e.preventDefault()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
$('#netBtn').addEventListener('click',throwNet);
$('#eBtn').addEventListener('click',pressE);
$('#jumpBtn').addEventListener('click',jump);
function goMap(){if(me.leash)releaseLeash();show('map')}
$('#back').onclick=goMap;
$('#toZoo1').onclick=openZoo;
$('#toZoo2').onclick=()=>{if(me.leash)releaseLeash();if(world&&world.zoo){show('zoo');zoo.running=true;renderZooUI();return}deliver();openZoo()};
$('#zooMap').onclick=()=>show('map');
function deliver(){if(!S.cages.length)return;const n=S.cages.length;S.holding.push(...S.cages);S.cages=[];save();setTimeout(()=>toast('You brought '+n+' animal'+(n>1?'s':'')+' to your zoo!'),50)}

/* ---------- zoo panel ---------- */
let selected=null;
$('#habSel').innerHTML=Object.entries(HAB).map(([k,h])=>`<option value="${k}">${h.i} ${h.name}</option>`).join('');
function renderZooUI(){
  coins();
  const all=S.areas.flatMap(a=>a.animals.map(an=>[an,a])),h=all.filter(([an,a])=>happy(an,a)).length;
  const score=all.length?Math.min(5,Math.round((h/all.length)*3+Math.min(2,all.length/8))):0;
  $('#stars').textContent='★'.repeat(score)+'☆'.repeat(5-score)+`  ${all.length} animals · ${h} happy`;
  $('#holding').innerHTML=S.holding.length?S.holding.map(an=>{const s=SP[an.k];
    return `<button class="chip ${selected===an.uid?'sel':''}" data-uid="${an.uid}"><span class="e">${s.e}</span>${s.n}<small>${HAB[s.hab].i}</small></button>`}).join('')
    :'<span class="empty">The truck is empty. Go on safari to catch more animals!</span>';
  $('#placeHint').hidden=selected===null;
  if(selected!==null){const an=S.holding.find(x=>x.uid===selected);if(an)$('#placeHint').textContent='Now tap an area in the zoo to move the '+SP[an.k].n+' in. It likes '+HAB[SP[an.k].hab].name+' areas best.'}
  renderAreaCard();
}
function renderAreaCard(){
  const card=$('#areaCard'),area=S.areas.find(a=>a.id===zoo.sel);
  if(!area){card.hidden=true;return}
  card.hidden=false;
  $('#acTitle').textContent=(S.areas.indexOf(area)+1)+'. '+HAB[area.hab].i+' '+HAB[area.hab].name+' Dome';
  $('#acCount').textContent=area.animals.length+' of '+CAP[area.type]+' places used';
  $('#acList').innerHTML=area.animals.length?area.animals.map(an=>{const s=SP[an.k],ok=happy(an,area);
    return `<li><span class="e">${s.e}</span><span><b>${s.n}</b><small>${ok?'Happy here':'Wants a '+HAB[s.hab].name+' home'}</small></span><button class="mini" data-back="${an.uid}">To truck</button></li>`}).join('')
    :'<li class="empty">No animals here yet. Pick one from your truck, then tap this area.</li>';
}
function tapArea(id){
  const area=S.areas.find(a=>a.id===id);if(!area)return;
  if(selected!==null){
    if(area.animals.length>=CAP[area.type]){toast('This area is full. Build another one!');return}
    const i=S.holding.findIndex(x=>x.uid===selected);if(i<0){selected=null;return}
    const an=S.holding.splice(i,1)[0];area.animals.push(an);selected=null;save();
    toast(happy(an,area)?SP[an.k].n+' loves the new home!':SP[an.k].n+' would prefer a '+HAB[SP[an.k].hab].name+' area');
    syncZooAnimals();
  }
  zoo.sel=id;focusArea(id);renderZooUI();
}
$('#holding').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;const u=+b.dataset.uid;selected=selected===u?null:u;renderZooUI();
  if(selected!==null&&matchMedia('(max-width:700px)').matches)$('#zooSide').classList.add('min')});
$('#acList').addEventListener('click',e=>{const b=e.target.closest('[data-back]');if(!b)return;const area=S.areas.find(a=>a.id===zoo.sel),u=+b.dataset.back;
  const i=area.animals.findIndex(x=>x.uid===u);S.holding.push(area.animals.splice(i,1)[0]);save();syncZooAnimals();renderZooUI()});
$('#acClose').onclick=()=>{zoo.sel=null;renderAreaCard();const w=zoo.cam.w;w.dist=150;w.tx=0;w.tz=-60};
$('#sideToggle').onclick=()=>$('#zooSide').classList.toggle('min');
function build(type){const cost=250;
  if(S.coins<cost){toast('You need '+cost+' coins. Catch more animals!');return}
  S.coins-=cost;const area={id:S.aid++,type,hab:$('#habSel').value,animals:[]};S.areas.push(area);save();
  buildArea(area,S.areas.length-1);rebuildPaths();zoo.sel=area.id;focusArea(area.id);renderZooUI();
  toast('Built dome '+S.areas.length+': '+HAB[area.hab].name+'!')}
$('#buildD').onclick=()=>build('dome');

/* ---------- driving in the zoo ---------- */
function renderEncPick(){
  $('#encGrid').innerHTML='<button class="enc gate" data-enc="gate"><b>🚪</b><span>Zoo gate</span><small>Drive around</small></button>'+
    S.areas.map((a,i)=>`<button class="enc" data-enc="${a.id}"><b>${i+1}</b><span>${HAB[a.hab].i} ${HAB[a.hab].name}</span><small>${a.animals.map(x=>SP[x.k].e).join('')||'empty'}</small></button>`).join('');
}
async function startZooDrive(id){
  if(!initRenderer())return;
  $('#encPick').hidden=true;
  if(!zoo.built||curView!=='zoo'){show('zoo');loading(true,'Opening your zoo…');await nextFrame();await enterZoo(t=>$('#loadTxt').textContent=t);loading(false)}
  world=zooDriveWorld();
  if(zoo.carG)zoo.scene.remove(zoo.carG);
  buildCar(zoo.scene);zoo.carG=car.g;buildFootRig();zoo.scene.add(cam);refreshCages();
  mode='car';me.leash=null;me.rope=null;car.v=0;car.steer=0;look.yaw=0;look.pitch=-.12;
  const A=id!=null&&zoo.areas.get(id);
  if(A){car.x=A.x;car.z=A.z+A.R0-10;$('#where').textContent='Dome '+(S.areas.indexOf(A.area)+1)+' · '+HAB[A.area.hab].name}
  else{car.x=0;car.z=48;$('#where').textContent='My Zoo'}
  car.yaw=0;footRig.visible=false;setDriveUI();
  $('#cagesTxt').hidden=true;$('#toZoo2').textContent='🏛️ Zoo view';
  show('drive');safari.running=true;
}
$('#driveZoo').onclick=()=>startZooDrive(null);
$('#goEnc').onclick=()=>{renderEncPick();$('#encPick').hidden=false};
$('#encClose').onclick=()=>$('#encPick').hidden=true;
$('#encGrid').addEventListener('click',e=>{const b=e.target.closest('[data-enc]');if(!b)return;startZooDrive(b.dataset.enc==='gate'?null:+b.dataset.enc)});

// visitors pay for happy animals
setInterval(()=>{let h=0;for(const a of S.areas)for(const an of a.animals)if(happy(an,a))h++;if(h){S.coins+=h;save();coins()}},5000);

show('map');
