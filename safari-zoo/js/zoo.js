// Your zoo in 3D: fenced paddocks, glass domes, paths, lamps and signs, with your animals living inside.
const ZOO_ENV={zen:'#4a88d0',hor:'#e2ecf0',fog:'#d3e0e6',ground:'#5f8a3c',patch:'#4c7530',rock:'#7a7c78',water:'#3f7896',grass:['#3a6a22','#8cbc54'],grassH:.32,grassN:70000,sunEl:.75};
const SLOT=48,COLS=4,PLOT=18,DOME=19;
const zoo={scene:null,running:false,areas:new Map(),animals:[],grounds:[],waters:[],cam:{yaw:.5,pitch:.72,dist:150,tx:0,tz:-60,w:{yaw:.5,pitch:.72,dist:150,tx:0,tz:-60}},sel:null,mask:null};
function slotXZ(i){const r=Math.floor(i/COLS),c=i%COLS;return{x:(c-(COLS-1)/2)*SLOT,z:-40-r*SLOT}}
function zooRows(){return Math.ceil((S.areas.length+1)/COLS)}

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
  zoo.sky=NATURE.setupSky(R,scene,ZOO_ENV,{fogNear:220,fogFar:950,az:2.2});
  const gt=NATURE.groundTextures('woodland'),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(200,200);nm.repeat.set(200,200);
  const gg=new T.PlaneGeometry(1400,1400,80,80);gg.rotateX(-Math.PI/2);
  const pc=gg.attributes.position,col=new Float32Array(pc.count*3),a=new T.Color(ZOO_ENV.ground),b=new T.Color(ZOO_ENV.patch),t=new T.Color();
  for(let i=0;i<pc.count;i++){t.copy(a).lerp(b,MESHER.fbm(pc.getX(i)*.02,0,pc.getZ(i)*.02));col.set([t.r*1.2,t.g*1.2,t.b*1.2],i*3)}
  gg.setAttribute('color',new T.BufferAttribute(col,3));
  const ground=new T.Mesh(gg,new T.MeshStandardMaterial({vertexColors:true,map,normalMap:nm,roughness:1}));ground.receiveShadow=true;scene.add(ground);
  // grass everywhere except on paths and inside the areas
  const [mc,mg]=NATURE.canvas(1024);zoo.mask={c:mc,g:mg,tex:NATURE.toTex(mc,false)};zoo.mask.tex.wrapS=zoo.mask.tex.wrapT=T.ClampToEdgeWrapping;
  zoo.grass=NATURE.makeGrass(ZOO_ENV,[],{flat:1,tile:120,maskTex:zoo.mask.tex,maskRect:new T.Vector3(-300,-300,600)});scene.add(zoo.grass);
  zoo.paths=new T.Group();scene.add(zoo.paths);
  // trees around the zoo
  const types=NATURE.treeTypes('woodland'),r=rng(5);
  NATURE.scatter(scene,types,Math.round(900*QUALITY.trees),rr=>{const x=(rr()-.5)*700,z=(rr()-.5)*700-100;const inside=Math.abs(x)<125&&z<30&&z>-60-zooRows()*SLOT-80;return inside?null:V(x,0,z)},r);
  // entrance gate
  const gate=new T.Group();gate.position.set(0,0,14);scene.add(gate);
  const stone=NATURE.rockMat('#b8a890'),wood=NATURE.barkMat(false);
  for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(2.2,7,2.2),stone);p.position.set(s*7,3.5,0);p.castShadow=p.receiveShadow=true;gate.add(p)}
  const beam=new T.Mesh(new T.BoxGeometry(17,1.2,1.4),wood);beam.position.y=7.4;beam.castShadow=true;gate.add(beam);
  const sign=new T.Mesh(new T.PlaneGeometry(10,3.1),new T.MeshStandardMaterial({map:signTexture(['MY ZOO','Animals from every continent'],'#2f5a32'),roughness:.7}));sign.position.set(0,9.3,.75);gate.add(sign);
  const sb=new T.Mesh(new T.BoxGeometry(10.4,3.5,.4),wood);sb.position.set(0,9.3,.5);sb.castShadow=true;gate.add(sb);
  zoo.built=true;
}
function rebuildPaths(){
  const P=zoo.paths;while(P.children.length)P.remove(P.children[0]);
  const pv=zoo.pave||(zoo.pave=pavingTexture());
  const rows=zooRows(),zTop=-16,zEnd=-40-(rows-1)*SLOT-24;
  const strip=(x0,z0,x1,z1)=>{const w=Math.abs(x1-x0),d=Math.abs(z1-z0),m=pv.map.clone(),n=pv.normal.clone();m.needsUpdate=n.needsUpdate=true;m.repeat.set(w/4,d/4);n.repeat.set(w/4,d/4);
    const o=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:m,normalMap:n,roughness:.9}));o.rotation.x=-Math.PI/2;o.position.set((x0+x1)/2,.04,(z0+z1)/2);o.receiveShadow=true;P.add(o)};
  const xs=[-96,-48,0,48,96];
  for(let rr=0;rr<=rows;rr++){const z=zTop-rr*SLOT;strip(-99,z-3,99,z+3)}
  for(const x of xs)strip(x-3,zEnd,x+3,zTop);
  strip(-8,zTop,8,16);
  // lamps along the paths
  const pole=new T.MeshStandardMaterial({color:'#2a2c2e',metalness:.7,roughness:.4}),glow=new T.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffe8b0',emissiveIntensity:1.2});
  for(let rr=0;rr<=rows;rr++)for(let x=-84;x<=84;x+=24){const z=zTop-rr*SLOT+3.6;const l=new T.Group();l.position.set(x,0,z);
    const p=new T.Mesh(new T.CylinderGeometry(.08,.12,4.2,8),pole);p.position.y=2.1;p.castShadow=true;l.add(p);
    const h=new T.Mesh(new T.SphereGeometry(.3,12,8),glow);h.position.y=4.3;l.add(h);P.add(l)}
  // benches
  const bw=NATURE.barkMat(false);
  for(let rr=0;rr<=rows;rr++)for(const x of[-72,-24,24,72]){const b=new T.Group();b.position.set(x,0,zTop-rr*SLOT-3.8);
    for(const yy of[.5,.8]){const s=new T.Mesh(new T.BoxGeometry(2.4,.08,.35),bw);s.position.set(0,yy,yy>.6?-.2:0);if(yy>.6)s.rotation.x=-1.2;s.castShadow=true;b.add(s)}
    for(const sx of[-1,1]){const l=new T.Mesh(new T.BoxGeometry(.08,.5,.4),pole);l.position.set(sx*1.1,.25,0);b.add(l)}P.add(b)}
  // the next empty plot
  const n=S.areas.length,{x,z}=slotXZ(n),out=new T.Group();out.position.set(x,0,z);
  const dm=new T.MeshStandardMaterial({color:'#e8dcc0',roughness:.9});
  for(let i=-PLOT;i<PLOT;i+=3)for(const[px,pz,rot]of[[i+1,-PLOT,0],[i+1,PLOT,0],[-PLOT,i+1,1],[PLOT,i+1,1]]){const s=new T.Mesh(new T.BoxGeometry(rot?.25:1.6,.06,rot?1.6:.25),dm);s.position.set(px,.06,pz);out.add(s)}
  const st=new T.Mesh(new T.PlaneGeometry(6,1.9),new T.MeshStandardMaterial({map:signTexture(['Empty plot','Build a new area here'],'#6a5a40'),roughness:.8}));st.position.set(0,1.8,PLOT+1.6);out.add(st);
  const sp=new T.Mesh(new T.BoxGeometry(.2,1.8,.2),bw);sp.position.set(0,.9,PLOT+1.5);out.add(sp);
  P.add(out);
  drawMask();
}
function drawMask(){
  const {g,tex}=zoo.mask,W=1024,k=W/600,X=x=>(x+300)*k,Z=z=>(z+300)*k;
  g.fillStyle='#fff';g.fillRect(0,0,W,W);g.fillStyle='#000';
  const rows=zooRows(),zTop=-16,zEnd=-40-(rows-1)*SLOT-24;
  for(let rr=0;rr<=rows;rr++){const z=zTop-rr*SLOT;g.fillRect(X(-100),Z(z-3.5),200*k,7*k)}
  for(const x of[-96,-48,0,48,96])g.fillRect(X(x-3.5),Z(zEnd),7*k,(zTop-zEnd)*k);
  g.fillRect(X(-9),Z(zTop),18*k,32*k);
  S.areas.forEach((a,i)=>{const p=slotXZ(i);if(a.type==='dome'){g.beginPath();g.arc(X(p.x),Z(p.z),(DOME+1)*k,0,7);g.fill()}else g.fillRect(X(p.x-PLOT-.6),Z(p.z-PLOT-.6),(PLOT*2+1.2)*k,(PLOT*2+1.2)*k)});
  tex.needsUpdate=true;
}

const habTypes={};
function buildArea(area,i){
  const {x,z}=slotXZ(i),grp=new T.Group();grp.position.set(x,0,z);zoo.scene.add(grp);
  const E=ENV[area.hab],dome=area.type==='dome',R0=dome?DOME:PLOT;
  const gt=NATURE.groundTextures(area.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(R0/3.5,R0/3.5);nm.repeat.set(R0/3.5,R0/3.5);
  const geo=dome?new T.CircleGeometry(R0,64):new T.PlaneGeometry(R0*2,R0*2,1,1);
  const gc=new T.Color(E.ground).multiplyScalar(1.15);
  const gm=new T.Mesh(geo,new T.MeshStandardMaterial({color:gc,map,normalMap:nm,roughness:area.hab==='polar'?.55:1}));gm.rotation.x=-Math.PI/2;gm.position.y=.06;gm.receiveShadow=true;gm.userData.area=area.id;grp.add(gm);zoo.grounds.push(gm);
  // pond
  const pr=dome?4.5:4,px=dome?-6:-7,pz=dome?-5:-6;
  const w=NATURE.waterMesh(pr,E.water);w.position.set(px,.12,pz);grp.add(w);zoo.waters.push(w);
  const rim=new T.Mesh(new T.TorusGeometry(pr,.35,8,40),NATURE.rockMat(E.rock));rim.rotation.x=-Math.PI/2;rim.position.set(px,.1,pz);rim.scale.z=.4;rim.receiveShadow=true;grp.add(rim);
  // plants and rocks from that habitat
  const types=habTypes[area.hab]||(habTypes[area.hab]=NATURE.treeTypes(area.hab));
  const rr=rng(area.id*97+3),lim=R0-3,scale=dome?.62:.55;
  const scaled=types.map(t=>Object.assign({},t,{s:[t.s[0]*scale,Math.min(t.s[1]*scale,t.col>3?.9:t.s[1]*scale)],col:0}));
  NATURE.scatter(grp,scaled,dome?13:14,q=>{const a=q()*6.28,d=Math.sqrt(q())*lim;const p=V(Math.cos(a)*d,0,Math.sin(a)*d);if(!dome&&(Math.abs(p.x)>lim||Math.abs(p.z)>lim))return null;
    if(Math.hypot(p.x-px,p.z-pz)<pr+1.5||Math.hypot(p.x,p.z)<(dome?10:5)||p.z>lim*.4&&Math.abs(p.x)<lim*.5)return null;return p},rr);
  if(dome)buildDome(grp,area);else buildFence(grp);
  // sign at the front
  const st=new T.Mesh(new T.PlaneGeometry(6,1.9),new T.MeshStandardMaterial({map:signTexture([HAB[area.hab].name,dome?'Big Glass Dome':'Paddock']),roughness:.7}));
  st.position.set(0,2,R0+2.3);grp.add(st);
  const bw=NATURE.barkMat(false);for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.2,2.4,.2),bw);p.position.set(s*2.6,1.2,R0+2.2);p.castShadow=true;grp.add(p)}
  zoo.areas.set(area.id,{grp,area,x,z,dome,R0});
}
function buildFence(grp){
  const posts=[],rails=[],R0=PLOT+.3;
  for(let i=-R0;i<=R0;i+=2.4){posts.push([i,-R0],[i,R0],[-R0,i],[R0,i])}
  const wood=NATURE.barkMat(false);
  const pg=new T.CylinderGeometry(.11,.13,1.8,7);pg.translate(0,.9,0);
  const pim=new T.InstancedMesh(pg,wood,posts.length);posts.forEach(([x,z],j)=>pim.setMatrixAt(j,new T.Matrix4().makeTranslation(x,0,z)));pim.castShadow=true;grp.add(pim);
  const rg=new T.BoxGeometry(1,.12,.07),m4=new T.Matrix4();
  const sides=[[0,-R0,0],[0,R0,0],[-R0,0,1],[R0,0,1]];
  const rim=new T.InstancedMesh(rg,wood,8);let j=0;
  for(const[x,z,rot]of sides)for(const y of[.75,1.45]){m4.compose(V(x,y,z),new T.Quaternion().setFromAxisAngle(V(0,1,0),rot?Math.PI/2:0),V(R0*2,1,1));rim.setMatrixAt(j++,m4)}
  rim.castShadow=true;grp.add(rim);
}
let domeCache=null;
function domeGeometry(){
  if(domeCache)return domeCache;
  const ico=new T.IcosahedronGeometry(DOME,3).toNonIndexed(),p=ico.attributes.position,keep=[],edges=new Map();
  const key=v=>v.toArray().map(n=>n.toFixed(2)).join(',');
  for(let i=0;i<p.count;i+=3){const a=V(p.getX(i),p.getY(i),p.getZ(i)),b=V(p.getX(i+1),p.getY(i+1),p.getZ(i+1)),c=V(p.getX(i+2),p.getY(i+2),p.getZ(i+2));
    if(Math.min(a.y,b.y,c.y)<-.01)continue;keep.push(a,b,c);
    for(const[u,v]of[[a,b],[b,c],[c,a]]){const k=[key(u),key(v)].sort().join('|');if(!edges.has(k))edges.set(k,[u,v])}}
  const g=new T.BufferGeometry().setFromPoints(keep);g.computeVertexNormals();
  return domeCache={glass:g,edges:[...edges.values()]};
}
function buildDome(grp,area){
  const D=domeGeometry();
  const glass=new T.Mesh(D.glass,new T.MeshPhysicalMaterial({color:'#eaf7ff',transparent:true,opacity:.13,roughness:.03,metalness:.1,clearcoat:1,envMapIntensity:2.2,side:T.DoubleSide,depthWrite:false}));
  glass.renderOrder=2;grp.add(glass);
  const frame=new T.MeshStandardMaterial({color:'#f2f2ee',metalness:.6,roughness:.3});
  const cg=new T.CylinderGeometry(.09,.09,1,6),im=new T.InstancedMesh(cg,frame,D.edges.length),m4=new T.Matrix4();
  D.edges.forEach(([a,b],j)=>{const d=b.clone().sub(a),L=d.length();m4.compose(a.clone().addScaledVector(d,.5),new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),V(1,L,1));im.setMatrixAt(j,m4)});
  im.castShadow=true;grp.add(im);
  const base=new T.Mesh(new T.CylinderGeometry(DOME+.4,DOME+.6,.7,64,1,true),NATURE.rockMat('#c8c0b0'));base.position.y=.35;base.receiveShadow=base.castShadow=true;grp.add(base);
  const door=new T.Mesh(new T.BoxGeometry(3.4,3.6,.5),frame);door.position.set(0,1.8,DOME-.3);grp.add(door);
  const dg=new T.Mesh(new T.PlaneGeometry(2.8,3.2),new T.MeshPhysicalMaterial({color:'#9ccfe8',transparent:true,opacity:.35,roughness:.05}));dg.position.set(0,1.7,DOME);grp.add(dg);
}

/* ---------- animals living in the zoo ---------- */
function syncZooAnimals(){
  for(const a of zoo.animals)zoo.scene.remove(a.inst.g);zoo.animals=[];
  for(const area of S.areas){const A=zoo.areas.get(area.id);if(!A)continue;
    for(const an of area.animals){const sp=SP[an.k],inst=ANIMALS.make(sp),r=rng(an.uid*13);
      const p=randomSpot(A,r);const o={an,A,inst,x:p.x,z:p.z,tx:p.x,tz:p.z,yaw:r()*6.28,t:r()*3};
      inst.g.position.set(o.x,0,o.z);zoo.scene.add(inst.g);zoo.animals.push(o)}}
}
function randomSpot(A,r=Math.random){const lim=A.R0-3;for(let i=0;i<30;i++){const x=(r()-.5)*2*lim,z=(r()-.5)*2*lim;if(A.dome&&Math.hypot(x,z)>lim)continue;if(Math.hypot(x+(A.dome?6:7),z+(A.dome?5:6))<5.5)continue;return{x:A.x+x,z:A.z+z}}return{x:A.x,z:A.z}}
function updateZooAnimals(dt,time){
  for(const o of zoo.animals){
    const dx=o.tx-o.x,dz=o.tz-o.z,d=Math.hypot(dx,dz);let spd=0;
    if(d>.4){spd=Math.min(SP[o.an.k].s*.55,d);o.x+=dx/d*spd*dt;o.z+=dz/d*spd*dt;
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
function focusArea(id){const A=zoo.areas.get(id);if(!A)return;const w=zoo.cam.w;w.tx=A.x;w.tz=A.z;w.dist=A.dome?62:55;w.pitch=Math.max(.45,Math.min(w.pitch,.8))}
function zooFrame(dt,time){
  zooCamera(dt);updateZooAnimals(dt,time);
  zoo.grass.userData.update(V(zoo.cam.tx,0,zoo.cam.tz),time,zoo.scene.fog,zoo.sky.sunDir);
  for(const w of zoo.waters){w.userData.water.offset.x+=dt*.015;w.userData.water.offset.y+=dt*.01}
  zoo.sky.follow(zoo.cam.tx,0,zoo.cam.tz);
  R.render(zoo.scene,cam);
}
async function enterZoo(progress){
  if(!zoo.built)buildZoo();
  S.areas.forEach((a,i)=>{if(!zoo.areas.has(a.id))buildArea(a,i)});
  rebuildPaths();
  const need=[...new Set(S.areas.flatMap(a=>a.animals.map(x=>x.k)))].filter(k=>!ANIMALS.isBuilt(SP[k]));
  for(let i=0;i<need.length;i++){progress('Getting the animals ready… '+(i+1)+'/'+need.length);await nextFrame();ANIMALS.species(SP[need[i]])}
  syncZooAnimals();
}
function zooPick(cx,cy){
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(cx/innerWidth*2-1,-(cy/innerHeight)*2+1),cam);
  const hit=ray.intersectObjects(zoo.grounds,false)[0];return hit?hit.object.userData.area:null;
}
