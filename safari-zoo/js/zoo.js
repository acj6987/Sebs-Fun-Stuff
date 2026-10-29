// Your zoo in 3D: big glass domes you can drive into, paths, lamps and signs, with your animals living inside.
const ZOO_ENV={zen:'#4a88d0',hor:'#e2ecf0',fog:'#d3e0e6',ground:'#5f8a3c',patch:'#4c7530',rock:'#7a7c78',water:'#3f7896',grass:['#3a6a22','#8cbc54'],grassH:.32,grassN:70000,sunEl:.75};
// ginormous domes so every animal can be its real size; the Dino Zone dome is the biggest of all
const ROAD=7,GAP=24,MASK={x0:-1400,z0:-2700,size:2800};
// the Ultra Dino Dome sits beside the start of the road and holds every dinosaur
const MEGA=200; // every dome is a mega dome
const DREAM_R=300; // the giant Mummy Dream Dome: first one along the road, just for the two Mummy Dreams
const ULTRA={R:300,x:ROAD+16+300,z:-16-300};
const doorAng=R=>9/R; // half-width of the doorway, in radians around the dome
const zoo={scene:null,running:false,areas:new Map(),animals:[],grounds:[],waters:[],cols:[],cam:{yaw:.5,pitch:.75,dist:700,tx:0,tz:-400,w:{yaw:.5,pitch:.75,dist:700,tx:0,tz:-400}},sel:null,mask:null};
// domes line both sides of one long road that starts at the gate
function zooLayout(){
  // the Mummy Dream Dome is first on the right, right at the front; the Ultra Dino Dome sits just behind it
  const dream=S.areas.some(a=>a.hab==='dream');ULTRA.z=-16-ULTRA.R-(dream?DREAM_R*2+GAP:0);
  const zs=[-16,ULTRA.z-ULTRA.R-GAP],list=[];
  const place=(R,k)=>{const side=k?1:-1,z=zs[k]-R;zs[k]=z-R-GAP;return{x:side*(R+ROAD+10),z,R,side}};
  // other domes fill whichever side of the road is shorter
  S.areas.forEach(a=>list.push(a.hab==='dino'?{x:ULTRA.x,z:ULTRA.z,R:ULTRA.R,side:1,ultra:1}:a.hab==='dream'?{x:ROAD+16+DREAM_R,z:-16-DREAM_R,R:DREAM_R,side:1,ultra:1}:place(MEGA,zs[0]>=zs[1]?0:1)));
  const next=place(MEGA,zs[0]>=zs[1]?0:1);
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
    return(Math.abs(x)<ROAD+10+MEGA*2+40||x>0&&x<ULTRA.x+ULTRA.R+40)&&z<60?null:V(x,0,z)},r));
  NATURE.scatter(scene,types,Math.round(260*QUALITY.trees),rr=>{const x=(rr()-.5)*900,z=60+rr()*300;return Math.abs(x)<110&&z<190?null:V(x,0,z)},r);
  buildEntrance();buildFoodStore();buildNursery();buildFamilyPens();buildDoctor();buildLab();buildStaffArea();buildLaunchRoom();
  // planes flying high over the zoo
  zoo.skyPlanes=[0,1,2].map(i=>{const g=planeModel();g.scale.setScalar(1.6);scene.add(g);return{g,a:i*2.1,r:350+i*120,h:110+i*35,spd:(i%2?-1:1)*(30+i*6),cx:0,cz:-500}});
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
  strip(-ROAD,L.end,ROAD,40);strip(RIDE.x+RIDE.rx-1,RIDE.z-2.5,-ROAD,RIDE.z+2.5);strip(ROAD,FOOD.z-4,FOOD.x-FOOD.D/2+1,FOOD.z+4);strip(ROAD,NURSE.z-4,NURSE.x-NURSE.D/2+1,NURSE.z+4);
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
  buildTunnel();buildFence(L);drawMask();refreshZooWorld();if(zoo.people&&zoo.people.length)zoo.graph=pathGraph();
}
function drawMask(){
  const {g,tex}=zoo.mask,W=1024,k=W/MASK.size,X=x=>(x-MASK.x0)*k,Z=z=>(z-MASK.z0)*k,L=zooLayout();
  g.fillStyle='#fff';g.fillRect(0,0,W,W);g.fillStyle='#000';
  g.fillRect(X(-ROAD-1),Z(L.end),(ROAD*2+2)*k,(42-L.end)*k);g.beginPath();g.ellipse(X(RIDE.x),Z(RIDE.z),(RIDE.rx+3)*k,(RIDE.rz+3)*k,0,0,7);g.fill();g.fillRect(X(RIDE.x+RIDE.rx),Z(RIDE.z-2.5),(-ROAD-RIDE.x-RIDE.rx)*k,5*k);g.fillRect(X(-75),Z(30),150*k,135*k);g.fillRect(X(ROAD),Z(FOOD.z-FOOD.W/2-2),(FOOD.x+FOOD.D/2+2-ROAD)*k,(FOOD.W+4)*k);g.fillRect(X(ROAD),Z(NURSE.z-NURSE.W/2-2),(NURSE.x+NURSE.D/2+2-ROAD)*k,(NURSE.W+4)*k);
  for(const c of[STAFF_AREA,LUNCH])g.fillRect(X(c.x-c.w/2-1),Z(c.z-c.d/2-1),(c.w+2)*k,(c.d+8)*k);
  if(zoo.tunnel){const t=zoo.tunnel;g.strokeStyle='#000';g.lineWidth=20*k;g.beginPath();g.moveTo(X(t.p0.x),Z(t.p0.z));g.lineTo(X(t.p1.x),Z(t.p1.z));g.stroke()}
  for(const d of L.list){if(d.ultra)g.fillRect(X(ROAD),Z(d.z-10),(d.x-d.R-ROAD+3)*k,20*k);else g.fillRect(X(d.side>0?ROAD:-ROAD-12),Z(d.z-7),12*k,14*k);g.beginPath();g.arc(X(d.x),Z(d.z),(d.R+1.5)*k,0,7);g.fill()}
  tex.needsUpdate=true;
}

const habTypes={};
function buildArea(area,i){
  const D=zooLayout().list[i],{x,z,R:R0,side}=D,grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=-side*Math.PI/2;zoo.scene.add(grp);
  const E=ENV[area.hab];
  const gt=NATURE.groundTextures(area.hab),map=gt.map.clone(),nm=gt.normal.clone();map.needsUpdate=nm.needsUpdate=true;map.repeat.set(R0/3.5,R0/3.5);nm.repeat.set(R0/3.5,R0/3.5);
  const gc=new T.Color(E.ground).multiplyScalar(1.15),dreamy=area.hab==='dream',sea=area.hab==='ocean'||dreamy;
  // a big pond; the Ocean Dome has a huge deep pool for its fish, and the Mummy Dream Dome a lagoon with islands
  const pr=R0*(dreamy?.42:sea?.4:.12),px=-R0*.35,pz=R0*.05;
  let ggeo;if(sea){const sh=new T.Shape();sh.absarc(0,0,R0,0,Math.PI*2);const hole=new T.Path();hole.absarc(px,-pz,pr,0,Math.PI*2,true);sh.holes.push(hole);ggeo=new T.ShapeGeometry(sh,96);map.repeat.set(1/3.5,1/3.5);nm.repeat.set(1/3.5,1/3.5)}
  else ggeo=new T.CircleGeometry(R0,96);
  const gm=new T.Mesh(ggeo,new T.MeshStandardMaterial({color:gc,map,normalMap:nm,roughness:area.hab==='polar'?.55:1}));
  gm.rotation.x=-Math.PI/2;gm.position.y=.06;gm.receiveShadow=true;gm.userData.area=area.id;grp.add(gm);zoo.grounds.push(gm);
  const cols=[];
  const w=NATURE.waterMesh(pr,E.water);w.position.set(px,.12,pz);grp.add(w);zoo.waters.push(w);
  if(sea){w.material.opacity=.38;const sand=new T.MeshStandardMaterial({color:'#2f9aa8',roughness:1}),wall=new T.MeshStandardMaterial({color:'#d8c48a',roughness:.95,side:T.BackSide});
    const side=new T.Mesh(new T.CylinderGeometry(pr,pr*.92,6,96,1,true),wall);side.position.set(px,-3,pz);grp.add(side);
    const bot=new T.Mesh(new T.CircleGeometry(pr*.92,64),sand);bot.rotation.x=-Math.PI/2;bot.position.set(px,-6,pz);bot.receiveShadow=true;grp.add(bot)}
  const isl=[];
  if(dreamy){const sandM=new T.MeshStandardMaterial({color:'#f2dca0',roughness:1}),grassM=new T.MeshStandardMaterial({color:'#7ac85a',roughness:1}),palms=(habTypes.ocean||(habTypes.ocean=NATURE.treeTypes('ocean'))).filter((t,j)=>j<2);
    [[-.35,-.25,.32],[.3,.15,.26],[-.1,.45,.22],[.35,-.45,.18]].forEach(([a,b,s2],j)=>{const ix=px+a*pr,iz=pz+b*pr,ir=pr*s2;
      const m=new T.Mesh(new T.CylinderGeometry(ir,ir*1.2,7,40),sandM);m.position.set(ix,-2.6,iz);m.receiveShadow=true;grp.add(m);
      const top=new T.Mesh(new T.CircleGeometry(ir*.8,40),grassM);top.rotation.x=-Math.PI/2;top.position.set(ix,.92,iz);top.receiveShadow=true;grp.add(top);
      NATURE.scatter(grp,palms,6,q=>{const a2=q()*6.28,d=Math.sqrt(q())*ir*.7;return V(ix+Math.sin(a2)*d,.9,iz+Math.cos(a2)*d)},rng(j+7));isl.push({x:ix,z:iz,r:ir})})}
  const rim=new T.Mesh(new T.TorusGeometry(pr,.5,8,64),NATURE.rockMat(E.rock));rim.rotation.x=-Math.PI/2;rim.position.set(px,.1,pz);rim.scale.z=.4;rim.receiveShadow=true;grp.add(rim);
  // full-size plants and rocks from that habitat, with a clear ring to drive round
  const types=habTypes[area.hab]||(habTypes[area.hab]=NATURE.treeTypes(area.hab));
  const rr=rng(area.id*97+3),lim=R0-4;
  const sized=types.map(t=>Object.assign({},t,{col:t.col?Math.min(t.col,2):0}));
  cols.push(...NATURE.scatter(grp,sized,Math.round((R0>250?650:R0>150?380:60)*Math.max(.5,QUALITY.trees)),q=>{const a=q()*6.28,d=Math.sqrt(q())*lim;const p=V(Math.sin(a)*d,0,Math.cos(a)*d);
    if(Math.hypot(p.x-px,p.z-pz)<pr+3||d<R0*.22||(d>R0*.55&&d<R0*.72)||Math.abs(p.x)<10&&p.z>0||Math.hypot(p.x,p.z-(R0-Math.min(R0*.3,R0>250?75:45)-22))<Math.min(R0*.3,R0>250?75:45)+6)return null;return p},rr));
  if(area.hab==='dino'){const vg=new T.CylinderGeometry(10,70,80,48,8,true),p=vg.attributes.position;for(let i=0;i<p.count;i++){const k=1+(MESHER.noise3(p.getX(i)*.05,p.getY(i)*.05,p.getZ(i)*.05)-.5)*.3;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k)}vg.computeVertexNormals();
    const [lc,lg]=NATURE.canvas(256);lg.fillStyle='#000';lg.fillRect(0,0,256,256);for(let i=0;i<7;i++){let x=Math.random()*256;lg.strokeStyle='#ff6a14';lg.lineWidth=3+Math.random()*4;lg.beginPath();lg.moveTo(x,0);for(let y=0;y<120+Math.random()*130;y+=8){x+=(Math.random()-.5)*6;lg.lineTo(x,y)}lg.stroke()}
    const vo=new T.Mesh(vg,new T.MeshStandardMaterial({color:'#3a3330',roughness:.95,emissive:'#ff5a14',emissiveMap:NATURE.toTex(lc,true),emissiveIntensity:1.3}));vo.position.set(-R0*.45,40,-R0*.4);vo.castShadow=true;grp.add(vo);
    const cr=new T.Mesh(new T.CircleGeometry(10,24),new T.MeshBasicMaterial({color:'#ff5a14'}));cr.rotation.x=-Math.PI/2;cr.position.set(-R0*.45,78,-R0*.4);grp.add(cr);cols.push({x:-R0*.45,z:-R0*.4,r:70})}
  const doors=buildDome(grp,R0);
  // sign beside the doorway
  const st=new T.Mesh(new T.PlaneGeometry(8,2.5),new T.MeshStandardMaterial({map:area.hab==='dino'?signTexture(['ULTRA DINO DOME','Danger! Only with the zoo owner'],'#8a2a14'):area.hab==='carnivore'?signTexture([(i+1)+'. CARNIVORE DINO DOME','Danger! Meat eaters! Only with the owner'],'#8a2a14'):area.hab==='dream'?signTexture(['💖 MUMMY DREAM DOME 💙','The only two in the whole world!'],'#c2368a'):signTexture([(i+1)+'. '+HAB[area.hab].name+' Mega Dome','Visitors only with the zoo owner']),roughness:.7}));
  st.position.set(13,2.6,R0+3);st.rotation.y=-.25;grp.add(st);
  const bw=NATURE.barkMat(false);for(const sd of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.25,3.2,.25),bw);p.position.set(13+sd*3.4,1.6,R0+3-sd*.85);p.castShadow=true;grp.add(p)}
  // the glass wall is solid except for the doorway; pond and trees block the truck too
  const da=doorAng(R0);
  for(let a=0;a<Math.PI*2;a+=1.8/R0){const d=Math.atan2(Math.sin(a),Math.cos(a));if(Math.abs(d)<da)continue;cols.push({x:Math.sin(a)*R0,z:Math.cos(a)*R0,r:1})}
  cols.push({x:px,z:pz,r:pr});
  const house=buildHouse(grp,R0,cols);
  buildBarn(grp,R0,cols,area);
  grp.updateMatrixWorld(true);const W=(lx,lz)=>{const v=grp.localToWorld(V(lx,0,lz));return{x:v.x,z:v.z}};
  zoo.areas.set(area.id,{grp,area,x,z,R0,side,doors,open:0,cols:cols.map(c=>Object.assign(W(c.x,c.z),{r:c.r})),
    pond:Object.assign(W(px,pz),{r:pr}),door:W(0,R0),inside:W(0,R0-16),house,food:[],islands:isl.map(q=>Object.assign(W(q.x,q.z),{r:q.r}))});
}
// the animal house: a big barn inside the dome with an open front, where animals shelter and mums have their babies
function buildHouse(grp,R0,cols){
  const big=R0>250,r=Math.min(R0*.3,big?75:45),D=big?30:18,W=big?44:26,Ht=big?24:12,hx=-r*.66,hz=R0-r-22;
  const wall=new T.MeshStandardMaterial({color:'#8a5a34',roughness:.9}),roofM=new T.MeshStandardMaterial({color:'#5a2a1c',roughness:.75}),straw=new T.MeshStandardMaterial({color:'#c8a85a',roughness:1});
  const g=new T.Group();g.position.set(hx,0,hz);grp.add(g);
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o)};
  box(wall,-D/2,Ht/2,0,.6,Ht,W);for(const sd of[-1,1])box(wall,0,Ht/2,sd*W/2,D,Ht,.6);
  for(const sd of[-1,1])box(wall,D/2,Ht/2,sd*(W/2-1.2),.8,Ht,2.4);
  box(wall,D/2,Ht-1,0,.8,2,W);
  const rs=new T.Shape();rs.moveTo(-W/2-1.5,0);rs.lineTo(W/2+1.5,0);rs.lineTo(0,W*.28);rs.closePath();
  const rg=new T.ExtrudeGeometry(rs,{depth:D+2,bevelEnabled:false});rg.translate(0,0,-(D+2)/2);rg.rotateY(Math.PI/2);
  const roof=new T.Mesh(rg,roofM);roof.position.y=Ht;roof.castShadow=true;g.add(roof);
  const fl=new T.Mesh(new T.PlaneGeometry(D-1,W-1),straw);fl.rotation.x=-Math.PI/2;fl.position.y=.09;fl.receiveShadow=true;g.add(fl);
  const st=new T.Mesh(new T.PlaneGeometry(big?10:6,big?3:1.8),new T.MeshStandardMaterial({map:signTexture(['ANIMAL HOUSE'],'#4a3020'),roughness:.7}));st.position.set(D/2+.45,Ht-1,0);st.rotation.y=Math.PI/2;g.add(st);
  for(let z=-W/2;z<=W/2;z+=1.8)cols.push({x:hx-D/2,z:hz+z,r:1});
  for(const sd of[-1,1]){for(let x=-D/2;x<=D/2;x+=1.8)cols.push({x:hx+x,z:hz+sd*W/2,r:1});cols.push({x:hx+D/2,z:hz+sd*(W/2-1.2),r:1.4})}
  return{g,D,W}
}
// a spot inside the animal house
function houseSpot(A,r=Math.random){const h=A.house,v=h.g.localToWorld(V((r()-.5)*(h.D-5),0,(r()-.5)*(h.W-5)));return{x:v.x,z:v.z}}
const domeCache={};
function domeGeometry(R){
  if(domeCache[R])return domeCache[R];
  const da=doorAng(R),dh=R>150?18:R>60?15:11;
  const ico=new T.IcosahedronGeometry(R,R>250?11:R>150?8:R>60?5:4).toNonIndexed(),p=ico.attributes.position,keep=[],edges=new Map();
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
    for(const an of area.animals){const r=rng(an.uid*13),p=swims(an)?poolSpot(A,r):an.preg?houseSpot(A,r):randomSpot(A,r);addZooAnimal(an,A,p.x,p.z,r()*6.28)}}
  for(const A of zoo.areas.values())syncBarn(A);
  if(zoo.vetArea)zoo.vetArea.area=vetWard();
  for(const P of[...(zoo.penAreas||[]),zoo.vetArea].filter(Boolean))for(const an of P.area.animals){const o=addZooAnimal(an,P,P.x+(Math.random()-.5)*8,P.z+(Math.random()-.5)*8,Math.random()*6.28);const k=Math.min(1,5/o.inst.h,9/Math.max(o.inst.len,1));if(k<1)o.inst.inner.scale.multiplyScalar(k)}
  syncMumTags();
}
function addZooAnimal(an,A,x,z,yaw){const inst=ANIMALS.make(SP[an.k]),o={an,A,inst,x,z,tx:x,tz:z,yaw,t:Math.random()*3};inst.g.position.set(x,0,z);zoo.scene.add(inst.g);zoo.animals.push(o);return o}
// what an animal eats: meat for hunters, hay for everyone else
const eats=sp=>sp.def.swim?null:sp.def.hunts||sp.hab==='carnivore'?'meat':'hay';
// where an animal wants to go next: food, the house, or somewhere near the gate
function nextSpot(o){
  if(swims(o.an))return poolSpot(o.A);
  if(SP[o.an.k].def.soar&&o.A.islands&&o.A.islands.length&&Math.random()<.55){const q=Math.random()<.6?o.A.islands[Math.floor(Math.random()*o.A.islands.length)]:null;
    if(q){const a=Math.random()*6.28,d=Math.random()*q.r*.6;return{x:q.x+Math.sin(a)*d,z:q.z+Math.cos(a)*d}}return poolSpot(o.A)}
  if(o.A.pen==='barn')return barnSpot(o.A);
  if(o.A.pen)return{x:o.A.x+(Math.random()-.5)*12,z:o.A.z+(Math.random()-.5)*12};
  const pile=o.A.food.find(f=>f.type===eats(SP[o.an.k]));
  if(pile){const a=(o.an.uid*2.4)%6.28,d=pile.r+1+SP[o.an.k].def.L*.6||3;return{x:pile.x+Math.sin(a)*d,z:pile.z+Math.cos(a)*d,pile}}
  if(o.an.preg||Math.random()<.18)return houseSpot(o.A);
  return randomSpot(o.A);
}
function homeOf(A){const r=Math.min(A.R0*.3,A.R0>250?75:45),k=(A.R0-r-22)/A.R0;return{x:A.x+(A.door.x-A.x)*k,z:A.z+(A.door.z-A.z)*k,r}}
// what kind of baby a mum has: a mix baby, a girl or boy Mummy Dream, or one like her
function babyKind(an){const k=an.pregK,mate=SP[an.k].def.mate;delete an.pregK;return k||(mate&&Math.random()<.5?mate:an.k)}
function poolSpot(A,r=Math.random){const a=r()*6.28,d=Math.sqrt(r())*A.pond.r*.82;return{x:A.pond.x+Math.sin(a)*d,z:A.pond.z+Math.cos(a)*d}}
const swims=an=>!!SP[an.k].def.swim;
function randomSpot(A,r=Math.random){const h=homeOf(A);for(let i=0;i<30;i++){const a=r()*6.28,d=Math.sqrt(r())*h.r,x=h.x+Math.sin(a)*d,z=h.z+Math.cos(a)*d;if(Math.hypot(x-A.pond.x,z-A.pond.z)<A.pond.r+2)continue;return{x,z}}return{x:h.x,z:h.z}}
function updateZooAnimals(dt,time){
  const driving=curView==='drive'&&world&&world.zoo,px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  for(const o of zoo.animals){
    if(o.follow&&driving&&mode==='foot'){const b=V(Math.sin(look.yaw),0,Math.cos(look.yaw)),side=o.follow===1?-1:1;o.tx=me.x+b.x*4+b.z*side*2.5;o.tz=me.z+b.z*4-b.x*side*2.5;o.t=1}
    // move out of the way of the jeep or of you
    if(driving&&!o.follow&&!swims(o.an)&&Math.hypot(o.x-px,o.z-pz)<9){const a=Math.atan2(o.x-px,o.z-pz);const lim=o.A.R0-4;let nx=o.x+Math.sin(a)*8-o.A.x,nz=o.z+Math.cos(a)*8-o.A.z;const d=Math.hypot(nx,nz);if(d>lim){nx*=lim/d;nz*=lim/d}o.tx=o.A.x+nx;o.tz=o.A.z+nz;o.t=2}
    const dx=o.tx-o.x,dz=o.tz-o.z,d=Math.hypot(dx,dz);let spd=0;
    if(d>.4){spd=Math.min(SP[o.an.k].s*(o.follow||o.dash?2.2:driving&&o.t===2?1.4:.55),o.follow?d*2:d);o.x+=dx/d*spd*dt;o.z+=dz/d*spd*dt;
      const ty=Math.atan2(dx,dz);let dy=ty-o.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));o.yaw+=dy*Math.min(1,dt*4)}
    else{o.t-=dt;o.dash=0;if(o.pile&&o.pile.left>0){o.pile.left-=dt;o.t=Math.max(o.t,.5)}
      if(o.t<=0){o.t=3+Math.random()*6;const p=nextSpot(o);o.tx=p.x;o.tz=p.z;o.pile=p.pile||null}}
    if(o.pile&&o.pile.left<=0)o.pile=null;
    if(o.A.pen==='barn'){const b=o.A.b;o.x=clamp(o.x,b.x0,b.x1);o.z=clamp(o.z,b.z0,b.z1);o.tx=clamp(o.tx,b.x0,b.x1);o.tz=clamp(o.tz,b.z0,b.z1)}
    const far=Math.hypot(o.x-cam.position.x,o.z-cam.position.z)>110;if(far!==o.far){o.far=far;ANIMALS.setLOD(o.inst,far)}
    ANIMALS.animate(o.inst,dt,spd,time,{graze:spd<.1&&(!!o.pile||Math.sin(time*.3+o.an.uid)>.3)});
    const sw=SP[o.an.k].def.swim;let base=.06;
    if(o.A.islands&&o.A.islands.length){const onI=o.A.islands.some(q=>Math.hypot(o.x-q.x,o.z-q.z)<q.r*.8),inPool=Math.hypot(o.x-o.A.pond.x,o.z-o.A.pond.z)<o.A.pond.r;
      const want=inPool&&!onI||d>25&&SP[o.an.k].def.soar?7+Math.sin(time+o.an.uid):0;o.alt=lerp(o.alt||0,want,Math.min(1,dt*1.5));base=(onI?.92:.06)+o.alt;
      if(o.alt>.4)ANIMALS.animate(o.inst,0,spd,time,{alt:o.alt})}
    o.inst.g.position.set(o.x,sw?.12-(SP[o.an.k].def.dorsalS&&o.inst.h>1?o.inst.h*.7:o.inst.h*.85):base+(o.inst.hop||0),o.z);o.inst.g.rotation.y=o.yaw;
    if(o.an.born){const g=Math.min(1,(Date.now()-o.an.born)/GROW);o.inst.g.scale.setScalar(.35+.65*g);if(g>=1)delete o.an.born}
  }
  breed(dt);updateFood(dt);updateNursery();
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
  updateZooAnimals(dt,time);updateVisitors(dt,time);updateTours(dt,time);updateDinoTour(dt);updateRides(dt,time);
  if(zoo.flyers)updateFlyers(zoo.flyers,dt,time,()=>0);
  if(zoo.helix)zoo.helix.rotation.y+=dt*.8;updateLab(dt);updateShow(dt,time);updateLaunchShow(dt);
  for(const p of zoo.skyPlanes||[]){p.a+=p.spd/p.r*dt;const x=p.cx+Math.cos(p.a)*p.r,z=p.cz+Math.sin(p.a)*p.r,d=Math.sign(p.spd);p.g.position.set(x,p.h,z);p.g.rotation.set(0,Math.atan2(-Math.sin(p.a)*d,Math.cos(p.a)*d),-d*.25,'YXZ');p.g.userData.prop.rotation.z+=dt*40}
  const driving=curView==='drive'&&world&&world.zoo;
  for(const A of zoo.areas.values()){const gx=A.door.x,gz=A.door.z;let near=false;
    if(driving&&Math.hypot((mode==='car'?car.x:me.x)-gx,(mode==='car'?car.z:me.z)-gz)<20)near=true;
    if(!near&&zoo.people&&A.R0<0)for(const v of zoo.people)if(Math.hypot(v.x-gx,v.z-gz)<9){near=true;break}
    if(!near&&zoo.tours)for(const t of zoo.tours)if(Math.hypot(t.x-gx,t.z-gz)<22){near=true;break}
    A.open+=((near?1:0)-A.open)*Math.min(1,dt*2.5);
    for(const d of A.doors){const{sd,w}=d.userData;d.position.x=sd*(w/2+A.open*w*.95)}}
  for(const w of zoo.waters){w.userData.water.offset.x+=dt*.015;w.userData.water.offset.y+=dt*.01}
}
function zooFrame(dt,time){
  if(zoo.prog)progCamera(dt,time);else zooCamera(dt);zooTick(dt,time);
  zoo.grass.userData.update(V(zoo.cam.tx,0,zoo.cam.tz),time,zoo.scene.fog,zoo.sky.sunDir);
  zoo.sky.follow(zoo.cam.tx,0,zoo.cam.tz);
  R.render(zoo.scene,cam);
}
async function enterZoo(progress){
  if(!zoo.built)buildZoo();
  for(const c of S.cages.slice())if(SP[c.k].def.mate){S.cages.splice(S.cages.indexOf(c),1);delete c.pen;S.holding.push(c)}
  checkDream();const made=autoHome();if(made.length)setTimeout(()=>toast('New dome built for your '+made.map(h=>HAB[h].name).join(', ')+' animals!'),400);
  S.areas.forEach((a,i)=>{if(!zoo.areas.has(a.id))buildArea(a,i)});
  rebuildPaths();
  const need=[...new Set(S.areas.flatMap(a=>a.animals.map(x=>x.k)))].filter(k=>!ANIMALS.isBuilt(SP[k]));
  for(let i=0;i<need.length;i++){progress('Getting the animals ready… '+(i+1)+'/'+need.length);await nextFrame();ANIMALS.species(SP[need[i]])}
  syncZooAnimals();syncEggs();syncNurseryEggs();syncLabShelves();
  if(!ANIMALS.isBuilt(SP['dino:1'])){progress('Saddling up the Triceratops…');await nextFrame();ANIMALS.species(SP['dino:1'])}
  syncRides();
  // pterodactyls flying inside the Ultra Dino Dome
  for(const f of zoo.flyers||[])zoo.scene.remove(f.inst.g);zoo.flyers=[];
  const U=[...zoo.areas.values()].find(a=>a.area.hab==='dino');if(U){if(!ANIMALS.isBuilt(SP['dino:3']))ANIMALS.species(SP['dino:3']);zoo.flyers=makeFlyers(zoo.scene,SP['dino:3'],6,{x:U.x,z:U.z},[60,150],[30,70],1.4)}
  for(let i=0;i<LOOKS.length;i++)if(!ANIMALS.isBuilt(personSp(i))){progress('Opening the gates for visitors… '+(i+1)+'/'+LOOKS.length);await nextFrame();ANIMALS.species(personSp(i))}
  for(const k of['staff','security'])if(!ANIMALS.isBuilt(personSp(k))){progress('Zoo workers and security are getting ready…');await nextFrame();ANIMALS.species(personSp(k))}
  buildEntrancePeople();
  syncVisitors();syncTours();syncLunch();
  const dd=S.areas.find(a=>a.hab==='dream');if(dd&&dd.animals.length&&!S.dreamShown){S.dreamShown=1;save();focusArea(dd.id);setTimeout(()=>toast('💖💙 Here is your Mummy Dream Dome, right at the front of the zoo!',6000),800)}
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
  zoo.cols.forEach(add);(zoo.fenceCols||[]).forEach(add);for(const A of zoo.areas.values())A.cols.forEach(add);
  w.bounds={x0:-(ROAD+10+MEGA*2+120),x1:ULTRA.x+ULTRA.R+120,z0:zooLayout().end-120,z1:175};
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
    if(!d){d={id:S.aid++,type:'dome',hab,animals:[],eggs:[]};S.areas.push(d);made.push(hab)}
    const wait=an.wait&&!SP[an.k].def.mate;delete an.wait;(wait?(d.barn=d.barn||[]):d.animals).push(an)}
  // the Mummy Dream megadome is always ready for them at the front of the zoo
  if(!S.areas.some(a=>a.hab==='dream')){S.areas.push({id:S.aid++,type:'dome',hab:'dream',animals:[],eggs:[]});made.push('dream')}
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
const SECURITY={s:1.05,skin:'#8d5a3b',shirt:'#1d2430',pants:'#1d2430',hair:'#111',shoes:'#111',hat:'#1d2430'};
function personSp(i){return personSps[i]||(personSps[i]={k:'person'+i,n:i==='staff'?'Zoo worker':i==='security'?'Security':'Visitor',def:Object.assign({plan:'person'},i==='staff'?STAFF:i==='security'?SECURITY:LOOKS[i])})}
function pathGraph(){
  const nodes=[],link=(a,b)=>{a.nb.push(b);b.nb.push(a)},L=zooLayout();
  const gate={x:0,z:22,nb:[],gate:1};nodes.push(gate);
  const plaza={x:0,z:38,nb:[]};nodes.push(plaza);link(plaza,gate);
  for(const sx of[-1,1]){const booth={x:sx*10.5,z:46,nb:[],pay:1,face:sx*Math.PI/2};nodes.push(booth);link(booth,plaza);
    for(const pz of[100,135]){const park={x:sx*(20+Math.random()*30),z:pz,nb:[],park:1};nodes.push(park);link(park,booth)}}
  // nodes down the middle of the road, one level with every dome
  const zs=[...new Set([10,...L.list.map(d=>Math.round(d.z)),Math.round(L.end+10)])].sort((a,b)=>b-a);
  const road=zs.map(z=>{const n={x:0,z,nb:[]};nodes.push(n);return n});link(gate,road[0]);for(let i=1;i<road.length;i++)link(road[i-1],road[i]);
  S.areas.forEach((a,i)=>{const A=zoo.areas.get(a.id);if(!A)return;const d=L.list[i],rn=road.find(n=>n.z===Math.round(d.z));
    // a spot at the dome gate to look in, and a spot inside the dome
    const v={x:d.ultra?d.x-d.R-7:d.side*(ROAD+6),z:d.z,nb:[],view:1,face:d.side*Math.PI/2};nodes.push(v);link(rn,v);
    return;
    const ins={x:A.inside.x,z:A.inside.z+(Math.random()-.5)*8,nb:[],inside:1};ins.face=Math.atan2(A.x-ins.x,A.z-ins.z);nodes.push(ins);link(v,ins)});
  return{nodes,gate};
}
function syncVisitors(){
  for(const v of zoo.people||[])zoo.scene.remove(v.inst.g);zoo.people=[];zoo.graph=pathGraph();
  const n=Math.min(42,10+S.areas.length*4+Math.floor(S.areas.reduce((t,a)=>t+a.animals.length,0)/2));
  for(let i=0;i<n;i++){const inst=ANIMALS.make(personSp(i%LOOKS.length));zoo.scene.add(inst.g);
    // most start somewhere along the paths, the rest come in through the gate
    const g=zoo.graph,parks=g.nodes.filter(q=>q.park),from=i<n*.7?g.nodes[Math.floor(Math.random()*g.nodes.length)]:parks[i%parks.length];
    const v={inst,from,to:from.nb[Math.floor(Math.random()*from.nb.length)],off:(Math.random()-.5)*4.5,spd:1.1+Math.random()*.6,wait:Math.random()*3,x:from.x,z:from.z,yaw:0};
    zoo.people.push(v)}
  // zoo workers you bought in the shop walk around too
  for(let i=0;i<(S.shop.workers||0);i++){const inst=ANIMALS.make(personSp('staff'));zoo.scene.add(inst.g);const g=zoo.graph,from=g.nodes[Math.floor(Math.random()*g.nodes.length)];
    zoo.people.push({inst,from,to:from.nb[Math.floor(Math.random()*from.nb.length)],off:(Math.random()-.5)*4.5,spd:1.2+Math.random()*.5,wait:Math.random()*3,x:from.x,z:from.z,yaw:0})}
  for(const g of zoo.guards||[])zoo.scene.remove(g.g);zoo.guards=[];
  S.areas.forEach(a=>{const A=zoo.areas.get(a.id);if(!A)return;const ox=A.door.x-A.x,oz=A.door.z-A.z,l=Math.hypot(ox,oz),nx=ox/l,nz=oz/l;
    for(const sd of[-1,1]){const g=ANIMALS.make(personSp('staff'));const x=A.door.x+nx*3-nz*sd*11,z=A.door.z+nz*3+nx*sd*11;g.g.position.set(x,.04,z);g.g.rotation.y=Math.atan2(nx,nz);zoo.scene.add(g.g);zoo.guards.push(g)}});
  const el=$('#visitors');if(el)el.textContent='👥 '+(S.dreamBonus?(6e6+n).toLocaleString():n)+' visitors';
}
function updateVisitors(dt,time){
  if(!zoo.people)return;
  for(const g of zoo.guards||[])ANIMALS.animate(g,dt,0,time,{});
  const driving=curView==='drive'&&world&&world.zoo,px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  for(const v of zoo.people){
    let spd=0,look=0;
    if(v.wait>0){v.wait-=dt;if(v.from.view||v.from.inside){const ty=v.from.face??Math.PI;let d=ty-v.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));v.yaw+=d*Math.min(1,dt*3);look=Math.sin(time*.7+v.off)*.4}}
    else{
      const dx=v.to.x-v.from.x,dz=v.to.z-v.from.z,L=Math.hypot(dx,dz)||1,ox=-dz/L*v.off,oz=dx/L*v.off;
      const tx=v.to.x+(v.to.view||v.to.inside?0:ox),tz=v.to.z+(v.to.view||v.to.inside?0:oz),ex=tx-v.x,ez=tz-v.z,d=Math.hypot(ex,ez);
      if(d<.5){const prev=v.from;v.from=v.to;
        if(v.from.pay&&prev.park){v.wait=2.5;S.coins+=TICKET;save();coins();zoo.tickets=(zoo.tickets||0)+1;if(curView==='zoo'&&zoo.tickets%5===0)toast('🎟️ Visitors are buying tickets at the front office: +'+TICKET+' coins each')}const opts=v.from.nb.filter(n=>n!==prev);v.to=(opts.length?opts:v.from.nb)[Math.floor(Math.random()*(opts.length||v.from.nb.length))];
        if(v.from.pay&&prev.park){}else if(v.from.inside)v.wait=6+Math.random()*8;else if(v.from.view)v.wait=2+Math.random()*4;else if(Math.random()<.12)v.wait=1+Math.random()*3}
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
  const sign=new T.Mesh(new T.PlaneGeometry(1.8,.35),new T.MeshStandardMaterial({map:signTexture(['ZOO SHUTTLE'],'#2f6a32'),roughness:.7}));sign.position.set(0,3.05,-2.26);sign.rotation.y=Math.PI;g.add(sign);
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
  const n=(S.dreamBonus?6:2)+(S.shop.shuttles||0),L=zooLayout(),route=[{x:-3,z:120},{x:-3,z:60},{x:-3,z:20},{x:-3,z:L.end+40},{x:3,z:L.end+40},{x:3,z:20},{x:3,z:60},{x:3,z:120},{x:30,z:140},{x:-30,z:140}];
  for(let i=0;i<n;i++){const g=tourCarModel();zoo.scene.add(g);
    const driver=ANIMALS.make(personSp('staff'));seat(driver);driver.g.position.set(-.45,.23,-1.2);g.add(driver.g);
    const riders=[];[[-.5,-.1],[.5,-.1],[-.5,1.1],[.5,1.1]].forEach(([x,z],j)=>{const r=ANIMALS.make(personSp((i*4+j)%LOOKS.length));seat(r);r.g.position.set(x,.23,z);g.add(r.g);riders.push(r)});
    const k=Math.floor(i*route.length/n);zoo.tours.push({g,route,k,x:route[k].x,z:route[k].z,yaw:0,riders,driver})}
  const el=$('#tours');if(el){el.textContent='🚐 '+n+' shuttles';el.hidden=!n}
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

/* ---------- your tours: visitors pay 600 coins each to ride with you into the domes ---------- */
const TOUR_FEE=600;
const dinoTour={on:false,riders:[],inDome:null,t:0,seen:new Set()};
function startDinoTour(){
  const n=Math.min(8,car.seats.length||3),fee=TOUR_FEE*n;S.coins+=fee;save();coins();
  dinoTour.on=true;dinoTour.inDome=null;dinoTour.t=0;dinoTour.seen=new Set();dinoTour.riders=[];
  const seats=car.seats.length?car.seats:[V(-.5,1.47,1.42),V(0,1.47,1.42),V(.5,1.47,1.42)],parent=car.seats.length?car.trailer:car.g;
  for(let j=0;j<n;j++){const r=ANIMALS.make(personSp((j*3+2)%LOOKS.length));seat(r);const sp=seats[j];r.g.position.set(sp.x,sp.y-.95*LOOKS[(j*3+2)%LOOKS.length].s,sp.z);parent.add(r.g);dinoTour.riders.push(r)}
  toast('🚙 '+n+' visitors paid '+fee+' coins ('+TOUR_FEE+' each) and took their seats in your safari truck! Drive them into the domes. Only you can take them inside.');
}
function updateDinoTour(dt){
  if(!dinoTour.on||!(world&&world.zoo)||curView!=='drive')return;
  for(const r of dinoTour.riders)r.B.head.rotation.y=Math.sin(performance.now()/700+r.seed)*.7;
  const A=[...zoo.areas.values()].find(a=>Math.hypot(car.x-a.x,car.z-a.z)<a.R0-2)||null;
  if(A!==dinoTour.inDome){
    const prev=dinoTour.inDome;
    if(prev&&dinoTour.t>20&&!dinoTour.seen.has(prev.area.id)){dinoTour.seen.add(prev.area.id);const tip=prev.R0>250?300:150;S.coins+=tip;save();coins();
      toast('The visitors loved the '+(prev.area.hab==='dino'?'Ultra Dino Dome':HAB[prev.area.hab].name+' Mega Dome')+'! They gave you a '+tip+' coin tip.')}
    else if(prev&&dinoTour.t<=20)toast('That was quick! Show them around a bit longer next time.');
    if(A)toast(A.area.hab==='dino'?'Hold on tight! The visitors are amazed by the dinosaurs!':'Welcome to the '+HAB[A.area.hab].name+' Mega Dome! The visitors are looking at the animals.');
    dinoTour.inDome=A;dinoTour.t=0}
  if(A)dinoTour.t+=dt;
}
function endDinoTour(){for(const r of dinoTour.riders)r.g.parent&&r.g.parent.remove(r.g);dinoTour.riders=[];dinoTour.on=false}

/* ---------- the entrance: car park, ticket booths, security and a fence all round ---------- */
const TICKET=10;
function carModel(col){
  const g=new T.Group(),paint=new T.MeshPhysicalMaterial({color:col,roughness:.3,metalness:.3,clearcoat:.8}),dark=new T.MeshStandardMaterial({color:'#1a1a1c',roughness:.8}),glass=new T.MeshStandardMaterial({color:'#2a3a48',roughness:.1,metalness:.4});
  const B=(m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(new T.BoxGeometry(sx,sy,sz),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o)};
  B(paint,0,.7,0,1.8,.6,4.2);B(glass,0,1.25,.15,1.6,.55,2.1);B(paint,0,1.55,.15,1.62,.08,2);
  for(const x of[-.85,.85])for(const z of[-1.35,1.35]){const w=new T.Mesh(new T.CylinderGeometry(.34,.34,.24,14),dark);w.rotation.z=Math.PI/2;w.position.set(x,.34,z);g.add(w)}
  return g;
}
function buildEntrance(){
  const scene=zoo.scene;
  // car park
  const [c,g]=NATURE.canvas(512);g.fillStyle='#3a3b3d';g.fillRect(0,0,512,512);for(let i=0;i<9000;i++){const l=40+Math.random()*30|0;g.fillStyle=`rgb(${l},${l},${l+2})`;g.fillRect(Math.random()*512,Math.random()*512,2,2)}
  const asphalt=NATURE.toTex(c,true);asphalt.repeat.set(14,13);
  const lot=new T.Mesh(new T.PlaneGeometry(150,130),new T.MeshStandardMaterial({map:asphalt,roughness:.95}));lot.rotation.x=-Math.PI/2;lot.position.set(0,.03,95);lot.receiveShadow=true;scene.add(lot);
  const line=new T.MeshBasicMaterial({color:'#e8e8e0'}),cols=['#c0392b','#2e86de','#f4f4f2','#222428','#7f8c8d','#27ae60','#f1c40f','#8e44ad','#d35400','#16a085'];
  for(const row of[75,108,141])for(let x=-66;x<=66;x+=4.4){if(Math.abs(x)<9)continue;
    const l=new T.Mesh(new T.PlaneGeometry(.15,5.5),line);l.rotation.x=-Math.PI/2;l.position.set(x,.05,row);scene.add(l);
    if(S.dreamBonus||Math.random()<.7){const car2=carModel(cols[Math.floor(Math.random()*cols.length)]);car2.position.set(x+2.2,0,row);car2.rotation.y=Math.random()<.5?0:Math.PI;scene.add(car2);zoo.cols.push({x:x+2.2,z:row-1.2,r:1.3},{x:x+2.2,z:row+1.2,r:1.3})}}
  const ps=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['P  CAR PARK','Visitors please buy a ticket'],'#2a4a8a'),roughness:.7}));ps.position.set(0,4,160);ps.rotation.y=Math.PI;scene.add(ps);
  // ticket booths (front office)
  const wall=new T.MeshPhysicalMaterial({color:'#e8e0cc',roughness:.6}),roof=new T.MeshStandardMaterial({color:'#2f6a32',roughness:.6}),win=new T.MeshPhysicalMaterial({color:'#bfe3f2',transparent:true,opacity:.35,roughness:.05,clearcoat:1});
  for(const sx of[-1,1]){const b=new T.Group();b.position.set(sx*15,0,44);scene.add(b);
    const box=(m,x,y,z,a,bb,cc)=>{const o=new T.Mesh(new T.BoxGeometry(a,bb,cc),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;b.add(o)};
    box(wall,0,1.5,0,6,3,5);box(roof,0,3.25,0,7,.5,6);box(win,-sx*3.02,1.8,0,.05,1.3,3.6);box(wall,-sx*3.3,1,0,.6,.15,3.6);
    const sg=new T.Mesh(new T.PlaneGeometry(4,1),new T.MeshStandardMaterial({map:signTexture(['TICKETS','Front office'],'#2f6a32')}));sg.position.set(-sx*3.05,3,0);sg.rotation.y=-sx*Math.PI/2;b.add(sg);
    zoo.cols.push({x:sx*15,z:44,r:3.6});b.userData.sx=sx;(zoo.booths=zoo.booths||[]).push(b)}
  const ent=new T.Mesh(new T.PlaneGeometry(8,2.4),new T.MeshStandardMaterial({map:signTexture(['ENTRANCE','Tickets '+TICKET+' coins'],'#8a2a14')}));ent.position.set(0,2.6,58);ent.rotation.y=Math.PI;scene.add(ent);
}
function buildEntrancePeople(){
  for(const p of zoo.entrancePeople||[])zoo.scene.remove(p.g);zoo.entrancePeople=[];
  const add=(k,x,z,yaw)=>{const p=ANIMALS.make(personSp(k));p.g.position.set(x,.04,z);p.g.rotation.y=yaw;zoo.scene.add(p.g);zoo.entrancePeople.push(p)};
  for(const sx of[-1,1]){add('staff',sx*14,44,-sx*Math.PI/2);add('security',sx*8.5,33,0);add('security',sx*8.5,26,0)}
}
function buildFence(L){
  if(zoo.fence)zoo.scene.remove(zoo.fence);const f=new T.Group();zoo.fence=f;zoo.scene.add(f);zoo.fenceCols=[];
  const x0=-(ROAD+10+MEGA*2+40),x1=ULTRA.x+ULTRA.R+40,z0=L.end-40,z1=30,H=3.4;
  const segs=[[x0,z1,-7.5,z1],[7.5,z1,x1,z1],[x1,z1,x1,z0],[x1,z0,x0,z0],[x0,z0,x0,z1]];
  const posts=[],rails=[];
  for(const[a,b,c,d]of segs){const len=Math.hypot(c-a,d-b),n=Math.ceil(len/4);
    for(let i=0;i<=n;i++){const t=i/n,x=a+(c-a)*t,z=b+(d-b)*t;posts.push([x,z]);if(i<n)rails.push([x,z,a+(c-a)*(i+1)/n,b+(d-b)*(i+1)/n])}
    for(let i=0;i<=Math.ceil(len/2);i++){const t=i/Math.ceil(len/2);zoo.fenceCols.push({x:a+(c-a)*t,z:b+(d-b)*t,r:1})}}
  const metal=new T.MeshStandardMaterial({color:'#2e3a2e',metalness:.6,roughness:.4}),m4=new T.Matrix4();
  const pg=new T.CylinderGeometry(.09,.09,H,6);pg.translate(0,H/2,0);const pim=new T.InstancedMesh(pg,metal,posts.length);posts.forEach(([x,z],i)=>pim.setMatrixAt(i,m4.makeTranslation(x,0,z)));f.add(pim);
  const rg=new T.BoxGeometry(1,.07,.07),rim=new T.InstancedMesh(rg,metal,rails.length*3);let j=0;
  for(const[a,b,c,d]of rails)for(const y of[.3,1.7,H-.1]){const dx=c-a,dz=d-b;m4.compose(V((a+c)/2,y,(b+d)/2),new T.Quaternion().setFromAxisAngle(V(0,1,0),Math.atan2(-dz,dx)),V(Math.hypot(dx,dz),1,1));rim.setMatrixAt(j++,m4)}
  f.add(rim);
  // see-through mesh panels between the posts
  const meshTex=(()=>{const [c,g]=NATURE.canvas(64);g.strokeStyle='#2e3a2e';g.lineWidth=2;for(let i=-64;i<128;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}const t=NATURE.toTex(c,true);return t})();
  const pm=new T.MeshStandardMaterial({map:meshTex,transparent:true,alphaTest:.3,side:T.DoubleSide,roughness:.6});
  for(const[a,b,c,d]of segs){const len=Math.hypot(c-a,d-b);const t=meshTex.clone();t.needsUpdate=true;t.repeat.set(len/1.2,H/1.2);const m=pm.clone();m.map=t;
    const pl=new T.Mesh(new T.PlaneGeometry(len,H),m);pl.position.set((a+c)/2,H/2,(b+d)/2);pl.rotation.y=Math.atan2(-(d-b),c-a);f.add(pl)}
}

/* ---------- eggs and babies ---------- */
const eggMeshes=new Map();
function eggMesh(e,A){
  const g=new T.Group(),r=rng(e.uid*31),sp=SP[e.k],big=sp.hab==='dino'||sp.hab==='carnivore'?2.2:1;
  const nest=new T.Mesh(new T.TorusGeometry(.55*big,.22*big,8,20),new T.MeshStandardMaterial({color:'#7a5a32',roughness:1}));nest.rotation.x=-Math.PI/2;nest.position.y=.15*big;nest.scale.z=.6;g.add(nest);
  const [c,cg]=NATURE.canvas(64);cg.fillStyle=big>1?'#e8dcc0':'#f4efe4';cg.fillRect(0,0,64,64);cg.fillStyle='rgba(120,90,60,.5)';for(let i=0;i<30;i++){cg.beginPath();cg.arc(r()*64,r()*64,1+r()*3,0,7);cg.fill()}
  const em=new T.MeshStandardMaterial({map:NATURE.toTex(c,true),roughness:.5});
  const n=1+Math.floor(r()*3);for(let i=0;i<n;i++){const egg=new T.Mesh(new T.SphereGeometry(.22*big,14,10),em);egg.scale.set(1,1.3,1);egg.position.set((i-(n-1)/2)*.32*big,.32*big,(r()-.5)*.2);egg.castShadow=true;g.add(egg)}
  const lb=labelSprite('🥚 Laid by the '+sp.n);lb.position.y=1.4*big;g.add(lb);
  const p=A.house?houseSpot(A,r):{x:A.x+3,z:A.z+2};g.position.set(p.x,0,p.z);zoo.scene.add(g);return g;
}
// a little floating sign
function labelSprite(text,col='#2f5a32'){const c=document.createElement('canvas');c.width=512;c.height=96;const g=c.getContext('2d');g.font='800 40px Nunito,sans-serif';
  const w=Math.min(500,g.measureText(text).width+40);g.fillStyle=col;g.beginPath();g.roundRect((512-w)/2,8,w,80,40);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,50);
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;const s=new T.Sprite(new T.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(4,.75,1);s.renderOrder=6;return s}
// mums wear a sign while their eggs or babies are around
function syncMumTags(){
  for(const o of zoo.animals){if(o.tag){o.inst.g.remove(o.tag);o.tag=null}
    const eggs=[...S.areas,vetWard()].some(a=>a.eggs.some(e=>e.mum===o.an.uid))||(me.holdEggs||[]).some(e=>e.mum===o.an.uid)||(S.truckEggs||[]).some(e=>e.mum===o.an.uid)||(S.nursery||[]).some(e=>e.mum===o.an.uid);
    const baby=S.areas.some(a=>a.animals.some(b=>b.born&&b.mum===o.an.uid))||(S.fam||[]).some(p=>p.some(b=>b.born&&b.mum===o.an.uid));
    if(eggs||baby){o.tag=labelSprite(eggs?'🥚 I laid these eggs':'🍼 I had this baby','#8a2a6a');o.tag.position.y=o.inst.h+1.2;o.inst.g.add(o.tag)}}
}
// pick up an egg on foot and put it in your truck
function nearEgg(){let best=null,bd=3.5;for(const a of[...S.areas,vetWard()])for(const e of a.eggs){const m=eggMeshes.get(e.uid);if(!m)continue;const d=Math.hypot(m.position.x-me.x,m.position.z-me.z);if(d<bd){bd=d;best={a,e,m}}}return best}
// pick up an egg and carry it: its mum and dad follow you wherever you go
function pickEgg(){
  if(mode!=='foot')return false;const n=nearEgg();if(!n)return false;
  n.a.eggs.splice(n.a.eggs.indexOf(n.e),1);zoo.scene.remove(n.m);eggMeshes.delete(n.e.uid);(me.holdEggs=me.holdEggs||[]).push(n.e);save();
  const k=n.e.k,mate=SP[k].def.mate,mum=zoo.animals.find(o=>o.an.uid===n.e.mum),dad=zoo.animals.find(o=>o!==mum&&!o.an.born&&(o.an.k===k||o.an.k===mate)&&o.A.area===n.a);
  const fam=[mum,dad].filter(Boolean);fam.forEach((o,i)=>{o.follow=i+1;o.pile=null});
  toast('🥚 You are holding the '+SP[k].n+' egg!'+(fam.length?' '+(fam.length>1?'Its mum and dad are':'Its mum is')+' following you.':'')+' Take it to the Egg Nursery, the Doctor or the DNA Lab, or back to your truck.',7000);return true}
function followers(){return zoo.animals.filter(o=>o.follow)}
function sendHome(){for(const o of followers()){o.follow=0;o.t=0}releaseVet()}
// things you can do on foot while carrying eggs
function eggAction(){
  const eggs=me.holdEggs||[];if(!eggs.length||mode!=='foot')return false;
  if(nearNursery(me.x,me.z)){S.nursery=S.nursery||[];for(const e of eggs.splice(0)){if(!e.long)e.hatch=Date.now()+30000;S.nursery.push(e)}save();syncNurseryEggs();sendHome();
    toast('🥚 You put the egg in a warm incubator. It hatches in '+(S.nursery.at(-1).long?'6 hours':'30 seconds')+'! Mum and dad are going home.',6000);return true}
  if(nearDoctor(me.x,me.z)&&eggs.some(e=>e.long)){for(const e of eggs.filter(e=>e.long)){eggs.splice(eggs.indexOf(e),1);vetWard().eggs.push(e);eggMeshes.set(e.uid,eggMesh(e,zoo.vetArea))}
    for(const o of followers())o.follow=0;save();syncMumTags();toast('🩺 You put the Sub Ninja egg back in the Animal Doctor\'s, with its mum and dad.',6000);return true}
  if(nearDoctor(me.x,me.z)){const f=followers();S.coins+=20*(eggs.length+f.length);save();coins();
    toast('🩺 The doctor checked the egg'+(f.length?' and '+f.map(o=>'the '+SP[o.an.k].n+' '+(o.follow===1?'mum':'dad')).join(' and '):'')+'. Everyone is healthy! ❤️ +'+20*(eggs.length+f.length)+' coins',6000);return true}
  return false}
function eggsIntoTruck(){
  const eggs=me.holdEggs||[];if(!eggs.length)return;(S.truckEggs=S.truckEggs||[]).push(...eggs.splice(0));
  for(const o of followers()){if(smallUsed()>=CAGES)break;const area=o.A.area;area.animals.splice(area.animals.indexOf(o.an),1);zoo.scene.remove(o.inst.g);zoo.animals.splice(zoo.animals.indexOf(o),1);S.cages.push(Object.assign({},o.an))}
  sendHome();save();showTruckEggs();refreshCages();syncMumTags();toast('🚚 The egg went into your truck, and the family hopped in too!',5000)}
function eggHint(){if(mode==='foot'&&(me.holdEggs||[]).length){const k=SP[me.holdEggs[0].k].n;return nearNursery(me.x,me.z)?'Press <b>E</b> to put the '+k+' egg in an incubator':nearDoctor(me.x,me.z)&&me.holdEggs.some(e=>e.long)?'Press <b>E</b> to put the '+k+' egg back in the Vet Ward':nearDoctor(me.x,me.z)?'Press <b>E</b> for the doctor to check the egg and the family':'🥚 Holding the '+k+' egg · Egg Nursery, Doctor, DNA Lab or your truck <b>E</b>'}
  const n=mode==='foot'&&nearEgg();if(n)return'Press <b>E</b> to pick up the '+SP[n.e.k].n+' egg';if(mode==='car'&&nearNursery()&&((S.truckEggs||[]).length||S.cages.some(c=>c.preg)))return'Press <b>G</b> to put your eggs and mums in the Egg Nursery';
  if(mode==='car'&&nearPens()&&S.cages.length)return'Press <b>G</b> to put the animals in your truck into a Family Pen';
  if(mode==='car'?nearLab():nearLab(me.x,me.z))return'Press <b>G</b> to open the DNA Lab and make new animals';
  if(mode==='car'&&nearDoctor())return'Press <b>G</b> for the doctor to check the animals in your truck';return''}
function showTruckEggs(){
  if(!car.g||!car.trailer)return;if(car.eggRack)car.eggRack.parent&&car.eggRack.parent.remove(car.eggRack);const g=new T.Group();car.eggRack=g;car.trailer.add(g);
  const em=new T.MeshStandardMaterial({color:'#f4efe4',roughness:.5}),box=new T.Mesh(new T.BoxGeometry(1.2,.25,.9),new T.MeshStandardMaterial({color:'#e8d0a0',roughness:.9}));box.position.set(0,2.15,3.6);if((S.truckEggs||[]).length)g.add(box);
  (S.truckEggs||[]).slice(0,8).forEach((e,i)=>{const m=new T.Mesh(new T.SphereGeometry(.12,10,8),em);m.scale.y=1.3;m.position.set(-.45+(i%4)*.3,2.35,3.45+Math.floor(i/4)*.3);g.add(m)});
}

/* ---------- the Egg Nursery: only you can drive in; eggs hatch fast in the warm incubators ---------- */
const NURSE={x:72,z:-48,D:24,W:30};
function buildNursery(){
  const g=new T.Group();g.position.set(NURSE.x,0,NURSE.z);zoo.scene.add(g);const {D,W}=NURSE,Ht=9;
  const wall=new T.MeshStandardMaterial({color:'#f2d8e8',roughness:.7}),roof=new T.MeshStandardMaterial({color:'#c24a8a',roughness:.5}),floor=new T.MeshStandardMaterial({color:'#e8dcc8',roughness:.9});
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  box(floor,0,.05,0,D,.1,W);box(wall,D/2,Ht/2,0,.5,Ht,W);for(const sd of[-1,1])box(wall,0,Ht/2,sd*W/2,D,Ht,.5);
  for(const sd of[-1,1])box(wall,-D/2,Ht/2,sd*(W/2-4),.5,Ht,8);box(wall,-D/2,Ht-1,0,.5,2,W);box(roof,0,Ht+.2,0,D+1.5,.4,W+1.5);
  // warm incubators with heat lamps
  const inc=new T.MeshStandardMaterial({color:'#ffffff',roughness:.3}),lamp=new T.MeshStandardMaterial({color:'#ff8a3a',emissive:'#ff7a2a',emissiveIntensity:1.5});
  zoo.incubators=[];for(let i=0;i<6;i++){const x=D/2-4,z=-W/2+4+i*4.4;box(inc,x,.6,z,2.4,1.2,3);box(lamp,x,4,z,.8,.3,.8);zoo.incubators.push(V(NURSE.x+x,1.3,NURSE.z+z))}
  const st=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['EGG NURSERY','Zoo owner only - press G'],'#c24a8a'),roughness:.7}));st.position.set(-D/2-.3,Ht-1,0);st.rotation.y=-Math.PI/2;g.add(st);
  for(let z=-W/2;z<=W/2;z+=1.8)zoo.cols.push({x:NURSE.x+D/2,z:NURSE.z+z,r:1});
  for(const sd of[-1,1]){for(let x=-D/2;x<=D/2;x+=1.8)zoo.cols.push({x:NURSE.x+x,z:NURSE.z+sd*W/2,r:1});for(let z=0;z<=8;z+=1.8)zoo.cols.push({x:NURSE.x-D/2,z:NURSE.z+sd*(W/2-z),r:1})}
  zoo.nurseEggs=new Map();
}
// catch an animal in your zoo (like a mum who is having a baby) and put it in your truck
function zooCatch(){
  const f=V(0,0,-1).applyQuaternion(cam.quaternion);let best=null,bs=1e9;
  for(const o of zoo.animals){const p=V(o.x,o.inst.g.position.y+o.inst.h*.5,o.z),d=p.clone().sub(cam.position),dist=d.length();if(dist>16)continue;const ang=f.angleTo(d.normalize());if(ang<.4&&ang*30+dist<bs){bs=ang*30+dist;best=o}}
  if(!best){toast('Walk up to an animal in a dome and look right at it to catch it');return}
  const big=S.cages.filter(c=>c.pen==null).length>=CAGES;if(big){toast('Your truck cages are full! Put some animals back in their domes first.');return}
  const area=best.A.area,an=best.an;area.animals.splice(area.animals.indexOf(an),1);zoo.scene.remove(best.inst.g);zoo.animals.splice(zoo.animals.indexOf(best),1);
  S.cages.push(Object.assign({},an));save();refreshCages();syncMumTags();
  toast(an.preg?'🤰 You caught the '+SP[an.k].n+' mum! Drive her to the Egg Nursery and press G so she can have her baby safe and warm.':'You caught the '+SP[an.k].n+'! It is in your truck. Put it back with "Put them back in their domes".',6000);
}
function nearNursery(x=car.x,z=car.z){return Math.abs(x-NURSE.x)<NURSE.D/2+10&&Math.abs(z-NURSE.z)<NURSE.W/2+3}
function dropEggs(){
  const n=(S.truckEggs||[]).length,mums=S.cages.filter(c=>c.preg);if(!n&&!mums.length)return false;S.nursery=S.nursery||[];
  for(const e of (S.truckEggs||[]).splice(0)){if(!e.long)e.hatch=Date.now()+30000;S.nursery.push(e)}
  for(const c of mums){S.cages.splice(S.cages.indexOf(c),1);delete c.pen;S.nursery.push({uid:c.uid,k:c.k,hatch:Date.now()+30000,mumAn:c})}
  save();showTruckEggs();refreshCages();syncNurseryEggs();
  toast((n?'🥚 You put '+n+' egg'+(n>1?'s':'')+' in the warm incubators. ':'')+(mums.length?'🤰 The '+mums.map(c=>SP[c.k].n).join(' and ')+' mum'+(mums.length>1?'s are':' is')+' in a cosy nursery pen. ':'')+'Babies come in 30 seconds!',7000);return true}
function syncNurseryEggs(){
  if(!zoo.nurseEggs)return;for(const m of zoo.nurseEggs.values())zoo.scene.remove(m);zoo.nurseEggs.clear();
  (S.nursery||[]).forEach((e,i)=>{let m;
    if(e.mumAn){const inst=ANIMALS.make(SP[e.k]),k=Math.min(1,6/inst.h,8/Math.max(inst.len,1));inst.g.scale.setScalar(k);m=inst.g;m.position.set(NURSE.x-3+(i%3)*-4,.1,NURSE.z-8+Math.floor(i/3)*8);m.rotation.y=-Math.PI/2}
    else{const p=zoo.incubators[i%6];m=new T.Mesh(new T.SphereGeometry(.3,12,10),new T.MeshStandardMaterial({color:'#f4efe4',roughness:.5}));m.scale.y=1.3;m.position.set(p.x,p.y,p.z+(Math.floor(i/6)-.5)*.8)}
    zoo.scene.add(m);zoo.nurseEggs.set(e.uid,m)});
}
function updateNursery(){
  const now=Date.now();let hatched=false;
  for(const e of (S.nursery||[]).slice())if(now>=e.hatch){S.nursery.splice(S.nursery.indexOf(e),1);const sp=SP[e.k];let d=S.areas.find(a=>a.hab===sp.hab);
    if(e.mumAn){const mum=e.mumAn,b={uid:S.uid++,k:babyKind(mum),born:now,mum:mum.uid};delete mum.preg;
      if(d)d.animals.push(mum,b);else S.holding.push(mum,b);hatched=true;toast('🍼 The '+sp.n+' mum had her baby '+SP[b.k].n+' in the Nursery! They both went home to their dome.',6000);continue}
    if(d)d.animals.push({uid:S.uid++,k:e.k,born:now,mum:e.mum});else S.holding.push({uid:S.uid++,k:e.k,born:now});hatched=true;toast('🐣 A baby '+sp.n+' hatched in the Egg Nursery and went to its dome!')}
  if(hatched){if(S.holding.length)autoHome();save();syncNurseryEggs();syncZooAnimals();if(curView==='zoo')renderZooUI()}
}
function syncEggs(){
  for(const m of eggMeshes.values())zoo.scene.remove(m);eggMeshes.clear();
  for(const a of S.areas){const A=zoo.areas.get(a.id);if(A)for(const e of a.eggs)eggMeshes.set(e.uid,eggMesh(e,A))}
  if(zoo.vetArea)for(const e of vetWard().eggs)eggMeshes.set(e.uid,eggMesh(e,zoo.vetArea));
}
function breed(dt){
  const now=Date.now();let changed=false;
  // eggs hatch
  for(const a of S.areas)for(const e of a.eggs.slice())if(now>=e.hatch){a.eggs.splice(a.eggs.indexOf(e),1);a.animals.push({uid:S.uid++,k:e.k,born:now});changed=true;
    const m=eggMeshes.get(e.uid);if(m){zoo.scene.remove(m);eggMeshes.delete(e.uid)}toast('🐣 A baby '+SP[e.k].n+' hatched!')}
  // the Sub Ninja egg at the vets hatches after 6 hours, then the family goes home
  for(const e of vetWard().eggs.slice())if(now>=e.hatch){S.vet.eggs.splice(S.vet.eggs.indexOf(e),1);const m=eggMeshes.get(e.uid);if(m){zoo.scene.remove(m);eggMeshes.delete(e.uid)}
    S.vet.animals.push({uid:S.uid++,k:e.k,born:now,mum:e.mum});toast('🐣 The baby '+SP[e.k].n+' hatched at the Animal Doctor\'s!',8000);releaseVet(true)}
  ninjaEgg(now);
  // mums go into the animal house and have their babies there
  // (mums in a Family Pen have their babies right there in the pen)
  const homes=[...S.areas.map(a=>[a,zoo.areas.get(a.id)]),...(zoo.penAreas||[]).map(P=>[P.area,P])];
  for(const[a,A]of homes)for(const an of a.animals.slice())if(an.preg&&now>=an.preg){const b={uid:S.uid++,k:babyKind(an),born:now,mum:an.uid};hist(an,'had a baby');delete an.preg;a.animals.push(b);
    const mum=zoo.animals.find(o=>o.an===an);if(A){const p=mum?{x:mum.x+1.5,z:mum.z}:A.pen?{x:A.x,z:A.z}:houseSpot(A);addZooAnimal(b,A,p.x,p.z,Math.random()*6.28)}syncMumTags();
    save();if(curView==='zoo')renderZooUI();toast('🍼 A baby '+SP[b.k].n+' was born'+(A&&A.pen?' in Family Pen '+A.pen:' in the animal house')+'!')}
  zoo.breedT=(zoo.breedT??45)-dt;
  if(zoo.breedT<=0){zoo.breedT=75;
    for(const a of S.areas){const A=zoo.areas.get(a.id);if(!A)continue;
      const grown={};for(const an of a.animals)if(!an.born)grown[an.k]=(grown[an.k]||0)+1;
      const total={};for(const an of a.animals)total[an.k]=(total[an.k]||0)+(an.preg?2:1);for(const e of a.eggs)total[e.k]=(total[e.k]||0)+1;
      // the Great White Seal Bear and a Mummy Dream can have a Sparkle Seal Bear baby
      if(grown['ocean:17']&&(grown['ocean:10']||grown['ocean:11'])&&(total['ocean:18']||0)<10&&Math.random()<.35){
        const mum=a.animals.find(x=>(x.k==='ocean:10'||x.k==='ocean:17')&&!x.born&&!x.preg);
        if(mum){mum.preg=now+60000;mum.pregK='ocean:18';save();const o=zoo.animals.find(o=>o.an===mum);if(o){const p=houseSpot(A);o.tx=p.x;o.tz=p.z;o.t=99}
          toast('🤰 The '+SP[mum.k].n+' is going to have a Sparkle Seal Bear baby with the '+(mum.k==='ocean:17'?'Mummy Dream':'Great White Seal Bear')+'!',6000);break}}
      // the Mummy Dream girl and boy are a pair, so they can have babies together
      const ks=Object.keys(grown).filter(k=>(grown[k]>=2||SP[k].def.female&&grown[SP[k].def.mate]>=1)&&total[k]<10&&!SP[k].def.monthly);if(!ks.length||Math.random()>.3)continue;
      const k=ks[Math.floor(Math.random()*ks.length)],sp=SP[k];
      if(laysEggs(sp)){const mum=a.animals.find(x=>x.k===k&&!x.born),e={uid:S.uid++,k,hatch:now+90000,mum:mum&&mum.uid};a.eggs.push(e);eggMeshes.set(e.uid,eggMesh(e,A));syncMumTags();toast('🥚 The '+sp.n+'s laid an egg in the '+HAB[a.hab].name+' dome! It will hatch soon.')}
      else{const mum=a.animals.find(x=>x.k===k&&!x.born&&!x.preg);if(!mum||a.animals.some(x=>x.k===k&&x.preg))continue;mum.preg=now+60000;save();
        const o=zoo.animals.find(o=>o.an===mum);if(o){const p=houseSpot(A);o.tx=p.x;o.tz=p.z;o.t=99;o.pile=null}
        toast('🤰 A '+sp.n+' is going to have a baby! She has gone into the animal house in the '+HAB[a.hab].name+' dome.')}
      break}}
  if(changed){save();syncZooAnimals();if(curView==='zoo')renderZooUI()}
  else if(zoo.breedT===75)save();
}

// the two Sub Ninjas have one egg every month; it takes 6 hours to hatch
const MONTH=30*24*3600e3,NINJA_EGG=6*3600e3;
function vetWard(){return S.vet=S.vet||{animals:[],eggs:[],hab:'pen'}}
function ninjaEgg(now){
  const W=vetWard();if(W.eggs.length||(me.holdEggs||[]).some(e=>e.long)||(S.nursery||[]).some(e=>e.long)||(S.truckEggs||[]).some(e=>e.long))return;
  let girl,boy,home;for(const a of S.areas){const g=a.animals.find(x=>x.k==='africa:9'&&!x.born),b=a.animals.find(x=>x.k==='africa:8'&&!x.born);if(g&&b){girl=g;boy=b;home=a;break}}
  if(!girl)return;
  // the first egg comes a couple of minutes after they are together, then one every month
  if(!S.ninjaNext){S.ninjaNext=now+120000;save()}
  if(now<S.ninjaNext)return;S.ninjaNext=now+MONTH;
  const e={uid:S.uid++,k:Math.random()<.5?'africa:9':'africa:8',hatch:now+NINJA_EGG,mum:girl.uid,long:1};
  // straight to the vets: the mum, the dad and their egg
  for(const an of[girl,boy]){home.animals.splice(home.animals.indexOf(an),1);W.animals.push(an)}W.eggs.push(e);
  save();syncZooAnimals();eggMeshes.set(e.uid,eggMesh(e,zoo.vetArea));syncMumTags();if(curView==='zoo')renderZooUI();
  bigAlert('🥚🦅','Sub Ninja egg!','The Sub Ninjas laid an egg! The mum, the dad and the egg went straight to the <b>Animal Doctor</b>.<br>It hatches in 6 hours. You can pick up the egg and move it.',15000);
  toast('🚑 The Sub Ninjas laid an egg! They have gone to the Animal Doctor\'s with it. Go and see them!',10000)}
// when the egg has gone or hatched, the Sub Ninjas leave the vets and go home
function releaseVet(force){
  const W=vetWard();if(!W.animals.length)return;if(!force&&(W.eggs.length||(me.holdEggs||[]).some(e=>e.long)))return;
  for(const an of W.animals.splice(0)){const d=S.areas.find(a=>a.hab===SP[an.k].hab);if(d)d.animals.push(an);else S.holding.push(an)}
  if(S.holding.length)autoHome();save();syncZooAnimals();if(curView==='zoo')renderZooUI();toast('🦅 The Sub Ninja family left the Animal Doctor\'s and went home to their dome.',6000)}

/* ---------- Triceratops Rides: visitors pay 1000 coins each to ride round the track ---------- */
const RIDE={x:-95,z:7,rx:55,rz:14,fee:1000};
function buildRideArea(){
  if(zoo.rideArea)return;const g=new T.Group();zoo.rideArea=g;zoo.scene.add(g);
  const sand=NATURE.groundTextures('savanna'),m=sand.map.clone();m.needsUpdate=true;m.repeat.set(16,5);
  const ground=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshStandardMaterial({map:m,color:'#d8c08a',roughness:1}));ground.scale.set(RIDE.rx+2,RIDE.rz+2,1);ground.rotation.x=-Math.PI/2;ground.position.set(RIDE.x,.05,RIDE.z);ground.receiveShadow=true;g.add(ground);
  const wood=NATURE.barkMat(false),posts=[],m4=new T.Matrix4();
  for(let a=0;a<Math.PI*2;a+=.045){const x=RIDE.x+Math.cos(a)*(RIDE.rx+2.5),z=RIDE.z+Math.sin(a)*(RIDE.rz+2.5);if(Math.abs(z-RIDE.z)<3&&x>RIDE.x)continue;posts.push([x,z]);zoo.cols.push({x,z,r:.6})}
  const pg=new T.CylinderGeometry(.12,.14,1.6,7);pg.translate(0,.8,0);const pim=new T.InstancedMesh(pg,wood,posts.length);posts.forEach(([x,z],i)=>pim.setMatrixAt(i,m4.makeTranslation(x,0,z)));pim.castShadow=true;g.add(pim);
  const rg=new T.BoxGeometry(1,.1,.07),rim=new T.InstancedMesh(rg,wood,posts.length*2);let j=0;
  for(let i=0;i<posts.length-1;i++){const[a,b]=posts[i],[c,d]=posts[i+1];if(Math.hypot(c-a,d-b)>5)continue;for(const y of[.7,1.4]){m4.compose(V((a+c)/2,y,(b+d)/2),new T.Quaternion().setFromAxisAngle(V(0,1,0),Math.atan2(-(d-b),c-a)),V(Math.hypot(c-a,d-b),1,1));rim.setMatrixAt(j++,m4)}}
  rim.count=j;rim.castShadow=true;g.add(rim);
  const st=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['BABY TRICERATOPS RIDES',RIDE.fee+' coins per rider'],'#2f6a32'),roughness:.7,side:T.DoubleSide}));
  st.position.set(RIDE.x+RIDE.rx-6,3,RIDE.z+RIDE.rz+4);g.add(st);
  for(const sd of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(.25,3.6,.25),wood);p.position.set(RIDE.x+RIDE.rx-6+sd*4.3,1.8,RIDE.z+RIDE.rz+4);p.castShadow=true;g.add(p)}
}
function syncRides(){
  buildRideArea();
  for(const t of zoo.rides||[])zoo.scene.remove(t.inst.g);zoo.rides=[];
  const owned=S.areas.some(a=>a.animals.some(x=>x.k==='dino:1'))||S.cages.some(x=>x.k==='dino:1');
  if(!owned){if(!zoo.rideNote){toast('Catch a Triceratops in the 🦖 Dino Zone to open Triceratops Rides!');zoo.rideNote=1}return}
  // only baby triceratops give rides: one visitor sits on each little one's back
  const BS=.6;
  for(let i=0;i<4;i++){const inst=ANIMALS.make(SP['dino:1']);inst.g.scale.setScalar(BS);zoo.scene.add(inst.g);
    const look=(i*3+1)%LOOKS.length,r=ANIMALS.make(personSp(look));seat(r);r.g.scale.setScalar(1/BS);r.g.position.set(0,inst.h*.92-.95*LOOKS[look].s/BS,-.6);inst.inner.add(r.g);
    zoo.rides.push({inst,a:i*Math.PI/2,riders:[r],laps:0})}
  // baby triceratops play in the middle
  for(let i=0;i<2;i++){const inst=ANIMALS.make(SP['dino:1']);inst.g.scale.setScalar(.4);zoo.scene.add(inst.g);zoo.rides.push({inst,baby:1,x:RIDE.x-10+i*20,z:RIDE.z,tx:RIDE.x,tz:RIDE.z,t:0,yaw:0})}
}
function updateRides(dt,time){
  if(!zoo.rides)return;
  for(const t of zoo.rides){
    if(t.baby){const dx=t.tx-t.x,dz=t.tz-t.z,d=Math.hypot(dx,dz);let spd=0;
      if(d>.5){spd=1.2;t.x+=dx/d*spd*dt;t.z+=dz/d*spd*dt;t.yaw=Math.atan2(dx,dz)}else if((t.t-=dt)<=0){t.t=3+Math.random()*4;t.tx=RIDE.x+(Math.random()-.5)*RIDE.rx;t.tz=RIDE.z+(Math.random()-.5)*RIDE.rz*.6}
      ANIMALS.animate(t.inst,dt,spd,time,{});t.inst.g.position.set(t.x,.05,t.z);t.inst.g.rotation.y=t.yaw;continue}
    const prev=t.a;t.a+=dt*1.6/((RIDE.rx+RIDE.rz)*.5);
    if(Math.floor(t.a/(Math.PI*2))>Math.floor(prev/(Math.PI*2))){const fee=RIDE.fee*t.riders.length;S.coins+=fee;save();coins();t.laps++;if(curView==='zoo')toast('🦕 Baby Triceratops ride finished! '+t.riders.length+' riders paid '+fee+' coins')}
    const x=RIDE.x+Math.cos(t.a)*(RIDE.rx-6),z=RIDE.z+Math.sin(t.a)*(RIDE.rz-4),vx=-Math.sin(t.a)*(RIDE.rx-6),vz=Math.cos(t.a)*(RIDE.rz-4);
    ANIMALS.animate(t.inst,dt,1.6,time,{});t.inst.g.position.set(x,.05,z);t.inst.g.rotation.y=Math.atan2(vx,vz);
    for(const r of t.riders)r.B.head.rotation.y=Math.sin(time*.9+r.seed)*.6;
  }
}

/* ---------- the Food Store: only you can go in, load food into your truck and feed the animals ---------- */
const FOOD={x:62,z:5,D:22,W:30,max:3};
function buildFoodStore(){
  const g=new T.Group();g.position.set(FOOD.x,0,FOOD.z);zoo.scene.add(g);
  const wall=new T.MeshStandardMaterial({color:'#9aa4a8',roughness:.6,metalness:.3}),roofM=new T.MeshStandardMaterial({color:'#4a5a62',roughness:.5,metalness:.5}),floor=new T.MeshStandardMaterial({color:'#8a8a84',roughness:.9});
  const {D,W}=FOOD,Ht=9;
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  box(floor,0,.05,0,D,.1,W);box(wall,D/2,Ht/2,0,.5,Ht,W);for(const sd of[-1,1])box(wall,0,Ht/2,sd*W/2,D,Ht,.5);
  for(const sd of[-1,1])box(wall,-D/2,Ht/2,sd*(W/2-4),.5,Ht,8);box(wall,-D/2,Ht-1,0,.5,2,W);box(roofM,0,Ht+.2,0,D+1.5,.4,W+1.5);
  // meat in the cold room on one side, hay bales on the other
  const meat=new T.MeshStandardMaterial({color:'#9a2a22',roughness:.5}),hay=new T.MeshStandardMaterial({color:'#d8b860',roughness:1}),crate=new T.MeshStandardMaterial({color:'#6a4a2a',roughness:.9});
  for(let i=0;i<5;i++)for(let j=0;j<2;j++){box(crate,D/2-2-j*2.2,.6,-W/2+3+i*2.4,1.8,1.1,1.8);const m=box(meat,D/2-2-j*2.2,1.3,-W/2+3+i*2.4,1.3,.4,1.3)}
  for(let i=0;i<5;i++)for(let j=0;j<2;j++){const b=new T.Mesh(new T.CylinderGeometry(.9,.9,1.6,16),hay);b.rotation.z=Math.PI/2;b.position.set(D/2-2-j*2.2,.9,W/2-3-i*2.4);b.castShadow=true;g.add(b)}
  const st=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['FOOD STORE','Zoo owner only - press G'],'#8a2a14'),roughness:.7}));st.position.set(-D/2-.3,Ht-1,0);st.rotation.y=-Math.PI/2;g.add(st);
  for(let z=-W/2;z<=W/2;z+=1.8)zoo.cols.push({x:FOOD.x+D/2,z:FOOD.z+z,r:1});
  for(const sd of[-1,1]){for(let x=-D/2;x<=D/2;x+=1.8)zoo.cols.push({x:FOOD.x+x,z:FOOD.z+sd*W/2,r:1});for(let z=0;z<=8;z+=1.8)zoo.cols.push({x:FOOD.x-D/2,z:FOOD.z+sd*(W/2-z),r:1})}
  for(let z=-W/2+3;z<=W/2-3;z+=2.4)zoo.cols.push({x:FOOD.x+D/2-3,z:FOOD.z+z,r:1.6});
  zoo.foodStore=g;
}
function truckFood(){return S.food||(S.food={meat:0,hay:0})}
function nearStore(){return Math.abs(car.x-FOOD.x)<FOOD.D/2+12&&Math.abs(car.z-FOOD.z)<FOOD.W/2+4}
function domeAt(x,z){return[...zoo.areas.values()].find(a=>Math.hypot(x-a.x,z-a.z)<a.R0-3)||null}
// G: load food at the store, or drop food in the dome you are in
function foodAction(){
  if(world&&!world.zoo){callDreams();return}
  if(!(world&&world.zoo))return;
  // use where YOU are: in the truck or walking about
  const px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  if(inLab()||nearLab(px,pz)){openLab();return}
  {const bA=nearBarn(px,pz);if(bA&&(bA.area.barn||[]).length){openRelease(bA.area.id);return}}if(nearNursery(px,pz)&&dropEggs())return;if(nearPens(px,pz)&&dropFamily())return;if(nearDoctor(px,pz)&&visitDoctor())return;const f=truckFood();
  if(nearStore()){if(f.meat>=FOOD.max&&f.hay>=FOOD.max){toast('Your truck is full of food! Drive it to a dome and press G to feed the animals.');return}
    f.meat=FOOD.max;f.hay=FOOD.max;save();showFood();toast('🥩🌾 Loaded '+FOOD.max+' crates of meat and '+FOOD.max+' bales of hay onto your truck! Take them to the domes and press G.');return}
  const A=domeAt(car.x,car.z);
  if(!A){toast(f.meat+f.hay?'Drive into a dome, then press G to feed the animals':'Drive to the 🥩 Food Store (right of the gate) and press G to load food');return}
  const need=[...new Set(A.area.animals.map(an=>eats(SP[an.k])))].filter(Boolean);
  if(!need.length){toast('There are no animals in this dome to feed');return}
  const type=need.find(t=>f[t]>0&&!A.food.some(p=>p.type===t))||need.find(t=>f[t]>0);
  if(!type){toast('You have no '+need.map(t=>t==='meat'?'🥩 meat':'🌾 hay').join(' or ')+' left! Go back to the Food Store.');return}
  f[type]--;save();showFood();
  const p=car.g.localToWorld(V(4,0,0)),pile=dropPile(A,type,p.x,p.z);
  for(const o of zoo.animals)if(o.A===A&&!o.an.preg&&eats(SP[o.an.k])===type){const s=nextSpot(o);o.tx=s.x;o.tz=s.z;o.pile=s.pile||null;o.t=0}
  const who=[...new Set(A.area.animals.filter(an=>eats(SP[an.k])===type).map(an=>SP[an.k].n))].slice(0,3).join(', ');
  toast((type==='meat'?'🥩 Feeding time! Here come the ':'🌾 Fresh hay for the ')+who+'!');
}
function dropPile(A,type,x,z){
  const g=new T.Group(),big=A.R0>250||A.area.hab==='carnivore'?1.8:1,r=1.6*big;
  if(type==='meat'){const m=new T.MeshStandardMaterial({color:'#9a2a22',roughness:.45}),bone=new T.MeshStandardMaterial({color:'#efe6d0',roughness:.6});
    for(let i=0;i<6;i++){const c=new T.Mesh(new T.SphereGeometry(.45*big,10,8),m);c.scale.set(1.4,.6,1);c.position.set((Math.random()-.5)*r,.25*big,(Math.random()-.5)*r);c.rotation.y=Math.random()*3;c.castShadow=true;g.add(c);
      const b=new T.Mesh(new T.CylinderGeometry(.07*big,.07*big,1.2*big,6),bone);b.rotation.z=Math.PI/2;b.position.copy(c.position);b.position.y+=.15*big;b.rotation.y=c.rotation.y;g.add(b)}}
  else{const m=new T.MeshStandardMaterial({color:'#d8b860',roughness:1});for(let i=0;i<5;i++){const h=new T.Mesh(new T.SphereGeometry(.8*big,10,8),m);h.scale.set(1,.45,1);h.position.set((Math.random()-.5)*r,.3*big,(Math.random()-.5)*r);h.castShadow=true;g.add(h)}}
  g.position.set(x,.05,z);zoo.scene.add(g);
  const pile={type,x,z,r,g,left:40,full:40};A.food.push(pile);return pile;
}
function updateFood(dt){
  for(const A of zoo.areas.values())for(const p of A.food.slice()){p.g.scale.setScalar(Math.max(.15,p.left/p.full));
    if(p.left<=0){zoo.scene.remove(p.g);A.food.splice(A.food.indexOf(p),1);S.coins+=100;save();coins();
      toast((p.type==='meat'?'🍖 The meat is all gone! ':'🌾 The hay is all eaten! ')+'Visitors loved feeding time: +100 coins')}}
  if(world&&world.zoo&&car.g)showFood();
}
// food crates ride on the roof rack of your truck
function showFood(){
  if(!car.g)return;const f=truckFood(),key=f.meat+','+f.hay;
  if(car.rack&&car.rack.parent===car.g&&car.rack.userData.key===key)return;
  if(car.rack)car.rack.parent&&car.rack.parent.remove(car.rack);
  const g=new T.Group();g.userData.key=key;car.rack=g;car.g.add(g);
  const meat=new T.MeshStandardMaterial({color:'#9a2a22',roughness:.5}),hay=new T.MeshStandardMaterial({color:'#d8b860',roughness:1}),crate=new T.MeshStandardMaterial({color:'#6a4a2a',roughness:.9});
  for(let i=0;i<f.meat;i++){const c=new T.Mesh(new T.BoxGeometry(.5,.32,.5),crate);c.position.set(-.55+i*.55,2.95,.15);c.castShadow=true;g.add(c);const m=new T.Mesh(new T.BoxGeometry(.38,.1,.38),meat);m.position.set(-.55+i*.55,3.15,.15);g.add(m)}
  for(let i=0;i<f.hay;i++){const b=new T.Mesh(new T.BoxGeometry(.5,.36,.55),hay);b.position.set(-.55+i*.55,2.97,1.05);b.castShadow=true;g.add(b)}
}
function foodHint(){
  if(nearStore())return'<b>G</b> load food into your truck at the Food Store';
  const f=truckFood(),A=domeAt(car.x,car.z);
  if(A&&f.meat+f.hay)return'<b>G</b> drop food for the animals ('+f.meat+' 🥩 '+f.hay+' 🌾)';
  return'';
}

/* ---------- the Ultra Dome: a glass tunnel joining the Mummy Dream Dome and the Ultra Dino Dome ---------- */
function buildTunnel(){
  const a=S.areas.find(x=>x.hab==='dream'),b=S.areas.find(x=>x.hab==='dino'),A=a&&zoo.areas.get(a.id),B=b&&zoo.areas.get(b.id);
  if(!A||!B||zoo.tunnel)return;
  const dx=B.x-A.x,dz=B.z-A.z,L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;
  const p0={x:A.x+ux*(A.R0-8),z:A.z+uz*(A.R0-8)},p1={x:B.x-ux*(B.R0-8),z:B.z-uz*(B.R0-8)},len=Math.hypot(p1.x-p0.x,p1.z-p0.z);
  const g=new T.Group();g.position.set((p0.x+p1.x)/2,0,(p0.z+p1.z)/2);g.rotation.y=Math.atan2(ux,uz);zoo.scene.add(g);
  const glass=new T.MeshPhysicalMaterial({color:'#cdefff',roughness:.05,metalness:.1,clearcoat:1,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});
  const tube=new T.CylinderGeometry(9,9,len,40,1,true);tube.rotateX(Math.PI/2);g.add(new T.Mesh(tube,glass));
  const steel=new T.MeshStandardMaterial({color:'#dfe6ea',metalness:.8,roughness:.3});
  for(let z=-len/2;z<=len/2+.1;z+=len/Math.max(2,Math.round(len/6))){const ring=new T.Mesh(new T.TorusGeometry(9,.22,8,40,Math.PI),steel);ring.position.z=z;ring.castShadow=true;g.add(ring)}
  const pv=zoo.pave||(zoo.pave=pavingTexture()),m=pv.map.clone();m.needsUpdate=true;m.repeat.set(4,len/4);
  const fl=new T.Mesh(new T.PlaneGeometry(16,len),new T.MeshStandardMaterial({map:m,roughness:.9}));fl.rotation.x=-Math.PI/2;fl.position.y=.05;fl.receiveShadow=true;g.add(fl);
  for(const e of[-1,1]){const st=new T.Mesh(new T.PlaneGeometry(10,2.6),new T.MeshStandardMaterial({map:signTexture(['ULTRA DOME','Mummy Dream · Dino Zone'],'#2a5ab8'),roughness:.7,side:T.DoubleSide}));st.position.set(0,10.5,e*len/2);g.add(st)}
  // glass walls you can't drive through, and holes in both domes for the tunnel
  g.updateMatrixWorld(true);
  for(let z=-len/2;z<=len/2;z+=2)for(const sx of[-1,1]){const v=g.localToWorld(V(sx*8.6,0,z));zoo.cols.push({x:v.x,z:v.z,r:1})}
  const clear=(D,cx,cz,r)=>{D.cols=D.cols.filter(c=>Math.hypot(c.x-cx,c.z-cz)>r)};
  for(let t=0;t<=1;t+=.1){clear(A,A.x+ux*A.R0*(1-t*.2),A.z+uz*A.R0*(1-t*.2),9);clear(B,B.x-ux*B.R0*(1-t*.2),B.z-uz*B.R0*(1-t*.2),9)}
  zoo.tunnel={g,p0,p1};
}

/* ---------- Family Pens: small areas just for a mum and her baby ---------- */
const FAM={x:106,z:-32,size:16,gap:2,cols:3,rows:2};
function famPen(i){const c=i%FAM.cols,r=Math.floor(i/FAM.cols);return{x:FAM.x+c*(FAM.size+FAM.gap),z:FAM.z+r*(FAM.size+FAM.gap)}}
function buildFamilyPens(){
  S.fam=S.fam||[[],[],[],[],[],[]];
  const g=new T.Group();zoo.scene.add(g);const wood=NATURE.barkMat(false),hay=new T.MeshStandardMaterial({color:'#d8c07a',roughness:1}),h=FAM.size/2;
  for(let i=0;i<6;i++){const p=famPen(i);
    const fl=new T.Mesh(new T.PlaneGeometry(FAM.size,FAM.size),hay);fl.rotation.x=-Math.PI/2;fl.position.set(p.x,.05,p.z);fl.receiveShadow=true;g.add(fl);
    const rail=(x0,z0,x1,z1)=>{const L=Math.hypot(x1-x0,z1-z0);for(const y of[.5,1.1]){const b=new T.Mesh(new T.BoxGeometry(L,.12,.12),wood);b.position.set((x0+x1)/2,y,(z0+z1)/2);b.rotation.y=-Math.atan2(z1-z0,x1-x0);b.castShadow=true;g.add(b)}
      for(let t=0;t<=L;t+=2){const x=x0+(x1-x0)*t/L,z=z0+(z1-z0)*t/L,po=new T.Mesh(new T.BoxGeometry(.18,1.4,.18),wood);po.position.set(x,.7,z);g.add(po);zoo.cols.push({x,z,r:.7})}};
    rail(p.x-h,p.z-h,p.x+h,p.z-h);rail(p.x-h,p.z-h,p.x-h,p.z+h);rail(p.x+h,p.z-h,p.x+h,p.z+h);rail(p.x-h,p.z+h,p.x-2,p.z+h);rail(p.x+2,p.z+h,p.x+h,p.z+h);
    const st=new T.Mesh(new T.PlaneGeometry(4,1),new T.MeshStandardMaterial({map:signTexture(['Family Pen '+(i+1)],'#8a5a2a'),side:T.DoubleSide}));st.position.set(p.x,1.9,p.z+h+.1);g.add(st)}
  const big=new T.Mesh(new T.PlaneGeometry(10,2.6),new T.MeshStandardMaterial({map:signTexture(['FAMILY PENS','Mums and babies - press G'],'#8a5a2a'),side:T.DoubleSide}));
  big.position.set(FAM.x+FAM.size+FAM.gap,4,FAM.z+2*(FAM.size+FAM.gap)-2);g.add(big);
  zoo.penAreas=[...Array(6)].map((_,i)=>{const p=famPen(i);return{pen:i+1,x:p.x,z:p.z,R0:8,area:{animals:S.fam[i],hab:'pen'},food:[],pond:{x:p.x,z:p.z,r:0}}});
}
function nearPens(x=car.x,z=car.z){const a=famPen(0),b=famPen(5);return x>a.x-FAM.size&&x<b.x+FAM.size&&z>a.z-FAM.size&&z<b.z+FAM.size+6}
function dropFamily(){
  const list=S.cages.filter(c=>!SP[c.k].def.mate);if(!list.length)return false;
  const i=S.fam.findIndex(p=>!p.length);if(i<0){toast('All the Family Pens are full! Catch the animals in a pen with F to take them out.');return true}
  for(const c of list){S.cages.splice(S.cages.indexOf(c),1);delete c.pen;S.fam[i].push(c)}save();refreshCages();syncZooAnimals();
  toast('🏡 '+list.map(c=>SP[c.k].n+(c.born?' baby':'')).join(' and ')+' moved into Family Pen '+(i+1)+'!',6000);return true}

/* ---------- the Animal Doctor's: bring animals in your truck for a check-up ---------- */
const DOC={x:180,z:-8,D:24,W:22};
function buildDoctor(){
  const g=new T.Group();g.position.set(DOC.x,0,DOC.z);zoo.scene.add(g);const {D,W}=DOC,Ht=8;
  const wall=new T.MeshStandardMaterial({color:'#f6f6f2',roughness:.6}),roof=new T.MeshStandardMaterial({color:'#2a7ac8',roughness:.5}),red=new T.MeshStandardMaterial({color:'#e02a2a',emissive:'#a01010',emissiveIntensity:.4});
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  box(wall,0,.05,0,D,.1,W);box(wall,D/2,Ht/2,0,.5,Ht,W);for(const sd of[-1,1])box(wall,0,Ht/2,sd*W/2,D,Ht,.5);
  for(const sd of[-1,1])box(wall,-D/2,Ht/2,sd*(W/2-3.5),.5,Ht,7);box(wall,-D/2,Ht-1,0,.5,2,W);box(roof,0,Ht+.2,0,D+1.5,.4,W+1.5);
  box(red,-D/2-.4,Ht+1.6,0,.3,2.4,.8);box(red,-D/2-.4,Ht+1.6,0,.3,.8,2.4);
  const bed=new T.MeshStandardMaterial({color:'#9ad0f0',roughness:.6});for(let i=0;i<3;i++)box(bed,D/2-4,.5,-W/2+4+i*7,3,1,5);
  const st=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['ANIMAL DOCTOR','Bring animals in your truck - press G'],'#2a7ac8'),roughness:.7}));st.position.set(-D/2-.3,Ht-1.2,0);st.rotation.y=-Math.PI/2;g.add(st);
  // the vet ward: the Sub Ninjas and their egg stay here
  const vs=new T.Mesh(new T.PlaneGeometry(5,1.3),new T.MeshStandardMaterial({map:signTexture(['VET WARD','Sub Ninja family'],'#2a7ac8'),side:T.DoubleSide}));vs.position.set(-1,5,-W/2+.4);g.add(vs);
  zoo.vetArea={pen:'vet',x:DOC.x-1,z:DOC.z,R0:6,area:vetWard(),food:[],pond:{x:DOC.x,z:DOC.z,r:0}};
  for(let z=-W/2;z<=W/2;z+=1.8)zoo.cols.push({x:DOC.x+D/2,z:DOC.z+z,r:1});
  for(const sd of[-1,1]){for(let x=-D/2;x<=D/2;x+=1.8)zoo.cols.push({x:DOC.x+x,z:DOC.z+sd*W/2,r:1});for(let z=0;z<=7;z+=1.8)zoo.cols.push({x:DOC.x-D/2,z:DOC.z+sd*(W/2-z),r:1})}
}
function nearDoctor(x=car.x,z=car.z){return Math.abs(x-DOC.x)<DOC.D/2+12&&Math.abs(z-DOC.z)<DOC.W/2+4}
function visitDoctor(){
  if(!S.cages.length){toast('🩺 Bring animals in your truck and the doctor will check them!');return true}
  const now=Date.now(),names=[];let babies=0;
  for(const c of S.cages.splice(0)){delete c.pen;names.push(SP[c.k].n);
    hist(c,'had a check-up at the Animal Doctor');
    if(c.preg){hist(c,'had a baby at the Animal Doctor');S.holding.push({uid:S.uid++,k:babyKind(c),born:now,mum:c.uid});delete c.preg;babies++}
    S.holding.push(c)}
  S.coins+=names.length*20;autoHome();save();coins();refreshCages();syncZooAnimals();if(curView==='zoo')renderZooUI();
  toast('🩺 The doctor checked your '+names.join(', ')+'. All healthy and happy! ❤️'+(babies?' And the doctor helped '+babies+' baby'+(babies>1?' babies':'')+' be born! 🍼':'')+' They went home to their domes. +'+names.length*20+' coins',8000);return true}

/* ---------- 🧬 the DNA Lab: take DNA from animals and mix two to make a new animal ---------- */
const LAB={x:125,z:12,D:24,W:20};
function buildLab(){
  const g=new T.Group();g.position.set(LAB.x,0,LAB.z);zoo.scene.add(g);const {D,W}=LAB,Ht=8;
  const wall=new T.MeshPhysicalMaterial({color:'#e6fff2',roughness:.3,clearcoat:.6}),roof=new T.MeshStandardMaterial({color:'#1a9a5a',roughness:.5}),glow=new T.MeshStandardMaterial({color:'#3af08a',emissive:'#2ad06a',emissiveIntensity:1.3});
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  box(wall,0,.05,0,D,.1,W);box(wall,0,Ht/2,-W/2,D,Ht,.5);for(const sd of[-1,1])box(wall,sd*D/2,Ht/2,0,.5,Ht,W);
  for(const sd of[-1,1])box(wall,sd*(D/2-4),Ht/2,W/2,8,Ht,.5);box(wall,0,Ht-1,W/2,D,2,.5);box(roof,0,Ht+.2,0,D+1.5,.4,W+1.5);
  // shelves along the back wall for your DNA tubes
  const shelfM=new T.MeshStandardMaterial({color:'#c8b088',roughness:.7});
  for(const y of[1,2.2,3.4])box(shelfM,0,y,-W/2+1,D-4,.12,1.4);for(const sx of[-1,0,1])box(shelfM,sx*(D/2-2),2.2,-W/2+1,.15,4.6,1.4);
  zoo.labSlots=[];for(const y of[1,2.2,3.4])for(let i=0;i<5;i++)zoo.labSlots.push(V(LAB.x-D/2+4+i*(D-8)/4,y+.5,LAB.z-W/2+1));
  // the DNA Mixer machine in the middle
  const tank=new T.MeshPhysicalMaterial({color:'#e8fbff',roughness:.05,transmission:.5,transparent:true,opacity:.35,side:T.DoubleSide});
  const mx=new T.Group();mx.position.set(0,0,1.5);g.add(mx);
  const base=new T.Mesh(new T.CylinderGeometry(2.2,2.5,1,24),new T.MeshStandardMaterial({color:'#5a6a74',metalness:.7,roughness:.3}));base.position.y=.5;mx.add(base);
  const tk=new T.Mesh(new T.CylinderGeometry(1.7,1.7,3.4,28,1,true),tank);tk.position.set(0,2.7,0);mx.add(tk);
  const liq=new T.Mesh(new T.CylinderGeometry(1.55,1.55,1,28),new T.MeshStandardMaterial({color:'#3af08a',emissive:'#2ad06a',emissiveIntensity:.9,transparent:true,opacity:.85}));liq.position.y=1.05;liq.scale.y=.05;mx.add(liq);
  const fun=new T.Mesh(new T.ConeGeometry(1.2,1.2,20,1,true),new T.MeshStandardMaterial({color:'#9aa8b0',metalness:.8,roughness:.3,side:T.DoubleSide}));fun.rotation.x=Math.PI;fun.position.y=5;mx.add(fun);
  const ms=new T.Mesh(new T.PlaneGeometry(4,1),new T.MeshStandardMaterial({map:signTexture(['DNA MIXER'],'#1a9a5a'),side:T.DoubleSide}));ms.position.set(0,6.2,0);mx.add(ms);
  zoo.mixer={g:mx,liq,pour:[],x:LAB.x,z:LAB.z+1.5};zoo.cols.push({x:LAB.x,z:LAB.z+1.5,r:2.4});
  // glass sliding doors at the front
  const doorM=new T.MeshPhysicalMaterial({color:'#bff2ff',roughness:.05,transparent:true,opacity:.45,clearcoat:1});zoo.labDoors=[];
  for(const sd of[-1,1]){const d=new T.Mesh(new T.BoxGeometry(4,6,.2),doorM);d.position.set(sd*2,3,W/2);d.userData.sd=sd;g.add(d);zoo.labDoors.push(d)}
  const helix=new T.Group();helix.position.set(0,Ht+4,0);g.add(helix);for(let i=0;i<24;i++){const a=i*.5;for(const s2 of[1,-1]){const b=new T.Mesh(new T.SphereGeometry(.35,10,8),i%2?glow:roof);b.position.set(Math.cos(a)*1.4*s2,i*.3-3.5,Math.sin(a)*1.4*s2);helix.add(b)}}
  zoo.helix=helix;
  const st=new T.Mesh(new T.PlaneGeometry(9,2.6),new T.MeshStandardMaterial({map:signTexture(['DNA LAB','Make new animals - press G'],'#1a9a5a'),roughness:.7}));st.position.set(0,Ht-1.2,W/2+.3);g.add(st);
  for(let x=-D/2;x<=D/2;x+=1.8)zoo.cols.push({x:LAB.x+x,z:LAB.z-W/2,r:1});
  for(const sd of[-1,1]){for(let z=-W/2;z<=W/2;z+=1.8)zoo.cols.push({x:LAB.x+sd*D/2,z:LAB.z+z,r:1});for(let x=0;x<=8;x+=1.8)zoo.cols.push({x:LAB.x+sd*(D/2-x),z:LAB.z+W/2,r:1})}
}
function nearLab(x=car.x,z=car.z){return Math.abs(x-LAB.x)<LAB.D/2+4&&Math.abs(z-LAB.z)<LAB.W/2+12}
// look at an animal in the zoo and take some of its DNA
function takeDNA(){
  if(!(world&&world.zoo)||mode!=='foot')return;const f=V(0,0,-1).applyQuaternion(cam.quaternion);let best=null,bs=1e9;
  for(const o of zoo.animals){const p=V(o.x,o.inst.g.position.y+o.inst.h*.5,o.z),d=p.clone().sub(cam.position),dist=d.length();if(dist>16)continue;const ang=f.angleTo(d.normalize());if(ang<.4&&ang*30+dist<bs){bs=ang*30+dist;best=o}}
  if(!best){toast('Walk up to an animal and look right at it to take some DNA');return}
  S.dna[best.an.k]=(S.dna[best.an.k]||0)+1;save();syncLabShelves();toast('🧬 You took some '+SP[best.an.k].n+' DNA! It is in the DNA box on your truck. Take it to the DNA Lab.',5000);
}
let dnaSel=[];
function openLab(){dnaSel=[];renderLab();$('#dnaPanel').hidden=false}
function renderLab(){
  const ks=Object.keys(S.dna).filter(k=>S.dna[k]>0&&SP[k]);
  $('#dnaList').innerHTML=ks.length?ks.map(k=>`<button data-k="${k}" class="${dnaSel.includes(k)?'on':''}">${SP[k].e} ${SP[k].n} DNA ×${S.dna[k]}</button>`).join(''):'<i>No DNA yet! Pick up 🧬 DNA tubes on safari, or walk up to a zoo animal and press X.</i>';
  $('#dnaPick').textContent=dnaSel.length===2?SP[dnaSel[0]].n+' + '+SP[dnaSel[1]].n+' = the '+mixName(SP[dnaSel[0]],SP[dnaSel[1]])+'!':'Pick '+(2-dnaSel.length)+' more';
  $('#dnaMix').disabled=dnaSel.length<2;
  $('#dnaMade').innerHTML=S.mixes.length?'Animals you made: '+S.mixes.map(m=>'🧬 '+m.n).join(', '):'';
}
function mixDNA(){
  if(dnaSel.length<2)return;const[a,b]=dnaSel,n=mixName(SP[a],SP[b]);
  S.dna[a]--;S.dna[b]--;const i=S.mixes.length;S.mixes.push({a,b,n});addMix(S.mixes[i],i);const k='mix:'+i;S.dex[k]=1;
  S.holding.push({uid:S.uid++,k});const made=autoHome();save();
  if(zoo.built){S.areas.forEach((ar,j)=>{if(!zoo.areas.has(ar.id)){buildArea(ar,j)}});if(made.length)rebuildPaths();syncVisitors();syncZooAnimals();if(curView==='zoo')renderZooUI()}
  dnaSel=[];renderLab();syncLabShelves();toast('🧬✨ You made a brand-new animal: the '+n+'! It went to its '+HAB[SP[k].hab].name+' dome.',7000);
}
$('#dnaList').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k,i=dnaSel.indexOf(k);if(i>=0)dnaSel.splice(i,1);else if(dnaSel.length<2)dnaSel.push(k);renderLab()});
$('#dnaMix').onclick=mixDNA;$('#dnaClose').onclick=()=>$('#dnaPanel').hidden=true;$('#dnaOpen').onclick=openLab;

/* ---------- inside the DNA Lab: hold a DNA tube and pour it into the mixer ---------- */
function inLab(){return world&&world.zoo&&mode==='foot'&&Math.abs(me.x-LAB.x)<LAB.D/2&&Math.abs(me.z-LAB.z)<LAB.W/2+.5}
function syncLabShelves(){
  if(!zoo.labSlots)return;for(const t of zoo.labTubes||[])zoo.scene.remove(t.g);zoo.labTubes=[];
  const glass=new T.MeshPhysicalMaterial({color:'#e8fbff',roughness:.05,transparent:true,opacity:.5}),liq=new T.MeshStandardMaterial({color:'#3af08a',emissive:'#2ad06a',emissiveIntensity:1.2});
  const left=k=>(S.dna[k]||0)-zoo.mixer.pour.filter(x=>x===k).length-(me.holdDNA===k?1:0);
  Object.keys(S.dna).filter(k=>SP[k]&&left(k)>0).slice(0,zoo.labSlots.length).forEach((k,i)=>{const p=zoo.labSlots[i],g=new T.Group();g.position.copy(p);
    g.add(new T.Mesh(new T.CylinderGeometry(.2,.2,.9,12),glass));const l=new T.Mesh(new T.CylinderGeometry(.16,.16,.7,12),liq);l.position.y=-.05;g.add(l);
    const lb=labelSprite(SP[k].e+' '+SP[k].n+' ×'+left(k),'#1a7a4a');lb.scale.set(2.6,.5,1);lb.position.y=.85;g.add(lb);zoo.scene.add(g);zoo.labTubes.push({k,g})});
}
function lookAtLab(list,r){const f=V(0,0,-1).applyQuaternion(cam.quaternion);let best=null,bs=1e9;
  for(const t of list){const d=t.g.position.clone().sub(cam.position),dist=d.length();if(dist>r)continue;const a=f.angleTo(d.normalize());if(a<.5&&a*10+dist<bs){bs=a*10+dist;best=t}}return best}
function labHint(){
  if(!inLab())return'';
  if(!Object.keys(S.dna).some(k=>S.dna[k]>0))return'🧬 Your DNA shelves are empty! Collect DNA tubes on safari, or press <b>X</b> next to a zoo animal';
  if(me.holdDNA)return Math.hypot(me.x-zoo.mixer.x,me.z-zoo.mixer.z)<5?'Press <b>E</b> to pour the '+SP[me.holdDNA].n+' DNA into the mixer ('+(zoo.mixer.pour.length+1)+'/2)':'You are holding '+SP[me.holdDNA].n+' DNA. Walk to the <b>DNA MIXER</b> and press <b>E</b>';
  const t=lookAtLab(zoo.labTubes||[],4);return t?'Press <b>E</b> to pick up the '+SP[t.k].n+' DNA':'Look at a DNA tube on the shelves and press <b>E</b> to pick it up';
}
function labAction(){
  if(!inLab())return false;
  if(me.holdDNA){if(Math.hypot(me.x-zoo.mixer.x,me.z-zoo.mixer.z)>5){toast('Walk to the DNA MIXER in the middle to pour it in');return true}
    const k=me.holdDNA;if(zoo.mixer.pour[0]===k){toast('Pour in a different kind of DNA to make a new animal!');return true}
    me.holdDNA=null;zoo.mixer.pour.push(k);showHeldDNA();toast('💧 You poured in the '+SP[k].n+' DNA! ('+zoo.mixer.pour.length+'/2)');
    if(zoo.mixer.pour.length===2){dnaSel=zoo.mixer.pour.slice();zoo.mixer.pour=[];zoo.mixer.bubble=3;mixDNA()}
    syncLabShelves();return true}
  const t=lookAtLab(zoo.labTubes||[],4);if(!t){toast(labHint().replace(/<[^>]+>/g,''));return true}
  me.holdDNA=t.k;showHeldDNA();syncLabShelves();toast('✋ You are holding the '+SP[t.k].n+' DNA. Pour it into the DNA MIXER!');return true
}
// a DNA tube in your hand instead of the net
function showHeldDNA(){
  if(!footRig)return;if(!footRig.userData.tube){const g=new T.Group();g.position.set(.26,-.2,-.5);g.rotation.set(-.3,0,-.2);
    g.add(new T.Mesh(new T.CylinderGeometry(.04,.04,.22,10),new T.MeshPhysicalMaterial({color:'#e8fbff',roughness:.05,transparent:true,opacity:.5})));
    const l=new T.Mesh(new T.CylinderGeometry(.033,.033,.17,10),new T.MeshStandardMaterial({color:'#3af08a',emissive:'#2ad06a',emissiveIntensity:1.2}));l.position.y=-.015;g.add(l);footRig.add(g);footRig.userData.tube=g}
  if(!footRig.userData.egg){const e=new T.Mesh(new T.SphereGeometry(.09,14,10),new T.MeshStandardMaterial({color:'#f4efe4',roughness:.5}));e.scale.y=1.3;e.position.set(-.18,-.25,-.45);footRig.add(e);footRig.userData.egg=e}
  const lab=inLab(),egg=(me.holdEggs||[]).length>0;footRig.userData.tube.visible=lab&&!!me.holdDNA;footRig.userData.egg.visible=egg;netRig.visible=!lab&&!me.noNet&&!(world&&world.zoo);
}
function updateLab(dt){
  if(!zoo.mixer)return;const near=curView==='drive'&&world&&world.zoo&&Math.hypot((mode==='car'?car.x:me.x)-LAB.x,(mode==='car'?car.z:me.z)-(LAB.z+LAB.W/2))<9;
  zoo.labOpen=lerp(zoo.labOpen||0,near?1:0,Math.min(1,dt*3));for(const d of zoo.labDoors)d.position.x=d.userData.sd*(2+zoo.labOpen*3.8);
  const m=zoo.mixer,target=m.bubble>0?1:m.pour.length*.45+.05;m.liq.scale.y=lerp(m.liq.scale.y,target*3.2,Math.min(1,dt*2));m.liq.position.y=1+m.liq.scale.y/2;
  if(m.bubble>0){m.bubble-=dt;m.liq.material.emissiveIntensity=1+Math.sin(performance.now()*.02)*.8}else m.liq.material.emissiveIntensity=.9;
  if(curView==='drive'&&world&&world.zoo){showHeldDNA();
    if(inLab())for(const e of me.holdEggs||[])if(!e.dnaTaken){e.dnaTaken=1;S.dna[e.k]=(S.dna[e.k]||0)+1;save();syncLabShelves();toast('🧬 The DNA Lab took some DNA from your '+SP[e.k].n+' egg! It is on the shelf now.',5000)}}
}

/* ---------- Staff Only area and the staff lunch room, next to the Triceratops Rides ---------- */
const STAFF_AREA={x:-188,z:5,w:30,d:22},LUNCH={x:-226,z:5,w:26,d:22};
function buildStaffArea(){
  const g=new T.Group();zoo.scene.add(g);const wood=NATURE.barkMat(false);
  const room=(c,col,roofCol,sign,signCol)=>{const wall=new T.MeshStandardMaterial({color:col,roughness:.7}),roof=new T.MeshStandardMaterial({color:roofCol,roughness:.5});
    const box=(m,x,y,z,a,b,cc)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,cc),m);o.position.set(c.x+x,y,c.z+z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
    box(wall,0,.05,0,c.w,.1,c.d);box(wall,0,3,-c.d/2,c.w,6,.4);for(const sd of[-1,1])box(wall,sd*c.w/2,3,0,.4,6,c.d);
    for(const sd of[-1,1])box(wall,sd*(c.w/4+2),3,c.d/2,c.w/2-4,6,.4);box(roof,0,6.2,0,c.w+1,.4,c.d+1);
    const st=new T.Mesh(new T.PlaneGeometry(8,2.2),new T.MeshStandardMaterial({map:signTexture(sign,signCol),side:T.DoubleSide}));st.position.set(c.x,7.6,c.z+c.d/2);g.add(st);
    for(let x=-c.w/2;x<=c.w/2;x+=1.8)zoo.cols.push({x:c.x+x,z:c.z-c.d/2,r:1});for(const sd of[-1,1]){for(let z=-c.d/2;z<=c.d/2;z+=1.8)zoo.cols.push({x:c.x+sd*c.w/2,z:c.z+z,r:1});for(let x=4;x<=c.w/2;x+=1.8)zoo.cols.push({x:c.x+sd*x,z:c.z+c.d/2,r:1})}
    return box};
  const b1=room(STAFF_AREA,'#d8d0c0','#8a2a14',['STAFF ONLY','Zoo workers'],'#8a2a14');
  const desk=new T.MeshStandardMaterial({color:'#6a4a2a',roughness:.8}),locker=new T.MeshStandardMaterial({color:'#4a6a8a',metalness:.4,roughness:.5});
  for(let i=0;i<6;i++)b1(locker,-STAFF_AREA.w/2+3+i*2,1.4,-STAFF_AREA.d/2+1,1.6,2.8,.8);b1(desk,4,.8,2,5,.1,2.5);
  const b2=room(LUNCH,'#f2e6c8','#2f6a32',['STAFF LUNCH ROOM','Yummy!'],'#2f6a32');
  const tableM=new T.MeshStandardMaterial({color:'#c8a070',roughness:.7}),plate=new T.MeshStandardMaterial({color:'#ffffff',roughness:.4}),food=new T.MeshStandardMaterial({color:'#e07a3a',roughness:.6});
  zoo.lunchSeats=[];for(let i=0;i<3;i++){const z=-6+i*5;b2(tableM,0,.9,z,10,.15,2.2);for(const sx of[-3,0,3]){b2(plate,sx,1,z+.6,.7,.05,.7);b2(food,sx,1.08,z+.6,.35,.12,.35);b2(plate,sx,1,z-.6,.7,.05,.7);b2(food,sx,1.08,z-.6,.35,.12,.35);zoo.lunchSeats.push({x:LUNCH.x+sx,z:LUNCH.z+z+1.5,face:Math.PI},{x:LUNCH.x+sx,z:LUNCH.z+z-1.5,face:0})}
    for(const sd of[-1,1])b2(desk,0,.45,z+sd*1.5,10,.1,.6)}
  // a path from the ride track to the staff area
  const pv=zoo.pave||(zoo.pave=pavingTexture()),m=pv.map.clone();m.needsUpdate=true;m.repeat.set(20,2);
  const path=new T.Mesh(new T.PlaneGeometry(LUNCH.x-STAFF_AREA.x>0?1:Math.abs(RIDE.x-RIDE.rx-LUNCH.x),5),new T.MeshStandardMaterial({map:m,roughness:.9}));path.rotation.x=-Math.PI/2;path.position.set((RIDE.x-RIDE.rx+LUNCH.x)/2,.04,STAFF_AREA.z+STAFF_AREA.d/2+4);path.receiveShadow=true;g.add(path);
}
// workers sit down to eat in the lunch room
function syncLunch(){
  for(const p of zoo.lunchers||[])zoo.scene.remove(p.g);zoo.lunchers=[];if(!zoo.lunchSeats)return;
  const n=Math.min(zoo.lunchSeats.length,4+(S.shop.workers||0));
  for(let i=0;i<n;i++){const p=ANIMALS.make(personSp('staff'));seat(p);const s=zoo.lunchSeats[i];p.g.position.set(s.x,.5-.95*STAFF.s,s.z);p.g.rotation.y=s.face;zoo.scene.add(p.g);zoo.lunchers.push(p)}
}

/* ---------- 🛒 the Zoo Shop ---------- */
const SHOP=[
  {id:'shuttle',e:'🚐',n:'Safari car for visitors',cost:500,buy(){S.shop.shuttles++;if(zoo.built)syncTours();return'A new safari car is driving visitors around!'}},
  {id:'worker',e:'👷',n:'Zoo worker',cost:200,buy(){S.shop.workers++;if(zoo.built){syncVisitors();syncLunch()}return'A new zoo worker started today!'}},
  {id:'hay',e:'🚛',n:'Animal lorry: hay, no bars, 16 spaces',cost:2000,once:1,buy(){S.shop.hayTruck=1;S.cages.forEach(c=>delete c.pen);updateCaps();return'Your new animal lorry has soft hay and room for 16 animals! You will drive it next time you go on safari.'}},
  {id:'helper',e:'🚚',n:'Worker truck that follows you (+4 spaces)',cost:800,max:16,buy(){S.shop.helpers=(S.shop.helpers||0)+1;updateCaps();return'A zoo worker will follow you in their truck on safari! ('+S.shop.helpers+'/16)'}},
  {id:'food',e:'🍖',n:'Food crates for your truck',cost:50,buy(){const f=truckFood();f.meat+=3;f.hay+=3;if(car.g)showFood();return'3 crates of meat and 3 bales of hay are on your truck!'}},
  ...[['#c4843a','Sandy'],['#d8251f','Red'],['#2a5bd7','Blue'],['#ff5fae','Pink'],['#2f9a4a','Green'],['#1d1d22','Black'],['#ffd23a','Yellow']].map(([c,n])=>({id:'paint'+c,e:'🎨',n:n+' truck paint',cost:300,col:c,buy(){S.shop.paint=c;return'Your truck is painted '+n.toLowerCase()+'! You will see it next time you drive.'}}))];
function openShop(){renderShop();$('#shopPanel').hidden=false}
function renderShop(){
  $('#shopCoins').textContent='🪙 '+S.coins.toLocaleString()+' coins · '+(S.shop.workers||0)+' workers · '+((S.dreamBonus?6:2)+(S.shop.shuttles||0))+' safari cars';
  const done=it=>it.once&&S.shop.hayTruck||it.max&&(S.shop.helpers||0)>=it.max;
  $('#shopList').innerHTML=SHOP.map(it=>`<button data-buy="${it.id}" ${S.coins<it.cost||done(it)?'disabled':''}>${it.col?`<i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${it.col}"></i> `:it.e+' '}${it.n}<small>🪙 ${it.cost}</small></button>`).join('');
}
$('#shopList').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(!b)return;const it=SHOP.find(x=>x.id===b.dataset.buy);if(!it||S.coins<it.cost||it.once&&S.shop.hayTruck||it.max&&(S.shop.helpers||0)>=it.max)return;
  S.coins-=it.cost;const msg=it.buy();save();coins();renderShop();toast('🛒 '+msg,5000)});
$('#shopClose').onclick=()=>$('#shopPanel').hidden=true;$('#shopOpen').onclick=openShop;

/* ---------- 🚀 the Launch Room: the Starfleet, a starship for everyone ---------- */
const LAUNCH={x:240,z:0,D:30,W:24},PAD={x:271,z:0};
// a starship: points its nose along +z like the plane
function starModel(col='#2a6ae0'){
  const g=new T.Group(),white=new T.MeshPhysicalMaterial({color:'#f4f6fa',roughness:.25,metalness:.35,clearcoat:1}),blue=new T.MeshStandardMaterial({color:col,roughness:.35,metalness:.4});
  const gold=new T.MeshStandardMaterial({color:'#ffd23a',emissive:'#a07a00',emissiveIntensity:.6,metalness:.6,roughness:.3,side:T.DoubleSide}),dark=new T.MeshStandardMaterial({color:'#2a2e38',metalness:.7,roughness:.4});
  const glass=new T.MeshPhysicalMaterial({color:'#7fd8ff',roughness:.05,emissive:'#2a8ad8',emissiveIntensity:.5}),fire=new T.MeshBasicMaterial({color:'#ffb43a',transparent:true,opacity:.85,fog:false,depthWrite:false});
  const add=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o};
  const body=new T.CapsuleGeometry(1.1,6,8,20);body.rotateX(Math.PI/2);add(body,white,0,0,0);
  const nose=new T.ConeGeometry(1.1,3.2,20);nose.rotateX(Math.PI/2);add(nose,blue,0,0,5.1);
  const cock=add(new T.SphereGeometry(.85,16,12),glass,0,.75,1.8);cock.scale.set(1,.6,1.6);
  // swept-back wings, each with a gold star
  for(const sx of[-1,1]){const w=new T.Shape();w.moveTo(0,1.5);w.lineTo(sx*5.5,-2.2);w.lineTo(sx*5.5,-3.2);w.lineTo(0,-3);
    const wg=new T.ExtrudeGeometry(w,{depth:.2,bevelEnabled:false});wg.rotateX(Math.PI/2);add(wg,blue,0,.1,0);
    const st=new T.ShapeGeometry(starShape(.9));st.rotateX(-Math.PI/2);add(st,gold,sx*3.2,.14,-1.4);
    add(new T.CylinderGeometry(.55,.65,1.8,14),dark,sx*.95,-.2,-3.9).rotation.x=Math.PI/2}
  const fin=add(new T.BoxGeometry(.2,2.2,2),blue,0,1.4,-3);fin.rotation.x=-.4;
  const fl=new T.Group();fl.position.z=-4.8;g.add(fl);
  for(const sx of[-1,1]){const c=new T.ConeGeometry(.5,2.4,12);c.translate(0,1.2,0);c.rotateX(-Math.PI/2);const m=new T.Mesh(c,fire);m.position.set(sx*.95,-.2,0);fl.add(m)}
  g.userData.prop=fl;g.userData.fire=fl;return g;
}
function starShape(r){const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,d=i%2?r*.42:r;s[i?'lineTo':'moveTo'](Math.sin(a)*d,Math.cos(a)*d)}return s}
const FLEET_COLS=['#e02a2a','#2fb84a','#a04ad8','#ff8a1a','#1ab8c8','#ff4fa8'];
function buildLaunchRoom(){
  const g=new T.Group();g.position.set(LAUNCH.x,0,LAUNCH.z);zoo.scene.add(g);const {D,W}=LAUNCH,Ht=12;
  const wall=new T.MeshStandardMaterial({color:'#1c2a5a',roughness:.6}),roof=new T.MeshStandardMaterial({color:'#e8ecf4',roughness:.4,metalness:.3}),floor=new T.MeshStandardMaterial({color:'#3a4048',roughness:.8});
  const glow=new T.MeshStandardMaterial({color:'#3ad8ff',emissive:'#1ab8ff',emissiveIntensity:1.2}),yel=new T.MeshStandardMaterial({color:'#ffd23a',emissive:'#a07a00',emissiveIntensity:.4});
  const box=(m,x,y,z,a,b,c)=>{const o=new T.Mesh(new T.BoxGeometry(a,b,c),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  box(floor,0,.05,0,D,.1,W);box(wall,0,Ht/2,-W/2,D,Ht,.5);for(const sd of[-1,1])box(wall,sd*D/2,Ht/2,0,.5,Ht,W);
  for(const sd of[-1,1])box(wall,sd*(D/2-5),Ht/2,W/2,10,Ht,.5);box(wall,0,Ht-1.5,W/2,D,3,.5);box(roof,0,Ht+.2,0,D+1.5,.4,W+1.5);
  // twinkly stars on the walls and big mission screens
  for(let i=0;i<40;i++){const s=new T.Mesh(new T.ShapeGeometry(starShape(.25+Math.random()*.3)),yel);s.position.set((Math.random()-.5)*(D-2),2+Math.random()*(Ht-4),-W/2+.3);g.add(s)}
  for(const x of[-8,0,8])box(glow,x,5.5,-W/2+.35,6,3.2,.1);box(new T.MeshStandardMaterial({color:'#5a6270',metalness:.5,roughness:.4}),0,.6,-W/2+3,16,1.2,1.6);
  // the Starfleet waits inside, one starship for everyone
  zoo.parked=[];const spots=[[-9,-3],[0,-3],[9,-3],[-9,5],[0,5],[9,5],[-4.5,1]];
  spots.forEach(([x,z],i)=>{const s=starModel(i===spots.length-1?'#ffb020':FLEET_COLS[i%FLEET_COLS.length]);s.userData.fire.visible=false;s.scale.setScalar(.75);s.position.set(LAUNCH.x+x,1.2,LAUNCH.z+z);zoo.scene.add(s);zoo.parked.push(s)});
  const st=new T.Mesh(new T.PlaneGeometry(12,3),new T.MeshStandardMaterial({map:signTexture(['🚀 LAUNCH ROOM','The Starfleet · a starship for everyone · press P'],'#1c2a5a'),roughness:.7}));st.position.set(0,Ht-1.5,W/2+.3);g.add(st);
  for(let x=-D/2;x<=D/2;x+=1.8)zoo.cols.push({x:LAUNCH.x+x,z:LAUNCH.z-W/2,r:1});
  for(const sd of[-1,1]){for(let z=-W/2;z<=W/2;z+=1.8)zoo.cols.push({x:LAUNCH.x+sd*D/2,z:LAUNCH.z+z,r:1});for(let x=0;x<=10;x+=1.8)zoo.cols.push({x:LAUNCH.x+sd*(D/2-x),z:LAUNCH.z+W/2,r:1})}
  // the launch pad outside, with a big star painted on it and a tower
  const pad=new T.Mesh(new T.CylinderGeometry(9,9.5,.6,40),new T.MeshStandardMaterial({color:'#8a8e96',roughness:.8}));pad.position.set(PAD.x,.3,PAD.z);pad.receiveShadow=true;zoo.scene.add(pad);
  const ps=new T.Mesh(new T.ShapeGeometry(starShape(6.5)),yel);ps.rotation.x=-Math.PI/2;ps.position.set(PAD.x,.62,PAD.z);zoo.scene.add(ps);
  const red=new T.MeshStandardMaterial({color:'#d83a2a',roughness:.5});
  for(let y=0;y<22;y+=2){const b=new T.Mesh(new T.BoxGeometry(2.4,.25,2.4),red);b.position.set(PAD.x+11,y+1,PAD.z);zoo.scene.add(b)}
  for(const[a,b]of[[-1,-1],[-1,1],[1,-1],[1,1]]){const p=new T.Mesh(new T.BoxGeometry(.3,22,.3),red);p.position.set(PAD.x+11+a*1.1,11,PAD.z+b*1.1);p.castShadow=true;zoo.scene.add(p)}
  zoo.cols.push({x:PAD.x+11,z:PAD.z,r:2});
  // visitors blast off too: a starship full of visitors goes to space now and then
  zoo.show={g:starModel('#ff4fa8'),t:-20};zoo.show.g.visible=false;zoo.scene.add(zoo.show.g);
}
function nearLaunch(x,z){return Math.abs(x-LAUNCH.x)<LAUNCH.D/2+6&&Math.abs(z-LAUNCH.z)<LAUNCH.W/2+10||Math.hypot(x-PAD.x,z-PAD.z)<16}
// press P: blast off from the Launch Room, or fly home if you are already up there
function launchShip(){
  if(mode==='plane'&&plane.star){if(!plane.homing){plane.homing=1;toast('🛬 Autopilot on! The Starfleet is flying home to the Launch Room…',6000)}return}
  if(mode!=='foot'&&mode!=='car')return;
  const px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z;
  if(!nearLaunch(px,pz)){toast('🚀 Go to the Launch Room (past the Animal Doctor) and press P to blast off in your Starfleet!',6000);return}
  if(me.pack.length)releaseLeash();if(me.mount)dismount(true);
  if(plane.g&&plane.g.parent)plane.g.parent.remove(plane.g);plane.g=starModel('#ffb020');world.scene.add(plane.g);
  Object.assign(plane,{on:true,star:1,homing:0,x:PAD.x,z:PAD.z,y:2.6,yaw:0,v:0,launchT:3.5,boost:0,pitch:-Math.PI/2,from:mode});
  zoo.wing=FLEET_COLS.map((c,i)=>{const s=starModel(c);world.scene.add(s);const k=Math.floor(i/2)+1,side=i%2?1:-1;return{g:s,side:side*7*k,back:8*k,x:0,y:0,z:0}});
  for(const w of zoo.wing){const p=wingSpot(w);w.x=p.x;w.z=p.z;w.y=2.6}
  for(const s of zoo.parked||[])s.visible=false;
  mode='plane';car.v=0;footRig.visible=false;netRig.visible=false;look.yaw=0;look.pitch=.15;setDriveUI();
  toast('🚀 Everyone get in! The whole Starfleet is on the launch pad… 3…',1200);
}
function wingSpot(w){const b={x:Math.sin(plane.yaw),z:Math.cos(plane.yaw)},s={x:Math.cos(plane.yaw),z:-Math.sin(plane.yaw)};return{x:plane.x+b.x*w.back+s.x*w.side,z:plane.z+b.z*w.back+s.z*w.side}}
function landShip(){
  for(const w of zoo.wing||[])world.scene.remove(w.g);zoo.wing=[];world.scene.remove(plane.g);plane.g=null;plane.on=false;plane.star=0;
  for(const s of zoo.parked||[])s.visible=true;
  me.x=PAD.x-12;me.z=PAD.z+4;me.y=0;me.vy=0;mode='foot';look.yaw=Math.PI/2;look.pitch=0;footRig.visible=true;netRig.visible=!me.noNet;setDriveUI();
  toast('🛬 The Starfleet landed back at the Launch Room! Everyone had a great trip to space. Your truck is where you left it.',7000)}
function updateStar(dt){
  const g=plane.g;let turn=0,vy=0,gas=0;
  if(plane.launchT>0){const was=Math.ceil(plane.launchT);plane.launchT-=dt;const n=Math.ceil(plane.launchT);
    if(n!==was&&n>0)toast('🚀 '+n+'…',1000);if(plane.launchT<=0){plane.boost=3;toast('🔥 BLAST OFF! W faster · S slower · A D turn · Space up · Shift down · P to fly home',8000)}
    gas=plane.launchT<1.5?.6:0}
  else if(plane.boost>0){plane.boost-=dt;plane.y+=(30+(3-plane.boost)*25)*dt;plane.pitch=lerp(plane.pitch,-.35,dt*.8);gas=1;if(plane.boost<=0)plane.v=40}
  else if(plane.homing){const dx=PAD.x-plane.x,dz=PAD.z-plane.z,d=Math.hypot(dx,dz),sp=clamp(d*.8,6,160);
    if(d>.5){const k=Math.min(1,sp*dt/d);plane.x+=dx*k;plane.z+=dz*k;let dy=Math.atan2(-dx,-dz)-plane.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));plane.yaw+=dy*Math.min(1,dt*2);turn=clamp(dy,-1,1)}
    const want=d>40?Math.min(plane.y,Math.max(60,d*.5)):2.6;plane.y=lerp(plane.y,want,Math.min(1,dt*(d>40?.4:1.2)));plane.pitch=lerp(plane.pitch,d>40?.1:0,dt*2);gas=.4;
    if(d<1.5&&plane.y<3.5){landShip();return}}
  else{gas=keys.up?1:pad.gas;const brk=keys.down?1:pad.brake;turn=((keys.left?1:0)-(keys.right?1:0))||-pad.steer;
    if(gas>.05)plane.v+=35*gas*dt;if(brk>.05)plane.v-=35*brk*dt;plane.v=clamp(plane.v,15,160);plane.yaw+=turn*.9*dt;
    plane.x=clamp(plane.x-Math.sin(plane.yaw)*plane.v*dt,-2500,2500);plane.z=clamp(plane.z-Math.cos(plane.yaw)*plane.v*dt,-3000,2000);
    vy=(keys.rise||pad.rise?1:0)-(keys.run||keys.dive||pad.dive?1:0);plane.y=clamp(plane.y+vy*45*dt,6,950);plane.pitch=lerp(plane.pitch,-vy*.3,dt*4)}
  me.x=plane.x;me.z=plane.z;me.y=plane.y-1;
  const shake=plane.launchT>0?(3.5-plane.launchT)*.04:0;
  g.position.set(plane.x+(Math.random()-.5)*shake,plane.y+(plane.launchT>0?0:Math.sin(performance.now()*.002)*.2),plane.z+(Math.random()-.5)*shake);
  g.rotation.set(plane.pitch,plane.yaw+Math.PI,0,'YXZ');g.rotation.z=-turn*.5;
  const f=g.userData.fire;f.visible=gas>0||plane.launchT<=0;f.scale.set(1,1,.5+gas*.9+Math.random()*.3);
  // the rest of the Starfleet flies in a V behind you
  for(const w of zoo.wing||[]){const p=wingSpot(w),k=plane.launchT>0?1:Math.min(1,dt*3);w.x=lerp(w.x,p.x,k);w.z=lerp(w.z,p.z,k);w.y=lerp(w.y,plane.launchT>0?2.6:plane.y-2-w.back*.15,plane.boost>0?Math.min(1,dt*2):k);
    w.g.position.set(w.x,w.y+Math.sin(performance.now()*.002+w.side)*.3,w.z);w.g.rotation.copy(g.rotation);const wf=w.g.userData.fire;wf.visible=f.visible;wf.scale.copy(f.scale)}
}
// high up, the sky turns black and you can see the stars, the moon and a ringed planet
function spaceSky(){
  const s=mode==='plane'&&plane.star?clamp((plane.y-150)/400,0,1):0;
  if(!zoo.space){if(!s)return;const g=new T.Group(),n=2500,pos=new Float32Array(n*3);
    for(let i=0;i<n;i++){const v=V(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(880);pos.set([v.x,v.y,v.z],i*3)}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));
    const stars=new T.Points(geo,new T.PointsMaterial({color:'#ffffff',size:2.2,sizeAttenuation:false,fog:false,transparent:true,depthWrite:false}));stars.renderOrder=-9;g.add(stars);
    const moon=new T.Mesh(new T.SphereGeometry(60,32,20),new T.MeshBasicMaterial({color:'#e8e8e0',fog:false,transparent:true}));moon.position.set(-500,420,-450);moon.renderOrder=-8;g.add(moon);
    const pl=new T.Mesh(new T.SphereGeometry(90,32,20),new T.MeshBasicMaterial({color:'#e89a4a',fog:false,transparent:true}));pl.position.set(550,300,-500);pl.renderOrder=-8;g.add(pl);
    const ring=new T.Mesh(new T.RingGeometry(120,170,48),new T.MeshBasicMaterial({color:'#f4d8a0',fog:false,side:T.DoubleSide,transparent:true,opacity:.8}));ring.position.copy(pl.position);ring.rotation.set(1.2,.3,0);ring.renderOrder=-8;g.add(ring);
    zoo.space={g,mats:[stars.material,moon.material,pl.material,ring.material]};zoo.scene.add(g)}
  const sp=zoo.space;sp.g.visible=s>0;if(!s)return;sp.g.position.copy(cam.position);for(const m of sp.mats)m.opacity=s*(m===sp.mats[3]?.8:1);
  const f=world.scene.fog,blk=new T.Color('#03040c');f.color.lerp(blk,s);world.scene.background.lerp(blk,s);f.far*=1+s*4;world.sky.sky.visible=s<.6}
// every so often a starship full of visitors blasts off and comes back from space
function updateLaunchShow(dt){
  const sh=zoo.show;if(!sh)return;if(plane.star){sh.g.visible=false;sh.t=-20;return}sh.t+=dt;const t=sh.t,g=sh.g;
  if(t<0){g.visible=false;return}g.visible=true;
  // 0-4 countdown on the pad, 4-14 up to space, 14-30 away, 30-40 back down, then a rest
  const y=t<4?2.6:t<14?2.6+Math.pow((t-4)/10,2)*700:t<30?2000:t<40?2.6+Math.pow((40-t)/10,2)*700:2.6;
  g.position.set(PAD.x+(t<4?(Math.random()-.5)*t*.03:0),y,PAD.z);g.rotation.set(-Math.PI/2,Math.PI,0,'YXZ');g.visible=y<1500;
  const f=g.userData.fire;f.visible=t>3&&t<40;f.scale.set(1,1,.8+Math.random()*.6);
  if(t>=45){sh.t=-40;S.coins+=300;save();coins();if(curView==='drive'&&Math.hypot(me.x-PAD.x,me.z-PAD.z)<150)toast('🚀 A starship full of visitors came back from space! They loved it. +300 coins')}
}

/* ---------- 🔒 animal houses beside every dome: new animals wait behind bars until you release them ---------- */
// a long row of barred cages along the front of the dome: one cage for each kind of animal, room for hundreds
const BARN={n:28,w:6,start:17,z0:1.5,z1:8.5,Ht:5,show:4};
function cageX(i){const side=i<BARN.n?-1:1,j=i%BARN.n;return side*(BARN.start+BARN.w*(j+.5))}
function buildBarn(grp,R0,cols,area){
  const {n,w,start,Ht}=BARN,z0=R0+BARN.z0,z1=R0+BARN.z1,D=z1-z0,zc=(z0+z1)/2,L=n*w;
  const walls=[],roofs=[],bars=[],floors=[];
  const box=(list,a,b,c,x,y,z)=>{const g=new T.BoxGeometry(a,b,c);g.translate(x,y,z);list.push(g)};
  const bar=(x,z)=>{const g=new T.CylinderGeometry(.06,.06,Ht,6);g.translate(x,Ht/2,z);bars.push(g)};
  for(const sd of[-1,1]){const xa=sd*start,xb=sd*(start+L),xm=(xa+xb)/2;
    box(floors,L,.12,D,xm,.06,zc);box(walls,L,Ht,.4,xm,Ht/2,z0);box(roofs,L+1,.4,D+1.2,xm,Ht+.2,zc);
    for(const x of[xa,xb])box(walls,.4,Ht,D,x,Ht/2,zc);
    for(let t=.3;t<L;t+=.45)bar(xa+sd*t,z1);
    for(let c=1;c<n;c++)for(let z=z0+.3;z<z1;z+=.45)bar(xa+sd*c*w,z);
    for(const y of[.15,Ht-.15])box(bars,L,.12,.12,xm,y,z1);
    for(let t=0;t<=L;t+=1.6){cols.push({x:xa+sd*t,z:z1,r:.9});cols.push({x:xa+sd*t,z:z0,r:.9})}
    for(let z=z0;z<=z1;z+=1.6)for(const x of[xa,xb])cols.push({x,z,r:.9})}
  const mk=(list,m)=>{const o=new T.Mesh(NATURE.merge(list),m);o.castShadow=o.receiveShadow=true;grp.add(o)};
  mk(floors,new T.MeshStandardMaterial({color:'#9a9488',roughness:.95}));mk(walls,new T.MeshStandardMaterial({color:'#b8a890',roughness:.85}));
  mk(roofs,new T.MeshStandardMaterial({color:'#6a4a2a',roughness:.7}));mk(bars,new T.MeshStandardMaterial({color:'#3a3d42',metalness:.7,roughness:.35}));
  const st=new T.Mesh(new T.PlaneGeometry(9,2.2),new T.MeshStandardMaterial({map:signTexture(['🔒 '+(area.hab==='dream'?'DREAM':area.hab==='dino'?'DINO':HAB[area.hab].name.toUpperCase())+' ANIMAL HOUSE','Every animal has its own cage'],'#6a4210'),roughness:.7}));
  st.position.set(-start-4.5,Ht+2.6,z1+.62);grp.add(st);
}
// the kinds of animal waiting, in the order they arrived: each one gets the next cage
function barnKinds(area){const ks=[];for(const an of area.barn||[])if(!ks.includes(an.k))ks.push(an.k);return ks.slice(0,BARN.n*2)}
function cageArea(A,i){
  const x=cageX(i),a=A.grp.localToWorld(V(x-BARN.w/2+1,0,A.R0+BARN.z0+1.2)),b=A.grp.localToWorld(V(x+BARN.w/2-1,0,A.R0+BARN.z1-1.2));
  const B={x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),z0:Math.min(a.z,b.z),z1:Math.max(a.z,b.z)};
  return{pen:'barn',dome:A,b:B,x:(B.x0+B.x1)/2,z:(B.z0+B.z1)/2,R0:2,area:{animals:A.area.barn,hab:'pen'},food:[],pond:{x:0,z:0,r:0}}}
// put the waiting animals in their cages, with a name sign on each one
function syncBarn(A){
  A.area.barn=A.area.barn||[];if(A.barnSigns)A.grp.remove(A.barnSigns);const g=new T.Group();A.barnSigns=g;A.grp.add(g);A.cages={};
  barnKinds(A.area).forEach((k,i)=>{const P=cageArea(A,i);A.cages[k]=P;const n=A.area.barn.filter(an=>an.k===k).length;
    const sg=new T.Mesh(new T.PlaneGeometry(5.4,1.5),new T.MeshStandardMaterial({map:signTexture([SP[k].e+' '+SP[k].n,'×'+n],'#3a2a1a'),roughness:.7}));
    sg.position.set(cageX(i),BARN.Ht-.9,A.R0+BARN.z1+.3);g.add(sg);
    A.area.barn.filter(an=>an.k===k).slice(0,BARN.show).forEach(an=>{const s=barnSpot(P),o=addZooAnimal(an,P,s.x,s.z,Math.random()*6.28);
      const f=Math.min(1,3.4/o.inst.h,4/Math.max(o.inst.len,1));if(f<1)o.inst.inner.scale.multiplyScalar(f)})})}
function barnSpot(P){const b=P.b;return{x:b.x0+Math.random()*(b.x1-b.x0),z:b.z0+Math.random()*(b.z1-b.z0)}}
function nearBarn(x,z){for(const A of zoo.areas.values()){if(!A.grp)continue;const l=A.grp.worldToLocal(V(x,0,z));
  if(Math.abs(l.x)>BARN.start-6&&Math.abs(l.x)<BARN.start+BARN.n*BARN.w+6&&l.z>A.R0-4&&l.z<A.R0+BARN.z1+10)return A}return null}
function barnHint(){const px=mode==='car'?car.x:me.x,pz=mode==='car'?car.z:me.z,A=nearBarn(px,pz);if(!A)return'';const n=(A.area.barn||[]).length;
  return n?'🔒 '+n+' animal'+(n>1?'s':'')+' waiting in the animal house · press <b>G</b> to release them':'🔒 The animal house is empty'}
// the Release animals panel: pick a place, then pick who to let out
let relArea=null;
function domeName(a){return a.hab==='dream'?'Mummy Dream Dome':a.hab==='dino'?'Ultra Dino Dome':HAB[a.hab].name+' dome'}
function openRelease(id){relArea=id==null?null:id;renderRelease();$('#relPanel').hidden=false}
function renderRelease(){
  const list=$('#relList'),info=$('#relInfo');
  if(relArea==null){const ws=S.areas.filter(a=>a.animals.length||(a.barn||[]).length);
    info.textContent=ws.length?'Pick a place:':'No animals yet. Animals you bring to the zoo wait in the animal house next to their dome.';
    list.innerHTML=ws.map(a=>`<button data-area="${a.id}"><span>${HAB[a.hab]?HAB[a.hab].i:'💖'} ${domeName(a)}</span><small>${(a.barn||[]).length?'🔒 '+a.barn.length+' waiting · ':''}${a.animals.length} out</small></button>`).join('');$('#relBack').hidden=true;return}
  const a=S.areas.find(x=>x.id===relArea);if(!a){relArea=null;renderRelease();return}
  const wait={},out={};for(const an of a.barn||[])wait[an.k]=(wait[an.k]||0)+1;for(const an of a.animals)out[an.k]=(out[an.k]||0)+1;
  const ks=[...new Set([...Object.keys(wait),...Object.keys(out)])];
  info.textContent='All the animals in the '+domeName(a)+'. Press an animal to let it out, or to put it back in the animal house:';
  list.innerHTML=(a.animals.length?`<button class="all" data-allin="1"><span>🔒 All of them in</span><b>PUT ALL IN ×${a.animals.length}</b></button>`:'')+((a.barn||[]).length>1?`<button class="all" data-k="*"><span>🔓 Everyone</span><b>RELEASE ALL ×${a.barn.length}</b></button>`:'')+
    ks.map(k=>wait[k]?`<button data-k="${k}"><span>${SP[k].e} ${SP[k].n} ×${wait[k]}</span><b style="color:#b8741a">🔓 RELEASE</b></button>`
      :`<button data-back="${k}" style="border-color:#2f9a4a"><span>${SP[k].e} ${SP[k].n} ×${out[k]}</span><b style="color:#2f9a4a">✅ OUT · 🔒 put back</b></button>`).join('');$('#relBack').hidden=false}
// put animals back in the animal house
function lockAnimals(id,k){const a=S.areas.find(x=>x.id===id);if(!a)return;a.barn=a.barn||[];const back=a.animals.filter(an=>an.k===k&&!an.preg);if(!back.length){toast('That mum is about to have her baby, so she stays out for now!');return}
  for(const an of back){a.animals.splice(a.animals.indexOf(an),1);a.barn.push(an)}save();syncZooAnimals();if(curView==='zoo')renderZooUI();toast('🔒 The '+SP[k].n+(back.length>1?'s went':' went')+' back into the animal house.')}
function releaseAnimals(id,k){
  const a=S.areas.find(x=>x.id===id);if(!a||!a.barn)return;const out=a.barn.filter(an=>k==='*'||an.k===k);if(!out.length)return;
  for(const an of out){a.barn.splice(a.barn.indexOf(an),1);a.animals.push(an);hist(an,'was released into the '+domeName(a))}
  save();syncZooAnimals();if(curView==='zoo')renderZooUI();
  // they come out of the animal house and run in through the dome's door
  const A=zoo.areas.get(id);if(A)for(const o of zoo.animals)if(out.includes(o.an)){o.x=A.door.x+(Math.random()-.5)*6;o.z=A.door.z+(Math.random()-.5)*6;o.dash=1}
  const names=[...new Set(out.map(an=>SP[an.k].n))];
  toast('🔓 The '+(names.length>2?out.length+' animals':names.join(' and ')+(out.length>1?'s':''))+' ran out into the '+domeName(a)+'!',6000)}
$('#relList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.area){relArea=+b.dataset.area;renderRelease();return}
  if(b.dataset.k){releaseAnimals(relArea,b.dataset.k);renderRelease()}
  if(b.dataset.back){lockAnimals(relArea,b.dataset.back);renderRelease()}
  if(b.dataset.allin){const a=S.areas.find(x=>x.id===relArea);if(a)for(const k of new Set(a.animals.map(an=>an.k)))lockAnimals(relArea,k);renderRelease()}});
$('#relBack').onclick=()=>{relArea=null;renderRelease()};$('#relClose').onclick=()=>$('#relPanel').hidden=true;$('#relOpen').onclick=()=>openRelease(null);

/* ---------- 🎤 the Feeding Show: visitors pay to watch you feed an animal, the speaker tells everyone and the crowd cheers ---------- */
const SHOW_FEE=600000;
const SHOW_LINES=['Look at it go! What an appetite!','Give it up for the zookeeper!','More food coming up! Who wants more?','Wow! Did you see that? Amazing!','Everybody cheer! Louder!','Yum yum yum! Best dinner ever!'];
function openShow(){
  const seen=new Set(),ks=[];for(const a of S.areas)for(const an of a.animals)if(!seen.has(an.k)&&zoo.animals.some(o=>o.an===an)){seen.add(an.k);ks.push(an.k)}
  $('#showList').innerHTML=ks.length?ks.map(k=>`<button data-show="${k}"><span>${SP[k].e} ${SP[k].n}</span><small>👥 +600,000</small></button>`).join(''):'<p>Release some animals into their domes first!</p>';
  $('#showPanel').hidden=false}
function showSay(text){$('#speaker .say').textContent='📢 '+text}
// the crowd cheers: clapping hands and confetti float up, and you hear them
function cheer(){
  const box=$('#cheer');for(let i=0;i<14;i++){const e=document.createElement('i');e.textContent=['👏','🎉','🙌','⭐','🥳','📣'][i%6];e.style.left=(5+Math.random()*90)+'%';e.style.animationDelay=(Math.random()*.5)+'s';box.appendChild(e);setTimeout(()=>e.remove(),2800)}
  if(zoo.show2)zoo.show2.cheerT=2.5;
  try{const ac=zoo.ac||(zoo.ac=new(window.AudioContext||window.webkitAudioContext)()),n=ac.sampleRate*1.8,buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.min(1,t*8)*(1-t)*(.6+.4*Math.sin(i/ac.sampleRate*40))}
    const s=ac.createBufferSource();s.buffer=buf;const f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;f.Q.value=.7;const g=ac.createGain();g.gain.value=.5;s.connect(f).connect(g).connect(ac.destination);s.start()}catch(e){}}
// the feeding gate: bars across the dome's doorway, with the crowd outside and the food going through the bars
function showSpot(A,lx,lz){const v=A.grp.localToWorld(V(lx,0,lz));return{x:v.x,z:v.z}}
function startShow(k){
  const o=zoo.animals.find(o=>o.an.k===k&&S.areas.includes(o.A.area)&&o.A.grp);if(!o){toast('That animal is not out in its dome right now');return}
  $('#showPanel').hidden=true;if(zoo.show2)endShow(true);const A=o.A,R0=A.R0,hw=doorAng(R0)*R0+1;
  // bars across the doorway so nobody goes in
  const gate=new T.Group(),iron=new T.MeshStandardMaterial({color:'#3a3d42',metalness:.7,roughness:.35}),bars=[];
  for(let x=-hw;x<=hw;x+=.4){const g=new T.CylinderGeometry(.06,.06,4.6,6);g.translate(x,2.3,R0+.6);bars.push(g)}
  for(const y of[.2,2.3,4.5]){const g=new T.BoxGeometry(hw*2,.14,.14);g.translate(0,y,R0+.6);bars.push(g)}
  gate.add(new T.Mesh(NATURE.merge(bars),iron));const sg=new T.Mesh(new T.PlaneGeometry(7,1.8),new T.MeshStandardMaterial({map:signTexture(['🎤 FEEDING SHOW','Feed through the bars only!'],'#d8442a'),roughness:.7}));
  sg.position.set(0,5.6,R0+.7);gate.add(sg);A.grp.add(gate);
  // the crowd stands OUTSIDE, behind the bars
  const inside=showSpot(A,0,R0-4),crowd=[];
  for(let i=0;i<14;i++){const row=i%2,lx=-hw+1+(i>>1)*(2*hw-2)/6,lz=R0+2.8+row*2.2,p=showSpot(A,lx,lz),inst=ANIMALS.make(personSp(i%LOOKS.length));
    inst.g.position.set(p.x,0,p.z);inst.g.rotation.y=Math.atan2(inside.x-p.x,inside.z-p.z);zoo.scene.add(inst.g);crowd.push({inst,x:p.x,z:p.z,ph:Math.random()*6})}
  // the keeper calls the animals over to the gate
  for(const q of zoo.animals)if(q.A===A&&q.an.k===k){const p=showSpot(A,(Math.random()-.5)*16,R0-22-Math.random()*10);q.x=q.tx=p.x;q.z=q.tz=p.z}
  zoo.show2={k,A,o,crowd,gate,t:0,cheerT:0,look:showSpot(A,0,R0-3)};for(const an of A.area.animals)if(an.k===k)hist(an,'starred in a Feeding Show');
  S.coins+=SHOW_FEE;save();coins();
  const w=zoo.cam.w,dr=A.door;w.yaw=Math.atan2(dr.x-A.x,dr.z-A.z);w.tx=zoo.show2.look.x;w.tz=zoo.show2.look.z;w.dist=26;w.pitch=.3;
  $('#speaker').hidden=false;const n=SP[k].n;
  showSay('Ladies and gentlemen, boys and girls! Welcome to the Feeding Show! Stay behind the bars, please! Today we are feeding the '+n+'! Give a big cheer!');cheer();
  setTimeout(()=>{if(zoo.show2&&zoo.show2.k===k)throwShowFood()},3500);
  toast('🎤 The visitors paid 600,000 coins to watch the '+n+' Feeding Show!',6000)}
function throwShowFood(){
  const sh=zoo.show2;if(!sh)return;const R0=sh.A.R0,type=eats(SP[sh.k])||'meat';
  // the food goes through the bars, just inside the gate
  const p=showSpot(sh.A,(Math.random()-.5)*10,R0-4-Math.random()*4);dropPile(sh.A,type,p.x,p.z);
  for(const q of zoo.animals)if(q.A===sh.A&&q.an.k===sh.k){const s=nextSpot(q);q.tx=s.x;q.tz=s.z;q.pile=s.pile||null;q.t=0;q.dash=1}
  showSay(SHOW_LINES[Math.floor(Math.random()*SHOW_LINES.length)]);cheer()}
function endShow(quiet){const sh=zoo.show2;if(!sh)return;for(const c of sh.crowd)zoo.scene.remove(c.inst.g);if(sh.gate)sh.A.grp.remove(sh.gate);zoo.show2=null;$('#speaker').hidden=true;
  try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}if(!quiet)toast('🎤 What a show! The visitors loved it. Come back soon!')}
function updateShow(dt,time){const sh=zoo.show2;if(!sh)return;sh.t+=dt;sh.cheerT-=dt;
  for(const c of sh.crowd){ANIMALS.animate(c.inst,dt,0,time,{});c.inst.g.position.y=sh.cheerT>0?Math.abs(Math.sin(time*9+c.ph))*.5:0}
  }
$('#showOpen').onclick=openShow;$('#showClose').onclick=()=>$('#showPanel').hidden=true;
$('#showList').addEventListener('click',e=>{const b=e.target.closest('[data-show]');if(b)startShow(b.dataset.show)});
$('#showFeed').onclick=throwShowFood;$('#showEnd').onclick=()=>endShow();

/* ---------- 📺 The Animal Programme: people watch at home while a drone flies to each animal and the presenter tells its story ---------- */
const FACTS={Zebra:'Every zebra has its own stripes, like a fingerprint. No two are the same!',Giraffe:'Giraffes are the tallest animals in the world. Their tongues are purple and very long.',
  Elephant:'Elephants are the biggest land animals. They use their trunks to drink, smell and give hugs.',Hippo:'Hippos spend most of the day in the water to keep cool, and they can hold their breath for five minutes.',
  Rhino:'Rhinos have thick skin like armour, and their horns are made of the same stuff as your fingernails.',Lion:'Lions live in families called prides, and a lion\'s roar can be heard eight kilometres away!',
  Gorilla:'Gorillas are gentle giants. The biggest male is called a silverback because of the grey hair on his back.',Cheetah:'Cheetahs are the fastest animals on land. They can run as fast as a car on the motorway!',
  Gazelle:'Gazelles can jump high into the air while they run. It is called pronking!',Wildebeest:'Every year millions of wildebeest walk across Africa looking for fresh grass. It is called the Great Migration.',
  'Cape Buffalo':'Cape buffalo live in big herds and look after each other. Even lions are careful around them.',Warthog:'Warthogs kneel down on their front knees to eat grass, and they run with their tails straight up.',
  Hyena:'Hyenas sound like they are laughing, and they have some of the strongest jaws of any animal.',Leopard:'Leopards are super strong. They can carry their food all the way up a tree.',
  Impala:'Impalas can leap three metres high and ten metres long. Boing!',Ostrich:'Ostriches are the biggest birds in the world. They cannot fly, but they run really fast.',
  'Nile Crocodile':'Crocodiles have been around since the time of the dinosaurs!',Meerkat:'Meerkats take turns standing on guard to look out for danger while the others play.',
  Baboon:'Baboons live in big noisy troops and love to groom each other.',Chimpanzee:'Chimpanzees are very clever. They use sticks as tools to catch tasty termites.',
  'Black Mamba':'The black mamba is one of the fastest snakes in the world. It is not black, it is grey. Its mouth is black inside!',
  Vulture:'Vultures are nature\'s cleaners. They can spot food from high up in the sky.','Ring-tailed Lemur':'Ring-tailed lemurs live only on the island of Madagascar, and they hold their stripy tails up high like flags.',
  Aardvark:'Aardvarks can eat fifty thousand ants and termites in one night with their long sticky tongues.',Pangolin:'Pangolins are covered in scales and roll up into a ball when they are scared.',
  Penguin:'Penguins cannot fly in the air, but they fly through the water!','Polar Bear':'Polar bears have black skin under their white fur to soak up the sun.',Kangaroo:'Baby kangaroos are called joeys and they live in their mum\'s pouch.',
  'Giant Panda':'Pandas eat bamboo for about twelve hours every day!',Tiger:'Tigers love swimming, and every tiger has different stripes.'};
function ago(t){const s=(Date.now()-t)/1000,n=(v,w)=>{v=Math.round(v);return(v===1?'one '+w:v+' '+w+'s')+' ago'};return s<90?'just now':s<3600?n(s/60,'minute'):s<86400?n(s/3600,'hour'):n(s/86400,'day')}
function storyFor(o){
  const an=o.an,sp=SP[an.k],d=sp.def,n=sp.n,c=CONT.find(c=>c.id===sp.cont),A=o.A,lines=[];
  lines.push('Our drone is flying over the '+(A.area?domeName(A.area):'zoo')+' to visit the '+n+'!');
  lines.push(FACTS[n]||(d.hunts?'The '+n+' is a hunter. It loves to eat meat.':d.swim?'The '+n+' lives in the water.':d.fly?'The '+n+' can fly!':'The '+n+' loves to munch on plants.'));
  if(an.born)lines.push('This one is a baby. It was born right here in our zoo'+(zoo.animals.some(q=>q.an.uid===an.mum)?', and its mum lives here too.':'!'));
  else if(an.h&&an.h.length)for(const[t,txt]of an.h.slice(-3))lines.push(ago(t).replace(/^./,m=>m.toUpperCase())+', this '+n+' '+txt+'.');
  else if(c&&c.place)lines.push('Animals like this one come from the '+c.place+' in '+c.name+'.');
  const kids=zoo.animals.filter(q=>q.an.mum===an.uid).length;if(kids)lines.push('It has had '+kids+' '+(kids>1?'babies':'baby')+'. What a great parent!');
  const all=S.areas.reduce((s,a)=>s+a.animals.filter(x=>x.k===an.k).length,0);if(all>1)lines.push('There are '+all+' '+n+'s in our zoo.');
  return lines}
function droneModel(){const g=new T.Group(),body=new T.MeshStandardMaterial({color:'#e8e8ec',metalness:.4,roughness:.3}),dark=new T.MeshStandardMaterial({color:'#222'}),red=new T.MeshBasicMaterial({color:'#ff2a2a'});
  const b=new T.Mesh(new T.BoxGeometry(.5,.18,.5),body);g.add(b);g.userData.props=[];
  for(const[x,z]of[[1,1],[1,-1],[-1,1],[-1,-1]]){const arm=new T.Mesh(new T.BoxGeometry(.06,.05,.55),dark);arm.position.set(x*.25,0,z*.25);arm.rotation.y=Math.atan2(x,z);g.add(arm);
    const p=new T.Mesh(new T.BoxGeometry(.45,.01,.05),dark);p.position.set(x*.45,.08,z*.45);g.add(p);g.userData.props.push(p)}
  const cam=new T.Mesh(new T.SphereGeometry(.08,10,8),dark);cam.position.set(0,-.12,.2);g.add(cam);const led=new T.Mesh(new T.SphereGeometry(.04,8,6),red);led.position.set(0,.1,-.25);g.add(led);return g}
function startProgramme(){
  const seen=new Set(),list=[];for(const o of zoo.animals)if(S.areas.includes(o.A.area)&&!seen.has(o.an.k)){seen.add(o.an.k);list.push(o)}
  if(!list.length){toast('Release some animals into their domes first, then the drone can film them!');return}
  if(zoo.show2)endShow(true);
  const d=droneModel();zoo.scene.add(d);const c=zoo.cam;d.position.set(c.tx,30,c.tz);
  zoo.prog={list,drone:d,ang:0,viewers:800+Math.floor(Math.random()*400),earned:0};
  document.body.classList.add('onAir');$('#tv').hidden=false;cam.position.set(c.tx,40,c.tz);
  $('#tvPick').innerHTML='<b style="color:#fff;text-shadow:0 1px 3px #000">🚁 Where should the drone go?</b>'+list.map(o=>`<button data-go="${o.an.k}">${SP[o.an.k].e} ${SP[o.an.k].n}</button>`).join('');
  $('#tvSub').textContent='Welcome to The Animal Programme! Pick an animal (or say or type its name) and Dan the drone pilot will fly there.'}
// fly the drone to where that kind of animal lives, and show its story to read
function goToAnimal(k){
  const P=zoo.prog;if(!P)return;const o=zoo.animals.find(q=>q.an.k===k&&S.areas.includes(q.A.area));if(!o){toast('That animal is not out in a dome right now');return}
  P.o=o;P.ang=Math.random()*6;const pay=P.viewers*5;P.earned+=pay;S.coins+=pay;save();coins();
  for(const b of document.querySelectorAll('#tvPick button'))b.classList.toggle('on',b.dataset.go===k);
  $('#tvSub').textContent=storyFor(o).join('\n')}
// a name you said or typed: find the animal it means
function animalNamed(text){const t=(text||'').toLowerCase();if(!zoo.prog)return null;
  const hits=zoo.prog.list.map(o=>o.an.k).filter(k=>{const n=SP[k].n.toLowerCase();return t.includes(n)||n.split(' ').some(w=>w.length>3&&t.includes(w))||t.includes(n.replace(/s$/,''))});
  return hits.sort((a,b)=>SP[b].n.length-SP[a].n.length)[0]||null}
function stopProgramme(){const P=zoo.prog;if(!P)return;zoo.scene.remove(P.drone);zoo.prog=null;document.body.classList.remove('onAir');$('#tv').hidden=true;$('#tvSub').textContent='';
  try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}toast('📺 The Animal Programme is over! '+P.viewers.toLocaleString()+' people watched at home and you earned '+P.earned.toLocaleString()+' coins.',7000)}
// say lines one after another out loud, with subtitles; fall back to timers if the browser cannot speak
function sayLines(lines,done,voice){const id=(sayLines.id=(sayLines.id||0)+1);let i=0;
  const next=()=>{if(sayLines.id!==id)return;if(i>=lines.length){done&&done();return}const t=lines[i++];$('#tvSub').textContent=t;if(!$('#speaker').hidden)$('#speaker .say').textContent='📢 '+t;
    let ok=false;if(voice)ok=speakNow(t,()=>setTimeout(next,350));
    if(!ok)setTimeout(next,2500+t.length*70)};
  next()}
function progCamera(dt,time){
  const P=zoo.prog,o=P.o,d=P.drone;for(const p of d.userData.props)p.rotation.y+=dt*40;
  let tx,ty,tz,lx,ly,lz;
  if(o&&zoo.animals.includes(o)){const h=Math.max(1.5,o.inst.h),r=6+h*2.2;P.ang+=dt*.25;lx=o.x;ly=h*.6;lz=o.z;tx=o.x+Math.sin(P.ang)*r;tz=o.z+Math.cos(P.ang)*r;ty=2+h*1.1}
  else{lx=zoo.cam.tx;ly=0;lz=zoo.cam.tz;tx=lx;ty=40;tz=lz+30}
  const dp=d.position,dx=tx-dp.x,dy=ty-dp.y,dz=tz-dp.z,dist=Math.hypot(dx,dy,dz),sp=Math.min(dist,Math.max(4,dist*1.5)*dt);
  if(dist>.01){dp.x+=dx/dist*sp;dp.y+=dy/dist*sp;dp.z+=dz/dist*sp}dp.y+=Math.sin(time*2)*.004;
  d.rotation.set(0,Math.atan2(lx-dp.x,lz-dp.z),0);d.rotation.x=Math.min(.3,sp/dt*.01);
  // the camera films from just behind the drone, so you can see it flying
  const back=V(dp.x-lx,0,dp.z-lz).normalize();cam.position.lerp(V(dp.x+back.x*2.5,dp.y+1,dp.z+back.z*2.5),Math.min(1,dt*3));cam.lookAt(lx,ly,lz);
  zoo.cam.tx=dp.x;zoo.cam.tz=dp.z;
  P.viewers+=Math.floor(Math.random()*3);$('#tvViewers').textContent='👀 '+P.viewers.toLocaleString()+' watching at home'}
$('#progOpen').onclick=startProgramme;$('#tvStop').onclick=stopProgramme;$('#tvType').onclick=()=>{$('#sayBox').hidden=false;$('#sayIn').focus()};
$('#tvPick').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)goToAnimal(b.dataset.go)});

/* ---------- 🎙️ your own voice through the zoo speakers ---------- */
let talk=null;
// say something out loud with the browser's voice; some browsers drop words said right after stopping, so wait a moment then
function speakNow(text,done){const ss=window.speechSynthesis;if(!ss||!window.SpeechSynthesisUtterance){toast('🔇 This browser cannot read words out loud. Try Chrome, Edge or Safari.');return false}
  const go=()=>{const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=1;u.volume=1;let fin=false;const end=()=>{if(!fin){fin=true;done&&done()}};u.onend=end;u.onerror=end;
    try{ss.resume()}catch(e){}ss.speak(u);setTimeout(()=>{if(!ss.speaking&&!ss.pending&&!fin)toast('🔇 The speaker could not talk. Check your sound is turned up, and that the page is not muted.')},2500);setTimeout(end,4000+text.length*120)};
  if(ss.speaking||ss.pending){ss.cancel();setTimeout(go,120)}else go();return true}
// wake up the sound so it is allowed to play (browsers only allow sound after a tap)
function wakeSound(){try{const ac=zoo.ac||(zoo.ac=new(window.AudioContext||window.webkitAudioContext)());if(ac.state==='suspended')ac.resume();return ac}catch(e){return null}}
async function talkStart(btn){
  if(talk)return;btn.classList.add('on');wakeSound();try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){btn.classList.remove('on');openSayBox();return}
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream),chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
    talk={stream,rec,chunks,btn,words:'',t0:Date.now()};rec.start(100);
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const r=new SR();r.interimResults=true;r.onresult=e=>{talk&&(talk.words=[...e.results].map(x=>x[0].transcript).join(' '));showWords(talk.words)};try{r.start();talk.sr=r}catch(e){}}
    showWords('🎙️ Talking…')}
  catch(e){btn.classList.remove('on');talk=null;openSayBox()}}
// play your recording loud and tinny like a loudspeaker; if that cannot work, just play it as it is
async function playVoice(blob){
  const ac=wakeSound();
  try{const buf=await ac.decodeAudioData(await blob.arrayBuffer());const s=ac.createBufferSource();s.buffer=buf;const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=400;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4000;
    const ws=ac.createWaveShaper(),cv=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;cv[i]=Math.tanh(x*2.2)}ws.curve=cv;const g=ac.createGain();g.gain.value=1.6;s.connect(hp).connect(lp).connect(ws).connect(g).connect(ac.destination);s.start();return true}
  catch(e){try{const a=new Audio(URL.createObjectURL(blob));a.volume=1;await a.play();return true}catch(e2){return false}}}
function talkStop(){
  const t=talk;if(!t)return;talk=null;t.btn.classList.remove('on');try{t.sr&&t.sr.stop()}catch(e){}
  t.rec.onstop=async()=>{t.stream.getTracks().forEach(x=>x.stop());
    const blob=new Blob(t.chunks,{type:t.rec.mimeType||'audio/webm'});
    if(Date.now()-t.t0<500||!blob.size){toast('🎙️ Hold the button down while you talk, then let go!');return}
    const ok=await playVoice(blob);const k=animalNamed(t.words);if(k)goToAnimal(k);showWords('📢 '+(t.words||'(your voice)'));
    if(!ok){toast('🔇 Your voice could not play here, so type what you want to say!');openSayBox()}else if(zoo.show2)cheer()};
  t.rec.stop()}
function showWords(w){$('#tvSub').textContent=w;if(!$('#speaker').hidden)$('#speaker .say').textContent='📢 '+w}
// no microphone? type it and the speaker says it out loud
function openSayBox(){$('#sayBox').hidden=false;$('#sayIn').focus();toast('🎙️ The microphone is not allowed here, so type what you want to say!')}
function sayTyped(){const t=$('#sayIn').value.trim();if(!t)return;$('#sayIn').value='';$('#sayBox').hidden=true;wakeSound();const k=animalNamed(t);if(k)goToAnimal(k);sayLines([t],()=>{if(k&&zoo.prog&&zoo.prog.o)$('#tvSub').textContent=storyFor(zoo.prog.o).join('\n')},true);if(zoo.show2)cheer()}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('.talkBtn');if(b){e.preventDefault();talkStart(b)}});
document.addEventListener('pointerup',()=>talkStop());
$('#sayGo').onclick=sayTyped;$('#sayIn').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')sayTyped()});
