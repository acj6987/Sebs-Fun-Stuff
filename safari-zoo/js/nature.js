// Sky, sunlight, ground, swaying grass, trees, rocks and water. Shared by the safari and the zoo.
const NATURE=(function(){
const texCache={};
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h||w;return[c,c.getContext('2d')]}
function toTex(c,srgb=true,rep=1){const t=new T.CanvasTexture(c);if(srgb)t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);t.anisotropy=8;return t}
function normalFrom(c,strength){
  const S=c.width,g=c.getContext('2d'),d=g.getImageData(0,0,S,S).data,h=new Float32Array(S*S);
  for(let i=0;i<S*S;i++)h[i]=(d[i*4]+d[i*4+1]+d[i*4+2])/765;
  const [o,og]=canvas(S),img=og.createImageData(S,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    const l=h[y*S+(x-1+S)%S],r=h[y*S+(x+1)%S],u=h[((y-1+S)%S)*S+x],dn=h[((y+1)%S)*S+x];
    const nx=(l-r)*strength,ny=(u-dn)*strength,len=Math.hypot(nx,ny,1),k=(y*S+x)*4;
    img.data[k]=(nx/len*.5+.5)*255;img.data[k+1]=(ny/len*.5+.5)*255;img.data[k+2]=255/len*.5+127;img.data[k+3]=255}
  og.putImageData(img,0,0);return o;
}

/* ---------- sky and light ---------- */
function skyMaterial(E,sunDir){
  return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
    uniforms:{zen:{value:new T.Color(E.zen)},hor:{value:new T.Color(E.hor)},sunDir:{value:sunDir},sunCol:{value:new T.Color('#fff0d0')}},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 zen;uniform vec3 hor;uniform vec3 sunDir;uniform vec3 sunCol;varying vec3 vD;
      void main(){vec3 d=normalize(vD);float h=d.y;
        vec3 col=mix(hor,zen,pow(clamp(h,0.,1.),.42));
        if(h<0.)col=hor*.92;
        float s=max(dot(d,normalize(sunDir)),0.);
        col+=sunCol*(pow(s,5.)*.18+pow(s,48.)*.45);
        col+=sunCol*smoothstep(.99955,.9998,s)*6.;
        col=mix(col,hor*1.02,exp(-max(h,0.)*18.)*.45);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`});
}
function cloudTexture(){
  if(texCache.cloud)return texCache.cloud;const[c,g]=canvas(256,128),r=rng(3);
  for(let i=0;i<60;i++){const x=40+r()*176,y=50+r()*40-Math.abs(x-128)*.15,rad=18+r()*30;const gr=g.createRadialGradient(x,y,0,x,y,rad);
    gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,128)}
  return texCache.cloud=toTex(c,true);
}
// sky dome, clouds, sun light and image-based lighting for the scene
function setupSky(R,scene,E,opts={}){
  const el=E.sunEl,az=opts.az||.9,sunDir=V(Math.cos(el)*Math.cos(az),Math.sin(el),Math.cos(el)*Math.sin(az)).normalize();
  const sky=new T.Mesh(new T.SphereGeometry(950,32,16),skyMaterial(E,sunDir));sky.renderOrder=-10;scene.add(sky);
  const cl=new T.Group();sky.add(cl);const cm=new T.SpriteMaterial({map:cloudTexture(),fog:false,depthWrite:false,transparent:true,opacity:.95});
  const r=rng(hash(E.zen));
  for(let i=0;i<(opts.clouds??26);i++){const s=new T.Sprite(cm);const a=r()*6.28,d=300+r()*500;s.position.set(Math.cos(a)*d,180+r()*160,Math.sin(a)*d);s.scale.set(220+r()*200,90+r()*60,1);cl.add(s)}
  scene.fog=new T.Fog(E.fog,opts.fogNear||110,opts.fogFar||620);scene.background=new T.Color(E.hor);
  // environment light from the sky
  const pm=new T.PMREMGenerator(R),es=new T.Scene();es.add(new T.Mesh(new T.SphereGeometry(50,32,16),skyMaterial(E,sunDir)));
  const gnd=new T.Mesh(new T.CircleGeometry(48,32),new T.MeshBasicMaterial({color:E.ground}));gnd.rotation.x=-Math.PI/2;gnd.position.y=-2;es.add(gnd);
  scene.environment=pm.fromScene(es,.02,.1,200).texture;pm.dispose();
  const sun=new T.DirectionalLight('#fff1dc',2.0);sun.castShadow=true;sun.shadow.mapSize.set(QUALITY.shadow,QUALITY.shadow);
  const sc=sun.shadow.camera;sc.left=sc.bottom=-75;sc.right=sc.top=75;sc.near=1;sc.far=500;sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;
  scene.add(sun);scene.add(sun.target);
  scene.add(new T.HemisphereLight(E.zen,E.ground,.25));
  return{sky,sun,sunDir,follow(x,y,z){sky.position.set(x,y,z);sun.position.set(x+sunDir.x*200,y+sunDir.y*200,z+sunDir.z*200);sun.target.position.set(x,y,z)}};
}

/* ---------- ground ---------- */
function groundTextures(hab){
  if(texCache['g'+hab])return texCache['g'+hab];
  const S=512,[c,g]=canvas(S),r=rng(hash(hab));
  const tone=(l,a)=>`rgba(${l},${l},${l},${a})`;
  g.fillStyle='#d8d8d8';g.fillRect(0,0,S,S);
  for(let i=0;i<500;i++){const x=r()*S,y=r()*S,rad=10+r()*40;const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,tone(r()<.5?170:245,.25));gr.addColorStop(1,tone(200,0));g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2)}
  if(hab==='polar'){for(let i=0;i<5000;i++){g.fillStyle=tone(r()<.5?235:205,.5);g.fillRect(r()*S,r()*S,2,2)}}
  else if(hab==='outback'){for(let i=0;i<9000;i++){g.fillStyle=tone(r()<.5?140:250,.6);const s=1+r()*3;g.beginPath();g.arc(r()*S,r()*S,s,0,7);g.fill()}
    for(let i=0;i<260;i++){g.fillStyle=tone(120+r()*120|0,.9);g.beginPath();g.ellipse(r()*S,r()*S,3+r()*5,2+r()*4,r()*3,0,7);g.fill()}}
  else{const n=hab==='savanna'?16000:20000;
    for(let i=0;i<n;i++){const x=r()*S,y=r()*S,l=4+r()*12,a=(r()-.5)*.8;g.strokeStyle=tone(r()<.5?120:255,.45);g.lineWidth=1+r();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.sin(a)*l,y-Math.cos(a)*l);g.stroke()}
    for(let i=0;i<1400;i++){g.fillStyle=tone(110,.35);g.beginPath();g.arc(r()*S,r()*S,1+r()*2,0,7);g.fill()}}
  return texCache['g'+hab]={map:toTex(c,true),normal:toTex(normalFrom(c,hab==='polar'?2:5),false)};
}
function rockTextures(){
  if(texCache.rock)return texCache.rock;const S=256,[c,g]=canvas(S),r=rng(9);
  g.fillStyle='#b8b8b8';g.fillRect(0,0,S,S);
  for(let i=0;i<4000;i++){const l=110+r()*140|0;g.fillStyle=`rgba(${l},${l},${l},.35)`;g.fillRect(r()*S,r()*S,1+r()*4,1+r()*3)}
  for(let i=0;i<40;i++){g.strokeStyle='rgba(60,60,60,.5)';g.lineWidth=1;g.beginPath();let x=r()*S,y=r()*S;g.moveTo(x,y);for(let j=0;j<6;j++){x+=(r()-.5)*40;y+=(r()-.5)*40;g.lineTo(x,y)}g.stroke()}
  return texCache.rock={map:toTex(c,true),normal:toTex(normalFrom(c,4),false)};
}
function waterNormal(){
  if(texCache.water)return texCache.water;const S=256,[c,g]=canvas(S),r=rng(4);
  g.fillStyle='#808080';g.fillRect(0,0,S,S);
  for(let i=0;i<300;i++){const x=r()*S,y=r()*S,rad=6+r()*24;const gr=g.createRadialGradient(x,y,0,x,y,rad);const l=r()<.5?40:220;gr.addColorStop(0,`rgba(${l},${l},${l},.35)`);gr.addColorStop(1,'rgba(128,128,128,0)');g.fillStyle=gr;g.fillRect(x-rad,y-rad,rad*2,rad*2)}
  return texCache.water=toTex(normalFrom(c,3),false,6);
}
function waterMesh(r,col){
  const n=waterNormal().clone();n.needsUpdate=true;n.repeat.set(r/6,r/6);
  const m=new T.Mesh(new T.CircleGeometry(r,48),new T.MeshStandardMaterial({color:col,roughness:.04,metalness:.15,normalMap:n,normalScale:new T.Vector2(.35,.35),transparent:true,opacity:.93,envMapIntensity:1.2}));
  m.rotation.x=-Math.PI/2;m.receiveShadow=true;m.userData.water=n;return m;
}

/* ---------- grass that sways in the wind, follows the camera and sits on the hills ---------- */
const HGLSL=`uniform vec4 uPonds[8];uniform int uNP;uniform float uFlat;uniform float uHalf;
float baseH(vec2 p){return 2.4*sin(p.x*.012)*cos(p.y*.010)+1.3*sin(p.x*.029+p.y*.018)+.55*sin(p.x*.071)*sin(p.y*.063)+1.8*sin(p.x*.004+1.)*cos(p.y*.005+.4);}
float groundH(vec2 p,out float wet){wet=0.;if(uFlat>.5)return 0.;float h=baseH(p);float d=max(abs(p.x),abs(p.y));if(d>uHalf-60.)h+=pow(d-(uHalf-60.),1.5)*.09;
  for(int i=0;i<8;i++){if(i>=uNP)break;vec4 q=uPonds[i];float dd=length(p-q.xy);if(dd<q.z*1.4){float t=smoothstep(q.z*.75,q.z*1.4,dd);h=h*t+(q.w-.9)*(1.-t);}if(dd<q.z*1.12)wet=1.;}
  return h;}`;
function makeGrass(E,ponds,opts={}){
  const N=Math.round((opts.count||E.grassN)*QUALITY.grass);if(!N||!E.grass)return null;
  const tile=opts.tile||84,r=rng(77);
  const blade=new T.PlaneGeometry(1,1,1,4);blade.translate(0,.5,0);
  const geo=new T.InstancedBufferGeometry();geo.index=blade.index;geo.attributes.position=blade.attributes.position;geo.attributes.uv=blade.attributes.uv;
  const off=new Float32Array(N*3);for(let i=0;i<N;i++){off[i*3]=(r()-.5)*tile;off[i*3+1]=(r()-.5)*tile;off[i*3+2]=r()}
  geo.setAttribute('aOff',new T.InstancedBufferAttribute(off,3));geo.instanceCount=N;
  const pu=[];for(let i=0;i<8;i++){const p=ponds[i];pu.push(p?new T.Vector4(p.x,p.z,p.r,p.lvl):new T.Vector4(0,0,0,0))}
  const mat=new T.ShaderMaterial({side:T.DoubleSide,
    uniforms:{uPonds:{value:pu},uNP:{value:Math.min(8,ponds.length)},uFlat:{value:opts.flat?1:0},uHalf:{value:opts.half||320},
      uCam:{value:V(0,0,0)},uTile:{value:tile},uTime:{value:0},uH:{value:E.grassH*(opts.hScale||1)},
      uBase:{value:new T.Color(E.grass[0])},uTip:{value:new T.Color(E.grass[1])},uSun:{value:V(0,1,0)},
      uFogCol:{value:new T.Color(E.fog)},uFogNear:{value:110},uFogFar:{value:620},uMaskTex:{value:opts.maskTex||null},uMaskOn:{value:opts.maskTex?1:0},uMaskRect:{value:opts.maskRect||V(0,0,1)}},
    vertexShader:HGLSL+`attribute vec3 aOff;uniform vec3 uCam;uniform float uTile;uniform float uTime;uniform float uH;uniform vec3 uBase;uniform vec3 uTip;uniform sampler2D uMaskTex;uniform float uMaskOn;uniform vec3 uMaskRect;
      varying vec3 vCol;varying float vFog;varying float vY;
      void main(){
        vec2 wp=mod(aOff.xy-uCam.xz+uTile*.5,uTile)-uTile*.5+uCam.xz;
        float rnd=aOff.z,wet;float g=groundH(wp,wet);
        float dist=length(wp-uCam.xz);
        float hgt=uH*(.45+.8*fract(rnd*13.7))*smoothstep(uTile*.5,uTile*.32,dist)*(1.-wet);
        if(uMaskOn>.5){vec2 mu=(wp-uMaskRect.xy)/uMaskRect.z;if(mu.x>0.&&mu.x<1.&&mu.y>0.&&mu.y<1.)hgt*=step(.5,texture2D(uMaskTex,vec2(mu.x,1.-mu.y)).r);}
        float w=(.05+.05*fract(rnd*7.1))*(1.-position.y*.9);
        float rot=rnd*6.283;vec3 p=vec3(cos(rot)*position.x*w/1.,position.y*hgt,sin(rot)*position.x*w);
        float wind=sin(uTime*1.6+wp.x*.12+wp.y*.08)*.6+sin(uTime*3.3+rnd*30.)*.25;
        float bend=position.y*position.y*hgt*.32*(wind+.6);
        p.x+=bend;p.z+=bend*.3;p.y-=bend*bend*.15;
        vec3 world=vec3(wp.x,g,wp.y)+p;
        vec3 c=mix(uBase*.55,uTip,position.y)*(.75+.5*fract(rnd*3.7));
        vCol=c;vY=position.y;
        vec4 mv=viewMatrix*vec4(world,1.);vFog=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform vec3 uFogCol;uniform float uFogNear;uniform float uFogFar;uniform vec3 uSun;varying vec3 vCol;varying float vFog;varying float vY;
      void main(){vec3 c=vCol*(.55+.6*max(uSun.y,0.)*(.6+.4*vY));
        c=mix(c,uFogCol,smoothstep(uFogNear,uFogFar,vFog));gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`});
  const mesh=new T.Mesh(geo,mat);mesh.frustumCulled=false;
  mesh.userData.update=(cam,time,fog,sunDir)=>{mat.uniforms.uCam.value.copy(cam);mat.uniforms.uTime.value=time;if(fog){mat.uniforms.uFogNear.value=fog.near;mat.uniforms.uFogFar.value=fog.far}if(sunDir)mat.uniforms.uSun.value.copy(sunDir)};
  return mesh;
}

/* ---------- trees and plants built from branches and leaf cards ---------- */
function leafTexture(kind){
  if(texCache['leaf'+kind])return texCache['leaf'+kind];
  const tall=kind==='palm'||kind==='fern';const[c,g]=canvas(tall?128:256,tall?512:256),r=rng(hash(kind)),W=c.width,Hh=c.height;
  const pal={broad:['#3f6a28','#4f7d30','#2f5a20','#5f8a38'],acacia:['#6a7f34','#7c903c','#5a6e2c'],pine:['#22451f','#2c5426','#1a3a1a'],bamboo:['#5f8f30','#78a840','#4a7a28'],
    blossom:['#f2b6c8','#f7c8d6','#e898b0','#fff0f4'],euca:['#7b8a60','#8a9a6c','#6a7a54'],palm:['#3f7a2a','#4f8a32','#2f6a22'],fern:['#3a7a2a','#4a8a30'],bush:['#4a6a2a','#5a7a30','#3a5a22'],dry:['#8a7a40','#9a8a48','#7a6a38']}[kind];
  const leaf=(x,y,l,w,a,col)=>{g.save();g.translate(x,y);g.rotate(a);g.fillStyle=col;g.beginPath();g.ellipse(0,0,w,l,0,0,7);g.fill();g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=.8;g.beginPath();g.moveTo(0,-l);g.lineTo(0,l);g.stroke();g.restore()};
  if(kind==='palm'||kind==='fern'){g.strokeStyle='#5a6a2a';g.lineWidth=4;g.beginPath();g.moveTo(W/2,Hh);g.lineTo(W/2,8);g.stroke();
    for(let y=Hh-10;y>10;y-=7){const l=(kind==='palm'?55:45)*Math.sin((Hh-y)/Hh*Math.PI*.95+.15);for(const s of[-1,1])leaf(W/2+s*l*.5,y,4,l*.5,s*(1.25+r()*.1),pal[r()*pal.length|0])}}
  else if(kind==='pine'){for(let i=0;i<160;i++){const x=20+r()*(W-40),y=20+r()*(Hh-40);g.strokeStyle=pal[r()*3|0];g.lineWidth=2.5;for(let j=0;j<18;j++){const a=r()*6.28,l=8+r()*16;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}}}
  else if(kind==='bamboo'||kind==='euca'){for(let i=0;i<260;i++){leaf(20+r()*(W-40),20+r()*(Hh-40),18+r()*12,3+r()*2,r()*6.28,pal[r()*pal.length|0])}}
  else if(kind==='blossom'){for(let i=0;i<260;i++){const x=16+r()*(W-32),y=16+r()*(Hh-32),cc=pal[r()*4|0];for(let j=0;j<5;j++){g.fillStyle=cc;g.beginPath();g.arc(x+Math.cos(j*1.256)*3,y+Math.sin(j*1.256)*3,3,0,7);g.fill()}}}
  else{const n=kind==='acacia'?1100:kind==='bush'||kind==='dry'?520:480,sz=kind==='acacia'?7:kind==='bush'||kind==='dry'?10:12;
    for(let i=0;i<n;i++){const a=r()*6.28,d=Math.pow(r(),.7)*(W*.44);leaf(W/2+Math.cos(a)*d,Hh/2+Math.sin(a)*d,sz*(.7+r()*.6),sz*.45,r()*6.28,pal[r()*pal.length|0])}}
  const t=toTex(c,true);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.minFilter=T.LinearMipmapNearestFilter;return texCache['leaf'+kind]=t;
}
function barkTexture(light){
  const key='bark'+(light?1:0);if(texCache[key])return texCache[key];const[c,g]=canvas(128,256),r=rng(light?5:6);
  g.fillStyle=light?'#d8d2c6':'#6a5240';g.fillRect(0,0,128,256);
  for(let i=0;i<60;i++){g.strokeStyle=light?'rgba(90,80,70,.4)':'rgba(30,20,12,.5)';g.lineWidth=1+r()*3;let x=r()*128;g.beginPath();g.moveTo(x,0);for(let y=0;y<=256;y+=16){x+=(r()-.5)*6;g.lineTo(x,y)}g.stroke()}
  if(light)for(let i=0;i<40;i++){g.fillStyle='rgba(40,35,30,.6)';g.fillRect(r()*128,r()*256,6+r()*14,2)}
  return texCache[key]={map:toTex(c,true),normal:toTex(normalFrom(c,3),false)};
}
const matCache={};
function leafMat(kind){if(matCache[kind])return matCache[kind];
  const map=leafTexture(kind);const m=new T.MeshStandardMaterial({map,alphaTest:.3,side:T.DoubleSide,roughness:.8,metalness:0});
  m.userData.depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map,alphaTest:.3,side:T.DoubleSide});return matCache[kind]=m}
function barkMat(light){const k='bark'+(light?1:0);if(matCache[k])return matCache[k];const t=barkTexture(light);return matCache[k]=new T.MeshStandardMaterial({map:t.map,normalMap:t.normal,roughness:.95})}
function solidMat(col,o={}){const k=col+JSON.stringify(o);return matCache[k]||(matCache[k]=new T.MeshStandardMaterial(Object.assign({color:col,roughness:.9},o)))}

function merge(list){
  let n=0;const parts=list.map(g=>{const ng=g.index?g.toNonIndexed():g;n+=ng.attributes.position.count;return ng});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
  for(const g of parts){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,o*2);o+=g.attributes.position.count}
  const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));
  out.computeBoundingSphere();return out;
}
function limb(list,a,b,r1,r2,seg=7){
  const d=b.clone().sub(a),len=d.length();const g=new T.CylinderGeometry(r2,r1,len,seg,1,true);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*len/2);
  g.translate(0,len/2,0);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));g.translate(a.x,a.y,a.z);list.push(g);
}
function cards(list,center,count,spread,size,r,o={}){
  for(let i=0;i<count;i++){
    const p=center.clone().add(V((r()-.5)*2*spread.x,(r()-.5)*2*spread.y,(r()-.5)*2*spread.z));
    const g=new T.PlaneGeometry(size*(o.w||1),size*(o.h||1));
    if(o.flat)g.rotateX(-Math.PI/2+(r()-.5)*.6);else g.applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(r()*6.28,r()*6.28,r()*6.28)));
    if(o.droop){g.translate(0,size*(o.h||1)/2,0);g.applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(o.droop,o.yaw?o.yaw():r()*6.28,0,'YXZ')))}
    g.translate(p.x,p.y,p.z);
    // normals point away from the crown centre so the canopy is lit like a ball of leaves
    const pa=g.attributes.position,na=g.attributes.normal;const cc=o.lightCenter||center;
    for(let j=0;j<pa.count;j++){const v=V(pa.getX(j)-cc.x,(pa.getY(j)-cc.y)*1.3,pa.getZ(j)-cc.z).normalize();na.setXYZ(j,v.x,v.y+.25,v.z)}
    list.push(g);
  }
}
function rockGeo(seed,flat){
  const g=new T.IcosahedronGeometry(1,3),p=g.attributes.position,s=seed*7.3;
  for(let i=0;i<p.count;i++){const v=V(p.getX(i),p.getY(i),p.getZ(i));const n=MESHER.fbm(v.x*1.4+s,v.y*1.4,v.z*1.4)*.7+MESHER.noise3(v.x*4+s,v.y*4,v.z*4)*.15;
    v.multiplyScalar(.75+n*.6);v.y*=flat||.7;if(v.y<-.1)v.y*=.4;p.setXYZ(i,v.x,v.y,v.z)}
  g.computeVertexNormals();return g;
}
function rockMat(col){const k='rock'+col;if(matCache[k])return matCache[k];const t=rockTextures();return matCache[k]=new T.MeshStandardMaterial({color:col,map:t.map,normalMap:t.normal,roughness:.95})}

// a tree type = list of [geometry, material] parts; scattered later with instancing
function treeTypes(hab){
  if(hab==='carnivore')hab='dino';
  const r=rng(hash(hab)+1),out=[];
  const T2=(w,parts,o={})=>out.push(Object.assign({w,parts},o));
  const bark=barkMat(false),pale=barkMat(true);
  const acacia=()=>{const b=[],l=[];const top=V(0,4.2,0);limb(b,V(0,0,0),V(.3,2.2,0),.35,.26);limb(b,V(.3,2.2,0),top,.26,.18);
    for(let i=0;i<4;i++){const a=i*1.6+r(),e=V(Math.cos(a)*2.6,4.6+r()*.5,Math.sin(a)*2.6);limb(b,V(.3,2.4,0),e,.16,.07,5);cards(l,e.clone().setY(e.y+.35),9,V(1.5,.2,1.5),2.2,r,{flat:1,lightCenter:V(0,3,0)})}
    cards(l,V(0,5.1,0),14,V(2.6,.25,2.6),2.4,r,{flat:1,lightCenter:V(0,3.5,0)});return[[merge(b),bark],[merge(l),leafMat('acacia')]]};
  const broad=(h,crown,kind='broad',barkM=bark)=>{const b=[],l=[];limb(b,V(0,0,0),V(0,h*.55,0),h*.05,h*.035);
    for(let i=0;i<6;i++){const a=i*1.05+r()*.4,e=V(Math.cos(a)*crown*.6,h*(.7+r()*.25),Math.sin(a)*crown*.6);limb(b,V(0,h*.45,0),e,h*.03,h*.012,5);
      cards(l,e,10,V(crown*.35,crown*.3,crown*.35),crown*.55,r,{lightCenter:V(0,h*.75,0)})}
    cards(l,V(0,h*.92,0),10,V(crown*.4,crown*.25,crown*.4),crown*.6,r,{lightCenter:V(0,h*.75,0)});return[[merge(b),barkM],[merge(l),leafMat(kind)]]};
  const giant=()=>{const b=[],l=[];limb(b,V(0,0,0),V(0,16,0),1,.55,9);
    for(let i=0;i<5;i++){const a=i*1.26;limb(b,V(0,0,0),V(Math.cos(a)*1.6,0,Math.sin(a)*1.6),.5,.1,4);limb(b,V(Math.cos(a)*1.5,.2,Math.sin(a)*1.5),V(Math.cos(a)*.4,3,Math.sin(a)*.4),.25,.1,4)}
    for(let i=0;i<7;i++){const a=i*.9+r(),e=V(Math.cos(a)*5,15+r()*4,Math.sin(a)*5);limb(b,V(0,13,0),e,.35,.15,5);cards(l,e,14,V(3,1.6,3),3.4,r,{lightCenter:V(0,16,0)})}
    return[[merge(b),bark],[merge(l),leafMat('broad')]]};
  const palm=()=>{const b=[],l=[];let p=V(0,0,0),dir=V(.08,1,0).normalize();for(let i=0;i<6;i++){const n=p.clone().addScaledVector(dir,1.4);limb(b,p,n,.24-i*.015,.22-i*.015);p=n;dir.x+=.03;dir.normalize()}
    for(let i=0;i<9;i++){const yaw=i*.7+r()*.2;cards(l,p,1,V(0,0,0),1,r,{w:1.2,h:4.2,droop:.9+r()*.5,yaw:()=>yaw})}
    return[[merge(b),barkMat(true)],[merge(l),leafMat('palm')]]};
  const pine=()=>{const b=[],l=[];limb(b,V(0,0,0),V(0,11,0),.32,.08);
    for(let k=0;k<8;k++){const y=2.5+k*1.1,rad=3.2*(1-k/9);for(let i=0;i<7;i++){const yaw=i*.9+k;cards(l,V(0,y,0),1,V(0,0,0),1,r,{w:1.6,h:rad,droop:1.75,yaw:()=>yaw})}}
    cards(l,V(0,11,0),3,V(.2,.4,.2),1.4,r);return[[merge(b),bark],[merge(l),leafMat('pine')]]};
  const bamboo=()=>{const b=[],l=[];for(let i=0;i<9;i++){const a=r()*6.28,d=r()*1.1,h=7+r()*5,x=Math.cos(a)*d,z=Math.sin(a)*d,lean=V((r()-.5)*.6,0,(r()-.5)*.6);
      for(let y=0;y<h;y+=1.3)limb(b,V(x+lean.x*y/h,y,z+lean.z*y/h),V(x+lean.x*(y+1.25)/h,y+1.25,z+lean.z*(y+1.25)/h),.07,.065,6);
      cards(l,V(x+lean.x,h-1,z+lean.z),5,V(.8,1.4,.8),1.6,r)}
    return[[merge(b),solidMat('#8aa84a',{roughness:.5})],[merge(l),leafMat('bamboo')]]};
  const bush=(kind='bush',s=1)=>{const l=[];cards(l,V(0,.7*s,0),10,V(.9*s,.45*s,.9*s),1.4*s,r,{lightCenter:V(0,0,0)});return[[merge(l),leafMat(kind)]]};
  const fern=()=>{const l=[];for(let i=0;i<9;i++){const yaw=i*.7+r()*.3;cards(l,V(0,.05,0),1,V(0,0,0),1,r,{w:.7,h:1.6,droop:1.05+r()*.3,yaw:()=>yaw})}return[[merge(l),leafMat('fern')]]};
  const dead=()=>{const b=[];limb(b,V(0,0,0),V(.2,3,0),.2,.12);limb(b,V(.2,2.5,0),V(1.4,3.6,.3),.1,.03,5);limb(b,V(.15,2,0),V(-1,3,-.4),.09,.03,5);return[[merge(b),barkMat(true)]]};
  const mound=()=>{const g=new T.ConeGeometry(1,3.4,9,6);g.translate(0,1.7,0);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);p.setX(i,p.getX(i)*(1+MESHER.noise3(p.getX(i)*3,y*2,p.getZ(i)*3)*.3));p.setZ(i,p.getZ(i)*(1+MESHER.noise3(p.getZ(i)*3,y*2,1)*.3))}g.computeVertexNormals();return[[g,rockMat('#a8683c')]]};
  const rock=(col,big,flat)=>[[rockGeo(r()*10,flat),rockMat(col)]];
  const E=ENV[hab];
  if(hab==='savanna'){T2(5,acacia(),{s:[.8,1.3],col:.5});T2(1.5,acacia(),{s:[.6,1],col:.4});T2(3,bush('dry',1.2),{s:[.8,1.5]});T2(1,mound(),{s:[.7,1.2],col:.9});T2(2,rock(E.rock),{s:[.6,1.8],col:1});T2(.4,rock(E.rock),{s:[3,6],col:4});T2(.6,dead(),{s:[.8,1.2],col:.3})}
  if(hab==='rainforest'){T2(4,giant(),{s:[.8,1.2],col:1.1});T2(4,broad(9,6),{s:[.8,1.3],col:.5});T2(3,palm(),{s:[.8,1.2],col:.4});T2(6,fern(),{s:[.8,1.6]});T2(4,bush('broad',1.3),{s:[.8,1.5]});T2(1,rock('#5b6650'),{s:[.6,1.6],col:1})}
  if(hab==='jungle'){T2(5,bamboo(),{s:[.8,1.2],col:.9});T2(3,broad(8,5),{s:[.8,1.2],col:.5});T2(1.2,broad(6,4.5,'blossom'),{s:[.8,1.2],col:.4});T2(3,bush('bamboo',1),{s:[.8,1.4]});T2(1.5,rock(E.rock),{s:[.6,1.8],col:1})}
  if(hab==='woodland'){T2(5,pine(),{s:[.8,1.5],col:.5});T2(3,broad(9,6.5),{s:[.8,1.3],col:.6});T2(1,broad(8,4,'broad',pale),{s:[.8,1.2],col:.35});T2(3,bush('bush',1.1),{s:[.8,1.4]});T2(2,rock(E.rock),{s:[.6,1.8],col:1});T2(2,fern(),{s:[.6,1]})}
  if(hab==='outback'){T2(2.5,broad(7,4,'euca',pale),{s:[.8,1.3],col:.4});T2(5,bush('dry',.8),{s:[.6,1.3]});T2(3,rock(E.rock,0,.6),{s:[.6,2.5],col:1.2});T2(.5,rock(E.rock,0,.5),{s:[5,9],col:5});T2(1,dead(),{s:[.8,1.2],col:.3})}
  if(hab==='dino'){T2(4,giant(),{s:[.9,1.3],col:1.1});T2(5,palm(),{s:[.6,1.3],col:.4});T2(8,fern(),{s:[1,2.2]});T2(3,bush('broad',1.5),{s:[.8,1.6]});T2(2,rock('#4a4440'),{s:[.8,2.5],col:1.2});T2(.4,rock('#3a3430',0,.6),{s:[4,8],col:5})}
  if(hab==='polar'){const ice=new T.MeshPhysicalMaterial({color:'#cfe9f7',roughness:.08,clearcoat:1,transparent:true,opacity:.92});
    const block=()=>{const g=rockGeo(r()*10,.9);return[[g,ice]]};
    const spire=()=>{const g=new T.ConeGeometry(1.4,5,7,3);g.translate(0,2.5,0);g.computeVertexNormals();return[[g,ice]]};
    const snow=()=>{const g=rockGeo(r()*10,.35);return[[g,solidMat('#f6f9fb',{roughness:.7})]]};
    T2(4,block(),{s:[.8,2.4],col:1.2});T2(3,snow(),{s:[2,4]});T2(1.5,rock(E.rock),{s:[.6,1.6],col:1});T2(1,spire(),{s:[.8,1.8],col:1.2});T2(.4,rock('#e8f0f6',0,.6),{s:[5,9],col:5})}
  return out;
}
// place many copies of each tree type with instancing; returns collider list
function scatter(scene,types,count,place,r){
  const tot=types.reduce((a,t)=>a+t.w,0),mats=types.map(()=>[]),cols=[];
  for(let i=0;i<count;i++){let k=r()*tot,ti=0;while((k-=types[ti].w)>0&&ti<types.length-1)ti++;const t=types[ti];
    const p=place(r);if(!p)continue;const s=t.s[0]+r()*(t.s[1]-t.s[0]);
    mats[ti].push(new T.Matrix4().compose(V(p.x,p.y-.15,p.z),new T.Quaternion().setFromAxisAngle(V(0,1,0),r()*6.28),V(s,s*(.9+r()*.2),s)));
    if(t.col)cols.push({x:p.x,z:p.z,r:t.col*s})}
  types.forEach((t,ti)=>{if(!mats[ti].length)return;
    for(const[geo,mat]of t.parts){const im=new T.InstancedMesh(geo,mat,mats[ti].length);mats[ti].forEach((m,j)=>im.setMatrixAt(j,m));
      im.castShadow=true;im.receiveShadow=true;if(mat.userData.depth)im.customDepthMaterial=mat.userData.depth;scene.add(im)}});
  return cols;
}
return{setupSky,groundTextures,waterMesh,makeGrass,treeTypes,scatter,rockGeo,rockMat,barkMat,solidMat,leafMat,merge,limb,cards,canvas,toTex,normalFrom};
})();
