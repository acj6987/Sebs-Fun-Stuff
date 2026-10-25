// The safari: terrain, the jeep with your hands on the wheel, walking, catching and caging animals.
const WS=640,HALF=WS/2,LIMIT=HALF-45;
const keys={};
const look={yaw:0,pitch:-.12,drag:null,idle:0};
let mode='car',world=null,safariScene=null;
const car={x:0,z:0,y:0,yaw:0,v:0,steer:0,g:null};
const me={x:0,z:0,y:0,vy:0,ground:true,bob:0,pack:[]};const PACK=5,MAXPACK=14;

function baseH(x,z){return 2.4*Math.sin(x*.012)*Math.cos(z*.010)+1.3*Math.sin(x*.029+z*.018)+.55*Math.sin(x*.071)*Math.sin(z*.063)+1.8*Math.sin(x*.004+1)*Math.cos(z*.005+.4)}
// Ocean Islands: deep sea everywhere, with sandy islands poking out
function seaH(x,z){let h=-7+baseH(x,z)*.5;
  for(const I of world.islands){const d=Math.hypot(x-I.x,z-I.z)/I.r;if(d<1.6){const top=1.6+baseH(x,z)*.6+Math.max(0,1-d/.55)*I.hill;h=Math.max(h,lerp(-7,top,1-sm(.62,1.55,d)))}}
  return h}
// where you stand or drive: on the sea floor in shallow water, floating or swimming in deep water
function HW(x,z){const h=H(x,z);return world.sea?Math.max(h,-1.15):h}
function H(x,z){if(world.flat)return 0;if(world.sea)return seaH(x,z);let h=baseH(x,z);
  const d=Math.max(Math.abs(x),Math.abs(z));if(d>HALF-60)h+=Math.pow(d-(HALF-60),1.5)*.09;
  for(const p of world.ponds){const dd=Math.hypot(x-p.x,z-p.z);if(dd<p.r*1.4){const t=sm(p.r*.75,p.r*1.4,dd);h=h*t+(p.lvl-.9)*(1-t)}}
  return h}
function inPond(x,z){return world.ponds.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*.95)}
function addCol(c){const k=Math.floor(c.x/20)+','+Math.floor(c.z/20);if(!world.cols.has(k))world.cols.set(k,[]);world.cols.get(k).push(c)}
function collide(o,rad){
  const cx=Math.floor(o.x/20),cz=Math.floor(o.z/20);let hit=false;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const L=world.cols.get((cx+i)+','+(cz+j));if(!L)continue;
    for(const c of L){const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz),m=c.r+rad;if(d<m&&d>.001){o.x=c.x+dx/d*m;o.z=c.z+dz/d*m;hit=true}}}
  return hit}
function keepIn(o){const b=world.bounds||{x0:-LIMIT,x1:LIMIT,z0:-LIMIT,z1:LIMIT};o.x=clamp(o.x,b.x0,b.x1);o.z=clamp(o.z,b.z0,b.z1)}
const nextFrame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));

async function buildSafari(c,progress){
  const E=ENV[c.hab],r=rng(hash(c.id));
  const scene=new T.Scene();safariScene=scene;
  world={c,E,scene,ponds:[],cols:new Map(),animals:[],net:null,respawn:[],waters:[],sea:!!c.sea,maxAn:c.sea?70:40};
  world.sky=NATURE.setupSky(R,scene,E);
  if(c.sea){world.islands=[{x:0,z:0,r:72,hill:4}];
    for(let t=0;t<400&&world.islands.length<8;t++){const I={x:(r()-.5)*(WS-150),z:(r()-.5)*(WS-150),r:32+r()*45,hill:r()*9};
      if(world.islands.every(J=>Math.hypot(I.x-J.x,I.z-J.z)>(I.r+J.r)*1.55+20))world.islands.push(I)}}
  const np=c.sea?0:c.hab==='polar'?7:c.hab==='outback'?3:5;
  for(let i=0;i<np;i++){const x=(r()-.5)*(WS-160),z=(r()-.5)*(WS-160);if(Math.hypot(x,z)<60){i--;continue}const rr=14+r()*22;world.ponds.push({x,z,r:rr,lvl:baseH(x,z)-.35})}
  progress('Shaping the land…');await nextFrame();
  // terrain
  const SZ=WS+560,seg=220,geo=new T.PlaneGeometry(SZ,SZ,seg,seg);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=new Float32Array(pos.count*3),cg=new T.Color(E.ground),cp=new T.Color(E.patch),cr=new T.Color(E.rock),cs=new T.Color('#f4f7fa'),wet=new T.Color(E.patch).multiplyScalar(.55),tmp=new T.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=H(x,z);pos.setY(i,h);
    const n=MESHER.fbm(x*.02,0,z*.02);tmp.copy(cg).lerp(cp,clamp((n-.35)*2.2,0,1));
    if(c.sea){if(h>2.4)tmp.lerp(new T.Color('#6a9a40'),sm(2.4,4.5,h)*.85);if(h<0)tmp.lerp(new T.Color('#1f7f8c'),sm(0,-6,h)*.85)}
    else{if(h>8)tmp.lerp(cr,sm(8,26,h));if(h>50&&c.hab!=='outback')tmp.lerp(cs,sm(50,85,h))}
    for(const p of world.ponds){const dd=Math.hypot(x-p.x,z-p.z);if(dd<p.r*1.35)tmp.lerp(c.hab==='polar'?cr:wet,(1-sm(p.r*.9,p.r*1.35,dd))*.8)}
    const j=.92+MESHER.noise3(x*.3,1,z*.3)*.16;cols.set([tmp.r*j*1.18,tmp.g*j*1.18,tmp.b*j*1.18],i*3)}
  geo.setAttribute('color',new T.BufferAttribute(cols,3));geo.computeVertexNormals();
  const gt=NATURE.groundTextures(c.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(SZ/7,SZ/7);nm.repeat.set(SZ/7,SZ/7);
  const ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,map,normalMap:nm,normalScale:new T.Vector2(.9,.9),roughness:c.hab==='polar'?.55:1,envMapIntensity:.6}));
  ground.receiveShadow=true;scene.add(ground);
  for(const p of world.ponds){const w=NATURE.waterMesh(p.r*1.1,E.water);w.position.set(p.x,p.lvl,p.z);scene.add(w);world.waters.push(w)}
  if(c.hab==='dino')addVolcano(scene);
  if(c.sea){const w=NATURE.waterMesh(WS*1.2,E.water);w.material.opacity=.5;w.material.side=T.DoubleSide;w.position.y=0;scene.add(w);world.waters.push(w);buildReef(scene,r);buildTreasure(scene,r)}
  progress('Growing trees…');await nextFrame();
  const types=NATURE.treeTypes(c.hab);
  const place=rr=>{const x=(rr()-.5)*(WS+380),z=(rr()-.5)*(WS+380);if(Math.hypot(x,z)<28||inPond(x,z))return null;
    if(c.sea)return H(x,z)>1.3?V(x,H(x,z),z):null;
    if(Math.max(Math.abs(x),Math.abs(z))>HALF+40&&rr()<.55)return null;return V(x,H(x,z),z)};
  const count={rainforest:2600,jungle:2000,woodland:2000,savanna:1500,outback:1300,polar:800,ocean:3000}[c.hab];
  NATURE.scatter(scene,types,Math.round(count*QUALITY.trees),place,r).forEach(addCol);
  world.grass=NATURE.makeGrass(E,world.ponds,{half:HALF});if(world.grass)scene.add(world.grass);
  buildCar(scene);buildFootRig();scene.add(cam);
  sub.on=false;sub.g=null;
  // build each animal shape once, showing progress
  const list=c.animals.map((a,i)=>SP[c.id+':'+i]).concat(S.cages.map(x=>SP[x.k]),PET_KEYS.map(k=>SP[k]));
  for(let i=0;i<list.length;i++){if(!ANIMALS.isBuilt(list[i])){progress('Waking up the animals… '+(i+1)+'/'+list.length);await nextFrame();ANIMALS.species(list[i])}}
  // pterodactyls circling high in the sky over Dino Zone
  if(c.hab==='dino'){const fl=makeFlyers(scene,SP['dino:3'],10,{x:0,z:0},[60,240],[35,80],1.6),smoke=world.tick;
    world.tick=(dt,time)=>{if(smoke)smoke(dt,time);updateFlyers(fl,dt,time,H)}}
  refreshCages();
  // one group of every kind of animal first, then extra ones
  c.animals.forEach((x,i)=>spawnAnimal(true,SP[c.id+':'+i]));
  while(world.animals.length<world.maxAn)spawnAnimal(true);
}

/* ---------- flying reptiles that circle in the sky ---------- */
function makeFlyers(scene,sp,n,center,rr,alt,scale=1){
  const list=[];
  for(let i=0;i<n;i++){const inst=ANIMALS.make(sp);inst.g.scale.setScalar(scale);scene.add(inst.g);
    list.push({inst,cx:center.x+(Math.random()-.5)*rr[1],cz:center.z+(Math.random()-.5)*rr[1],r:rr[0]+Math.random()*(rr[1]-rr[0])*.5,
      alt:alt[0]+Math.random()*(alt[1]-alt[0]),a:Math.random()*6.28,spd:(9+Math.random()*5)*(Math.random()<.5?1:-1)})}
  return list;
}
function updateFlyers(list,dt,time,ground){
  for(const f of list){f.a+=f.spd/f.r*dt;const x=f.cx+Math.cos(f.a)*f.r,z=f.cz+Math.sin(f.a)*f.r;
    const vx=-Math.sin(f.a)*Math.sign(f.spd),vz=Math.cos(f.a)*Math.sign(f.spd);
    f.inst.g.position.set(x,ground(x,z)+f.alt+Math.sin(time*.4+f.r)*4,z);f.inst.g.rotation.set(0,Math.atan2(vx,vz),-Math.sign(f.spd)*.25);
    // flap for a bit, then glide
    const flap=Math.sin(time*.5+f.r)>.2;ANIMALS.animate(f.inst,dt,0,time,{alt:flap?5:0});if(!flap)for(const w of['L','R'])f.inst.B['wing'+w].rotation.z=(w==='R'?1:-1)*-.15}
}

/* ---------- the volcano on Dino Island ---------- */
function addVolcano(scene){
  const vx=60,vz=-345,base=Math.min(H(vx,vz),H(vx,vz-60),H(vx,vz+60))-8,hgt=150;
  const geo=new T.CylinderGeometry(22,150,hgt,64,16,true),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=MESHER.fbm(x*.03,y*.03,z*.03);const k=1+(n-.5)*.35;p.setX(i,x*k);p.setZ(i,z*k)}
  geo.computeVertexNormals();
  // glowing lava streams painted down the sides
  const [lc,lg]=NATURE.canvas(512);lg.fillStyle='#000';lg.fillRect(0,0,512,512);
  for(let i=0;i<9;i++){let x=Math.random()*512;const w=4+Math.random()*7;lg.strokeStyle=i%2?'#ff7a1a':'#ff3a08';lg.lineWidth=w;lg.beginPath();lg.moveTo(x,0);
    const end=180+Math.random()*330;for(let y=0;y<end;y+=12){x+=(Math.random()-.5)*10;lg.lineTo(x,y)}lg.stroke()}
  const lava=NATURE.toTex(lc,true);
  const cone=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#3a3330',roughness:.95,map:NATURE.rockMat('#3a3330').map,emissive:'#ff5a14',emissiveMap:lava,emissiveIntensity:1.4}));cone.position.set(vx,base+hgt/2,vz);cone.receiveShadow=true;scene.add(cone);
  const lavaM=new T.MeshBasicMaterial({color:'#ff5a14',fog:false});
  const crater=new T.Mesh(new T.CircleGeometry(19,32),lavaM);crater.rotation.x=-Math.PI/2;crater.position.set(vx,base+hgt-3,vz);scene.add(crater);
  const glow=new T.PointLight('#ff7a30',2.2,700,1.5);glow.position.set(vx,base+hgt+15,vz);scene.add(glow);
  const [c,g]=NATURE.canvas(128);const gr=g.createRadialGradient(64,64,0,64,64,62);gr.addColorStop(0,'rgba(90,85,80,.75)');gr.addColorStop(1,'rgba(90,85,80,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  const sm=new T.SpriteMaterial({map:NATURE.toTex(c,true),transparent:true,depthWrite:false,fog:false});
  world.smoke=[];for(let i=0;i<18;i++){const sp=new T.Sprite(sm.clone());scene.add(sp);world.smoke.push({sp,t:i/18})}
  world.tick=dt=>{for(const q of world.smoke){q.t=(q.t+dt*.03)%1;const k=q.t;q.sp.position.set(vx+Math.sin(k*9)*12*k,base+hgt+k*170,vz+Math.cos(k*7)*10*k);q.sp.scale.setScalar(30+k*120);q.sp.material.opacity=1-k}};
}
/* ---------- the jeep ---------- */
const TS=1.7;
function buildCar(scene,opts={}){
  const g=new T.Group();scene.add(g);car.g=g;
  const paint=new T.MeshPhysicalMaterial({color:'#c4843a',roughness:.38,metalness:.25,clearcoat:.7,clearcoatRoughness:.2});
  const dark=new T.MeshStandardMaterial({color:'#1f1d1b',roughness:.85}),trim=new T.MeshStandardMaterial({color:'#2e2924',roughness:.7});
  const seat=new T.MeshPhysicalMaterial({color:'#6e3f1f',roughness:.55,sheen:.4,sheenColor:new T.Color('#3a2010')});
  const chrome=new T.MeshStandardMaterial({color:'#e2e2e2',metalness:1,roughness:.18});
  const tyre=new T.MeshStandardMaterial({color:'#1a1918',roughness:.95});
  const A=(geo,m,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,ry,rz);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  const BX=new T.BoxGeometry(1,1,1),CY=new T.CylinderGeometry(1,1,1,20),SPH=new T.SphereGeometry(1,16,12);
  const rbox=(w,h,d,r)=>{const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const e=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:3,curveSegments:6});e.translate(0,0,-d/2);return e};
  A(rbox(2,.55,4.1,.12),paint,0,.95,0,1,1,1);
  A(rbox(1.9,.3,1.25,.1),paint,0,1.3,-1.45,1,1,1);
  A(BX,dark,0,1.05,-2.12,1.7,.42,.06);for(let i=-3;i<=3;i++)A(BX,chrome,i*.2,1.06,-2.16,.05,.3,.02);
  A(rbox(1.9,.3,.3,.06),trim,0,1.5,-.72,1,1,1);
  A(BX,paint,-.98,1.35,.62,.06,.36,2.9);A(BX,paint,.98,1.35,.62,.06,.36,2.9);A(BX,paint,0,1.35,2.08,2,.36,.06);
  for(const x of[-.45,.45]){A(rbox(.6,.22,.6,.08),seat,x,1.35,.35,1,1,1);A(rbox(.6,.46,.14,.06),seat,x,1.66,.66,1,1,1)}
  A(rbox(1.7,.22,.6,.08),seat,0,1.35,1.42,1,1,1);A(rbox(1.7,.36,.14,.06),seat,0,1.62,1.72,1,1,1);
  A(BX,dark,-.93,1.95,-.85,.06,.86,.06);A(BX,dark,.93,1.95,-.85,.06,.86,.06);A(BX,dark,0,2.37,-.85,1.92,.07,.07);
  const glass=new T.Mesh(new T.PlaneGeometry(1.8,.78),new T.MeshPhysicalMaterial({color:'#dff2fa',transparent:true,opacity:.08,roughness:0,metalness:0,clearcoat:1,side:T.DoubleSide,depthWrite:false}));glass.position.set(0,1.95,-.85);g.add(glass);
  A(CY,chrome,-.92,1.95,1.05,.04,1.3,.04);A(CY,chrome,.92,1.95,1.05,.04,1.3,.04);A(CY,chrome,0,2.6,1.05,.04,1.84,.04,0,0,Math.PI/2);
  for(const x of[-.7,.7]){A(CY,chrome,x,1.3,-2.12,.15,.06,.15,Math.PI/2,0,0);A(SPH,new T.MeshStandardMaterial({color:'#fffbe6',emissive:'#fff2c0',emissiveIntensity:.6}),x,1.3,-2.15,.12,.12,.04)}
  A(CY,tyre,0,1.25,2.2,.42,.22,.42,Math.PI/2,0,0);
  for(const x of[-.62,-.3])A(CY,new T.MeshStandardMaterial({color:'#efe8d6',roughness:.3}),x,1.6,-.57,.07,.02,.07,1.2,0,0);
  car.wheels=[];car.front=[];
  const tread=new T.TorusGeometry(.4,.14,10,28);
  for(const[x,z]of[[-1.02,-1.4],[1.02,-1.4],[-1.02,1.4],[1.02,1.4]]){const wg=new T.Group();wg.position.set(x,.54,z);g.add(wg);
    const sp=new T.Group();wg.add(sp);const t=new T.Mesh(tread,tyre);t.rotation.y=Math.PI/2;t.castShadow=true;sp.add(t);
    const hub=new T.Mesh(CY,chrome);hub.scale.set(.33,.24,.33);hub.rotation.z=Math.PI/2;sp.add(hub);const rim=new T.Mesh(CY,dark);rim.scale.set(.4,.2,.4);rim.rotation.z=Math.PI/2;sp.add(rim);
    car.wheels.push(sp);if(z<0)car.front.push(wg)}
  // trailer with cages
  // safety cage over the cab, a strong front bumper and a long trailer with 8 cages
  const steel=new T.MeshStandardMaterial({color:'#2f3336',metalness:.8,roughness:.35});
  const bar=(a,b,r=.05)=>{const d=b.clone().sub(a),L=d.length(),m=new T.Mesh(CY,steel);m.scale.set(r,L,r);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());m.castShadow=true;g.add(m)};
  for(const x of[-1,1]){bar(V(x*.95,1.3,-.9),V(x*.95,2.75,-.6));bar(V(x*.95,1.3,1.9),V(x*.95,2.75,1.9));bar(V(x*.95,2.75,-.6),V(x*.95,2.75,1.9));
    bar(V(x*.97,1.55,-.85),V(x*.97,1.55,1.9),.035);bar(V(x*.97,1.85,-.75),V(x*.97,1.85,1.9),.035)}
  bar(V(-.95,2.75,-.6),V(.95,2.75,-.6));bar(V(-.95,2.75,1.9),V(.95,2.75,1.9));for(const z of[.2,1])bar(V(-.95,2.75,z),V(.95,2.75,z),.035);
  bar(V(-1.05,.7,-2.35),V(1.05,.7,-2.35),.07);bar(V(-1.05,1.15,-2.35),V(1.05,1.15,-2.35),.06);for(const x of[-.7,0,.7])bar(V(x,.6,-2.35),V(x,1.2,-2.35),.05);
  for(const x of[-1,1])bar(V(x*1.05,.6,-2.35),V(x*1.05,1.15,-2.35),.06);
  const tr=new T.Group();tr.position.set(0,0,6.6);g.add(tr);car.trailer=tr;
  const wood=new T.MeshStandardMaterial({color:'#5b4632',roughness:.9});
  const TA=(geo,m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;tr.add(o);return o};
  TA(BX,dark,0,.75,-4.4,.14,.14,1.4);TA(BX,wood,0,.8,0,2.3,.2,8.2);TA(BX,steel,-1.15,.95,0,.06,.25,8.2);TA(BX,steel,1.15,.95,0,.06,.25,8.2);
  for(const z of[-2.6,-1.3,1.3,2.6])for(const x of[-1.22,1.22]){const wg=new T.Group();wg.position.set(x,.54,z);tr.add(wg);const sp=new T.Group();wg.add(sp);const t=new T.Mesh(tread,tyre);t.rotation.y=Math.PI/2;sp.add(t);const rim=new T.Mesh(CY,steel);rim.scale.set(.4,.22,.4);rim.rotation.z=Math.PI/2;sp.add(rim);car.wheels.push(sp)}
  car.slots=[];car.pens=[];car.seats=[];
  if(opts.tour){
    // a safari passenger carriage: seats, a roof and big open windows to look out of
    const paintC=new T.MeshPhysicalMaterial({color:'#e8e2d0',roughness:.4,clearcoat:.5}),green=new T.MeshStandardMaterial({color:'#2f6a32',roughness:.6}),seatM=new T.MeshPhysicalMaterial({color:'#7a4a26',roughness:.55,sheen:.4});
    const glassM=new T.MeshPhysicalMaterial({color:'#dff2fa',transparent:true,opacity:.12,roughness:.02,clearcoat:1,side:T.DoubleSide,depthWrite:false});
    for(const x of[-1.12,1.12]){TA(BX,paintC,x,1.35,0,.08,.9,8);TA(BX,green,x,1.82,0,.1,.08,8.04)}
    TA(BX,paintC,0,1.35,3.98,2.3,.9,.08);TA(BX,paintC,0,1.35,-3.98,2.3,.9,.08);
    for(const z of[-3.95,-2,0,2,3.95])for(const x of[-1.12,1.12])TA(BX,steel,x,2.55,z,.08,1.5,.08);
    TA(BX,green,0,3.32,0,2.5,.1,8.3);TA(BX,paintC,0,3.4,0,2.2,.06,7.8);
    for(const x of[-1.13,1.13]){const gl=new T.Mesh(new T.PlaneGeometry(7.9,1.4),glassM);gl.rotation.y=Math.PI/2;gl.position.set(x,2.55,0);tr.add(gl)}
    for(const z of[-3,-1.5,0,1.5,3]){TA(BX,seatM,0,1.12,z,2,.16,.6);TA(BX,seatM,0,1.45,z+.32,2,.55,.1);for(const x of[-.55,.55])car.seats.push(V(x,1.2,z))}
    const sign=new T.Mesh(new T.PlaneGeometry(2,.4),new T.MeshStandardMaterial({map:typeof signTexture==='function'?signTexture(['SAFARI TOURS'],'#2f6a32'):null,color:'#ffffff'}));sign.position.set(0,3,4.03);tr.add(sign);
  }else{
  for(const z of[-3.4,-2.05,-.7])for(const x of[-.55,.55]){const cg=new T.Group();cg.position.set(x,.9,z);tr.add(cg);buildCage(cg);const hold=new T.Group();cg.add(hold);car.slots.push(hold)}
  for(const x of[-.56,.56]){const cg=new T.Group();cg.position.set(x,.9,2.2);tr.add(cg);buildCage(cg,1.06,1.35,3.6);const hold=new T.Group();cg.add(hold);car.pens.push(hold)}
  }
  // steering wheel + your hands
  const col=new T.Group();col.position.set(-.45,1.6,-.48);col.rotation.x=-.6;g.add(col);
  const cm=new T.Mesh(CY,dark);cm.scale.set(.03,.5,.03);cm.rotation.x=Math.PI/2;cm.position.z=-.25;col.add(cm);
  const sw=new T.Group();col.add(sw);car.sw=sw;
  sw.add(new T.Mesh(new T.TorusGeometry(.2,.022,12,40),new T.MeshPhysicalMaterial({color:'#1c1a18',roughness:.5,sheen:.3})));
  for(const a of[0,Math.PI,-Math.PI/2]){const s=new T.Mesh(BX,dark);s.position.set(Math.cos(a)*.1,Math.sin(a)*.1,0);s.scale.set(a===-Math.PI/2?.03:.2,a===-Math.PI/2?.2:.03,.015);sw.add(s)}
  const hub=new T.Mesh(CY,new T.MeshStandardMaterial({color:'#7a1a1a',roughness:.4}));hub.scale.set(.05,.03,.05);hub.rotation.x=Math.PI/2;hub.position.z=.01;sw.add(hub);
  const skin=new T.MeshPhysicalMaterial({color:'#d39a74',roughness:.5,sheen:.4,sheenColor:new T.Color('#ff9080')}),sleeve=new T.MeshPhysicalMaterial({color:'#5f6a40',roughness:.95,sheen:.6,sheenColor:new T.Color('#9aa070')});
  car.hands=[];car.arms=[];
  for(const a of[Math.PI*5/6,Math.PI/6]){const h=new T.Group();h.position.set(Math.cos(a)*.2,Math.sin(a)*.2,.02);h.rotation.z=a-Math.PI/2;sw.add(h);
    const P=(x,y,z,sx,sy,sz)=>{const o=new T.Mesh(SPH,skin);o.position.set(x,y,z);o.scale.set(sx,sy,sz);h.add(o)};
    P(0,0,.015,.048,.058,.042);for(let f=0;f<4;f++)P((f-1.5)*.021,.033,-.008,.0125,.024,.021);P(a>Math.PI/2?.038:-.038,-.018,.028,.017,.03,.015);
    car.hands.push(h);const arm=new T.Mesh(CY,sleeve);arm.scale.set(.05,1,.05);arm.castShadow=true;g.add(arm);const cuff=new T.Mesh(CY,skin);cuff.scale.set(.034,1,.034);g.add(cuff);car.arms.push([arm,cuff])}
  g.scale.setScalar(TS); // a ginormous safari truck
}
function buildCage(cg,w=.98,h=1.1,d=1.3){
  const bar=new T.MeshStandardMaterial({color:'#3b3d40',metalness:.8,roughness:.35});
  const B=new T.BoxGeometry(1,1,1),C=new T.CylinderGeometry(1,1,1,6);
  const add=(geo,m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;cg.add(o)};
  add(B,new T.MeshStandardMaterial({color:'#6b5136',roughness:.9}),0,.03,0,w,.06,d);add(B,bar,0,h,0,w,.05,d);
  for(const sx of[-1,1])for(const sz of[-1,1])add(B,bar,sx*w/2,h/2,sz*d/2,.05,h,.05);
  const nb=Math.round(d/.22);for(let i=1;i<nb;i++){const z=-d/2+i*d/nb;for(const sx of[-1,1])add(C,bar,sx*w/2,h/2,z,.012,h,.012)}
  for(let i=1;i<4;i++){const x=-w/2+i*w/4;for(const sz of[-1,1])add(C,bar,x,h/2,sz*d/2,.012,h,.012)}
}
function refreshCages(){
  car.caged=[];
  const put=(hold,c,bx,by,bz)=>{const a=ANIMALS.make(SP[c.k]);const k=Math.min(bx/(a.rad*2),by/a.h,bz/a.len);a.g.scale.setScalar(k);a.g.position.y=.06;hold.add(a.g);car.caged.push(a);return a};
  const small=S.cages.filter(c=>c.pen==null);
  car.slots.forEach((s,i)=>{while(s.children.length)s.remove(s.children[0]);if(small[i])put(s,small[i],.85,.95,1.15)});
  car.pens.forEach((s,i)=>{while(s.children.length)s.remove(s.children[0]);
    S.cages.filter(c=>c.pen===i).forEach((c,j)=>{const a=put(s,c,.45,1.15,1);a.g.position.set(j%2?.24:-.24,.06,-1.15+Math.floor(j/2)*1.15)})});
  coins();
}
function setBetween(mesh,a,b){const d=b.clone().sub(a),L=d.length();mesh.position.copy(a).addScaledVector(d,.5);mesh.scale.y=L;mesh.quaternion.setFromUnitVectors(V(0,1,0),d.normalize())}

/* ---------- the net you carry on foot ---------- */
let footRig,netRig;
function buildFootRig(){
  if(footRig){cam.add(footRig);return}
  footRig=new T.Group();footRig.position.set(.1,-.12,0);footRig.scale.setScalar(.8);cam.add(footRig);
  const skin=new T.MeshPhysicalMaterial({color:'#d39a74',roughness:.5,sheen:.4}),sleeve=new T.MeshPhysicalMaterial({color:'#5f6a40',roughness:.95,sheen:.6}),pole=new T.MeshStandardMaterial({color:'#8a6a3a',roughness:.6});
  const CY=new T.CylinderGeometry(1,1,1,12);
  footRig.userData.sleeve=sleeve;
  const s=new T.Mesh(CY,sleeve);s.position.set(.32,-.38,-.25);s.scale.set(.06,.5,.06);s.rotation.set(-1.1,0,.25);footRig.add(s);
  const h=new T.Mesh(new T.SphereGeometry(1,14,10),skin);h.position.set(.26,-.27,-.5);h.scale.set(.05,.06,.05);footRig.add(h);
  netRig=new T.Group();netRig.position.set(.26,-.27,-.5);netRig.rotation.set(-.75,0,-.25);footRig.add(netRig);
  const p=new T.Mesh(CY,pole);p.position.set(0,.25,-.1);p.scale.set(.018,.9,.018);p.rotation.x=-.35;netRig.add(p);
  const hoop=new T.Mesh(new T.TorusGeometry(.22,.012,6,24),new T.MeshStandardMaterial({color:'#3b3d40',metalness:.7,roughness:.3}));hoop.position.set(0,.7,-.28);hoop.rotation.x=.4;netRig.add(hoop);
  const bag=new T.Mesh(new T.ConeGeometry(.22,.35,12,1,true),new T.MeshBasicMaterial({color:'#e8dcc0',wireframe:true}));bag.position.set(0,.75,-.12);bag.rotation.x=.4+Math.PI;netRig.add(bag);
  footRig.traverse(o=>{o.castShadow=false;o.receiveShadow=false});footRig.visible=false;
}
function makeNetMesh(){
  const g=new T.Group();
  const hoop=new T.Mesh(new T.TorusGeometry(.9,.04,6,28),new T.MeshStandardMaterial({color:'#3b3d40',metalness:.7,roughness:.3}));hoop.rotation.x=Math.PI/2;g.add(hoop);
  g.add(new T.Mesh(new T.SphereGeometry(.9,12,8,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:'#efe4c8',wireframe:true})));
  world.scene.add(g);return g}

/* ---------- state icons over animals ---------- */
const ICON={};
function iconTex(txt,col){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle=col;g.beginPath();g.arc(64,64,56,0,7);g.fill();g.fillStyle='#fff';g.font='900 64px Nunito,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,64,68);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t}
function makeIcon(){if(!ICON.run){ICON.run=iconTex('!','#d4602f');ICON.tired=iconTex('Zz','#2f6fa8')}
  const s=new T.Sprite(new T.SpriteMaterial({map:ICON.run,depthTest:false,fog:false}));s.scale.set(.9,.9,1);s.visible=false;s.renderOrder=5;return s}

/* ---------- animals ---------- */
let grpId=1;
function spawnAnimal(initial,force){
  const c=world.c,list=c.animals.map((a,i)=>SP[c.id+':'+i]);
  const w=list.map(s=>s.def.mate?0:[0,7,3,1.2][s.r]),tot=w.reduce((a,b)=>a+b);
  let k=Math.random()*tot,sp=force||list[0];if(!force)for(let i=0;i<list.length;i++){k-=w[i];if(k<0){sp=list[i];break}}
  // the two Mummy Dreams only ever appear together, and never again once they are yours
  let kinds=null;
  if(sp.def.mate){if(sp.def.male)return;kinds=[sp,SP[sp.def.mate]].filter(s=>!owns(s.k)&&!world.animals.some(a=>a.sp===s));if(!kinds.length)return}
  const okAt=(x,z)=>livesAt(sp,x,z);
  let x,z,tries=0;do{x=(Math.random()-.5)*2*(LIMIT-15);z=(Math.random()-.5)*2*(LIMIT-15);tries++}
  while(tries<(world.sea?300:50)&&(!okAt(x,z)||Math.hypot(x-me.x,z-me.z)<(initial?45:110)||Math.hypot(x-car.x,z-car.z)<(initial?45:110)));
  if(initial&&world.animals.length<4&&!world.sea){const a=Math.random()*6.28,d=45+Math.random()*30;x=Math.sin(a)*d;z=-Math.cos(a)*d}
  // the Mummy Dreams hide on the island furthest from where you start, tucked in among the trees
  if(kinds&&world.islands){const I=world.islands.slice().sort((p,q)=>Math.hypot(q.x,q.z)-Math.hypot(p.x,p.z))[0],a=Math.random()*6.28,d=I.r*.35*Math.random();x=I.x+Math.sin(a)*d;z=I.z+Math.cos(a)*d}
  // animals that live together come as a herd, pride or pack
  const hd=sp.def.herd,n=kinds?kinds.length:hd?hd[0]+Math.floor(Math.random()*(hd[1]-hd[0]+1)):1;
  const grp=n>1?{id:grpId++,members:[],fleeT:0}:null;
  for(let i=0;i<n;i++){
    const spi=kinds?kinds[i]:sp,m=ANIMALS.make(spi);world.scene.add(m.g);const icon=makeIcon();m.g.add(icon);icon.position.y=m.h+.7;
    const sp2=Math.max(2.5,m.rad*2.6);let ox=i?(Math.random()-.5)*sp2*2.4:0,oz=i?(Math.random()-.5)*sp2*2.4:0;if(!okAt(x+ox,z+oz))ox=oz=0;
    const a={sp:spi,x:x+ox,z:z+oz,ox,oz,vx:0,vz:0,yaw:Math.random()*6.3,t:0,state:'wander',stam:1,tired:0,alt:0,graze:0,m,icon,far:false,grp};
    if(grp)grp.members.push(a);world.animals.push(a);
  }
}
// fish stay in the deep water, land animals stay on the islands; turtles and the Sparkle Zebraffe go anywhere
function livesAt(sp,x,z){if(!world.sea)return!inPond(x,z);const h=H(x,z),d=sp.def;return d.swim?h<-2.2:d.amph?true:h>.8}
function removeAnimal(a){world.scene.remove(a.m.g);world.animals.splice(world.animals.indexOf(a),1);
  if(a.grp){a.grp.members=a.grp.members.filter(m=>m!==a)}world.respawn.push(10)}
// hunters chase their prey; if they catch it, it falls over and is gone
function startHunt(){
  const px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  const preds=world.animals.filter(a=>a.sp.def.hunts&&a.state==='wander').sort(()=>Math.random()-.5);
  for(const p of preds){
    const prey=world.animals.filter(b=>p.sp.def.hunts.includes(b.sp.n)&&b.state==='wander'&&Math.hypot(b.x-p.x,b.z-p.z)<90).sort((u,v)=>Math.hypot(u.x-p.x,u.z-p.z)-Math.hypot(v.x-p.x,v.z-p.z))[0];
    if(!prey)continue;
    const team=p.grp?p.grp.members.filter(m=>m.state==='wander'):[p];
    for(const h of team){h.state='hunt';h.prey=prey;h.huntT=16}
    prey.state='chased';prey.hunter=p;prey.chT=16;if(prey.grp)prey.grp.fleeT=6;
    if(Math.hypot(p.x-px,p.z-pz)<120)toast('Look! '+(team.length>1?'The '+p.sp.n.toLowerCase()+'s are':'A '+p.sp.n.toLowerCase()+' is')+' hunting a '+prey.sp.n.toLowerCase()+'!');
    return}
}
function updateAnimals(dt,time){
  const px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  world.huntT=(world.huntT??12)-dt;if(world.huntT<=0){world.huntT=18+Math.random()*22;startHunt()}
  for(const a of world.animals){
    const d=Math.hypot(a.x-px,a.z-pz),r=a.sp.r,G=a.grp;
    if(G&&G.fleeT>0)G.fleeT-=dt/Math.max(1,G.members.length);
    if(a.state==='netted'){
      // netted animals follow you in a line, each one behind the one before
      const own=me.pack.includes(a)?me:world.asst,i=own.pack.indexOf(a),lead=i>0?own.pack[i-1]:own,gap=i>0?2.2+a.m.rad+lead.m.rad:3.2,td=Math.hypot(lead.x-a.x,lead.z-a.z);
      if((mode==='foot'||own!==me)&&td>gap){const s=Math.min(7,(td-gap+.2)*2.2);a.vx=(lead.x-a.x)/td*s;a.vz=(lead.z-a.z)/td*s}else{a.vx*=.8;a.vz*=.8}}
    else if(a.state==='caught'){a.vx=a.vz=0;a.dead=(a.dead||0)+dt;a.m.g.rotation.z=Math.min(Math.PI/2,a.dead*2.5);if(a.dead>4){removeAnimal(a);continue}}
    else if(a.state==='hunt'){
      const q=a.prey;if(!q||!world.animals.includes(q)||q.state==='caught'||q.state==='netted'||(a.huntT-=dt)<=0){a.state='rest';a.restT=6;a.vx=a.vz=0}
      else{const dx=q.x-a.x,dz=q.z-a.z,dd=Math.hypot(dx,dz)||1,fs=Math.max(a.sp.s*4.2,10.5);a.vx=dx/dd*fs;a.vz=dz/dd*fs;
        if(dd<1.4+a.m.rad*.6+q.m.rad*.6){q.state='caught';q.icon.visible=false;q.vx=q.vz=0;
          if(Math.hypot(a.x-px,a.z-pz)<120)toast('The '+a.sp.n.toLowerCase()+' caught the '+q.sp.n.toLowerCase()+'!');
          for(const h of world.animals)if(h.prey===q){h.state='rest';h.restT=12;h.vx=h.vz=0;h.graze=1}}}}
    else if(a.state==='chased'){
      const h=a.hunter,dx=a.x-h.x,dz=a.z-h.z,dd=Math.hypot(dx,dz)||1,fs=Math.max(a.sp.s*2.6,7.6);a.vx=dx/dd*fs;a.vz=dz/dd*fs;
      if((a.chT-=dt)<=0||!world.animals.includes(h)||h.state!=='hunt'){a.state='wander';a.t=0}}
    else if(a.state==='follow'){
      // they smelled your food: they come to you and stay close, happy and calm
      const dx=px-a.x,dz=pz-a.z,dd=Math.hypot(dx,dz)||1,gap=4+a.m.rad;a.soar=dd>40;
      if(dd>gap){const s=Math.min(14,(dd-gap)*1.5+1);a.vx=dx/dd*s;a.vz=dz/dd*s;a.graze=0}else{a.vx*=.8;a.vz*=.8;a.graze=1}
      if((a.followT-=dt)<=0){a.state='wander';a.t=0;a.soar=0}}
    else if(a.state==='sleep'){a.vx*=.8;a.vz*=.8;a.graze=1;a.soar=0;if((a.sleepT-=dt)<=0&&(!G||G.members[0]===a)){for(const m of G?G.members:[a])if(m.state==='sleep'){m.state='wander';m.graze=0;m.t=0}}}
    else if(a.state==='rest'){a.vx*=.9;a.vz*=.9;if((a.restT-=dt)<=0){a.state='wander';a.graze=0}}
    else if(a.state==='tired'){a.tired-=dt;a.vx*=.9;a.vz*=.9;a.stam=Math.min(1,a.stam+dt*.2);if(a.tired<=0){a.state='wander';a.stam=1}}
    else{const scareR=a.sp.def.mate?(mode==='car'?55:32):r===3?(mode==='car'?28:20):r===2?(mode==='car'?20:14):0;
      const herdRun=G&&G.fleeT>0&&r>=2;
      if(r>=2&&(d<scareR||herdRun)&&a.stam>0){if(G&&d<scareR)G.fleeT=3;
        const chase=a.sp.def.chase&&d>4;if(chase&&a.state!=='flee'&&mode==='foot')toast('ROAR! The '+a.sp.n+' is chasing you! Run back to the truck!');
        if(a.sp.def.mate&&a.state==='wander'&&d<scareR&&G&&G.members[0]===a)toast('✨ Something glittery just flew away! Sneak up slowly…');
        a.state='flee';const fs=a.sp.def.mate?12:Math.max(a.sp.s*2.4,r===3?9.5:7)*(a.sp.def.chase?.62:1),dir=a.sp.def.chase?-1:1;a.vx=(a.x-px)/d*fs*dir;a.vz=(a.z-pz)/d*fs*dir;if(a.sp.def.chase&&d<4){a.vx*=.1;a.vz*=.1}a.stam-=dt/(r===3?4.5:3.5);a.graze=0;
        if(a.stam<=0){a.state='tired';a.tired=a.sp.def.mate?15:6;if(d<45&&(!G||G.members[0]===a))toast('The '+a.sp.n+(G?'s are':' is')+' tired! Quick, throw your net!')}}
      else{if(a.state==='flee')a.state='wander';a.stam=Math.min(1,a.stam+dt*.15);
        const lead=G&&G.members[0];
        if(lead&&lead!==a){
          // herd members stay close to their leader
          const tx=lead.x+a.ox,tz=lead.z+a.oz,ex=tx-a.x,ez=tz-a.z,ed=Math.hypot(ex,ez);
          if(ed>1.2){const s=Math.min(a.sp.s*1.5,ed*.7);a.vx=ex/ed*s;a.vz=ez/ed*s;a.graze=0}else{a.vx*=.9;a.vz*=.9;a.graze=lead.graze}}
        else{a.t-=dt;if(a.t<=0){a.t=2+Math.random()*4;
          if(Math.random()<.4){a.vx=a.vz=0;a.soar=0;a.graze=a.m.A.graze?1:0}else{a.graze=0;const ang=Math.random()*6.283,s=a.sp.s*(.35+Math.random()*.5);a.vx=Math.sin(ang)*s;a.vz=Math.cos(ang)*s;
            // the Sparkle Zebraffe sometimes flies about
            a.soar=a.sp.def.soar&&Math.random()<.4;if(a.soar){a.vx*=2.5;a.vz*=2.5}}
          // the Mummy Dreams have lots of long naps together
          if(a.sp.def.mate&&Math.random()<.6){const T=30+Math.random()*40;for(const m of G?G.members:[a]){m.state='sleep';m.sleepT=T;m.vx=m.vz=0;m.soar=0}}}}}}
    if(Math.abs(a.x)>LIMIT-5)a.vx=-Math.sign(a.x)*Math.abs(a.vx||1);
    if(Math.abs(a.z)>LIMIT-5)a.vz=-Math.sign(a.z)*Math.abs(a.vz||1);
    a.x+=a.vx*dt;a.z+=a.vz*dt;
    if(world.sea&&a.state!=='netted'&&!(a.sp.def.fly&&a.alt>1.5)){const d=a.sp.def,h=H(a.x,a.z);
      if(d.swim?h>-1.3:!d.amph&&h<-.3){a.x-=a.vx*dt;a.z-=a.vz*dt;a.vx=-a.vx;a.vz=-a.vz;a.t=Math.min(a.t,.6)}}
    const spd=Math.hypot(a.vx,a.vz);
    if(spd>.15){const ty=Math.atan2(a.vx,a.vz);let dy=ty-a.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));a.yaw+=dy*Math.min(1,dt*5)}
    if(a.state!=='wander')a.soar=0;
    a.alt=lerp(a.alt,a.m.A.fly&&(a.state==='flee'||a.state==='chased'||a.soar)?7:0,Math.min(1,dt*1.5));
    let pitch=0;
    if(world.sea){const h=H(a.x,a.z),d=a.sp.def;
      if(d.swim){let y=-(d.dorsalS&&a.m.h>1?a.m.h*.7:a.m.h*.85);
        // dolphins leap out of the water
        if(d.jump&&a.state!=='netted'){a.jt=(a.jt||0)-dt;if(a.jt<-8&&spd>.4&&Math.random()<dt*.15)a.jt=1.3;if(a.jt>0){const q=(1.3-a.jt)/1.3;y+=Math.sin(q*Math.PI)*3.4;pitch=-Math.cos(q*Math.PI)*.7}}
        a.alt=Math.max(h,y)-h}
      else if(h<-a.m.h*.45&&a.alt<1)a.alt=Math.max(a.alt,-a.m.h*.45-h)}
    a.m.inner.rotation.x=pitch;
    // far animals: simpler model, very far: hidden
    const vis=d<260;a.m.g.visible=vis;if(!vis)continue;
    const far=d>50;if(far!==a.far){a.far=far;ANIMALS.setLOD(a.m,far)}
    ANIMALS.animate(a.m,dt,a.state==='caught'?0:spd,time,{graze:a.graze,alt:a.alt});
    const g=a.m.g;g.position.set(a.x,H(a.x,a.z)+a.alt+(a.m.hop||0),a.z);g.rotation.y=a.yaw;
    const ic=a.icon;if(a.state==='flee'||a.state==='chased'){ic.visible=true;ic.material.map=ICON.run}else if(a.state==='tired'||a.state==='sleep'){ic.visible=true;ic.material.map=ICON.tired}else ic.visible=false;
    if(a.net){a.net.position.set(a.x,g.position.y+a.m.h*.45,a.z);const s=Math.max(a.m.rad,a.m.h*.6)*1.15;a.net.scale.set(s,s,s)}
  }
  world.respawn=world.respawn.map(t=>t-dt).filter(t=>t>0||(world.animals.length<world.maxAn-2&&spawnAnimal(false),false));
}

/* ---------- catching ---------- */
function aimTarget(){
  const f=V(0,0,-1).applyQuaternion(cam.quaternion);let best=null,bs=1e9;
  for(const a of world.animals){if(a.state==='netted'||a.state==='caught'||!a.m.g.visible)continue;
    const p=V(a.x,a.m.g.position.y+a.m.h*.5,a.z),d=p.clone().sub(cam.position),dist=d.length();if(dist>40)continue;
    const ang=f.angleTo(d.normalize());if(ang<.32){const sc=ang*30+dist;if(sc<bs){bs=sc;best={a,dist}}}}
  return best}
function throwNet(){
  if(!safari.running)return;
  if(mode==='car'){toast('Jump out of the truck first! Press E.');return}
  if(world.net)return;
  if(me.pack.length>=PACK){toast('You are already leading '+PACK+' animals! Take them to the cages first.');return}
  const t=aimTarget();
  if(!t){toast('Look right at an animal to aim your net');return}
  if(t.dist>(mode==='sub'?26:16)){toast('Too far away! Get closer to the '+t.a.sp.n);return}
  if(t.a.sp.def.mate&&Math.hypot(t.a.x-me.x,t.a.z-me.z)-t.a.m.rad>10){toast('💖 Creep up until you are 10 metres from the Mummy Dream, then throw!');return}
  const a=t.a,dur=.45,tx=a.x+a.vx*dur,tz=a.z+a.vz*dur;
  world.net={a,t:0,dur,start:cam.position.clone().add(V(.3,-.2,0).applyQuaternion(cam.quaternion)),end:V(tx,H(tx,tz)+a.alt+a.m.h*.5,tz),mesh:makeNetMesh()};
  netRig.visible=false;
}
function updateNet(dt){
  const n=world.net;if(!n)return;n.t+=dt;const p=Math.min(1,n.t/n.dur);
  n.mesh.position.lerpVectors(n.start,n.end,p);n.mesh.position.y+=Math.sin(p*Math.PI)*2;n.mesh.rotation.x+=dt*8;n.mesh.scale.setScalar(.4+p*.8);
  if(p<1)return;
  world.scene.remove(n.mesh);world.net=null;netRig.visible=true;
  const a=n.a,ok=world.animals.includes(a)&&Math.hypot(a.x-n.end.x,a.z-n.end.z)<Math.max(1.6,a.m.rad*1.3)&&(a.alt<2.5||a.sp.def.swim||world.sea&&a.alt<6&&!a.soar&&a.state!=='flee');
  if(ok){const netOne=b=>{b.state='netted';b.vx=b.vz=0;b.alt=0;b.icon.visible=false;me.pack.push(b);
      const net=new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshBasicMaterial({color:'#efe4c8',wireframe:true}));world.scene.add(net);b.net=net;
      b.rope=new T.Line(new T.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),new T.LineBasicMaterial({color:'#e8d9b0'}));b.rope.frustumCulled=false;world.scene.add(b.rope)};
    netOne(a);
    const mates=a.grp?a.grp.members.filter(m=>m!==a&&world.animals.includes(m)&&m.state!=='netted'&&m.state!=='caught'):[];
    mates.slice(0,MAXPACK-me.pack.length).forEach(netOne);
    if(mates.length)toast('You netted a '+a.sp.n+' and the whole '+(a.sp.def.hunts?'pack':'herd')+' comes with it! '+(mates.length+1)+' '+a.sp.n+'s. Lead them to the big pens on your truck.');
    else toast('You netted a '+a.sp.n+'! ('+me.pack.length+'/'+PACK+') '+(me.pack.length<PACK?'Catch more, or lead them to the cages on your truck.':'Now lead them to the cages on your truck.'))}
  else toast(a.state==='flee'?'Missed! It\'s too fast. Wait until it gets tired.':'Missed! Try again.');
  // the submarine sucks what it catches into its tank and sends it straight to your truck
  if(ok&&mode==='sub')cageIt();
}
function trailerPos(){return car.trailer.localToWorld(V(0,0,0))}
function cageIt(own=me){
  if(!own.pack.length)return;
  const names=[],caged=[];let coinsWon=0,fresh=false;
  const store=(a,pen)=>{if(!S.dex[a.sp.k])fresh=true;S.dex[a.sp.k]=(S.dex[a.sp.k]||0)+1;S.cages.push(pen==null?{uid:S.uid++,k:a.sp.k}:{uid:S.uid++,k:a.sp.k,pen});
    coinsWon+=VALUE[a.sp.r];names.push(a.sp.n);caged.push(a)};
  // whole herds and packs go into a big pen together
  const groups=new Map();for(const a of own.pack)if(a.grp){if(!groups.has(a.grp))groups.set(a.grp,[]);groups.get(a.grp).push(a)}
  for(const[g,list]of groups){if(list.length<2)continue;const used=new Set(S.cages.filter(c=>c.pen!=null).map(c=>c.pen));
    let pen=-1;for(let i=0;i<PENS;i++)if(!used.has(i)){pen=i;break}if(pen<0)break;
    list.slice(0,PEN_SIZE).forEach(a=>store(a,pen))}
  for(const a of own.pack)if(!caged.includes(a)&&smallUsed()<CAGES)store(a,null);
  if(!caged.length){toast('The cages and pens are full! Drive to the zoo to empty them.');return}
  own.pack=own.pack.filter(a=>!caged.includes(a));
  for(const a of caged){world.scene.remove(a.net);world.scene.remove(a.rope);removeAnimal(a)}
  S.coins+=coinsWon;save();refreshCages();checkDream();
  const count={};names.forEach(n=>count[n]=(count[n]||0)+1);
  toast((fresh?'NEW ANIMAL! ':'')+Object.entries(count).map(([n,c])=>c>1?c+' '+n+'s':n).join(', ')+' in the truck'+(own!==me?' (your assistant brought them)':'')+' · +'+coinsWon+' coins'+(own.pack.length?' · No room for '+own.pack.length+' more!':''));
}
function releaseLeash(){if(!me.pack.length)return;for(const a of me.pack){world.scene.remove(a.net);a.net=null;world.scene.remove(a.rope);a.rope=null;a.state='wander'}
  toast(me.pack.length>1?'Your animals wriggled out of the nets!':'The '+me.pack[0].sp.n+' wriggled out of the net!');me.pack=[]}
function pressE(){
  if(!safari.running)return;
  if(mode==='sub'){const q=V(sub.x+Math.cos(sub.yaw)*3.5,0,sub.z-Math.sin(sub.yaw)*3.5);me.x=q.x;me.z=q.z;me.y=Math.max(H(me.x,me.z)+.3,sub.y-1);me.vy=0;
    look.yaw=sub.yaw+look.yaw;look.pitch=0;mode='foot';footRig.visible=true;netRig.visible=true;setDriveUI();toast('🤿 You jumped out in your snorkel, mask and flippers! Space to swim up, Shift to dive, E by the submarine to get back in.',6000);return}
  if(mode==='foot'&&sub.on){
    if(Math.hypot(me.x-sub.x,me.z-sub.z)<9){if(me.pack.length)cageIt();mode='sub';footRig.visible=false;look.yaw=0;look.pitch=0;setDriveUI()}
    else toast('Swim back to your submarine to get in');return}
  if(mode==='car'){
    if(Math.abs(car.v)>3){toast('Slow down to jump out!');return}
    const p=car.g.localToWorld(V(-2.1,0,-.3));me.x=p.x;me.z=p.z;collide(me,.5);me.y=HW(me.x,me.z);me.vy=0;
    look.yaw=car.yaw+look.yaw;mode='foot';car.v=0;footRig.visible=true;netRig.visible=true;placePets();setDriveUI();return}
  if(me.pack.length){const tp=trailerPos();if(Math.hypot(me.x-tp.x,me.z-tp.z)<7.5*TS){cageIt();return}}
  if(world.zoo&&pickEgg())return;
  const tp=trailerPos();
  if(Math.hypot(me.x-car.x,me.z-car.z)<5.5*TS||Math.hypot(me.x-tp.x,me.z-tp.z)<5*TS){
    if(me.pack.length)releaseLeash();dismount(true);mode='car';look.yaw=0;look.pitch=-.12;footRig.visible=false;setDriveUI()}
  else toast('Walk back to your truck to get in');
}
function jump(){if(mode==='foot'&&me.ground){me.vy=6.5;me.ground=false}else if(mode==='car')toast('Jump out of the truck first!')}
function setDriveUI(){$('#eBtn').firstChild.textContent=mode==='car'?'JUMP OUT':'GET IN';const rb=$('#rideBtn');if(rb){rb.hidden=mode!=='foot'||!!(world&&(world.zoo||world.sea));rb.firstChild.textContent=me.mount?'GET OFF':'RIDE DINO'}$('#netBtn').hidden=mode==='car';$('#foodBtn').hidden=!(world&&(world.zoo||world.sea&&mode==='foot'));$('#cross').hidden=mode==='car';
  const sea=!!(world&&world.sea),sb=$('#subBtn');sb.hidden=!(sea&&mode!=='foot');sb.firstChild.textContent=mode==='sub'?'BACK TO TRUCK':'SUBMARINE';
  $('#upBtn').hidden=$('#downBtn').hidden=!(mode==='sub'||sea&&mode==='foot');$('#jumpBtn').hidden=mode==='sub';
  if(mode==='sub')$('#eBtn').firstChild.textContent='SNORKEL';else if(mode==='foot'&&sub.on)$('#eBtn').firstChild.textContent='GET IN SUB'}

/* ---------- your pet dinosaurs: they follow you, and you can ride them ---------- */
const PET_KEYS=['dino:0']; // your Velociraptor
function ensurePets(){
  if(world.pets||world.zoo||world.sea)return;world.pets=[];
  PET_KEYS.forEach((k,i)=>{const inst=ANIMALS.make(SP[k]);world.scene.add(inst.g);
    const tag=makeIcon();tag.material=tag.material.clone();tag.material.map=iconTex('🦖','#8a2a14');tag.visible=true;tag.scale.set(1.1,1.1,1);tag.position.y=inst.h+1;inst.g.add(tag);
    world.pets.push({sp:SP[k],inst,x:car.x,z:car.z,yaw:car.yaw,side:-1,fast:true,saddle:inst.h*.8,tag})});
  // your assistant comes along to help carry the animals you catch
  const ai=ANIMALS.make(personSp('staff'));world.scene.add(ai.g);world.asst={inst:ai,x:car.x,z:car.z,yaw:0,pack:[],state:'follow'};
}
function placePets(){ensurePets();if(!world.pets)return;for(const p of world.pets){const q=car.g.localToWorld(V(p.side*3.5,0,-1));p.x=q.x;p.z=q.z;p.yaw=car.yaw+Math.PI}
  const a=world.asst;if(a&&a.state==='follow'){const q=car.g.localToWorld(V(2.6,0,-.5));a.x=q.x;a.z=q.z}}
function rideToggle(){
  if(!safari.running||mode==='sub')return;if(mode==='car'){toast('Jump out of the truck first, then press R to ride a dinosaur!');return}
  if(me.mount){dismount();return}
  ensurePets();if(!world.pets){toast(world.sea?'No raptors in the Deep Blue Sea! Your Velociraptor is waiting on land.':'Your pet dinosaurs are waiting on safari!');return}
  const p=world.pets.map(p=>[p,Math.hypot(p.x-me.x,p.z-me.z)]).sort((a,b)=>a[1]-b[1])[0];
  if(p[1]>9){toast('Walk closer to your '+p[0].sp.n+' to ride it');return}
  me.mount=p[0];p[0].tag.visible=false;me.x=p[0].x;me.z=p[0].z;toast('You jumped on your '+p[0].sp.n+'! Hold Shift to go even faster. Press R to get off.');setDriveUI();
}
function dismount(quiet){if(!me.mount)return;const p=me.mount;me.mount=null;p.tag.visible=true;me.x+=Math.cos(look.yaw)*2.5;me.z-=Math.sin(look.yaw)*2.5;if(!quiet)toast('You hopped off your '+p.sp.n+'.');setDriveUI()}
function updateAssistant(dt,time){
  const a=world.asst;if(!a)return;let tx,tz,spd=0;const tp=trailerPos();
  if(a.state==='follow'){
    // when you're leading animals far from the truck, your assistant comes to take them
    if(mode==='foot'&&me.pack.length&&Math.hypot(me.x-tp.x,me.z-tp.z)>25){tx=me.x;tz=me.z;
      if(Math.hypot(a.x-me.x,a.z-me.z)<4){a.pack=me.pack;me.pack=[];a.state='carry';toast('Your assistant took the '+(a.pack.length>1?a.pack.length+' animals':a.pack[0].sp.n)+' back to the truck. Keep catching!')}}
    else if(mode==='foot'){tx=me.x+Math.cos(look.yaw)*3.5+Math.sin(look.yaw)*3;tz=me.z-Math.sin(look.yaw)*3.5+Math.cos(look.yaw)*3}
    else{const q=car.g.localToWorld(V(2.6,0,-.5));a.x=q.x;a.z=q.z;a.inst.g.visible=false;return}}
  else{tx=tp.x;tz=tp.z;if(Math.hypot(a.x-tp.x,a.z-tp.z)<7.5*TS){cageIt(a);if(a.pack.length){for(const b of a.pack){world.scene.remove(b.net);b.net=null;world.scene.remove(b.rope);b.rope=null;b.state='wander'}a.pack=[]}a.state='follow'}}
  a.inst.g.visible=true;
  const dx=tx-a.x,dz=tz-a.z,d=Math.hypot(dx,dz);if(d>1.5){spd=Math.min(a.state==='carry'?7:9,d*1.5);a.x+=dx/d*spd*dt;a.z+=dz/d*spd*dt;const ty=Math.atan2(dx,dz);let dy=ty-a.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));a.yaw+=dy*Math.min(1,dt*6)}
  ANIMALS.animate(a.inst,dt,spd,time,{});a.inst.g.position.set(a.x,HW(a.x,a.z),a.z);a.inst.g.rotation.y=a.yaw;
  if(a.pack.length)ropes(a,V(a.x,HW(a.x,a.z)+1.2,a.z));
}
function updatePets(dt,time){
  updateAssistant(dt,time);
  if(!world.pets)return;
  world.pets.forEach((p,i)=>{
    let tx,tz,spd=0;
    if(me.mount===p){const ox=p.x,oz=p.z,fw=p.fast?.4:1.6;p.x=me.x-Math.sin(look.yaw)*fw;p.z=me.z-Math.cos(look.yaw)*fw;spd=Math.hypot(p.x-ox,p.z-oz)/Math.max(dt,1e-3);p.yaw=look.yaw+Math.PI}
    else{
      // follow you, or run along behind the truck
      if(mode==='car'){const q=car.g.localToWorld(V(p.side*3.5,0,11));tx=q.x;tz=q.z}else{tx=me.x+Math.cos(look.yaw)*p.side*3.5+Math.sin(look.yaw)*3;tz=me.z-Math.sin(look.yaw)*p.side*3.5+Math.cos(look.yaw)*3}
      const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz);
      if(d>60){p.x=tx;p.z=tz}else if(d>1.5){spd=Math.min(p.fast?23:21,d*1.6);p.x+=dx/d*spd*dt;p.z+=dz/d*spd*dt;const ty=Math.atan2(dx,dz);let dy=ty-p.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));p.yaw+=dy*Math.min(1,dt*5)}}
    ANIMALS.animate(p.inst,dt,spd,time,{});
    p.inst.g.position.set(p.x,HW(p.x,p.z)+(p.inst.hop||0),p.z);p.inst.g.rotation.y=p.yaw;
  });
}

/* ---------- moving ---------- */
function updateCar(dt){
  const gas=keys.up?1:pad.gas,brk=keys.down?1:pad.brake,up=gas>.05,dn=brk>.05,turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;
  const deep=world.sea&&H(car.x,car.z)<-.9,wet=deep||inPond(car.x,car.z)&&world.c.hab!=='polar',max=deep?15:wet?7:world.zoo?34:21;
  if(up)car.v+=(car.v<0?16:8)*gas*dt;if(dn)car.v-=(car.v>0?16:7)*brk*dt;
  if(!up&&!dn)car.v*=Math.pow(.35,dt);
  car.v=clamp(car.v,-7,max);
  car.steer=lerp(car.steer,turn,Math.min(1,dt*6));
  car.yaw+=car.steer*1.05*dt*Math.min(1,Math.abs(car.v)/5)*Math.sign(car.v);
  car.x-=Math.sin(car.yaw)*car.v*dt;car.z-=Math.cos(car.yaw)*car.v*dt;
  keepIn(car);
  if(collide(car,1.7*TS)){if(Math.abs(car.v)>6)toast('Bump!');car.v*=-.25}
  const sy=Math.sin(car.yaw),cy=Math.cos(car.yaw);
  const hf=HW(car.x-sy*1.6*TS,car.z-cy*1.6*TS),hb=HW(car.x+sy*1.6*TS,car.z+cy*1.6*TS),hl=HW(car.x-cy*TS,car.z+sy*TS),hr=HW(car.x+cy*TS,car.z-sy*TS);
  car.y=(hf+hb+hl+hr)/4+(deep?Math.sin(performance.now()*.0016)*.08:0);
  const g=car.g;g.position.set(car.x,car.y+Math.sin(performance.now()*.03)*.006*Math.min(1,Math.abs(car.v)),car.z);g.rotation.set(Math.atan2(hf-hb,3.2*TS),car.yaw,Math.atan2(hr-hl,2*TS),'YXZ');
  for(const w of car.wheels)w.rotation.x-=car.v*dt/.47;
  for(const f of car.front)f.rotation.y=car.steer*.45;
  car.sw.rotation.z=car.steer*1.6;
  g.updateMatrixWorld(true);
  car.hands.forEach((h,i)=>{const hp=g.worldToLocal(h.localToWorld(V(0,-.02,.04))),sh=V(-.45+(i?.24:-.24),1.42,.25);
    setBetween(car.arms[i][0],sh,hp.clone().lerp(sh,.25));setBetween(car.arms[i][1],hp.clone().lerp(sh,.28),hp)});
}
function updateFoot(dt){
  const turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;look.yaw+=turn*2.2*dt;
  const mv=((keys.up?1:0)-(keys.down?1:0))||(pad.gas-pad.brake),run=keys.run||pad.run,spd=me.mount?(me.mount.fast?(run?22:16):(run?15:11)):(run?8:5.5);
  const deepW=world.sea&&!me.mount&&H(me.x,me.z)<-1.2,swim=deepW?.85:1;
  me.x-=Math.sin(look.yaw)*mv*spd*swim*dt;me.z-=Math.cos(look.yaw)*mv*spd*swim*dt;keepIn(me);collide(me,.5);
  const cl=o=>{const dx=me.x-o.x,dz=me.z-o.z,d=Math.hypot(dx,dz);if(d<o.r){me.x=o.x+dx/d*o.r;me.z=o.z+dz/d*o.r}};
  if(sub.on)cl({x:sub.x,z:sub.z,r:2.6});else{cl({x:car.x,z:car.z,r:2.1*TS});for(const z of[-3.2,-1.1,1.1,3.2]){const p=car.trailer.localToWorld(V(0,0,z));cl({x:p.x,z:p.z,r:1.5*TS})}}
  if(world.sea&&!me.mount&&H(me.x,me.z)<-1.2){const vy=(keys.rise||pad.rise?1:0)-(keys.run||keys.dive||pad.dive?1:0);me.y=clamp(me.y+vy*2.6*dt,H(me.x,me.z)+.2,-1.15);me.vy=0;me.ground=true}
  else{const gh=HW(me.x,me.z);me.vy-=18*dt;me.y+=me.vy*dt;if(me.y<=gh){me.y=gh;me.vy=0;me.ground=true}}
  if(mv&&me.ground)me.bob+=dt*spd*1.6;
  ropes(me,cam.localToWorld(V(.26,-.35,-.5)));
}
function ropes(own,hand){own.pack.forEach((a,i)=>{if(!a.rope)return;const pts=a.rope.geometry.attributes.position,lead=i?own.pack[i-1]:null,hp=lead?V(lead.x,lead.m.g.position.y+lead.m.h*.5,lead.z):hand;
    pts.setXYZ(0,hp.x,hp.y,hp.z);pts.setXYZ(1,a.x,a.m.g.position.y+a.m.h*.6,a.z);pts.needsUpdate=true});
}
function placeCamera(){
  if(mode==='sub'){const yaw=sub.yaw+look.yaw,back=V(Math.sin(yaw),0,Math.cos(yaw));
    cam.position.set(sub.x+back.x*11,sub.y+3.2-look.pitch*6,sub.z+back.z*11);cam.lookAt(sub.x-back.x*4,sub.y+.6,sub.z-back.z*4);underwater()}
  else if(mode==='car'){cam.position.copy(car.g.localToWorld(V(-.45,2.08,.42)));
    cam.quaternion.copy(car.g.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(look.pitch,look.yaw,0,'YXZ')))}
  else{cam.position.set(me.x,me.y+1.65+(me.mount?me.mount.saddle-.6:0)+Math.sin(me.bob)*(me.mount?.12:.05),me.z);cam.rotation.set(look.pitch,look.yaw,0,'YXZ');footRig.position.y=-.12+Math.sin(me.bob*2)*.01}
  const fx=mode==='car'?car.x:me.x,fz=mode==='car'?car.z:me.z;world.sky.follow(fx,H(fx,fz),fz);
  if(mode!=='sub')underwater();
}
const safari={running:false,
  frame(dt,time){
    // move in small steps so the jeep keeps full speed even when the computer draws few pictures a second
    const n=Math.min(8,Math.ceil(dt/(1/30))),h=dt/n;
    if(mode==='sub'){for(let i=0;i<n;i++)updateSub(h)}
    else if(mode==='car'){for(let i=0;i<n;i++)updateCar(h);if(!look.drag){look.idle+=dt;if(look.idle>2.5&&Math.abs(car.v)>2){look.yaw*=Math.pow(.2,dt);look.pitch=lerp(look.pitch,-.12,dt*2)}}}
    else{car.g.updateMatrixWorld(true);for(let i=0;i<n;i++)updateFoot(h)}
    updateAnimals(dt,time);updatePets(dt,time);placeCamera();updateNet(dt);if(world.treasure)updateTreasure(dt,time);
    for(const a of car.caged||[])ANIMALS.animate(a,dt,0,time,{});
    if(world.tick)world.tick(dt,time);
    if(world.grass)world.grass.userData.update(cam.position,time,world.scene.fog,world.sky.sunDir);
    for(const w of world.waters){w.userData.water.offset.x+=dt*.015;w.userData.water.offset.y+=dt*.01}
    R.render(world.scene,cam);hud();
  }};

/* ---------- HUD ---------- */
let hudT=0;
function hud(){
  const tag=$('#tag'),pr=$('#prompt');let target=null;
  if(mode==='foot'||mode==='sub')target=aimTarget();
  else{let bd=60;for(const a of world.animals){const d=Math.hypot(a.x-car.x,a.z-car.z);if(d<bd&&!(a.sp.def.mate&&d>22&&a.state!=='follow')){const v=V(a.x,a.m.g.position.y+a.m.h,a.z).project(cam);if(v.z<1&&Math.abs(v.x)<.8&&Math.abs(v.y)<.9){bd=d;target={a,dist:d}}}}}
  $('#cross').classList.toggle('on',!!(target&&(mode==='foot'&&target.dist<=16||mode==='sub'&&target.dist<=26)));
  if(target){const a=target.a,v=V(a.x,a.m.g.position.y+a.m.h+.4,a.z).project(cam);
    tag.hidden=false;tag.style.left=((v.x+1)/2*innerWidth)+'px';tag.style.top=((1-v.y)/2*innerHeight)+'px';
    const st=a.state==='flee'?'<small>Running away! Let it get tired</small>':a.state==='tired'?'<small>Tired! Throw now!</small>':a.state==='netted'?'<small>In your net</small>':'';
    tag.innerHTML=`<span class="${a.sp.r===3?'r3':''}">${a.sp.n} · ${RAR[a.sp.r]}</span> · ${Math.round(target.dist)} m${st}`}
  else tag.hidden=true;
  let msg;
  if(mode==='sub')msg=target&&target.dist<=26?`Press <b>F</b> to catch the ${target.a.sp.n}!`:'🚢 <b>W</b> go · <b>A D</b> turn · <b>Space</b> up · <b>Shift</b> dive · <b>F</b> catch · <b>E</b> snorkel · <b>B</b> truck';
  else if(world.zoo)msg=foodHint()||eggHint()||(mode==='car'?'<b>W A S D</b> to drive · go through a doorway to drive inside a dome · <b>G</b> food':'Walk around · <b>Space</b> jump · <b>E</b> by the truck to get in');
  else if(mode==='car')msg=target&&target.dist<30?`A <b>${target.a.sp.n}</b>! Stop and press <b>E</b> to jump out`:'<b>W A S D</b> to drive · drag to look around · find an animal';
  else if(me.pack.length){const tp=trailerPos(),n=me.pack.length,nm=n>1?n+' animals':'the '+me.pack[0].sp.n;msg=Math.hypot(me.x-tp.x,me.z-tp.z)<7.5*TS?`Press <b>E</b> to put ${nm} in the cages`:`Leading <b>${nm}</b> (${n}/${PACK}) · catch more with <b>F</b> or walk back to the cages`}
  else if(world.sea&&H(me.x,me.z)<-1.2&&!target)msg='🤿 Swimming! <b>Space</b> up · <b>Shift</b> dive · <b>F</b> net · <b>E</b> by the '+(sub.on?'submarine':'truck')+' to get in';
  else msg=target?(target.dist<=16?`Press <b>F</b> to throw your net at the ${target.a.sp.n}`:`Walk closer to the ${target.a.sp.n}`):'Look at an animal · <b>F</b> net · <b>Space</b> jump · <b>E</b> by the truck to get in';
  if(pr.dataset.m!==msg){pr.innerHTML=msg;pr.dataset.m=msg}
  if((hudT++)%3)return;
  const c=$('#mm').getContext('2d'),W=280,k=W/2/90,cx=mode==='car'?car.x:me.x,cz=mode==='car'?car.z:me.z;
  c.save();c.clearRect(0,0,W,W);c.beginPath();c.arc(W/2,W/2,W/2,0,7);c.clip();
  c.fillStyle=world.sea?world.E.water:world.E.ground;c.fillRect(0,0,W,W);
  if(world.islands){c.fillStyle=world.E.ground;for(const I of world.islands){c.beginPath();c.arc(W/2+(I.x-cx)*k,W/2+(I.z-cz)*k,I.r*.95*k,0,7);c.fill()}}
  if(world.domes)for(const d of world.domes){c.fillStyle='rgba(220,240,255,.55)';c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.arc(W/2+(d.x-cx)*k,W/2+(d.z-cz)*k,d.r*k,0,7);c.fill();c.stroke()}
  if(world.zoo)for(const o of zoo.animals){c.fillStyle='#1d2116';c.beginPath();c.arc(W/2+(o.x-cx)*k,W/2+(o.z-cz)*k,5,0,7);c.fill()}
  c.fillStyle=world.E.water;for(const p of world.ponds){c.beginPath();c.arc(W/2+(p.x-cx)*k,W/2+(p.z-cz)*k,p.r*k,0,7);c.fill()}
  for(const a of world.animals){if(a.sp.def.mate&&a.state!=='follow')continue;c.fillStyle=a.sp.def.mate?'#ff4fa3':a.sp.r===3?'#ffc93c':a.sp.r===2?'#d4602f':'#1d2116';c.beginPath();c.arc(W/2+(a.x-cx)*k,W/2+(a.z-cz)*k,a.sp.r===3?9:7,0,7);c.fill();if(a.sp.r===3){c.strokeStyle='#fff';c.lineWidth=2;c.stroke()}}
  const arrow=(x,z,yaw,col)=>{c.save();c.translate(W/2+(x-cx)*k,W/2+(z-cz)*k);c.rotate(-yaw);c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(0,-14);c.lineTo(10,10);c.lineTo(0,5);c.lineTo(-10,10);c.closePath();c.fill();c.stroke();c.restore()};
  if(!sub.on)arrow(car.x,car.z,car.yaw,'#d38a2c');if(mode==='foot')arrow(me.x,me.z,look.yaw,'#2f6fa8');if(mode==='sub')arrow(sub.x,sub.z,sub.yaw,'#ffcf1f');
  c.restore();
}

/* ---------- the submarine that rides on your truck in the Deep Blue Sea ---------- */
const sub={on:false,g:null,x:0,y:-2,z:0,yaw:0,v:0,prop:null};
function subModel(){
  const g=new T.Group(),yel=new T.MeshPhysicalMaterial({color:'#ffcf1f',roughness:.3,metalness:.2,clearcoat:.8}),dark=new T.MeshStandardMaterial({color:'#2a2e33',metalness:.6,roughness:.4});
  const glass=new T.MeshPhysicalMaterial({color:'#9fe6ff',roughness:.02,metalness:.1,transmission:.4,transparent:true,opacity:.6,emissive:'#3ab8ff',emissiveIntensity:.35});
  const add=(geo,m,x,y,z,rx=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.rotation.x=rx;o.castShadow=true;g.add(o);return o};
  const body=new T.CapsuleGeometry(1.1,3.6,8,24);body.rotateX(Math.PI/2);add(body,yel,0,1.2,0);
  add(new T.CylinderGeometry(.55,.7,1.1,20),yel,0,2.6,.5);add(new T.CylinderGeometry(.06,.06,1,8),dark,.2,3.4,.6);add(new T.BoxGeometry(.1,.1,.4),dark,.2,3.9,.75);
  const dome=new T.SphereGeometry(.95,24,16,0,Math.PI*2,0,Math.PI/2);dome.rotateX(Math.PI/2);add(dome,glass,0,1.25,2.55);
  for(const sx of[-1,1])for(let i=0;i<3;i++){const z=1-i*1.1,r=add(new T.TorusGeometry(.28,.06,8,20),dark,sx*1.08,1.35,z);r.rotation.y=Math.PI/2;const w=add(new T.CircleGeometry(.26,16),glass,sx*1.09,1.35,z);w.rotation.y=sx*Math.PI/2}
  for(const sx of[-1,1]){add(new T.BoxGeometry(.9,.08,.6),yel,sx*1.3,1.1,-2);add(new T.SphereGeometry(.16,10,8),new T.MeshBasicMaterial({color:'#fffbe0'}),sx*.55,.75,2.75)}
  add(new T.BoxGeometry(.08,1.2,.7),yel,0,1.9,-2.2);
  const prop=new T.Group();prop.position.set(0,1.2,-3.05);g.add(prop);for(let i=0;i<3;i++){const b=new T.Mesh(new T.BoxGeometry(.12,.75,.05),dark);b.position.y=.35;const p=new T.Group();p.rotation.z=i*Math.PI*2/3;p.add(b);prop.add(p)}
  g.userData.prop=prop;return g;
}
function buildReef(scene,r){
  // coral and seaweed on the sea floor for the submarine to explore
  const kinds=[[new T.ConeGeometry(.5,2.2,6),['#ff6fa8','#ff8a3a','#b45aff','#ffd23a']],[new T.SphereGeometry(.9,10,8),['#ff5a7a','#ffa0d0','#7ad0ff']],[new T.CylinderGeometry(.05,.12,3.5,5),['#2f9a4a','#4ab85a']]];
  const m4=new T.Matrix4(),q=new T.Quaternion(),col=new T.Color();
  kinds.forEach(([geo,cols],ki)=>{if(ki<2)geo.translate(0,ki?.3:1.1,0);else geo.translate(0,1.75,0);const n=ki===2?900:500,im=new T.InstancedMesh(geo,new T.MeshStandardMaterial({roughness:.7}),n);let j=0;
    for(let t=0;t<n*6&&j<n;t++){const x=(r()-.5)*WS*1.1,z=(r()-.5)*WS*1.1,h=H(x,z);if(h>-1.6||h<-7.5)continue;
      q.setFromEuler(new T.Euler((r()-.5)*.4,r()*6.28,(r()-.5)*.4));const s=.6+r()*1.2;m4.compose(V(x,h,z),q,V(s,s*(.7+r()*.8),s));im.setMatrixAt(j,m4);im.setColorAt(j,col.set(cols[Math.floor(r()*cols.length)]));j++}
    im.count=j;scene.add(im)});
}
// gold coins and treasure chests hidden under the sea and on the beaches
function buildTreasure(scene,r){
  world.treasure=[];
  const gold=new T.MeshStandardMaterial({color:'#ffd23a',metalness:1,roughness:.2,emissive:'#a87a10',emissiveIntensity:.5});
  const coinG=new T.CylinderGeometry(.55,.55,.12,24);coinG.rotateX(Math.PI/2);
  const wood=new T.MeshStandardMaterial({color:'#6a4426',roughness:.8});
  const put=(kind,test,n)=>{for(let t=0;t<n*40&&world.treasure.filter(q=>q.kind===kind).length<n;t++){const x=(r()-.5)*WS*1.1,z=(r()-.5)*WS*1.1,h=H(x,z);if(!test(h))continue;
    const g=new T.Group();g.position.set(x,h+.7,z);scene.add(g);
    if(kind==='chest'){const b=new T.Mesh(new T.BoxGeometry(1.6,.9,1),wood);b.position.y=-.2;b.castShadow=true;g.add(b);const lid=new T.Mesh(new T.CylinderGeometry(.5,.5,1.6,12,1,false,0,Math.PI),wood);lid.rotation.z=Math.PI/2;lid.position.y=.25;g.add(lid);
      for(let i=0;i<5;i++){const c=new T.Mesh(coinG,gold);c.position.set((i-2)*.25,.35,(i%2-.5)*.3);c.rotation.x=1.2;g.add(c)}}
    else{const c=new T.Mesh(coinG,gold);c.castShadow=true;g.add(c)}
    world.treasure.push({kind,g,x,y:h+.7,z,val:kind==='chest'?500:50})}};
  put('coin',h=>h<-1.8,30);put('coin',h=>h>.6&&h<2.2,12);put('chest',h=>h<-4,5);
}
function updateTreasure(dt,time){
  const p=mode==='sub'?V(sub.x,sub.y,sub.z):mode==='car'?V(car.x,car.y+1,car.z):V(me.x,me.y+1,me.z),reach=mode==='foot'?2.5:4.5;
  for(const q of world.treasure.slice()){if(q.kind==='coin')q.g.rotation.y=time*2+q.x;q.g.position.y=q.y+Math.sin(time*1.5+q.z)*.15;
    if(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<reach){world.scene.remove(q.g);world.treasure.splice(world.treasure.indexOf(q),1);S.coins+=q.val;save();coins();
      toast(q.kind==='chest'?'🏴‍☠️ You found a TREASURE CHEST! +500 coins!':'🪙 You found a gold coin! +50 ('+world.treasure.filter(t=>t.kind==='coin').length+' left to find)')}}
}
// hold out food and the Mummy Dreams come to you
function callDreams(){
  if(mode!=='foot'){toast('Jump out first, then press G to hold out food for the Mummy Dreams!');return}
  if(DREAM.every(owns)){toast('Both Mummy Dreams are already in your zoo!');return}
  // if they are not here, they fly in straight away
  if(!world.animals.some(a=>a.sp.def.mate))spawnAnimal(true,SP[DREAM[0]]);
  const d=world.animals.filter(a=>a.sp.def.mate&&a.state!=='netted');if(!d.length)return;
  const f=truckFood();if(f.hay>0){f.hay--;save()}
  for(const a of d){a.state='follow';a.followT=90;a.vx=a.vz=0}
  toast('🌾 You hold out some yummy food… 💖💙 The Mummy Dreams smelled it and are coming to you! They will follow you, so catch them!',7000);
}
function toggleSub(){
  if(!safari.running||!world.sea)return;
  if(mode==='sub'){
    // back to the truck
    // the submarine turns back into your truck, floating on the water
    world.scene.remove(sub.g);sub.on=false;car.g.visible=true;car.x=sub.x;car.z=sub.z;car.yaw=sub.yaw;car.v=0;mode='car';me.x=car.x;me.z=car.z;look.yaw=0;look.pitch=-.12;setDriveUI();toast('🚚 Your submarine turned back into your truck!');return}
  if(mode==='foot'&&sub.on){toast('Swim back to your submarine and press E to get in');return}
  if(mode!=='car'){toast('Get in your truck first, then turn it into a submarine!');return}
  if(H(car.x,car.z)>-1){toast('Drive the truck into the deep blue water, then turn it into a submarine!');return}
  if(!sub.g)sub.g=subModel();world.scene.add(sub.g);sub.on=true;car.g.visible=false;
  sub.x=car.x;sub.z=car.z;sub.yaw=car.yaw;sub.v=0;sub.y=-1.2;car.v=0;
  mode='sub';me.x=sub.x;me.z=sub.z;look.yaw=0;look.pitch=0;setDriveUI();
  toast('🚢 Your truck turned into a submarine! W to go, A D to turn, Space up, Shift dive, F to catch fish, E to jump out snorkelling!',7000);
}
function updateSub(dt){
  const gas=keys.up?1:pad.gas,brk=keys.down?1:pad.brake,turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;
  if(gas>.05)sub.v+=6*gas*dt;if(brk>.05)sub.v-=6*brk*dt;if(gas<=.05&&brk<=.05)sub.v*=Math.pow(.4,dt);sub.v=clamp(sub.v,-4,11);
  sub.yaw+=turn*1.1*dt;
  const ox=sub.x,oz=sub.z;sub.x-=Math.sin(sub.yaw)*sub.v*dt;sub.z-=Math.cos(sub.yaw)*sub.v*dt;keepIn(sub);
  if(H(sub.x,sub.z)>sub.y-1.1){sub.x=ox;sub.z=oz;if(Math.abs(sub.v)>3)toast('Bonk! The submarine hit the sea floor.');sub.v*=-.3}
  const vy=(keys.rise||pad.rise?1:0)-(keys.run||keys.dive||pad.dive?1:0);sub.y=clamp(sub.y+vy*3.2*dt,H(sub.x,sub.z)+1.1,-.9);
  me.x=sub.x;me.z=sub.z;car.x=sub.x;car.z=sub.z;car.yaw=sub.yaw;
  const g=sub.g;g.position.set(sub.x,sub.y-1.2+Math.sin(performance.now()*.002)*.05,sub.z);g.rotation.set(0,sub.yaw+Math.PI,0);g.rotation.z=-turn*.12*Math.min(1,Math.abs(sub.v)/4);
  g.userData.prop.rotation.z+=sub.v*dt*3;
}
// the world turns deep blue when the camera goes under the water
function underwater(){
  const f=world.scene.fog,u=world.sea&&cam.position.y<-.05;if(!world.fog0)world.fog0={c:f.color.clone(),n:f.near,x:f.far,b:world.scene.background.clone()};
  if(u){const d=clamp(-cam.position.y/7,0,1);f.color.set('#1a7fa8').lerp(new T.Color('#06304f'),d);f.near=1;f.far=70-d*30;world.scene.background.copy(f.color)}
  else{f.color.copy(world.fog0.c);f.near=world.fog0.n;f.far=world.fog0.x;world.scene.background.copy(world.fog0.b)}
  world.sky.sky.visible=!u;const el=$('#under');if(el&&el.hidden===u)el.hidden=!u;
  const sn=world.sea&&mode==='foot'&&!me.mount&&H(me.x,me.z)<-.4,se=$('#snorkel');if(se&&se.hidden===sn)se.hidden=!sn;
  if(footRig&&footRig.userData.sleeve)footRig.userData.sleeve.color.set(world.sea?'#1d4f8a':'#5f6a40');
}
