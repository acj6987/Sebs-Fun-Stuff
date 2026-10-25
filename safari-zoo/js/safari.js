// The safari: terrain, the jeep with your hands on the wheel, walking, catching and caging animals.
const WS=640,HALF=WS/2,LIMIT=HALF-45;
const keys={};
const look={yaw:0,pitch:-.12,drag:null,idle:0};
let mode='car',world=null,safariScene=null;
const car={x:0,z:0,y:0,yaw:0,v:0,steer:0,g:null};
const me={x:0,z:0,y:0,vy:0,ground:true,bob:0,pack:[]};const PACK=5,MAXPACK=14;

function baseH(x,z){return 2.4*Math.sin(x*.012)*Math.cos(z*.010)+1.3*Math.sin(x*.029+z*.018)+.55*Math.sin(x*.071)*Math.sin(z*.063)+1.8*Math.sin(x*.004+1)*Math.cos(z*.005+.4)}
function H(x,z){if(world.flat)return 0;let h=baseH(x,z);
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
  world={c,E,scene,ponds:[],cols:new Map(),animals:[],net:null,respawn:[],waters:[]};
  world.sky=NATURE.setupSky(R,scene,E);
  const np=c.hab==='polar'?7:c.hab==='outback'?3:5;
  for(let i=0;i<np;i++){const x=(r()-.5)*(WS-160),z=(r()-.5)*(WS-160);if(Math.hypot(x,z)<60){i--;continue}const rr=14+r()*22;world.ponds.push({x,z,r:rr,lvl:baseH(x,z)-.35})}
  progress('Shaping the land…');await nextFrame();
  // terrain
  const SZ=WS+560,seg=220,geo=new T.PlaneGeometry(SZ,SZ,seg,seg);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,cols=new Float32Array(pos.count*3),cg=new T.Color(E.ground),cp=new T.Color(E.patch),cr=new T.Color(E.rock),cs=new T.Color('#f4f7fa'),wet=new T.Color(E.patch).multiplyScalar(.55),tmp=new T.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=H(x,z);pos.setY(i,h);
    const n=MESHER.fbm(x*.02,0,z*.02);tmp.copy(cg).lerp(cp,clamp((n-.35)*2.2,0,1));
    if(h>8)tmp.lerp(cr,sm(8,26,h));if(h>50&&c.hab!=='outback')tmp.lerp(cs,sm(50,85,h));
    for(const p of world.ponds){const dd=Math.hypot(x-p.x,z-p.z);if(dd<p.r*1.35)tmp.lerp(c.hab==='polar'?cr:wet,(1-sm(p.r*.9,p.r*1.35,dd))*.8)}
    const j=.92+MESHER.noise3(x*.3,1,z*.3)*.16;cols.set([tmp.r*j*1.18,tmp.g*j*1.18,tmp.b*j*1.18],i*3)}
  geo.setAttribute('color',new T.BufferAttribute(cols,3));geo.computeVertexNormals();
  const gt=NATURE.groundTextures(c.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(SZ/7,SZ/7);nm.repeat.set(SZ/7,SZ/7);
  const ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,map,normalMap:nm,normalScale:new T.Vector2(.9,.9),roughness:c.hab==='polar'?.55:1,envMapIntensity:.6}));
  ground.receiveShadow=true;scene.add(ground);
  for(const p of world.ponds){const w=NATURE.waterMesh(p.r*1.1,E.water);w.position.set(p.x,p.lvl,p.z);scene.add(w);world.waters.push(w)}
  if(c.hab==='dino')addVolcano(scene);
  progress('Growing trees…');await nextFrame();
  const types=NATURE.treeTypes(c.hab);
  const place=rr=>{const x=(rr()-.5)*(WS+380),z=(rr()-.5)*(WS+380);if(Math.hypot(x,z)<28||inPond(x,z))return null;
    if(Math.max(Math.abs(x),Math.abs(z))>HALF+40&&rr()<.55)return null;return V(x,H(x,z),z)};
  const count={rainforest:2600,jungle:2000,woodland:2000,savanna:1500,outback:1300,polar:800}[c.hab];
  NATURE.scatter(scene,types,Math.round(count*QUALITY.trees),place,r).forEach(addCol);
  world.grass=NATURE.makeGrass(E,world.ponds,{half:HALF});if(world.grass)scene.add(world.grass);
  buildCar(scene);buildFootRig();scene.add(cam);
  // build each animal shape once, showing progress
  const list=c.animals.map((a,i)=>SP[c.id+':'+i]).concat(S.cages.map(x=>SP[x.k]));
  for(let i=0;i<list.length;i++){if(!ANIMALS.isBuilt(list[i])){progress('Waking up the animals… '+(i+1)+'/'+list.length);await nextFrame();ANIMALS.species(list[i])}}
  refreshCages();
  // one group of every kind of animal first, then extra ones
  c.animals.forEach((x,i)=>spawnAnimal(true,SP[c.id+':'+i]));
  while(world.animals.length<40)spawnAnimal(true);
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
function buildCar(scene){
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
  car.slots=[];car.pens=[];
  for(const z of[-3.4,-2.05,-.7])for(const x of[-.55,.55]){const cg=new T.Group();cg.position.set(x,.9,z);tr.add(cg);buildCage(cg);const hold=new T.Group();cg.add(hold);car.slots.push(hold)}
  for(const x of[-.56,.56]){const cg=new T.Group();cg.position.set(x,.9,2.2);tr.add(cg);buildCage(cg,1.06,1.35,3.6);const hold=new T.Group();cg.add(hold);car.pens.push(hold)}
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
  const w=list.map(s=>[0,7,3,1.2][s.r]),tot=w.reduce((a,b)=>a+b);
  let k=Math.random()*tot,sp=force||list[0];if(!force)for(let i=0;i<list.length;i++){k-=w[i];if(k<0){sp=list[i];break}}
  let x,z,tries=0;do{x=(Math.random()-.5)*2*(LIMIT-15);z=(Math.random()-.5)*2*(LIMIT-15);tries++}
  while(tries<50&&(inPond(x,z)||Math.hypot(x-me.x,z-me.z)<(initial?45:110)||Math.hypot(x-car.x,z-car.z)<(initial?45:110)));
  if(initial&&world.animals.length<4){const a=Math.random()*6.28,d=45+Math.random()*30;x=Math.sin(a)*d;z=-Math.cos(a)*d}
  // animals that live together come as a herd, pride or pack
  const hd=sp.def.herd,n=hd?hd[0]+Math.floor(Math.random()*(hd[1]-hd[0]+1)):1;
  const grp=n>1?{id:grpId++,members:[],fleeT:0}:null;
  for(let i=0;i<n;i++){
    const m=ANIMALS.make(sp);world.scene.add(m.g);const icon=makeIcon();m.g.add(icon);icon.position.y=m.h+.7;
    const sp2=Math.max(2.5,m.rad*2.6),ox=i?(Math.random()-.5)*sp2*2.4:0,oz=i?(Math.random()-.5)*sp2*2.4:0;
    const a={sp,x:x+ox,z:z+oz,ox,oz,vx:0,vz:0,yaw:Math.random()*6.3,t:0,state:'wander',stam:1,tired:0,alt:0,graze:0,m,icon,far:false,grp};
    if(grp)grp.members.push(a);world.animals.push(a);
  }
}
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
      const i=me.pack.indexOf(a),lead=i>0?me.pack[i-1]:me,gap=i>0?2.2+a.m.rad+lead.m.rad:3.2,td=Math.hypot(lead.x-a.x,lead.z-a.z);
      if(mode==='foot'&&td>gap){const s=Math.min(7,(td-gap+.2)*2.2);a.vx=(lead.x-a.x)/td*s;a.vz=(lead.z-a.z)/td*s}else{a.vx*=.8;a.vz*=.8}}
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
    else if(a.state==='rest'){a.vx*=.9;a.vz*=.9;if((a.restT-=dt)<=0){a.state='wander';a.graze=0}}
    else if(a.state==='tired'){a.tired-=dt;a.vx*=.9;a.vz*=.9;a.stam=Math.min(1,a.stam+dt*.2);if(a.tired<=0){a.state='wander';a.stam=1}}
    else{const scareR=r===3?(mode==='car'?28:20):r===2?(mode==='car'?20:14):0;
      const herdRun=G&&G.fleeT>0&&r>=2;
      if(r>=2&&(d<scareR||herdRun)&&a.stam>0){if(G&&d<scareR)G.fleeT=3;
        const chase=a.sp.def.chase&&d>4;if(chase&&a.state!=='flee'&&mode==='foot')toast('ROAR! The '+a.sp.n+' is chasing you! Run back to the truck!');
        a.state='flee';const fs=Math.max(a.sp.s*2.4,r===3?9.5:7)*(a.sp.def.chase?.62:1),dir=a.sp.def.chase?-1:1;a.vx=(a.x-px)/d*fs*dir;a.vz=(a.z-pz)/d*fs*dir;if(a.sp.def.chase&&d<4){a.vx*=.1;a.vz*=.1}a.stam-=dt/(r===3?4.5:3.5);a.graze=0;
        if(a.stam<=0){a.state='tired';a.tired=6;if(d<45&&(!G||G.members[0]===a))toast('The '+a.sp.n+(G?'s are':' is')+' tired! Quick, throw your net!')}}
      else{if(a.state==='flee')a.state='wander';a.stam=Math.min(1,a.stam+dt*.15);
        const lead=G&&G.members[0];
        if(lead&&lead!==a){
          // herd members stay close to their leader
          const tx=lead.x+a.ox,tz=lead.z+a.oz,ex=tx-a.x,ez=tz-a.z,ed=Math.hypot(ex,ez);
          if(ed>1.2){const s=Math.min(a.sp.s*1.5,ed*.7);a.vx=ex/ed*s;a.vz=ez/ed*s;a.graze=0}else{a.vx*=.9;a.vz*=.9;a.graze=lead.graze}}
        else{a.t-=dt;if(a.t<=0){a.t=2+Math.random()*4;
          if(Math.random()<.4){a.vx=a.vz=0;a.graze=a.m.A.graze?1:0}else{a.graze=0;const ang=Math.random()*6.283,s=a.sp.s*(.35+Math.random()*.5);a.vx=Math.sin(ang)*s;a.vz=Math.cos(ang)*s}}}}}
    if(Math.abs(a.x)>LIMIT-5)a.vx=-Math.sign(a.x)*Math.abs(a.vx||1);
    if(Math.abs(a.z)>LIMIT-5)a.vz=-Math.sign(a.z)*Math.abs(a.vz||1);
    a.x+=a.vx*dt;a.z+=a.vz*dt;const spd=Math.hypot(a.vx,a.vz);
    if(spd>.15){const ty=Math.atan2(a.vx,a.vz);let dy=ty-a.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));a.yaw+=dy*Math.min(1,dt*5)}
    a.alt=lerp(a.alt,a.m.A.fly&&(a.state==='flee'||a.state==='chased')?7:0,Math.min(1,dt*1.5));
    // far animals: simpler model, very far: hidden
    const vis=d<260;a.m.g.visible=vis;if(!vis)continue;
    const far=d>50;if(far!==a.far){a.far=far;ANIMALS.setLOD(a.m,far)}
    ANIMALS.animate(a.m,dt,a.state==='caught'?0:spd,time,{graze:a.graze,alt:a.alt});
    const g=a.m.g;g.position.set(a.x,H(a.x,a.z)+a.alt+(a.m.hop||0),a.z);g.rotation.y=a.yaw;
    const ic=a.icon;if(a.state==='flee'||a.state==='chased'){ic.visible=true;ic.material.map=ICON.run}else if(a.state==='tired'){ic.visible=true;ic.material.map=ICON.tired}else ic.visible=false;
    if(a.net){a.net.position.set(a.x,g.position.y+a.m.h*.45,a.z);const s=Math.max(a.m.rad,a.m.h*.6)*1.15;a.net.scale.set(s,s,s)}
  }
  world.respawn=world.respawn.map(t=>t-dt).filter(t=>t>0||(world.animals.length<38&&spawnAnimal(false),false));
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
  if(t.dist>16){toast('Too far away! Get closer to the '+t.a.sp.n);return}
  const a=t.a,dur=.45,tx=a.x+a.vx*dur,tz=a.z+a.vz*dur;
  world.net={a,t:0,dur,start:cam.position.clone().add(V(.3,-.2,0).applyQuaternion(cam.quaternion)),end:V(tx,H(tx,tz)+a.alt+a.m.h*.5,tz),mesh:makeNetMesh()};
  netRig.visible=false;
}
function updateNet(dt){
  const n=world.net;if(!n)return;n.t+=dt;const p=Math.min(1,n.t/n.dur);
  n.mesh.position.lerpVectors(n.start,n.end,p);n.mesh.position.y+=Math.sin(p*Math.PI)*2;n.mesh.rotation.x+=dt*8;n.mesh.scale.setScalar(.4+p*.8);
  if(p<1)return;
  world.scene.remove(n.mesh);world.net=null;netRig.visible=true;
  const a=n.a,ok=world.animals.includes(a)&&Math.hypot(a.x-n.end.x,a.z-n.end.z)<Math.max(1.6,a.m.rad*1.3)&&a.alt<2.5;
  if(ok){const netOne=b=>{b.state='netted';b.vx=b.vz=0;b.alt=0;b.icon.visible=false;me.pack.push(b);
      const net=new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshBasicMaterial({color:'#efe4c8',wireframe:true}));world.scene.add(net);b.net=net;
      b.rope=new T.Line(new T.BufferGeometry().setFromPoints([V(0,0,0),V(0,0,0)]),new T.LineBasicMaterial({color:'#e8d9b0'}));b.rope.frustumCulled=false;world.scene.add(b.rope)};
    netOne(a);
    const mates=a.grp?a.grp.members.filter(m=>m!==a&&world.animals.includes(m)&&m.state!=='netted'&&m.state!=='caught'):[];
    mates.slice(0,MAXPACK-me.pack.length).forEach(netOne);
    if(mates.length)toast('You netted a '+a.sp.n+' and the whole '+(a.sp.def.hunts?'pack':'herd')+' comes with it! '+(mates.length+1)+' '+a.sp.n+'s. Lead them to the big pens on your truck.');
    else toast('You netted a '+a.sp.n+'! ('+me.pack.length+'/'+PACK+') '+(me.pack.length<PACK?'Catch more, or lead them to the cages on your truck.':'Now lead them to the cages on your truck.'))}
  else toast(a.state==='flee'?'Missed! It\'s too fast. Wait until it gets tired.':'Missed! Try again.');
}
function trailerPos(){return car.trailer.localToWorld(V(0,0,0))}
function cageIt(){
  if(!me.pack.length)return;
  const names=[],caged=[];let coinsWon=0,fresh=false;
  const store=(a,pen)=>{if(!S.dex[a.sp.k])fresh=true;S.dex[a.sp.k]=(S.dex[a.sp.k]||0)+1;S.cages.push(pen==null?{uid:S.uid++,k:a.sp.k}:{uid:S.uid++,k:a.sp.k,pen});
    coinsWon+=VALUE[a.sp.r];names.push(a.sp.n);caged.push(a)};
  // whole herds and packs go into a big pen together
  const groups=new Map();for(const a of me.pack)if(a.grp){if(!groups.has(a.grp))groups.set(a.grp,[]);groups.get(a.grp).push(a)}
  for(const[g,list]of groups){if(list.length<2)continue;const used=new Set(S.cages.filter(c=>c.pen!=null).map(c=>c.pen));
    let pen=-1;for(let i=0;i<PENS;i++)if(!used.has(i)){pen=i;break}if(pen<0)break;
    list.slice(0,PEN_SIZE).forEach(a=>store(a,pen))}
  for(const a of me.pack)if(!caged.includes(a)&&smallUsed()<CAGES)store(a,null);
  if(!caged.length){toast('The cages and pens are full! Drive to the zoo to empty them.');return}
  me.pack=me.pack.filter(a=>!caged.includes(a));
  for(const a of caged){world.scene.remove(a.net);world.scene.remove(a.rope);removeAnimal(a)}
  S.coins+=coinsWon;save();refreshCages();
  const count={};names.forEach(n=>count[n]=(count[n]||0)+1);
  toast((fresh?'NEW ANIMAL! ':'')+Object.entries(count).map(([n,c])=>c>1?c+' '+n+'s':n).join(', ')+' in the truck · +'+coinsWon+' coins'+(me.pack.length?' · No room for '+me.pack.length+' more!':''));
}
function releaseLeash(){if(!me.pack.length)return;for(const a of me.pack){world.scene.remove(a.net);a.net=null;world.scene.remove(a.rope);a.rope=null;a.state='wander'}
  toast(me.pack.length>1?'Your animals wriggled out of the nets!':'The '+me.pack[0].sp.n+' wriggled out of the net!');me.pack=[]}
function pressE(){
  if(!safari.running)return;
  if(mode==='car'){
    if(Math.abs(car.v)>3){toast('Slow down to jump out!');return}
    const p=car.g.localToWorld(V(-2.1,0,-.3));me.x=p.x;me.z=p.z;collide(me,.5);me.y=H(me.x,me.z);me.vy=0;
    look.yaw=car.yaw+look.yaw;mode='foot';car.v=0;footRig.visible=true;netRig.visible=true;setDriveUI();return}
  if(me.pack.length){const tp=trailerPos();if(Math.hypot(me.x-tp.x,me.z-tp.z)<7.5){cageIt();return}}
  const tp=trailerPos();
  if(Math.hypot(me.x-car.x,me.z-car.z)<5.5||Math.hypot(me.x-tp.x,me.z-tp.z)<4){
    if(me.pack.length)releaseLeash();mode='car';look.yaw=0;look.pitch=-.12;footRig.visible=false;setDriveUI()}
  else toast('Walk back to your truck to get in');
}
function jump(){if(mode==='foot'&&me.ground){me.vy=6.5;me.ground=false}else if(mode==='car')toast('Jump out of the truck first!')}
function setDriveUI(){$('#eBtn').firstChild.textContent=mode==='car'?'JUMP OUT':'GET IN';$('#netBtn').hidden=mode==='car';$('#cross').hidden=mode==='car'}

/* ---------- moving ---------- */
function updateCar(dt){
  const gas=keys.up?1:pad.gas,brk=keys.down?1:pad.brake,up=gas>.05,dn=brk>.05,turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;
  const wet=inPond(car.x,car.z)&&world.c.hab!=='polar',max=wet?7:world.zoo?34:21;
  if(up)car.v+=(car.v<0?16:8)*gas*dt;if(dn)car.v-=(car.v>0?16:7)*brk*dt;
  if(!up&&!dn)car.v*=Math.pow(.35,dt);
  car.v=clamp(car.v,-7,max);
  car.steer=lerp(car.steer,turn,Math.min(1,dt*6));
  car.yaw+=car.steer*1.05*dt*Math.min(1,Math.abs(car.v)/5)*Math.sign(car.v);
  car.x-=Math.sin(car.yaw)*car.v*dt;car.z-=Math.cos(car.yaw)*car.v*dt;
  keepIn(car);
  if(collide(car,1.7)){if(Math.abs(car.v)>6)toast('Bump!');car.v*=-.25}
  const sy=Math.sin(car.yaw),cy=Math.cos(car.yaw);
  const hf=H(car.x-sy*1.6,car.z-cy*1.6),hb=H(car.x+sy*1.6,car.z+cy*1.6),hl=H(car.x-cy,car.z+sy),hr=H(car.x+cy,car.z-sy);
  car.y=(hf+hb+hl+hr)/4;
  const g=car.g;g.position.set(car.x,car.y+Math.sin(performance.now()*.03)*.006*Math.min(1,Math.abs(car.v)),car.z);g.rotation.set(Math.atan2(hf-hb,3.2),car.yaw,Math.atan2(hr-hl,2),'YXZ');
  for(const w of car.wheels)w.rotation.x-=car.v*dt/.47;
  for(const f of car.front)f.rotation.y=car.steer*.45;
  car.sw.rotation.z=car.steer*1.6;
  g.updateMatrixWorld(true);
  car.hands.forEach((h,i)=>{const hp=g.worldToLocal(h.localToWorld(V(0,-.02,.04))),sh=V(-.45+(i?.24:-.24),1.42,.25);
    setBetween(car.arms[i][0],sh,hp.clone().lerp(sh,.25));setBetween(car.arms[i][1],hp.clone().lerp(sh,.28),hp)});
}
function updateFoot(dt){
  const turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;look.yaw+=turn*2.2*dt;
  const mv=((keys.up?1:0)-(keys.down?1:0))||(pad.gas-pad.brake),spd=keys.run||pad.run?8:5.5;
  me.x-=Math.sin(look.yaw)*mv*spd*dt;me.z-=Math.cos(look.yaw)*mv*spd*dt;keepIn(me);collide(me,.5);
  const cl=o=>{const dx=me.x-o.x,dz=me.z-o.z,d=Math.hypot(dx,dz);if(d<o.r){me.x=o.x+dx/d*o.r;me.z=o.z+dz/d*o.r}};
  cl({x:car.x,z:car.z,r:2.1});for(const z of[-3.2,-1.1,1.1,3.2]){const p=car.trailer.localToWorld(V(0,0,z));cl({x:p.x,z:p.z,r:1.5})}
  const gh=H(me.x,me.z);me.vy-=18*dt;me.y+=me.vy*dt;if(me.y<=gh){me.y=gh;me.vy=0;me.ground=true}
  if(mv&&me.ground)me.bob+=dt*spd*1.6;
  me.pack.forEach((a,i)=>{if(!a.rope)return;const pts=a.rope.geometry.attributes.position,lead=i?me.pack[i-1]:null,hp=lead?V(lead.x,lead.m.g.position.y+lead.m.h*.5,lead.z):cam.localToWorld(V(.26,-.35,-.5));
    pts.setXYZ(0,hp.x,hp.y,hp.z);pts.setXYZ(1,a.x,a.m.g.position.y+a.m.h*.6,a.z);pts.needsUpdate=true});
}
function placeCamera(){
  if(mode==='car'){cam.position.copy(car.g.localToWorld(V(-.45,2.08,.42)));
    cam.quaternion.copy(car.g.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(look.pitch,look.yaw,0,'YXZ')))}
  else{cam.position.set(me.x,me.y+1.65+Math.sin(me.bob)*.05,me.z);cam.rotation.set(look.pitch,look.yaw,0,'YXZ');footRig.position.y=-.12+Math.sin(me.bob*2)*.01}
  const fx=mode==='car'?car.x:me.x,fz=mode==='car'?car.z:me.z;world.sky.follow(fx,H(fx,fz),fz);
}
const safari={running:false,
  frame(dt,time){
    // move in small steps so the jeep keeps full speed even when the computer draws few pictures a second
    const n=Math.min(8,Math.ceil(dt/(1/30))),h=dt/n;
    if(mode==='car'){for(let i=0;i<n;i++)updateCar(h);if(!look.drag){look.idle+=dt;if(look.idle>2.5&&Math.abs(car.v)>2){look.yaw*=Math.pow(.2,dt);look.pitch=lerp(look.pitch,-.12,dt*2)}}}
    else{car.g.updateMatrixWorld(true);for(let i=0;i<n;i++)updateFoot(h)}
    updateAnimals(dt,time);placeCamera();updateNet(dt);
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
  if(mode==='foot')target=aimTarget();
  else{let bd=60;for(const a of world.animals){const d=Math.hypot(a.x-car.x,a.z-car.z);if(d<bd){const v=V(a.x,a.m.g.position.y+a.m.h,a.z).project(cam);if(v.z<1&&Math.abs(v.x)<.8&&Math.abs(v.y)<.9){bd=d;target={a,dist:d}}}}}
  $('#cross').classList.toggle('on',!!(target&&mode==='foot'&&target.dist<=16));
  if(target){const a=target.a,v=V(a.x,a.m.g.position.y+a.m.h+.4,a.z).project(cam);
    tag.hidden=false;tag.style.left=((v.x+1)/2*innerWidth)+'px';tag.style.top=((1-v.y)/2*innerHeight)+'px';
    const st=a.state==='flee'?'<small>Running away! Let it get tired</small>':a.state==='tired'?'<small>Tired! Throw now!</small>':a.state==='netted'?'<small>In your net</small>':'';
    tag.innerHTML=`<span class="${a.sp.r===3?'r3':''}">${a.sp.n} · ${RAR[a.sp.r]}</span> · ${Math.round(target.dist)} m${st}`}
  else tag.hidden=true;
  let msg;
  if(world.zoo)msg=mode==='car'?'<b>W A S D</b> to drive · go through a doorway to drive inside a dome':'Walk around · <b>Space</b> jump · <b>E</b> by the truck to get in';
  else if(mode==='car')msg=target&&target.dist<30?`A <b>${target.a.sp.n}</b>! Stop and press <b>E</b> to jump out`:'<b>W A S D</b> to drive · drag to look around · find an animal';
  else if(me.pack.length){const tp=trailerPos(),n=me.pack.length,nm=n>1?n+' animals':'the '+me.pack[0].sp.n;msg=Math.hypot(me.x-tp.x,me.z-tp.z)<7.5?`Press <b>E</b> to put ${nm} in the cages`:`Leading <b>${nm}</b> (${n}/${PACK}) · catch more with <b>F</b> or walk back to the cages`}
  else msg=target?(target.dist<=16?`Press <b>F</b> to throw your net at the ${target.a.sp.n}`:`Walk closer to the ${target.a.sp.n}`):'Look at an animal · <b>F</b> net · <b>Space</b> jump · <b>E</b> by the truck to get in';
  if(pr.dataset.m!==msg){pr.innerHTML=msg;pr.dataset.m=msg}
  if((hudT++)%3)return;
  const c=$('#mm').getContext('2d'),W=280,k=W/2/90,cx=mode==='car'?car.x:me.x,cz=mode==='car'?car.z:me.z;
  c.save();c.clearRect(0,0,W,W);c.beginPath();c.arc(W/2,W/2,W/2,0,7);c.clip();
  c.fillStyle=world.E.ground;c.fillRect(0,0,W,W);
  if(world.domes)for(const d of world.domes){c.fillStyle='rgba(220,240,255,.55)';c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.arc(W/2+(d.x-cx)*k,W/2+(d.z-cz)*k,d.r*k,0,7);c.fill();c.stroke()}
  if(world.zoo)for(const o of zoo.animals){c.fillStyle='#1d2116';c.beginPath();c.arc(W/2+(o.x-cx)*k,W/2+(o.z-cz)*k,5,0,7);c.fill()}
  c.fillStyle=world.E.water;for(const p of world.ponds){c.beginPath();c.arc(W/2+(p.x-cx)*k,W/2+(p.z-cz)*k,p.r*k,0,7);c.fill()}
  for(const a of world.animals){c.fillStyle=a.sp.r===3?'#ffc93c':a.sp.r===2?'#d4602f':'#1d2116';c.beginPath();c.arc(W/2+(a.x-cx)*k,W/2+(a.z-cz)*k,a.sp.r===3?9:7,0,7);c.fill();if(a.sp.r===3){c.strokeStyle='#fff';c.lineWidth=2;c.stroke()}}
  const arrow=(x,z,yaw,col)=>{c.save();c.translate(W/2+(x-cx)*k,W/2+(z-cz)*k);c.rotate(-yaw);c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(0,-14);c.lineTo(10,10);c.lineTo(0,5);c.lineTo(-10,10);c.closePath();c.fill();c.stroke();c.restore()};
  arrow(car.x,car.z,car.yaw,'#d38a2c');if(mode==='foot')arrow(me.x,me.z,look.yaw,'#2f6fa8');
  c.restore();
}
