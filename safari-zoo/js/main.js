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
  const dt=Math.min(.25,(t-lastT)/1000||0);lastT=t;const time=t/1000;
  pollPad(dt);inputStatus();autoQuality(dt);
  if(curView==='drive'&&safari.running)safari.frame(dt,time);
  else if(curView==='zoo'&&zoo.running)zooFrame(dt,time);
  requestAnimationFrame(loop);
}
function show(id){
  try{document.activeElement&&document.activeElement.blur();window.focus()}catch(e){}
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
  me.pack=[];me.mount=null;car.x=0;car.z=0;car.yaw=0;car.v=0;car.steer=0;me.x=me.z=0;mode='car';look.yaw=0;look.pitch=-.12;
  try{await buildSafari(c,t=>$('#loadTxt').textContent=t)}catch(e){console.error(e);loading(false);toast('Something went wrong building '+c.name+'.');show('map');return}
  footRig.visible=false;setDriveUI();$('#where').textContent=c.name+' · '+c.place;$('#cagesTxt').hidden=false;$('#toZoo2').textContent='🏛️ Drive to zoo';
  loading(false);safari.running=true;fps.t=fps.n=0;fps.done=false;$('#startDrive').hidden=false;
}
async function openZoo(){
  if(!initRenderer())return;
  show('zoo');loading(true,'Opening your zoo…');await nextFrame();
  await enterZoo(t=>$('#loadTxt').textContent=t);
  loading(false);zoo.running=true;renderZooUI();
}

/* ---------- controls ---------- */
// game controllers and USB steering wheels with pedals (Gamepad API)
const pad={steer:0,gas:0,brake:0,run:false,rest:null,id:'',prev:[]};
const dz=v=>Math.abs(v)<.12?0:v;
function pollPad(dt){
  let g=null;try{const gs=navigator.getGamepads?navigator.getGamepads():[];for(const x of gs)if(x&&x.connected){g=x;break}}catch(e){}
  if(!g){pad.steer=pad.gas=pad.brake=0;pad.run=false;return}
  if(pad.id!==g.id+g.index){pad.id=g.id+g.index;pad.rest=g.axes.slice();pad.prev=[]}
  const ax=g.axes,bt=g.buttons,val=i=>bt[i]?(typeof bt[i]==='object'?bt[i].value:bt[i]):0,pressed=i=>bt[i]&&(bt[i].pressed||val(i)>.5);
  if(g.mapping==='standard'){
    // controller: left stick steers, right trigger = gas, left trigger = brake / reverse
    pad.steer=dz(ax[0]||0);pad.gas=Math.max(val(7),dz(-(ax[1]||0))>0?-dz(ax[1]):0);pad.brake=Math.max(val(6),dz(ax[1]||0)>0?dz(ax[1]):0);
    if(curView==='drive'&&(ax[2]||ax[3])){look.yaw-=dz(ax[2]||0)*2.5*dt;look.pitch=clamp(look.pitch-dz(ax[3]||0)*2*dt,-1.2,1.1);if(dz(ax[2]||0)||dz(ax[3]||0))look.idle=0}
    pad.run=pressed(10);
  }else{
    // steering wheel: axis 0 is the wheel; pedals are the other axes that move away from where they rest
    pad.steer=dz(ax[0]||0);
    const moved=[];for(let i=1;i<ax.length;i++){const d=Math.abs(ax[i]-(pad.rest[i]??0));if(Math.abs(pad.rest[i]??0)>.5||d>.05)moved.push([i,Math.min(1,d/ (Math.abs(pad.rest[i]??0)>.5?2:1))])}
    const pedals=moved.filter(([i])=>Math.abs(pad.rest[i]??0)>.5);
    pad.gas=pedals[0]?pedals[0][1]:0;pad.brake=pedals[1]?pedals[1][1]:0;
    if(!pedals.length){pad.gas=Math.max(0,-dz(ax[1]||0));pad.brake=Math.max(0,dz(ax[1]||0))}
    pad.gas=Math.max(pad.gas,val(7));pad.brake=Math.max(pad.brake,val(6));
  }
  // buttons: A / cross = jump out or get in, X / square = net, B / circle = jump, Y = back to zoo, LB = food (zoo), RB = ride (safari)
  const edge=i=>pressed(i)&&!pad.prev[i];
  if(curView==='drive'&&safari.running){if(edge(0))pressE();if(edge(2))throwNet();if(edge(1))jump();if(edge(3)&&world&&world.zoo)$('#toZoo2').click();if(g.mapping==='standard'&&edge(4)&&world&&world.zoo)foodAction();if(g.mapping==='standard'&&edge(5)&&!(world&&world.zoo))rideToggle();if(edge(3)&&world&&world.sea)toggleSub()}
  pad.rise=pressed(12);pad.dive=pressed(13);
  pad.prev=bt.map((b,i)=>pressed(i));
}
// a clicked button keeps the keyboard focus, so Space would press it again: give the focus back to the game
$('#drive').addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>document.activeElement&&document.activeElement.blur(),0)});
// shows whether the game can hear you, and lightens the graphics on slow computers
let heard=0;
function inputStatus(){
  const el=$('#inStat');if(curView!=='drive'||!safari.running){el.hidden=true;return}
  const anyKey=keys.up||keys.down||keys.left||keys.right,anyPad=pad.gas>.05||pad.brake>.05||Math.abs(pad.steer)>.05;
  if(anyKey||anyPad)heard=performance.now();
  el.hidden=false;const on=performance.now()-heard<600;el.classList.toggle('on',on);
  el.textContent=on?(mode==='car'?'🚙 Driving!':'🚶 Walking!'):(pad.id?'🎮 Controller ready: press the gas':'⌨️ Press W or ↑ to drive');
}
const fps={t:0,n:0,done:false};
function autoQuality(dt){
  if(curView!=='drive'||!safari.running||fps.done){return}
  fps.t+=dt;fps.n++;
  if(fps.t>4){const f=fps.n/fps.t;fps.done=true;
    if(f<24&&R){R.setPixelRatio(Math.max(.6,R.getPixelRatio()*.65));R.setSize(innerWidth,innerHeight,false);
      if(world&&world.grass)world.grass.geometry.instanceCount=Math.round(world.grass.geometry.instanceCount*.4);
      R.shadowMap.enabled=f>12;toast('Your computer was a bit slow, so I made the graphics lighter to help the truck drive smoothly.')}}
}
function startDriving(){
  $('#startDrive').hidden=true;try{window.focus();cv.focus()}catch(e){}
  if(document.activeElement&&document.activeElement!==document.body&&document.activeElement!==cv)document.activeElement.blur();
}
$('#startDrive').addEventListener('click',startDriving);
addEventListener('gamepadconnected',()=>$('#startDrive').hidden=true);
addEventListener('gamepadconnected',e=>toast('🎮 Controller connected: '+(e.gamepad.id.split('(')[0].trim()||'game controller')+'. Steer and press the pedals or triggers to drive!'));
addEventListener('gamepaddisconnected',()=>toast('🎮 Controller disconnected'));
const KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ShiftLeft:'run',ShiftRight:'run',Space:'rise',KeyQ:'rise',KeyC:'dive',KeyZ:'dive'};
addEventListener('keydown',e=>{
  if(curView!=='drive'||!safari.running)return;
  $('#startDrive').hidden=true;
  if(KM[e.code]){keys[KM[e.code]]=true;e.preventDefault()}
  if(e.repeat)return;
  if(e.code==='KeyE'){pressE();e.preventDefault()}
  if(e.code==='KeyF'){throwNet();e.preventDefault()}
  if(e.code==='KeyR'){rideToggle();e.preventDefault()}
  if(e.code==='KeyG'){foodAction();e.preventDefault()}
  if(e.code==='KeyB'){toggleSub();e.preventDefault()}
  if(e.code==='KeyP'){togglePlane();e.preventDefault()}
  if(e.code==='KeyX'){takeDNA();e.preventDefault()}
  if(e.code==='KeyN'){toggleNet();e.preventDefault()}
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
    w.dist=clamp(w.dist*pinch.d/Math.max(d,1),14,1600);panZoo(mx-pinch.mx,my-pinch.my);pinch={d,mx,my};return}
  if(downAt&&(downAt.btn===2||downAt.shift))panZoo(dx,dy);
  else{w.yaw-=dx*.006;w.pitch=clamp(w.pitch+dy*.004,.12,1.4)}});
function panZoo(dx,dy){const w=zoo.cam.w,s=w.dist*.0016,c=Math.cos(w.yaw),n=Math.sin(w.yaw);
  w.tx=clamp(w.tx-c*dx*s-n*dy*s,-700,800);w.tz=clamp(w.tz+n*dx*s-c*dy*s,zooLayout().end-60,120)}
const endPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;look.drag=false;look.idle=0;
  if(curView==='zoo'&&downAt&&Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)<7&&performance.now()-downAt.t<500&&ptrs.size===0){const id=zooPick(e.clientX,e.clientY);if(id!=null)tapArea(id)}
  if(ptrs.size===0)downAt=null};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('wheel',e=>{if(curView!=='zoo')return;e.preventDefault();const w=zoo.cam.w;w.dist=clamp(w.dist*Math.pow(1.0015,e.deltaY),14,1600)},{passive:false});
document.querySelectorAll('[data-k]').forEach(b=>{const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{keys[k]=true;b.setPointerCapture(e.pointerId);e.preventDefault()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys[k]=false))});
$('#netBtn').addEventListener('click',throwNet);
$('#rideBtn').addEventListener('click',rideToggle);
$('#eBtn').addEventListener('click',pressE);
$('#foodBtn').addEventListener('click',foodAction);
$('#subBtn').addEventListener('click',toggleSub);
$('#planeBtn').addEventListener('click',togglePlane);
$('#dnaBtn').addEventListener('click',takeDNA);
$('#dnaLabBtn').addEventListener('click',openLab);
$('#netToggle').addEventListener('click',toggleNet);
$('#jumpBtn').addEventListener('click',jump);
function goMap(){if(me.pack.length)releaseLeash();show('map')}
$('#back').onclick=goMap;
$('#toZoo1').onclick=openZoo;
$('#toZoo2').onclick=()=>{if(me.pack.length)releaseLeash();if(world&&world.zoo){show('zoo');zoo.running=true;renderZooUI();return}deliver();openZoo()};
$('#zooMap').onclick=()=>show('map');
function deliver(){if(!S.cages.length)return;const n=S.cages.length;S.holding.push(...S.cages.map(c=>(delete c.pen,c)));S.cages=[];save();setTimeout(()=>toast('You brought '+n+' animal'+(n>1?'s':'')+' to your zoo! They went straight into their domes.'),50)}

/* ---------- zoo panel ---------- */
let selected=null;
$('#habSel').innerHTML=Object.entries(HAB).map(([k,h])=>`<option value="${k}">${h.i} ${h.name}</option>`).join('');
function renderZooUI(){
  coins();$('#buildD').textContent=S.freeDomes>0?'Build dome · FREE ('+S.freeDomes+' left)':'Build dome · 🪙 250';
  $('#truckInfo').innerHTML=S.cages.length?`🚚 ${S.cages.length} animal${S.cages.length>1?'s':''} in your truck cages: ${S.cages.map(x=>SP[x.k].e).join('')} <button class="mini" id="unload">Put them back in their domes</button>`:'🚚 Your truck cages are empty.';
  if((S.truckEggs||[]).length)$('#truckInfo').innerHTML+=`<br>🥚 ${S.truckEggs.length} egg${S.truckEggs.length>1?'s':''} in your truck. Drive them to the Egg Nursery and press G.`;
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
  $('#acCount').textContent=area.animals.length+' animal'+(area.animals.length===1?'':'s')+' live here'+(area.eggs.length?' · 🥚 '+area.eggs.length+' egg'+(area.eggs.length>1?'s':'')+' waiting to hatch':'')+' · room for as many as you catch';
  $('#acList').innerHTML=area.animals.length?area.animals.map(an=>{const s=SP[an.k],ok=happy(an,area);
    return `<li><span class="e">${s.e}</span><span><b>${s.n}${an.born?' (baby)':''}</b><small>${ok?'Happy here':'Wants a '+HAB[s.hab].name+' home'}</small></span><span class="two"><button class="mini" data-load="${an.uid}">🚚 Truck</button><button class="mini" data-free="${an.uid}">🌿 Set free</button></span></li>`}).join('')
    :'<li class="empty">No animals here yet. Catch some '+HAB[area.hab].name+' animals on safari!</li>';
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
$('#acList').addEventListener('click',e=>{const area=S.areas.find(a=>a.id===zoo.sel);if(!area)return;
  const ld=e.target.closest('[data-load]'),fr=e.target.closest('[data-free]');
  if(ld){if(smallUsed()>=CAGES){toast('The small truck cages are full ('+CAGES+'). Unload some first!');return}
    const u=+ld.dataset.load,i=area.animals.findIndex(x=>x.uid===u),an=area.animals.splice(i,1)[0];delete an.pen;S.cages.push(an);save();syncZooAnimals();renderZooUI();
    toast('The '+SP[an.k].n+' is in a cage on your truck. Take it for a drive!')}
  if(fr){if(fr.dataset.sure!=='1'){fr.dataset.sure='1';fr.textContent='Tap again to set free';setTimeout(()=>{if(fr.isConnected){fr.dataset.sure='';fr.textContent='🌿 Set free'}},3000);return}
    const u=+fr.dataset.free,i=area.animals.findIndex(x=>x.uid===u),an=area.animals.splice(i,1)[0];save();syncZooAnimals();renderZooUI();
    toast('Bye bye '+SP[an.k].n+'! It went back to the wild.')}});
$('#truckInfo').addEventListener('click',e=>{if(!e.target.closest('#unload'))return;S.holding.push(...S.cages.splice(0).map(c=>(delete c.pen,c)));const made=autoHome();
  [...new Set(S.areas.map(a=>a.id))].forEach((id,i)=>{if(!zoo.areas.has(id)){buildArea(S.areas[i],i);syncVisitors()}});if(made.length)rebuildPaths();syncZooAnimals();renderZooUI();toast('Your animals are back in their domes!')});
$('#acClose').onclick=()=>{zoo.sel=null;renderAreaCard();const w=zoo.cam.w;w.dist=700;w.tx=0;w.tz=-400};
$('#sideToggle').onclick=()=>$('#zooSide').classList.toggle('min');
function build(type){const free=(S.freeDomes||0)>0,cost=free?0:250;
  if(S.coins<cost){toast('You need '+cost+' coins. Catch more animals!');return}
  S.coins-=cost;if(free)S.freeDomes--;const area={id:S.aid++,type,hab:$('#habSel').value,animals:[],eggs:[]};S.areas.push(area);save();
  buildArea(area,S.areas.length-1);rebuildPaths();syncVisitors();zoo.sel=area.id;focusArea(area.id);renderZooUI();
  toast('Built dome '+S.areas.length+': '+HAB[area.hab].name+'!')}
$('#buildD').onclick=()=>build('dome');

/* ---------- driving in the zoo ---------- */
function renderEncPick(){
  $('#encGrid').innerHTML='<button class="enc gate" data-enc="gate"><b>🚪</b><span>Zoo gate</span><small>Drive around</small></button>'+
    '<button class="enc" data-enc="lab"><b>🧬</b><span>DNA Lab</span><small>Make new animals</small></button>'+
    S.areas.map((a,i)=>`<button class="enc" data-enc="${a.id}"><b>${i+1}</b><span>${HAB[a.hab].i} ${HAB[a.hab].name}</span><small>${a.animals.map(x=>SP[x.k].e).join('')||'empty'}</small></button>`).join('');
}
async function startZooDrive(id,opts={}){
  if(!initRenderer())return;
  $('#encPick').hidden=true;
  if(!zoo.built||curView!=='zoo'){show('zoo');loading(true,'Opening your zoo…');await nextFrame();await enterZoo(t=>$('#loadTxt').textContent=t);loading(false)}
  world=zooDriveWorld();
  if(zoo.carG)zoo.scene.remove(zoo.carG);
  sub.on=false;plane.on=false;for(const h of car.helpers||[])h.g.parent&&h.g.parent.remove(h.g);buildCar(zoo.scene,opts);zoo.carG=car.g;if(!opts.tour)buildHelpers(zoo.scene);else car.helpers=car.helperHolds=[];showTruckEggs();showFood();buildFootRig();zoo.scene.add(cam);refreshCages();
  mode='car';me.pack=[];car.v=0;car.steer=0;look.yaw=0;look.pitch=-.12;
  const A=id!=null&&zoo.areas.get(id);
  if(A){car.x=A.inside.x;car.z=A.inside.z;$('#where').textContent='Dome '+(S.areas.indexOf(A.area)+1)+' · '+HAB[A.area.hab].name}
  else{car.x=0;car.z=opts.tour?52:48;$('#where').textContent=opts.tour?'Safari tour':'My Zoo'}
  car.yaw=A?Math.atan2(-(A.x-car.x),-(A.z-car.z)):0;footRig.visible=false;setDriveUI();
  $('#cagesTxt').hidden=true;$('#toZoo2').textContent='🏛️ Zoo view';
  show('drive');safari.running=true;fps.t=fps.n=0;fps.done=false;$('#startDrive').hidden=false;
}
$('#driveZoo').onclick=()=>{endDinoTour();startZooDrive(null)};
$('#dinoTour').onclick=async()=>{endDinoTour();await startZooDrive(null,{tour:true});startDinoTour()};
$('#goEnc').onclick=()=>{renderEncPick();$('#encPick').hidden=false};
$('#encClose').onclick=()=>$('#encPick').hidden=true;
$('#encGrid').addEventListener('click',e=>{const b=e.target.closest('[data-enc]');if(!b)return;endDinoTour();
  // the DNA Lab: park at its door and walk straight in
  if(b.dataset.enc==='lab'){startZooDrive(null).then(()=>{car.x=LAB.x;car.z=LAB.z+LAB.W/2+9;car.yaw=0;car.v=0;updateCar(0);pressE();me.x=LAB.x;me.z=LAB.z+LAB.W/2-3;look.yaw=0;look.pitch=-.1;toast('🧬 Welcome to the DNA Lab! Pick up a DNA tube from the shelves with E and pour it into the mixer.',6000)});return}
  startZooDrive(b.dataset.enc==='gate'?null:+b.dataset.enc)});

// visitors pay for happy animals
setInterval(()=>{let h=0;for(const a of S.areas)for(const an of a.animals)if(happy(an,a))h++;if(h){S.coins+=h;save();coins()}},5000);

show('map');
