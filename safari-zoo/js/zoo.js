// Your zoo in 3D: big glass domes you can drive into, paths, lamps and signs, with your animals living inside.
const ZOO_ENV={zen:'#4a88d0',hor:'#e2ecf0',fog:'#d3e0e6',ground:'#5f8a3c',patch:'#4c7530',rock:'#7a7c78',water:'#3f7896',grass:['#3a6a22','#8cbc54'],grassH:.32,grassN:70000,sunEl:.75};
// ginormous domes so every animal can be its real size; the Dino Zone dome is the biggest of all
const ROAD=7,GAP=24,MASK={x0:-1400,z0:-2700,size:2800};
// the Ultra Dino Dome sits beside the start of the road and holds every dinosaur
const ULTRA={R:300,x:ROAD+16+300,z:-16-300};
const doorAng=R=>9/R; // half-width of the doorway, in radians around the dome
const zoo={scene:null,running:false,areas:new Map(),animals:[],grounds:[],waters:[],cols:[],cam:{yaw:.5,pitch:.7,dist:330,tx:0,tz:-160,w:{yaw:.5,pitch:.7,dist:330,tx:0,tz:-160}},sel:null,mask:null};
// domes line both sides of one long road that starts at the gate
function zooLayout(){
  const zs=[-16,ULTRA.z-ULTRA.R-GAP],list=[];
  const place=(R,k)=>{const side=k?1:-1,z=zs[k]-R;zs[k]=z-R-GAP;return{x:side*(R+ROAD+10),z,R,side}};
  // other domes fill whichever side of the road is shorter
  S.areas.forEach(a=>list.push(a.hab==='dino'?{x:ULTRA.x,z:ULTRA.z,R:ULTRA.R,side:1,ultra:1}:place(50,zs[0]>=zs[1]?0:1)));
  const next=place(50,zs[0]>=zs[1]?0:1);
  return{list,next,end:Math.min(zs[0],zs[1])-20};
}

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
  const gt=NATURE.groundTextures('woodland'),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(430,430);nm.repeat.set(430,430);
  const gg=new T.PlaneGeometry(3200,3200,100,100);gg.rotateX(-Math.PI/2);gg.translate(0,0,-1200);
  const pc=gg.attributes.position,col=new Float32Array(pc.count*3),a=new T.Color(ZOO_ENV.ground),b=new T.Color(ZOO_ENV.patch),t=new T.Color();
  for(let i=0;i<pc.count;i++){t.copy(a).lerp(b,MESHER.fbm(pc.getX(i)*.02,0,pc.getZ(i)*.02));col.set([t.r*1.2,t.g*1.2,t.b*1.2],i*3)}
  gg.setAttribute('color',new T.BufferAttribute(col,3));
  const ground=new T.Mesh(gg,new T.MeshStandardMaterial({vertexColors:true,map,normalMap:nm,roughness:1}));ground.receiveShadow=true;scene.add(ground);
  // grass everywhere except on paths and inside the domes
  const [mc,mg]=NATURE.canvas(1024);zoo.mask={c:mc,g:mg,tex:NATURE.toTex(mc,false)};zoo.mask.tex.wrapS=zoo.mask.tex.wrapT=T.ClampToEdgeWrapping;
  zoo.grass=NATURE.makeGrass(ZOO_ENV,[],{flat:1,tile:120,maskTex:zoo.mask.tex,maskRect:new T.Vector3(MASK.x0,MASK.z0,MASK.size)});scene.add(zoo.grass);
  zoo.paths=new T.Group();scene.add(zoo.paths);
  // woods around the zoo, leaving room for lots more domes
  const types=NATURE.treeTypes('woodland'),r=rng(5);
  zoo.cols.push(...NATURE.scatter(scene,types,Math.round(1600*QUALITY.trees),rr=>{const x=(rr()-.5)*1400,z=40-rr()*2600;
    return(Math.abs(x)<300||x>0&&x<ULTRA.x+ULTRA.R+40&&z>ULTRA.z-ULTRA.R-40)&&z<60?null:V(x,0,z)},r));
  NATURE.scatter(scene,types,Math.round(260*QUALITY.trees),rr=>{const x=(rr()-.5)*700,z=60+rr()*300;return Math.abs(x)<20?null:V(x,0,z)},r);
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
  const pv=zoo.pave||(zoo.pave=pavingTexture()),L=zooLayout();
  const strip=(x0,z0,x1,z1)=>{const w=Math.abs(x1-x0),d=Math.abs(z1-z0),m=pv.map.clone(),n=pv.normal.clone();m.needsUpdate=n.needsUpdate=true;m.repeat.set(w/4,d/4);n.repeat.set(w/4,d/4);
    const o=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshStandardMaterial({map:m,normalMap:n,roughness:.9}));o.rotation.x=-Math.PI/2;o.position.set((x0+x1)/2,.04,(z0+z1)/2);o.receiveShadow=true;P.add(o)};
  strip(-ROAD,L.end,ROAD,40);
  for(const d of L.list)if(d.ultra)strip(ROAD,d.z-9,d.x-d.R+2,d.z+9);else strip(d.side>0?ROAD:-ROAD-11,d.z-6,d.side>0?ROAD+11:-ROAD,d.z+6);
  const pole=new T.MeshStandardMaterial({color:'#2a2c2e',metalness:.7,roughness:.4}),glow=new T.MeshStandardMaterial({color:'#fff6d8',emissive:'#ffe8b0',emissiveIntensity:1.2});
  for(let z=20;z>L.end;z-=30)for(const sx of[-1,1]){const l=new T.Group();l.position.set(sx*(ROAD+1.2),0,z+(sx>0?15:0));
    const p=new T.Mesh(new T.CylinderGeometry(.1,.14,5,8),pole);p.position.y=2.5;p.castShadow=true;l.add(p);
    const h=new T.Mesh(new T.SphereGeometry(.35,12,8),glow);h.position.y=5.1;l.add(h);P.add(l)}
  // the next empty plot
  const n=L.next,out=new T.Group();out.position.set(n.x,0,n.z);
  const dm=new T.MeshStandardMaterial({color:'#e8dcc0',roughness:.9});
  for(let i=0;i<80;i+=2){const a=i/80*Math.PI*2;const sg=new T.Mesh(new T.BoxGeometry(3,.06,.35),dm);sg.position.set(Math.sin(a)*n.R,.06,Math.cos(a)*n.R);sg.rotation.y=a+Math.PI/2;out.add(sg)}
  const st=new T.Mesh(new T.PlaneGeometry(8,2.5),new T.MeshStandardMaterial({map:signTexture(['Empty plot','Build a new dome here'],'#6a5a40'),roughness:.8,side:T.DoubleSide}));
  st.position.set(-n.side*(n.R-4),2.2,0);st.rotation.y=-n.side*Math.PI/2;out.add(st);
  P.add(out);
  drawMask();refreshZooWorld();if(zoo.people&&zoo.people.length)zoo.graph=pathGraph();
}
function drawMask(){
  const {g,tex}=zoo.mask,W=1024,k=W/MASK.size,X=x=>(x-MASK.x0)*k,Z=z=>(z-MASK.z0)*k,L=zooLayout();
  g.fillStyle='#fff';g.fillRect(0,0,W,W);g.fillStyle='#000';
  g.fillRect(X(-ROAD-1),Z(L.end),(ROAD*2+2)*k,(42-L.end)*k);
  for(const d of L.list){if(d.ultra)g.fillRect(X(ROAD),Z(d.z-10),(d.x-d.R-ROAD+3)*k,20*k);else g.fillRect(X(d.side>0?ROAD:-ROAD-12),Z(d.z-7),12*k,14*k);g.beginPath();g.arc(X(d.x),Z(d.z),(d.R+1.5)*k,0,7);g.fill()}
  tex.needsUpdate=true;
}

const habTypes={};
function buildArea(area,i){
  const D=zooLayout().list[i],{x,z,R:R0,side}=D,grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=-side*Math.PI/2;zoo.scene.add(grp);
  const E=ENV[area.hab];
  const gt=NATURE.groundTextures(area.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(R0/3.5,R0/3.5);nm.repeat.set(R0/3.5,R0/3.5);
  const gc=new T.Color(E.ground).multiplyScalar(1.15);
  const gm=new T.Mesh(new T.CircleGeometry(R0,96),new T.MeshStandardMaterial({color:gc,map,normalMap:nm,roughness:area.hab==='polar'?.55:1}));
  gm.rotation.x=-Math.PI/2;gm.position.y=.06;gm.receiveShadow=true;gm.userData.area=area.id;grp.add(gm);zoo.grounds.push(gm);
  const cols=[];
  // a big pond
  const pr=R0*.13,px=-R0*.32,pz=-R0*.25;
  const w=NATURE.waterMesh(pr,E.water);w.position.set(px,.12,pz);grp.add(w);zoo.waters.push(w);
  const rim=new T.Mesh(new T.TorusGeometry(pr,.5,8,64),NATURE.rockMat(E.rock));rim.rotation.x=-Math.PI/2;rim.position.set(px,.1,pz);rim.scale.z=.4;rim.receiveShadow=true;grp.add(rim);
  // full-size plants and rocks from that habitat, with a clear ring to drive round
  const types=habTypes[area.hab]||(habTypes[area.hab]=NATURE.treeTypes(area.hab));
  const rr=rng(area.id*97+3),lim=R0-4;
  const sized=types.map(t=>Object.assign({},t,{col:t.col?Math.min(t.col,2):0}));
  cols.push(...NATURE.scatter(grp,sized,Math.round((R0>200?650:60)*Math.max(.5,QUALITY.trees)),q=>{const a=q()*6.28,d=Math.sqrt(q())*lim;const p=V(Math.sin(a)*d,0,Math.cos(a)*d);
    if(Math.hypot(p.x-px,p.z-pz)<pr+3||d<R0*.22||(d>R0*.55&&d<R0*.72)||Math.abs(p.x)<10&&p.z>0)return null;return p},rr));
  if(R0>200){const vg=new T.CylinderGeometry(10,70,80,48,8,true),p=vg.attributes.position;for(let i=0;i<p.count;i++){const k=1+(MESHER.noise3(p.getX(i)*.05,p.getY(i)*.05,p.getZ(i)*.05)-.5)*.3;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k)}vg.computeVertexNormals();
    const [lc,lg]=NATURE.canvas(256);lg.fillStyle='#000';lg.fillRect(0,0,256,256);for(let i=0;i<7;i++){let x=Math.random()*256;lg.strokeStyle='#ff6a14';lg.lineWidth=3+Math.random()*4;lg.beginPath();lg.moveTo(x,0);for(let y=0;y<120+Math.random()*130;y+=8){x+=(Math.random()-.5)*6;lg.lineTo(x,y)}lg.stroke()}
    const vo=new T.Mesh(vg,new T.MeshStandardMaterial({color:'#3a3330',roughness:.95,emissive:'#ff5a14',emissiveMap:NATURE.toTex(lc,true),emissiveIntensity:1.3}));vo.position.set(-R0*.45,40,-R0*.4);vo.castShadow=true;grp.add(vo);
    const cr=new T.Mesh(new T.CircleGeometry(10,24),new T.MeshBasicMaterial({color:'#ff5a14'}));cr.rotation.x=-Math.PI/2;cr.position.set(-R0*.45,78,-R0*.4);grp.add(cr);cols.push({x:-R0*.45,z:-R0*.4,r:70})}
  const doors=buildDome(grp,R0);
  // sign beside the doorway
  const st=new T.Mesh(new T.PlaneGeometry(8,2.5),new T.MeshStandardMaterial({map:R0>200?signTexture(['ULTRA DINO DOME','Danger! Only with the zoo owner'],'#8a2a14'):signTexture([(i+1)+'. '+HAB[area.hab].name,'Giant Glass Dome']),roughness:.7}));
  st.position.set(13,2.6,R0+3);st.rotation.y=-.25;grp.add(st);
  const bw=NATURE.barkMat(false);for(const sd of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.25,3.2,.25),bw);p.position.set(13+sd*3.4,1.6,R0+3-sd*.85);p.castShadow=true;grp.add(p)}
  // the glass wall is solid except for the doorway; pond and trees block the truck too
  const da=doorAng(R0);
  for(let a=0;a<Math.PI*2;a+=1.8/R0){const d=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(d)<da)continue;cols.push({x:Math.sin(a)*R0,z:Math.cos(a)*R0,r:1})}
  cols.push({x:px,z:pz,r:pr});
  grp.updateMatrixWorld(true);const W=(lx,lz)=>{const v=grp.localToWorld(V(lx,0,lz));return{x:v.x,z:v.z}};
  zoo.areas.set(area.id,{grp,area,x,z,R0,side,doors,open:0,cols:cols.map(c=>Object.assign(W(c.x,c.z),{r:c.r})),
    pond:Object.assign(W(px,pz),{r:pr}),door:W(0,R0),inside:W(0,R0-16)});
}
const domeCache={};
function domeGeometry(R){
  if(domeCache[R])return domeCache[R];
  const da=doorAng(R),dh=R>200?18:R>60?15:11;
  const ico=new T.IcosahedronGeometry(R,R>200?11:R>60?5:4).toNonIndexed(),p=ico.attributes.position,keep=[],edges=new Map();
  const key=v=>v.toArray().map(n=>n.toFixed(2)).join(',');
  const door=v=>v.z>0&&Math.abs(Math.atan2(v.x,v.z))<da+.02&&v.y<dh;
  for(let i=0;i<p.count;i+=3){const a=V(p.getX(i),p.getY(i),p.getZ(i)),b=V(p.getX(i+1),p.getY(i+1),p.getZ(i+1)),c=V(p.getX(i+2),p.getY(i+2),p.getZ(i+2));
    if(Math.min(a.y,b.y,c.y)<-.01)continue;const cen=a.clone().add(b).add(c).divideScalar(3);if(door(cen))continue;keep.push(a,b,c);
    for(const[u,v]of[[a,b],[b,c],[c,a]]){const k=[key(u),key(v)].sort().join('|');if(!edges.has(k))edges.set(k,[u,v])}}
  const g=new T.BufferGeometry().setFromPoints(keep);g.computeVertexNormals();
  return domeCache[R]={glass:g,edges:[...edges.values()],dh};
}
function buildDome(grp,R){
  const D=domeGeometry(R),da=doorAng(R);
  const glass=new T.Mesh(D.glass,new T.MeshPhysicalMaterial({color:'#eaf7ff',transparent:true,opacity:.12,roughness:.03,metalness:.1,clearcoat:1,envMapIntensity:2.2,side:T.DoubleSide,depthWrite:false}));
  glass.renderOrder=2;grp.add(glass);
  const frame=new T.MeshStandardMaterial({color:'#f2f2ee',metalness:.6,roughness:.3});
  const cg=new T.CylinderGeometry(.14,.14,1,6),im=new T.InstancedMesh(cg,frame,D.edges.length),m4=new T.Matrix4();
  D.edges.forEach(([a,b],j)=>{const d=b.clone().sub(a),L=d.length();m4.compose(a.clone().addScaledVector(d,.5),new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()),V(1,L,1));im.setMatrixAt(j,m4)});
  im.castShadow=true;grp.add(im);
  const base=new T.Mesh(new T.CylinderGeometry(R+.4,R+.6,.8,160,1,true,da,Math.PI*2-da*2),NATURE.rockMat('#c8c0b0'));base.position.y=.4;base.receiveShadow=base.castShadow=true;grp.add(base);
  // doorway frame
  const dx=Math.sin(da)*R,dz=Math.cos(da)*R,dh=D.dh-1.5;
  for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.7,dh,.7),frame);p.position.set(s*dx,dh/2,dz);p.castShadow=true;grp.add(p)}
  const top=new T.Mesh(new T.BoxGeometry(dx*2+.7,.8,.7),frame);top.position.set(0,dh,dz);top.castShadow=true;grp.add(top);
  // two sliding gates that open when someone comes near
  const doors=[];
  const pane=new T.MeshPhysicalMaterial({color:'#dff2fa',transparent:true,opacity:.25,roughness:.05,clearcoat:1,side:T.DoubleSide,depthWrite:false});
  for(const sd of[-1,1]){const d=new T.Group();d.position.set(sd*dx/2,0,dz+.6);grp.add(d);
    const w=dx,h=dh-.5;const f=(x,y,sx,sy)=>{const m=new T.Mesh(new T.BoxGeometry(sx,sy,.28),frame);m.position.set(x,y,0);m.castShadow=true;d.add(m)};
    f(-w/2,h/2,.28,h);f(w/2,h/2,.28,h);f(0,h,w,.28);f(0,.15,w,.3);f(0,h*.38,w,.16);
    for(let i=1;i<6;i++)f(-w/2+i*w/6,h/2,.09,h);
    const g=new T.Mesh(new T.PlaneGeometry(w,h),pane);g.position.y=h/2;d.add(g);
    d.userData={sd,w};doors.push(d)}
  return doors;
}

/* ---------- animals living in the zoo ---------- */
function syncZooAnimals(){
  for(const a of zoo.animals)zoo.scene.remove(a.inst.g);zoo.animals=[];
  for(const area of S.areas){const A=zoo.areas.get(area.id);if(!A)continue;
    for(const an of area.animals){const sp=SP[an.k],inst=ANIMALS.make(sp),r=rng(an.uid*13);
      const p=randomSpot(A,r);const o={an,A,inst,x:p.x,z:p.z,tx:p.x,tz:p.z,yaw:r()*6.28,t:r()*3};
      inst.g.position.set(o.x,0,o.z);zoo.scene.add(inst.g);zoo.animals.push(o)}}
}
function randomSpot(A,r=Math.random){const lim=A.R0-5;for(let i=0;i<30;i++){const x=(r()-.5)*2*lim,z=(r()-.5)*2*lim;if(Math.hypot(x,z)>lim)continue;if(Math.hypot(A.x+x-A.pond.x,A.z+z-A.pond.z)<A.pond.r+2)continue;return{x:A.x+x,z:A.z+z}}return{x:A.x,z:A.z}}
function updateZooAnimals(dt,time){
  const driving=curView==='drive'&&world&&world.zoo,px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  for(const o of zoo.animals){
    // move out of the way of the jeep or of you
    if(driving&&Math.hypot(o.x-px,o.z-pz)<9){const a=Math.atan2(o.x-px,o.z-pz);const lim=o.A.R0-4;let nx=o.x+Math.sin(a)*8-o.A.x,nz=o.z+Math.cos(a)*8-o.A.z;const d=Math.hypot(nx,nz);if(d>lim){nx*=lim/d;nz*=lim/d}o.tx=o.A.x+nx;o.tz=o.A.z+nz;o.t=2}
    const dx=o.tx-o.x,dz=o.tz-o.z,d=Math.hypot(dx,dz);let spd=0;
    if(d>.4){spd=Math.min(SP[o.an.k].s*(driving&&o.t===2?1.4:.55),d);o.x+=dx/d*spd*dt;o.z+=dz/d*spd*dt;
      const ty=Math.atan2(dx,dz);let dy=ty-o.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));o.yaw+=dy*Math.min(1,dt*4)}
    else{o.t-=dt;if(o.t<=0){o.t=3+Math.random()*6;const p=randomSpot(o.A);o.tx=p.x;o.tz=p.z}}
    const far=Math.hypot(o.x-cam.position.x,o.z-cam.position.z)>110;if(far!==o.far){o.far=far;ANIMALS.setLOD(o.inst,far)}
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
function focusArea(id){const A=zoo.areas.get(id);if(!A)return;const w=zoo.cam.w;w.tx=A.x;w.tz=A.z;w.dist=A.R0*2.6;w.pitch=Math.max(.45,Math.min(w.pitch,.8))}
function zooTick(dt,time){
  updateZooAnimals(dt,time);updateVisitors(dt,time);updateTours(dt,time);updateDinoTour(dt);
  const driving=curView==='drive'&&world&&world.zoo;
  for(const A of zoo.areas.values()){const gx=A.door.x,gz=A.door.z;let near=false;
    if(driving&&Math.hypot((mode==='car'?car.x:me.x)-gx,(mode==='car'?car.z:me.z)-gz)<20)near=true;
    if(!near&&zoo.people&&A.R0<200)for(const v of zoo.people)if(Math.hypot(v.x-gx,v.z-gz)<9){near=true;break}
    if(!near&&zoo.tours)for(const t of zoo.tours)if(Math.hypot(t.x-gx,t.z-gz)<22){near=true;break}
    A.open+=((near?1:0)-A.open)*Math.min(1,dt*2.5);
    for(const d of A.doors){const{sd,w}=d.userData;d.position.x=sd*(w/2+A.open*w*.95)}}
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
  if(!ANIMALS.isBuilt(personSp('staff'))){progress('Zoo workers are getting the tour cars ready…');await nextFrame();ANIMALS.species(personSp('staff'))}
  syncVisitors();syncTours();
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
  w.bounds={x0:-290,x1:ULTRA.x+ULTRA.R+40,z0:zooLayout().end-40,z1:80};
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
const STAFF={s:1,skin:'#c99a74',shirt:'#3f6a2a',pants:'#5a4a32',hair:'#2a1a10',shoes:'#2a2018',hat:'#2f5a22',short:1};
function personSp(i){return personSps[i]||(personSps[i]={k:'person'+i,n:i==='staff'?'Zoo worker':'Visitor',def:Object.assign({plan:'person'},i==='staff'?STAFF:LOOKS[i])})}
function pathGraph(){
  const nodes=[],link=(a,b)=>{a.nb.push(b);b.nb.push(a)},L=zooLayout();
  const gate={x:0,z:44,nb:[],gate:1};nodes.push(gate);
  // nodes down the middle of the road, one level with every dome
  const zs=[...new Set([10,...L.list.map(d=>Math.round(d.z)),Math.round(L.end+10)])].sort((a,b)=>b-a);
  const road=zs.map(z=>{const n={x:0,z,nb:[]};nodes.push(n);return n});link(gate,road[0]);for(let i=1;i<road.length;i++)link(road[i-1],road[i]);
  S.areas.forEach((a,i)=>{const A=zoo.areas.get(a.id);if(!A)return;const d=L.list[i],rn=road.find(n=>n.z===Math.round(d.z));
    // a spot at the dome gate to look in, and a spot inside the dome
    const v={x:d.ultra?d.x-d.R-7:d.side*(ROAD+6),z:d.z,nb:[],view:1,face:d.side*Math.PI/2};nodes.push(v);link(rn,v);
    if(d.ultra)return;
    const ins={x:A.inside.x,z:A.inside.z+(Math.random()-.5)*8,nb:[],inside:1};ins.face=Math.atan2(A.x-ins.x,A.z-ins.z);nodes.push(ins);link(v,ins)});
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
    if(v.wait>0){v.wait-=dt;if(v.from.view||v.from.inside){const ty=v.from.face??Math.PI;let d=ty-v.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));v.yaw+=d*Math.min(1,dt*3);look=Math.sin(time*.7+v.off)*.4}}
    else{
      const dx=v.to.x-v.from.x,dz=v.to.z-v.from.z,L=Math.hypot(dx,dz)||1,ox=-dz/L*v.off,oz=dx/L*v.off;
      const tx=v.to.x+(v.to.view||v.to.inside?0:ox),tz=v.to.z+(v.to.view||v.to.inside?0:oz),ex=tx-v.x,ez=tz-v.z,d=Math.hypot(ex,ez);
      if(d<.5){const prev=v.from;v.from=v.to;const opts=v.from.nb.filter(n=>n!==prev);v.to=(opts.length?opts:v.from.nb)[Math.floor(Math.random()*(opts.length||v.from.nb.length))];
        if(v.from.inside)v.wait=6+Math.random()*8;else if(v.from.view)v.wait=2+Math.random()*4;else if(Math.random()<.12)v.wait=1+Math.random()*3}
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

/* ---------- tour cars: zoo workers drive visitors around the domes, and visitors pay ---------- */
function seat(inst){const B=inst.B;for(let i=0;i<2;i++){B['leg'+i].rotation.x=-1.45;B['low'+i].rotation.x=1.4;B['arm'+i].rotation.x=-.4}inst.rest=B.root.position.y}
function tourCarModel(){
  const g=new T.Group(),paint=new T.MeshPhysicalMaterial({color:'#f4f2ea',roughness:.35,clearcoat:.6}),green=new T.MeshStandardMaterial({color:'#2f6a32',roughness:.6}),dark=new T.MeshStandardMaterial({color:'#1d1c1a',roughness:.9});
  const B=(m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o)};
  B(paint,0,.75,0,2,.6,4.6);B(green,0,.9,0,2.02,.12,4.62);B(paint,0,1.15,-1.9,1.9,.35,.8);
  for(const x of[-.95,.95])for(const z of[-2.1,2.1]){B(dark,x,1.9,z,.08,1.8,.08)}B(green,0,2.85,0,2.1,.1,4.5);
  for(const z of[-.9,.3,1.5])B(new T.MeshStandardMaterial({color:'#6a4a2a'}),0,1.1,z,1.8,.15,.6);
  for(const x of[-1,1])for(const z of[-1.5,1.5]){const w=new T.Mesh(new T.CylinderGeometry(.4,.4,.3,16),dark);w.rotation.z=Math.PI/2;w.position.set(x,.4,z);g.add(w)}
  const sign=new T.Mesh(new T.PlaneGeometry(1.8,.35),new T.MeshStandardMaterial({map:signTexture(['ZOO TOURS'],'#2f6a32'),roughness:.7}));sign.position.set(0,3.05,-2.26);sign.rotation.y=Math.PI;g.add(sign);
  return g;
}
function tourRoute(){
  const L=zooLayout(),pts=[{x:2.5,z:40}];
  S.areas.forEach((a,i)=>{const A=zoo.areas.get(a.id),d=L.list[i];if(!A||d.ultra)return;
    // drive down the road, in through the gate, once round the inside ring and back out
    pts.push({x:2.5*d.side,z:d.z},{x:A.door.x,z:A.door.z});
    const ring=A.R0*.63,start=Math.atan2(A.door.x-A.x,A.door.z-A.z);
    for(let k=0;k<=10;k++){const a=start+k/10*Math.PI*2*d.side;pts.push({x:A.x+Math.sin(a)*ring,z:A.z+Math.cos(a)*ring,pay:k===10?1:0})}
    pts.push({x:A.door.x,z:A.door.z},{x:2.5*d.side,z:d.z})});
  pts.push({x:-2.5,z:L.end+30},{x:-2.5,z:40});
  return pts;
}
function syncTours(){
  for(const t of zoo.tours||[])zoo.scene.remove(t.g);zoo.tours=[];
  const n=S.areas.some(a=>a.hab!=='dino')?2:0,route=tourRoute();
  for(let i=0;i<n;i++){const g=tourCarModel();zoo.scene.add(g);
    const driver=ANIMALS.make(personSp('staff'));seat(driver);driver.g.position.set(-.45,.7,-1.2);g.add(driver.g);
    const riders=[];[[-.5,-.1],[.5,-.1],[-.5,1.1],[.5,1.1]].forEach(([x,z],j)=>{const r=ANIMALS.make(personSp((i*4+j)%LOOKS.length));seat(r);r.g.position.set(x,.75,z);g.add(r.g);riders.push(r)});
    const k=Math.floor(i*route.length/n);zoo.tours.push({g,route,k,x:route[k].x,z:route[k].z,yaw:0,riders,driver})}
  const el=$('#tours');if(el){el.textContent='🚙 '+n+' tour cars';el.hidden=!n}
}
function updateTours(dt,time){
  if(!zoo.tours)return;
  for(const t of zoo.tours){const p=t.route[t.k],dx=p.x-t.x,dz=p.z-t.z,d=Math.hypot(dx,dz),spd=7;
    if(d<1.5){if(p.pay){const fee=t.riders.length*3;S.coins+=fee;save();coins();if(curView==='zoo'&&Math.random()<.3)toast('🚙 A tour car finished a dome tour: +'+fee+' coins')}t.k=(t.k+1)%t.route.length}
    else{t.x+=dx/d*Math.min(spd*dt,d);t.z+=dz/d*Math.min(spd*dt,d);const ty=Math.atan2(-dx,-dz);let dy=ty-t.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));t.yaw+=dy*Math.min(1,dt*4)}
    t.g.position.set(t.x,0,t.z);t.g.rotation.y=t.yaw;
    for(const r of t.riders)r.B.head.rotation.y=Math.sin(time*.8+r.seed)*.6;
  }
}

/* ---------- Dino Tour: visitors pay to ride in your truck into the Ultra Dino Dome ---------- */
const dinoTour={on:false,riders:[],entered:0,inside:false};
function startDinoTour(){
  const n=3,fee=60*n;S.coins+=fee;save();coins();
  dinoTour.on=true;dinoTour.entered=0;dinoTour.inside=false;dinoTour.riders=[];
  [[-.5,1.42],[0,1.42],[.5,1.42]].forEach(([x,z],j)=>{const r=ANIMALS.make(personSp((j*3+2)%LOOKS.length));seat(r);r.g.position.set(x,1.2,z);car.g.add(r.g);dinoTour.riders.push(r)});
  toast('🦖 '+n+' visitors paid '+fee+' coins for a Dino Tour! Drive them into the Ultra Dino Dome, then bring them back out safely.');
}
function updateDinoTour(dt){
  if(!dinoTour.on||!(world&&world.zoo)||curView!=='drive')return;
  const A=[...zoo.areas.values()].find(a=>a.R0>200);if(!A)return;
  const inside=Math.hypot(car.x-A.x,car.z-A.z)<A.R0-2;
  for(const r of dinoTour.riders){r.B.head.rotation.y=Math.sin(performance.now()/700+r.seed)*.7}
  if(inside&&!dinoTour.inside){dinoTour.inside=true;toast(dinoTour.entered?'Back in the Ultra Dino Dome!':'The visitors are amazed! Look at all the dinosaurs! Drive around, then take them back out.')}
  if(inside)dinoTour.entered+=dt;
  if(!inside&&dinoTour.inside){dinoTour.inside=false;
    if(dinoTour.entered>20){const tip=150;S.coins+=tip;save();coins();toast('Dino Tour complete! The visitors loved it and gave you a '+tip+' coin tip!');endDinoTour()}
    else toast('That was quick! Drive them round the Ultra Dino Dome a bit longer.')}
}
function endDinoTour(){for(const r of dinoTour.riders)r.g.parent&&r.g.parent.remove(r.g);dinoTour.riders=[];dinoTour.on=false}
