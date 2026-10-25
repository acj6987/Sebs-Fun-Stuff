// Your zoo in 3D: big glass domes you can drive into, paths, lamps and signs, with your animals living inside.
const ZOO_ENV={zen:'#4a88d0',hor:'#e2ecf0',fog:'#d3e0e6',ground:'#5f8a3c',patch:'#4c7530',rock:'#7a7c78',water:'#3f7896',grass:['#3a6a22','#8cbc54'],grassH:.32,grassN:70000,sunEl:.75};
const SLOT=78,COLS=4,DOME=30,DOOR=.24; // DOOR: half-width of the doorway, in radians around the dome
const zoo={scene:null,running:false,areas:new Map(),animals:[],grounds:[],waters:[],cols:[],cam:{yaw:.5,pitch:.72,dist:190,tx:0,tz:-80,w:{yaw:.5,pitch:.72,dist:190,tx:0,tz:-80}},sel:null,mask:null};
function slotXZ(i){const r=Math.floor(i/COLS),c=i%COLS;return{x:(c-(COLS-1)/2)*SLOT,z:-52-r*SLOT}}
function zooRows(){return Math.ceil((S.areas.length+1)/COLS)}
const ZTOP=-52+SLOT/2,PATH_X=[-2,-1,0,1,2].map(i=>i*SLOT);
function zooBottom(){return-52-(zooRows()-1)*SLOT-SLOT/2}

function signTexture(lines,bg='#4a3020',fg='#fdf3dc'){
  const [c,g]=NATURE.canvas(512,160);g.fillStyle=bg;g.fillRect(0,0,512,160);
  g.strokeStyle='rgba(0,0,0,.25)';for(let y=12;y<160;y+=22){g.beginPath();g.moveTo(0,y);g.lineTo(512,y+4);g.stroke()}
  g.strokeStyle=fg;g.lineWidth=6;g.strokeRect(10,10,492,140);
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  g.font='bold 52px "Lilita One","Arial Rounded MT Bold",sans-serif';g.fillText(lines[0],256,lines[1]?62:82);
  if(lines[1]){g.font='bold 30px Nunito,sans-serif';g.fillText(lines[1],256,118)}
  return NATURE.toTex(c,true);
}
function pavingTexture(){
  const [c,g]=NATURE.canvas(256),r=rng(21);g.fillStyle='#b9b0a0';g.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){const l=170+r()*40|0;g.fillStyle=`rgb(${l},${l-6},${l-16})`;g.fillRect(x+2,y+2,28,28)}
  for(let i=0;i<3000;i++){g.fillStyle=`rgba(0,0,0,${r()*.12})`;g.fillRect(r()*256,r()*256,2,2)}
  return{map:NATURE.toTex(c,true),normal:NATURE.toTex(NATURE.normalFrom(c,3),false)};
}

function buildZoo(){
  const scene=new T.Scene();zoo.scene=scene;
  zoo.sky=NATURE.setupSky(R,scene,ZOO_ENV,{fogNear:240,fogFar:1100,az:2.2});
  const gt=NATURE.groundTextures('woodland'),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(240,240);nm.repeat.set(240,240);
  const gg=new T.PlaneGeometry(1800,1800,90,90);gg.rotateX(-Math.PI/2);
  const pc=gg.attributes.position,col=new Float32Array(pc.count*3),a=new T.Color(ZOO_ENV.ground),b=new T.Color(ZOO_ENV.patch),t=new T.Color();
  for(let i=0;i<pc.count;i++){t.copy(a).lerp(b,MESHER.fbm(pc.getX(i)*.02,0,pc.getZ(i)*.02));col.set([t.r*1.2,t.g*1.2,t.b*1.2],i*3)}
  gg.setAttribute('color',new T.BufferAttribute(col,3));
  const ground=new T.Mesh(gg,new T.MeshStandardMaterial({vertexColors:true,map,normalMap:nm,roughness:1}));ground.receiveShadow=true;scene.add(ground);
  // grass everywhere except on paths and inside the domes
  const [mc,mg]=NATURE.canvas(1024);zoo.mask={c:mc,g:mg,tex:NATURE.toTex(mc,false)};zoo.mask.tex.wrapS=zoo.mask.tex.wrapT=T.ClampToEdgeWrapping;
  zoo.grass=NATURE.makeGrass(ZOO_ENV,[],{flat:1,tile:120,maskTex:zoo.mask.tex,maskRect:new T.Vector3(-450,-750,900)});scene.add(zoo.grass);
  zoo.paths=new T.Group();scene.add(zoo.paths);
  // woods around the zoo, leaving room for lots more domes
  const types=NATURE.treeTypes('woodland'),r=rng(5);
  zoo.cols.push(...NATURE.scatter(scene,types,Math.round(1100*QUALITY.trees),rr=>{const x=(rr()-.5)*800,z=(rr()-.5)*900-300;
    const inside=Math.abs(x)<SLOT*2+30&&z<45&&z>-52-6*SLOT-60;return inside?null:V(x,0,z)},r));
  // entrance gate
  const gate=new T.Group();gate.position.set(0,0,30);scene.add(gate);
  const stone=NATURE.rockMat('#b8a890'),wood=NATURE.barkMat(false);
  for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(2.2,7,2.2),stone);p.position.set(s*7,3.5,0);p.castShadow=p.receiveShadow=true;gate.add(p);zoo.cols.push({x:s*7,z:30,r:1.6})}
  const beam=new T.Mesh(new T.BoxGeometry(17,1.2,1.4),wood);beam.position.y=7.4;beam.castShadow=true;gate.add(beam);
  const sign=new T.Mesh(new T.PlaneGeometry(10,3.1),new T.MeshStandardMaterial({map:signTexture(['MY ZOO','Animals from every continent'],'#2f5a32'),roughness:.7}));sign.position.set(0,9.3,.75);gate.add(sign);
  const sb=new T.Mesh(new T.BoxGeometry(10.4,3.5,.4),wood);sb.position.set(0,9.3,.5);sb.castShadow=true;gate.add(sb);
  zoo.built=true;
}
function rebuildPaths(){
  const P=zoo.paths;while(P.children.length)P.remove(P.children[0]);
  const pv=zoo.pave||(zoo.pave=pavingTexture());
  const rows=zooRows(),zEnd=zooBottom();
  const strip=(x0,z0,x1,z1)=>{const w=Math.abs(x1-x0),d=Math.abs(z1-z0),m=pv.map.clone(),n=pv.normal.clone();m.needsUpdate=n.needsUpdate=true;m.repeat.set(w/4,d/4);n.repeat.set(w/4,d/4);
    const o=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:m,normalMap:n,roughness:.9}));o.rotation.x=-Math.PI/2;o.position.set((x0+x1)/2,.04,(z0+z1)/2);o.receiveShadow=true;P.add(o)};
  for(let rr=0;rr<=rows;rr++){const z=ZTOP-rr*SLOT;strip(PATH_X[0]-4,z-4,PATH_X[4]+4,z+4)}
  for(const x of PATH_X)strip(x-4,zEnd,x+4,ZTOP);
  strip(-8,ZTOP,8,34);
  const pole=new T.MeshStandardMaterial({color:'#2a2c2e',metalness:.7,roughness:.4}),glow=new T.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffe8b0',emissiveIntensity:1.2});
  for(let rr=0;rr<=rows;rr++)for(let x=PATH_X[0]+13;x<PATH_X[4];x+=26){const z=ZTOP-rr*SLOT+4.8;const l=new T.Group();l.position.set(x,0,z);
    const p=new T.Mesh(new T.CylinderGeometry(.08,.12,4.2,8),pole);p.position.y=2.1;p.castShadow=true;l.add(p);
    const h=new T.Mesh(new T.SphereGeometry(.3,12,8),glow);h.position.y=4.3;l.add(h);P.add(l)}
  // the next empty plot
  const n=S.areas.length,{x,z}=slotXZ(n),out=new T.Group();out.position.set(x,0,z);
  const dm=new T.MeshStandardMaterial({color:'#e8dcc0',roughness:.9});
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2;if(i%2)continue;const s=new T.Mesh(new T.BoxGeometry(2.4,.06,.3),dm);s.position.set(Math.sin(a)*DOME,.06,Math.cos(a)*DOME);s.rotation.y=a+Math.PI/2;out.add(s)}
  const st=new T.Mesh(new T.PlaneGeometry(6,1.9),new T.MeshStandardMaterial({map:signTexture(['Empty plot','Build a new dome here'],'#6a5a40'),roughness:.8}));st.position.set(0,1.8,DOME+3.6);out.add(st);
  P.add(out);
  drawMask();refreshZooWorld();if(zoo.people&&zoo.people.length)zoo.graph=pathGraph();
}
function drawMask(){
  const {g,tex}=zoo.mask,W=1024,k=W/900,X=x=>(x+450)*k,Z=z=>(z+750)*k;
  g.fillStyle='#fff';g.fillRect(0,0,W,W);g.fillStyle='#000';
  const rows=zooRows(),zEnd=zooBottom();
  for(let rr=0;rr<=rows;rr++){const z=ZTOP-rr*SLOT;g.fillRect(X(PATH_X[0]-4.5),Z(z-4.5),(PATH_X[4]-PATH_X[0]+9)*k,9*k)}
  for(const x of PATH_X)g.fillRect(X(x-4.5),Z(zEnd),9*k,(ZTOP-zEnd)*k);
  g.fillRect(X(-9),Z(ZTOP),18*k,(34-ZTOP)*k);
  S.areas.forEach((a,i)=>{const p=slotXZ(i);g.beginPath();g.arc(X(p.x),Z(p.z),(DOME+1.2)*k,0,7);g.fill()});
  tex.needsUpdate=true;
}

const habTypes={};
function buildArea(area,i){
  const {x,z}=slotXZ(i),grp=new T.Group();grp.position.set(x,0,z);zoo.scene.add(grp);
  const E=ENV[area.hab],R0=DOME;
  const gt=NATURE.groundTextures(area.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(R0/3.5,R0/3.5);nm.repeat.set(R0/3.5,R0/3.5);
  const gc=new T.Color(E.ground).multiplyScalar(1.15);
  const gm=new T.Mesh(new T.CircleGeometry(R0,72),new T.MeshStandardMaterial({color:gc,map,normalMap:nm,roughness:area.hab==='polar'?.55:1}));
  gm.rotation.x=-Math.PI/2;gm.position.y=.06;gm.receiveShadow=true;gm.userData.area=area.id;grp.add(gm);zoo.grounds.push(gm);
  const cols=[];
  // pond
  const pr=6,px=-11,pz=-8;
  const w=NATURE.waterMesh(pr,E.water);w.position.set(px,.12,pz);grp.add(w);zoo.waters.push(w);
  const rim=new T.Mesh(new T.TorusGeometry(pr,.4,8,48),NATURE.rockMat(E.rock));rim.rotation.x=-Math.PI/2;rim.position.set(px,.1,pz);rim.scale.z=.4;rim.receiveShadow=true;grp.add(rim);
  // plants and rocks from that habitat, keeping a clear track to drive on
  const types=habTypes[area.hab]||(habTypes[area.hab]=NATURE.treeTypes(area.hab));
  const rr=rng(area.id*97+3),lim=R0-3,scale=.7;
  const scaled=types.map(t=>Object.assign({},t,{s:[t.s[0]*scale,Math.min(t.s[1]*scale,t.col>3?1.1:t.s[1]*scale)],col:t.col?Math.min(t.col,1.2):0}));
  cols.push(...NATURE.scatter(grp,scaled,26,q=>{const a=q()*6.28,d=Math.sqrt(q())*lim;const p=V(Math.sin(a)*d,0,Math.cos(a)*d);
    if(Math.hypot(p.x-px,p.z-pz)<pr+2||d<9||(d>17&&d<23)||Math.abs(p.x)<7&&p.z>0)return null;return p},rr));
  buildDome(grp);
  // sign at the doorway
  const st=new T.Mesh(new T.PlaneGeometry(6,1.9),new T.MeshStandardMaterial({map:signTexture([(i+1)+'. '+HAB[area.hab].name,'Big Glass Dome']),roughness:.7}));
  st.position.set(10,2,R0+3);st.rotation.y=-.2;grp.add(st);
  const bw=NATURE.barkMat(false);for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.2,2.4,.2),bw);p.position.set(10+s*2.55,1.2,R0+3-s*.5);p.castShadow=true;grp.add(p)}
  // the glass wall is solid except for the doorway; pond and trees block the jeep too
  for(let a=0;a<Math.PI*2;a+=.06){const d=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(d)<DOOR)continue;cols.push({x:Math.sin(a)*R0,z:Math.cos(a)*R0,r:.9})}
  cols.push({x:px,z:pz,r:pr});
  zoo.areas.set(area.id,{grp,area,x,z,R0,cols:cols.map(c=>({x:c.x+x,z:c.z+z,r:c.r})),pond:{x:px,z:pz,r:pr}});
}
let domeCache=null;
function domeGeometry(){
  if(domeCache)return domeCache;
  const ico=new T.IcosahedronGeometry(DOME,3).toNonIndexed(),p=ico.attributes.position,keep=[],edges=new Map();
  const key=v=>v.toArray().map(n=>n.toFixed(2)).join(',');
  const door=v=>v.z>0&&Math.abs(Math.atan2(v.x,v.z))<DOOR+.04&&v.y<9;
  for(let i=0;i<p.count;i+=3){const a=V(p.getX(i),p.getY(i),p.getZ(i)),b=V(p.getX(i+1),p.getY(i+1),p.getZ(i+1)),c=V(p.getX(i+2),p.getY(i+2),p.getZ(i+2));
    if(Math.min(a.y,b.y,c.y)<-.01)continue;const cen=a.clone().add(b).add(c).divideScalar(3);if(door(cen))continue;keep.push(a,b,c);
    for(const[u,v]of[[a,b],[b,c],[c,a]]){const k=[key(u),key(v)].sort().join('|');if(!edges.has(k))edges.set(k,[u,v])}}
  const g=new T.BufferGeometry().setFromPoints(keep);g.computeVertexNormals();
  return domeCache={glass:g,edges:[...edges.values()]};
}
function buildDome(grp){
  const D=domeGeometry();
  const glass=new T.Mesh(D.glass,new T.MeshPhysicalMaterial({color:'#eaf7ff',transparent:true,opacity:.13,roughness:.03,metalness:.1,clearcoat:1,envMapIntensity:2.2,side:T.DoubleSide,depthWrite:false}));
  glass.renderOrder=2;grp.add(glass);
  const frame=new T.MeshStandardMaterial({color:'#f2f2ee',metalness:.6,roughness:.3});
  const cg=new T.CylinderGeometry(.11,.11,1,6),im=new T.InstancedMesh(cg,frame,D.edges.length),m4=new T.Matrix4();
  D.edges.forEach(([a,b],j)=>{const d=b.clone().sub(a),L=d.length();m4.compose(a.clone().addScaledVector(d,.5),new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),V(1,L,1));im.setMatrixAt(j,m4)});
  im.castShadow=true;grp.add(im);
  const base=new T.Mesh(new T.CylinderGeometry(DOME+.4,DOME+.6,.7,96,1,true,DOOR,Math.PI*2-DOOR*2),NATURE.rockMat('#c8c0b0'));base.position.y=.35;base.receiveShadow=base.castShadow=true;grp.add(base);
  // doorway frame
  const dx=Math.sin(DOOR)*DOME,dz=Math.cos(DOOR)*DOME;
  for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.6,8.5,.6),frame);p.position.set(s*dx,4.25,dz);p.castShadow=true;grp.add(p)}
  const top=new T.Mesh(new T.BoxGeometry(dx*2+.6,.7,.6),frame);top.position.set(0,8.5,dz);top.castShadow=true;grp.add(top);
}

/* ---------- animals living in the zoo ---------- */
function syncZooAnimals(){
  for(const a of zoo.animals)zoo.scene.remove(a.inst.g);zoo.animals=[];
  for(const area of S.areas){const A=zoo.areas.get(area.id);if(!A)continue;
    for(const an of area.animals){const sp=SP[an.k],inst=ANIMALS.make(sp),r=rng(an.uid*13);
      const p=randomSpot(A,r);const o={an,A,inst,x:p.x,z:p.z,tx:p.x,tz:p.z,yaw:r()*6.28,t:r()*3};
      inst.g.position.set(o.x,0,o.z);zoo.scene.add(inst.g);zoo.animals.push(o)}}
}
function randomSpot(A,r=Math.random){const lim=A.R0-4;for(let i=0;i<30;i++){const x=(r()-.5)*2*lim,z=(r()-.5)*2*lim;if(Math.hypot(x,z)>lim)continue;if(Math.hypot(x-A.pond.x,z-A.pond.z)<A.pond.r+1.5)continue;return{x:A.x+x,z:A.z+z}}return{x:A.x,z:A.z}}
function updateZooAnimals(dt,time){
  const driving=curView==='drive'&&world&&world.zoo,px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  for(const o of zoo.animals){
    // move out of the way of the jeep or of you
    if(driving&&Math.hypot(o.x-px,o.z-pz)<9){const a=Math.atan2(o.x-px,o.z-pz);const lim=o.A.R0-4;let nx=o.x+Math.sin(a)*8-o.A.x,nz=o.z+Math.cos(a)*8-o.A.z;const d=Math.hypot(nx,nz);if(d>lim){nx*=lim/d;nz*=lim/d}o.tx=o.A.x+nx;o.tz=o.A.z+nz;o.t=2}
    const dx=o.tx-o.x,dz=o.tz-o.z,d=Math.hypot(dx,dz);let spd=0;
    if(d>.4){spd=Math.min(SP[o.an.k].s*(driving&&o.t===2?1.4:.55),d);o.x+=dx/d*spd*dt;o.z+=dz/d*spd*dt;
      const ty=Math.atan2(dx,dz);let dy=ty-o.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));o.yaw+=dy*Math.min(1,dt*4)}
    else{o.t-=dt;if(o.t<=0){o.t=3+Math.random()*6;const p=randomSpot(o.A);o.tx=p.x;o.tz=p.z}}
    const far=Math.hypot(o.x-cam.position.x,o.z-cam.position.z)>90;if(far!==o.far){o.far=far;ANIMALS.setLOD(o.inst,far)}
    ANIMALS.animate(o.inst,dt,spd,time,{graze:spd<.1&&Math.sin(time*.3+o.an.uid)>.3});
    o.inst.g.position.set(o.x,.06+(o.inst.hop||0),o.z);o.inst.g.rotation.y=o.yaw;
  }
}

/* ---------- camera you can fly around ---------- */
function zooCamera(dt){
  const c=zoo.cam,w=c.w,k=Math.min(1,dt*6);
  for(const p of['yaw','pitch','dist','tx','tz'])c[p]+=(w[p]-c[p])*k;
  const cp=Math.cos(c.pitch);cam.position.set(c.tx+Math.sin(c.yaw)*cp*c.dist,Math.sin(c.pitch)*c.dist+1,c.tz+Math.cos(c.yaw)*cp*c.dist);
  cam.lookAt(c.tx,1,c.tz);
}
function focusArea(id){const A=zoo.areas.get(id);if(!A)return;const w=zoo.cam.w;w.tx=A.x;w.tz=A.z;w.dist=85;w.pitch=Math.max(.45,Math.min(w.pitch,.8))}
function zooTick(dt,time){
  updateZooAnimals(dt,time);updateVisitors(dt,time);
  for(const w of zoo.waters){w.userData.water.offset.x+=dt*.015;w.userData.water.offset.y+=dt*.01}
}
function zooFrame(dt,time){
  zooCamera(dt);zooTick(dt,time);
  zoo.grass.userData.update(V(zoo.cam.tx,0,zoo.cam.tz),time,zoo.scene.fog,zoo.sky.sunDir);
  zoo.sky.follow(zoo.cam.tx,0,zoo.cam.tz);
  R.render(zoo.scene,cam);
}
async function enterZoo(progress){
  if(!zoo.built)buildZoo();
  const made=autoHome();if(made.length)setTimeout(()=>toast('New dome built for your '+made.map(h=>HAB[h].name).join(', ')+' animals!'),400);
  S.areas.forEach((a,i)=>{if(!zoo.areas.has(a.id))buildArea(a,i)});
  rebuildPaths();
  const need=[...new Set(S.areas.flatMap(a=>a.animals.map(x=>x.k)))].filter(k=>!ANIMALS.isBuilt(SP[k]));
  for(let i=0;i<need.length;i++){progress('Getting the animals ready… '+(i+1)+'/'+need.length);await nextFrame();ANIMALS.species(SP[need[i]])}
  syncZooAnimals();
  for(let i=0;i<LOOKS.length;i++)if(!ANIMALS.isBuilt(personSp(i))){progress('Opening the gates for visitors… '+(i+1)+'/'+LOOKS.length);await nextFrame();ANIMALS.species(personSp(i))}
  syncVisitors();
}
function zooPick(cx,cy){
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(cx/innerWidth*2-1,-(cy/innerHeight)*2+1),cam);
  const hit=ray.intersectObjects(zoo.grounds,false)[0];return hit?hit.object.userData.area:null;
}

/* ---------- driving your jeep around the zoo ---------- */
// the safari code drives the jeep; this gives it a flat zoo "world" with the domes as walls
function refreshZooWorld(){
  if(!zoo.world)return;const w=zoo.world;w.cols=new Map();
  const add=c=>{const k=Math.floor(c.x/20)+','+Math.floor(c.z/20);if(!w.cols.has(k))w.cols.set(k,[]);w.cols.get(k).push(c)};
  zoo.cols.forEach(add);for(const A of zoo.areas.values())A.cols.forEach(add);
  w.bounds={x0:PATH_X[0]-40,x1:PATH_X[4]+40,z0:zooBottom()-40,z1:60};
  w.domes=[...zoo.areas.values()].map(A=>({x:A.x,z:A.z,r:A.R0}));
}
function zooDriveWorld(){
  if(!zoo.world)zoo.world={zoo:true,flat:true,c:{hab:'woodland',name:'My Zoo'},E:ZOO_ENV,scene:zoo.scene,ponds:[],animals:[],respawn:[],waters:[],net:null,
    sky:zoo.sky,grass:zoo.grass,tick:zooTick};
  refreshZooWorld();return zoo.world;
}

/* ---------- every animal lives in the dome for its home ---------- */
function autoHome(){
  const moving=S.holding.splice(0),made=[];
  for(const a of S.areas)for(const an of a.animals.slice())if(SP[an.k].hab!==a.hab){a.animals.splice(a.animals.indexOf(an),1);moving.push(an)}
  for(const an of moving){const hab=SP[an.k].hab;let d=S.areas.find(a=>a.hab===hab);
    if(!d){d={id:S.aid++,type:'dome',hab,animals:[]};S.areas.push(d);made.push(hab)}d.animals.push(an)}
  save();return made;
}

/* ---------- visitors walking around the zoo ---------- */
const LOOKS=[
  {s:1,skin:'#e8b896',shirt:'#c0392b',pants:'#2c3e60',hair:'#3a2618',shoes:'#222'},
  {s:.97,skin:'#8d5a3b',shirt:'#f1c40f',pants:'#34495e',hair:'#111',shoes:'#f4f4f4',short:1,long:1},
  {s:1.04,skin:'#f2cdb0',shirt:'#2e86de',pants:'#d8c9a8',hair:'#c9a35a',shoes:'#5a3a22',short:1,shorts:1,hat:'#e8dcc0'},
  {s:.72,skin:'#c68a5e',shirt:'#27ae60',pants:'#1f3a5a',hair:'#2a1a10',shoes:'#e74c3c',short:1},
  {s:.95,skin:'#5c3a28',shirt:'#8e44ad',pants:'#222',hair:'#111',shoes:'#333',long:1},
  {s:.68,skin:'#f0c8a8',shirt:'#e67e22',pants:'#3b6ea5',hair:'#e0b050',shoes:'#fff',short:1,shorts:1,long:1},
  {s:1.02,skin:'#d9a982',shirt:'#ecf0f1',pants:'#4a5a3a',hair:'#6a4a2a',shoes:'#3a2a1a',hat:'#2f5a32'},
  {s:.98,skin:'#a8714c',shirt:'#e84393',pants:'#2d3436',hair:'#2a1a12',shoes:'#ddd',short:1,long:1},
];
const personSps=[];
function personSp(i){return personSps[i]||(personSps[i]={k:'person'+i,n:'Visitor',def:Object.assign({plan:'person'},LOOKS[i])})}
function pathGraph(){
  const rows=zooRows(),nodes=[],at=(x,z)=>nodes.find(n=>Math.abs(n.x-x)<.1&&Math.abs(n.z-z)<.1),link=(a,b)=>{a.nb.push(b);b.nb.push(a)};
  for(let r=0;r<=rows;r++)for(const x of PATH_X)nodes.push({x,z:ZTOP-r*SLOT,nb:[]});
  for(let r=0;r<=rows;r++)for(let c=0;c<PATH_X.length;c++){const n=at(PATH_X[c],ZTOP-r*SLOT);
    if(c<PATH_X.length-1)link(n,at(PATH_X[c+1],ZTOP-r*SLOT));if(r<rows)link(n,at(PATH_X[c],ZTOP-(r+1)*SLOT))}
  const gate={x:0,z:44,nb:[],gate:1};nodes.push(gate);link(gate,at(0,ZTOP));
  // spots in front of every dome doorway where people stop and look in
  S.areas.forEach((a,i)=>{const p=slotXZ(i),pz=p.z+SLOT/2,v={x:p.x,z:p.z+DOME+4,nb:[],view:1};nodes.push(v);
    const l=at(p.x-SLOT/2,pz),r=at(p.x+SLOT/2,pz);if(l)link(v,l);if(r)link(v,r)});
  return{nodes,gate};
}
function syncVisitors(){
  for(const v of zoo.people||[])zoo.scene.remove(v.inst.g);zoo.people=[];zoo.graph=pathGraph();
  const n=Math.min(42,10+S.areas.length*4+Math.floor(S.areas.reduce((t,a)=>t+a.animals.length,0)/2));
  for(let i=0;i<n;i++){const inst=ANIMALS.make(personSp(i%LOOKS.length));zoo.scene.add(inst.g);
    // most start somewhere along the paths, the rest come in through the gate
    const g=zoo.graph,from=i<n*.75?g.nodes[Math.floor(Math.random()*g.nodes.length)]:g.gate;
    const v={inst,from,to:from.nb[Math.floor(Math.random()*from.nb.length)],off:(Math.random()-.5)*4.5,spd:1.1+Math.random()*.6,wait:Math.random()*3,x:from.x,z:from.z,yaw:0};
    zoo.people.push(v)}
  const el=$('#visitors');if(el)el.textContent='👥 '+n+' visitors';
}
function updateVisitors(dt,time){
  if(!zoo.people)return;
  const driving=curView==='drive'&&world&&world.zoo,px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  for(const v of zoo.people){
    let spd=0,look=0;
    if(v.wait>0){v.wait-=dt;if(v.from.view){const ty=Math.PI;let d=ty-v.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));v.yaw+=d*Math.min(1,dt*3);look=Math.sin(time*.7+v.off)*.4}}
    else{
      const dx=v.to.x-v.from.x,dz=v.to.z-v.from.z,L=Math.hypot(dx,dz)||1,ox=-dz/L*v.off,oz=dx/L*v.off;
      const tx=v.to.x+(v.to.view?0:ox),tz=v.to.z+(v.to.view?0:oz),ex=tx-v.x,ez=tz-v.z,d=Math.hypot(ex,ez);
      if(d<.5){const prev=v.from;v.from=v.to;const opts=v.from.nb.filter(n=>n!==prev);v.to=(opts.length?opts:v.from.nb)[Math.floor(Math.random()*(opts.length||v.from.nb.length))];
        if(v.from.view)v.wait=3+Math.random()*6;else if(Math.random()<.12)v.wait=1+Math.random()*3}
      else{spd=v.spd;v.x+=ex/d*spd*dt;v.z+=ez/d*spd*dt;const ty=Math.atan2(ex,ez);let dy=ty-v.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));v.yaw+=dy*Math.min(1,dt*5)}
    }
    // step out of the way of the jeep or of you
    if(driving){const cx=v.x-px,cz=v.z-pz,cd=Math.hypot(cx,cz);if(cd<(mode==='car'?5:1.2)&&cd>.01){const push=((mode==='car'?5:1.2)-cd)*Math.min(1,dt*6);v.x+=cx/cd*push;v.z+=cz/cd*push}}
    const far=Math.hypot(v.x-cam.position.x,v.z-cam.position.z);v.inst.g.visible=far<220;if(!v.inst.g.visible)continue;
    const lod=far>60;if(lod!==v.far){v.far=lod;ANIMALS.setLOD(v.inst,lod)}
    ANIMALS.animate(v.inst,dt,spd,time,{look});
    v.inst.g.position.set(v.x,.04,v.z);v.inst.g.rotation.y=v.yaw;
  }
}
