// Builds smooth one-piece animal bodies.
// An animal is described as simple shapes (tapered capsules and ellipsoids) that are
// melted together with a smooth union, then turned into a mesh with surface nets.
// Every vertex gets bone weights (for walking) and a coat colour (stripes, spots...).
(function(){
const imul=Math.imul;
function hash3(a,b,c){let n=imul(a,374761393)+imul(b,668265263)+imul(c,1440662683)|0;n=imul(n^(n>>>13),1274126177);n^=n>>>16;return (n>>>0)/4294967296}
function noise3(x,y,z){
  const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(hash3(xi,yi,zi),hash3(xi+1,yi,zi),u),L(hash3(xi,yi+1,zi),hash3(xi+1,yi+1,zi),u),v),
           L(L(hash3(xi,yi,zi+1),hash3(xi+1,yi,zi+1),u),L(hash3(xi,yi+1,zi+1),hash3(xi+1,yi+1,zi+1),u),v),w);
}
function fbm(x,y,z){return noise3(x,y,z)*.55+noise3(x*2.1,y*2.1,z*2.1)*.3+noise3(x*4.3,y*4.3,z*4.3)*.15}
// distance to nearest and second nearest feature point (for giraffe patches and leopard spots)
function voronoi(x,y,z){
  const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);let f1=9,f2=9;
  for(let k=-1;k<=1;k++)for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
    const cx=xi+i,cy=yi+j,cz=zi+k;
    const px=cx+hash3(cx,cy,cz),py=cy+hash3(cy,cz,cx),pz=cz+hash3(cz,cx,cy);
    const d=Math.hypot(px-x,py-y,pz-z);if(d<f1){f2=f1;f1=d}else if(d<f2)f2=d}
  return[f1,f2];
}

function prep(p){
  if(p.t==='c'){
    p.ba=[p.b[0]-p.a[0],p.b[1]-p.a[1],p.b[2]-p.a[2]];p.bb=p.ba[0]**2+p.ba[1]**2+p.ba[2]**2||1e-9;
    p.len=Math.sqrt(p.bb);p.dir=p.ba.map(v=>v/p.len);
    p.cen=[(p.a[0]+p.b[0])/2,(p.a[1]+p.b[1])/2,(p.a[2]+p.b[2])/2];p.R=p.len/2+Math.max(p.r1,p.r2);
    p.minR=Math.min(p.r1,p.r2);
  }else{
    p.cen=p.c;p.R=Math.max(...p.r);p.minR=Math.min(...p.r);
    const [ex,ey,ez]=p.rot||[0,0,0];
    const m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(ex,ey,ez,'YXZ')).invert().elements;
    p.m=[m[0],m[4],m[8],m[1],m[5],m[9],m[2],m[6],m[10]];p.dir=[0,0,1];
  }
  p.k=p.k==null?.05:p.k;p.rough=p.rough||0;p.R+=p.rough+p.k;
}
function dist(p,x,y,z){
  let d;
  if(p.t==='c'){
    const px=x-p.a[0],py=y-p.a[1],pz=z-p.a[2];
    let t=(px*p.ba[0]+py*p.ba[1]+pz*p.ba[2])/p.bb;t=t<0?0:t>1?1:t;
    const dx=px-p.ba[0]*t,dy=py-p.ba[1]*t,dz=pz-p.ba[2]*t;
    d=Math.sqrt(dx*dx+dy*dy+dz*dz)-(p.r1+(p.r2-p.r1)*t);
  }else{
    const px=x-p.c[0],py=y-p.c[1],pz=z-p.c[2],m=p.m;
    const qx=(m[0]*px+m[1]*py+m[2]*pz)/p.r[0],qy=(m[3]*px+m[4]*py+m[5]*pz)/p.r[1],qz=(m[6]*px+m[7]*py+m[8]*pz)/p.r[2];
    const k0=Math.sqrt(qx*qx+qy*qy+qz*qz);
    const k1=Math.sqrt((qx/p.r[0])**2+(qy/p.r[1])**2+(qz/p.r[2])**2);
    d=k1<1e-9?-p.minR:k0*(k0-1)/k1;
  }
  if(p.rough)d+=(noise3(x*p.rf,y*p.rf,z*p.rf)-.5)*p.rough*2;
  return d;
}
function smin(a,b,k){if(k<=0)return Math.min(a,b);const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25}

// prims: shapes; opts: {res, maxCells, paint(prim,x,y,z,nx,ny,nz)->[r,g,b], bones}
function build(prims,opts){
  prims.forEach(prep);
  // pack every shape into one flat array so the hot loop stays fast
  const order=prims.slice().sort((a,b)=>b.R-a.R),NP=order.length,ST=24,PK=new Float64Array(NP*ST);
  order.forEach((p,i)=>{const o=i*ST;PK[o]=p.t==='c'?0:1;PK[o+1]=p.cen[0];PK[o+2]=p.cen[1];PK[o+3]=p.cen[2];PK[o+4]=p.R;PK[o+5]=p.k;PK[o+6]=p.rough;PK[o+7]=p.rf||1;
    if(p.t==='c'){PK.set(p.a,o+8);PK.set(p.ba,o+11);PK[o+14]=p.bb;PK[o+15]=p.r1;PK[o+16]=p.r2}
    else{PK.set(p.c,o+8);PK.set(p.r,o+11);PK.set(p.m,o+14);PK[o+23]=p.minR}});
  const field=(x,y,z)=>{let d=1e9;
    for(let o=0;o<NP*ST;o+=ST){const dx=x-PK[o+1],dy=y-PK[o+2],dz=z-PK[o+3];
      if(Math.sqrt(dx*dx+dy*dy+dz*dz)-PK[o+4]>d)continue;
      let di;
      if(PK[o]===0){const px=x-PK[o+8],py=y-PK[o+9],pz=z-PK[o+10],bx=PK[o+11],by=PK[o+12],bz=PK[o+13];
        let t=(px*bx+py*by+pz*bz)/PK[o+14];t=t<0?0:t>1?1:t;const ex=px-bx*t,ey=py-by*t,ez=pz-bz*t;
        di=Math.sqrt(ex*ex+ey*ey+ez*ez)-(PK[o+15]+(PK[o+16]-PK[o+15])*t)}
      else{const px=x-PK[o+8],py=y-PK[o+9],pz=z-PK[o+10],rx=PK[o+11],ry=PK[o+12],rz=PK[o+13];
        const qx=(PK[o+14]*px+PK[o+15]*py+PK[o+16]*pz)/rx,qy=(PK[o+17]*px+PK[o+18]*py+PK[o+19]*pz)/ry,qz=(PK[o+20]*px+PK[o+21]*py+PK[o+22]*pz)/rz;
        const k0=Math.sqrt(qx*qx+qy*qy+qz*qz),k1=Math.sqrt(qx*qx/(rx*rx)+qy*qy/(ry*ry)+qz*qz/(rz*rz));
        di=k1<1e-9?-PK[o+23]:k0*(k0-1)/k1}
      if(PK[o+6]>0){const f=PK[o+7];di+=(noise3(x*f,y*f,z*f)-.5)*PK[o+6]*2}
      if(d===1e9)d=di;else{const k=PK[o+5];const h=k-Math.abs(d-di);d=Math.min(d,di)-(h>0?h*h/k*.25:0)}}
    return d};
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],minR=1e9;
  for(const p of prims){for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],p.cen[i]-p.R);mx[i]=Math.max(mx[i],p.cen[i]+p.R)}if(!p.detail)minR=Math.min(minR,p.minR)}
  const ext=mx.map((v,i)=>v-mn[i]),maxDim=Math.max(...ext),vol=ext[0]*ext[1]*ext[2];
  let h=opts.low?maxDim/opts.res:Math.min(maxDim/(opts.res||90),minR/1.5);
  h=Math.max(h,Math.cbrt(vol/(opts.maxCells||1.6e6)),maxDim/(opts.maxRes||220));
  const nx=Math.ceil(ext[0]/h)+2,ny=Math.ceil(ext[1]/h)+2,nz=Math.ceil(ext[2]/h)+2;
  const ox=mn[0]-h*.5,oy=mn[1]-h*.5,oz=mn[2]-h*.5;
  const F=new Float32Array(nx*ny*nz);
  // evaluate in 4x4x4 blocks: blocks far from the surface get one sample, only blocks near the skin are filled in
  const BS=4,far=h*BS*1.2+h*2;
  for(let bk=0;bk<nz;bk+=BS)for(let bj=0;bj<ny;bj+=BS)for(let bi=0;bi<nx;bi+=BS){
    const ei=Math.min(nx,bi+BS),ej=Math.min(ny,bj+BS),ek=Math.min(nz,bk+BS);
    const d0=field(ox+(bi+(ei-bi-1)/2)*h,oy+(bj+(ej-bj-1)/2)*h,oz+(bk+(ek-bk-1)/2)*h);
    if(Math.abs(d0)>far){for(let k=bk;k<ek;k++)for(let j=bj;j<ej;j++)for(let i=bi;i<ei;i++)F[i+nx*(j+ny*k)]=d0;continue}
    for(let k=bk;k<ek;k++)for(let j=bj;j<ej;j++)for(let i=bi;i<ei;i++)F[i+nx*(j+ny*k)]=field(ox+i*h,oy+j*h,oz+k*h);
  }
  const cx=nx-1,cy=ny-1,cz=nz-1;
  const vIdx=new Int32Array(cx*cy*cz).fill(-1);
  const P=[],N=[];
  const O=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];
  const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const c=new Float32Array(8);
  for(let k=0;k<cz;k++)for(let j=0;j<cy;j++)for(let i=0;i<cx;i++){
    let mask=0;
    for(let q=0;q<8;q++){const o=O[q];const v=F[(i+o[0])+nx*((j+o[1])+ny*(k+o[2]))];c[q]=v;if(v<0)mask|=1<<q}
    if(mask===0||mask===255)continue;
    let sx=0,sy=0,sz=0,n=0;
    for(const e of E){const a=c[e[0]],b=c[e[1]];if((a<0)!==(b<0)){const t=a/(a-b),oa=O[e[0]],ob=O[e[1]];
      sx+=oa[0]+(ob[0]-oa[0])*t;sy+=oa[1]+(ob[1]-oa[1])*t;sz+=oa[2]+(ob[2]-oa[2])*t;n++}}
    vIdx[i+cx*(j+cy*k)]=P.length/3;
    P.push(ox+(i+sx/n)*h,oy+(j+sy/n)*h,oz+(k+sz/n)*h);
    let gx=c[1]-c[0]+c[3]-c[2]+c[5]-c[4]+c[7]-c[6],gy=c[2]-c[0]+c[3]-c[1]+c[6]-c[4]+c[7]-c[5],gz=c[4]-c[0]+c[5]-c[1]+c[6]-c[2]+c[7]-c[3];
    const gl=Math.hypot(gx,gy,gz)||1;N.push(gx/gl,gy/gl,gz/gl);
  }
  const I=[];
  const ci=(i,j,k)=>vIdx[i+cx*(j+cy*k)];
  const quad=(a,b,c2,d)=>{if(a<0||b<0||c2<0||d<0)return;
    // orient so the face points along the outward normal
    const ax=P[b*3]-P[a*3],ay=P[b*3+1]-P[a*3+1],az=P[b*3+2]-P[a*3+2],bx=P[c2*3]-P[a*3],by=P[c2*3+1]-P[a*3+1],bz=P[c2*3+2]-P[a*3+2];
    const fx=ay*bz-az*by,fy=az*bx-ax*bz,fz=ax*by-ay*bx;
    const s=fx*(N[a*3]+N[c2*3])+fy*(N[a*3+1]+N[c2*3+1])+fz*(N[a*3+2]+N[c2*3+2]);
    if(s>=0)I.push(a,b,c2,a,c2,d);else I.push(a,c2,b,a,d,c2)};
  for(let k=0;k<cz;k++)for(let j=0;j<cy;j++)for(let i=0;i<cx;i++){
    const in0=F[i+nx*(j+ny*k)]<0;
    if(j>0&&k>0&&in0!==(F[(i+1)+nx*(j+ny*k)]<0))quad(ci(i,j-1,k-1),ci(i,j,k-1),ci(i,j,k),ci(i,j-1,k));
    if(i>0&&k>0&&in0!==(F[i+nx*((j+1)+ny*k)]<0))quad(ci(i-1,j,k-1),ci(i,j,k-1),ci(i,j,k),ci(i-1,j,k));
    if(i>0&&j>0&&in0!==(F[i+nx*(j+ny*(k+1))]<0))quad(ci(i-1,j-1,k),ci(i,j-1,k),ci(i,j,k),ci(i-1,j,k));
  }
  // per-vertex: bone weights, colours, uvs
  const nv=P.length/3,col=new Float32Array(nv*3),si=new Uint16Array(nv*4),sw=new Float32Array(nv*4),uv=new Float32Array(nv*2);
  const nb=opts.bones;
  const bd=new Float32Array(nb),pd=new Float32Array(prims.length);
  const ccx=(mn[0]+mx[0])/2,ccy=(mn[1]+mx[1])/2;
  for(let v=0;v<nv;v++){
    const x=P[v*3],y=P[v*3+1],z=P[v*3+2];
    bd.fill(1e9);let best=0,bdist=1e9,second=-1,sdist=1e9;
    for(let q=0;q<prims.length;q++){const d=dist(prims[q],x,y,z);pd[q]=d;const b=prims[q].bone||0;if(d<bd[b])bd[b]=d;
      if(d<bdist){second=best;sdist=bdist;best=q;bdist=d}else if(d<sdist){second=q;sdist=d}}
    // up to 4 bones, softly blended
    const ids=[...bd.keys()].sort((a,b)=>bd[a]-bd[b]).slice(0,4);
    const s=h*2.2+.02;let tot=0;const ws=ids.map(id=>{const w=Math.exp(-(bd[id]-bd[ids[0]])/s);return bd[id]>5e8?0:w});
    ws.forEach(w=>tot+=w);
    for(let q=0;q<4;q++){si[v*4+q]=ids[q]||0;sw[v*4+q]=ids[q]==null?0:ws[q]/tot}
    const nx2=N[v*3],ny2=N[v*3+1],nz2=N[v*3+2];
    let c1=opts.paint(prims[best],x,y,z,nx2,ny2,nz2);
    if(second>=0&&prims[second].col!==prims[best].col||second>=0&&prims[second].pat!==prims[best].pat){
      const w=Math.exp(-(sdist-bdist)/(h*1.5+.01))*.5;
      if(w>.01){const c2=opts.paint(prims[second],x,y,z,nx2,ny2,nz2);c1=[c1[0]+(c2[0]-c1[0])*w,c1[1]+(c2[1]-c1[1])*w,c1[2]+(c2[2]-c1[2])*w]}}
    col[v*3]=c1[0];col[v*3+1]=c1[1];col[v*3+2]=c1[2];
    uv[v*2]=Math.atan2(y-ccy,x-ccx)/(Math.PI*2)+.5;uv[v*2+1]=z/.6;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));
  g.setAttribute('skinWeight',new THREE.BufferAttribute(sw,4));
  g.setIndex(I.length/3>65535?I:I);
  g.computeBoundingSphere();g.computeBoundingBox();
  return g;
}
window.MESHER={build,noise3,fbm,voronoi};
})();
