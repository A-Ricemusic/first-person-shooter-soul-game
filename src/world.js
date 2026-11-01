import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original Blender-authored props are combined with modular architectural geometry.
// World coordinates: Y up, floor 0; front entrance at +Z.
export async function buildWorld(scene) {
  const rng = (() => { let s = 51319; return () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296); })();
  const colliders = [], animated = [], coreVisuals = [];
  const group = new THREE.Group(); group.name = 'BLACKWATER / tidal power station'; scene.add(group);
  scene.background = new THREE.Color('#192b38');
  scene.fog = new THREE.FogExp2('#243744', .0095);

  function texture(type) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = type === 'floor' ? '#40474b' : '#737975'; ctx.fillRect(0,0,512,512);
    const im = ctx.getImageData(0,0,512,512);
    for(let i=0;i<im.data.length;i+=4){const n=(rng()-.5)*34; im.data[i]+=n;im.data[i+1]+=n;im.data[i+2]+=n;}
    ctx.putImageData(im,0,0);
    for(let i=0;i<70;i++) {
      ctx.fillStyle=`rgba(12,20,22,${.03+rng()*.1})`;
      ctx.fillRect(rng()*512,rng()*512,2+rng()*40,1+rng()*140);
    }
    ctx.strokeStyle='rgba(15,23,26,.48)';ctx.lineWidth=3;
    if(type==='floor') { ctx.strokeRect(1,1,510,510);ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.moveTo(0,256);ctx.lineTo(512,256);ctx.stroke(); }
    else {ctx.strokeRect(2,2,508,508); for(const x of [26,486])for(const y of [26,486]){ctx.fillStyle='#40494a';ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();}}
    const t = new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
    return t;
  }
  const textureLoader=new THREE.TextureLoader();
  async function pbrSet(name){const files=await Promise.all(['color','roughness','normal'].map(k=>textureLoader.loadAsync(`${import.meta.env.BASE_URL}assets/textures/${name}-${k}.png`)));for(const t of files){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;}files[0].colorSpace=THREE.SRGBColorSpace;files[1].colorSpace=files[2].colorSpace=THREE.NoColorSpace;return files;}
  const [wallPbr,floorPbr]=await Promise.all([pbrSet('wall-concrete'),pbrSet('floor-concrete')]);
  const concrete=new THREE.MeshStandardMaterial({color:0xb8bfba,map:wallPbr[0],roughnessMap:wallPbr[1],normalMap:wallPbr[2],normalScale:new THREE.Vector2(.5,.5),roughness:1,metalness:0});
  const darkConcrete=new THREE.MeshStandardMaterial({color:0x4b5a64,map:wallPbr[0],roughnessMap:wallPbr[1],normalMap:wallPbr[2],normalScale:new THREE.Vector2(.5,.5),roughness:1,metalness:0});
  const steel=new THREE.MeshStandardMaterial({color:0x25343b,metalness:.83,roughness:.35});
  const edge=new THREE.MeshStandardMaterial({color:0x75858b,metalness:.85,roughness:.3});
  const floor=new THREE.MeshStandardMaterial({color:0x7d898b,map:floorPbr[0],roughnessMap:floorPbr[1],normalMap:floorPbr[2],normalScale:new THREE.Vector2(.3,.3),roughness:1,metalness:0});
  const black=new THREE.MeshStandardMaterial({color:0x0b151c,roughness:.8});
  const amber=new THREE.MeshStandardMaterial({color:0xa45721,metalness:.4,roughness:.4});
  const cyan=new THREE.MeshStandardMaterial({color:0x24c9dc,emissive:0x18accc,emissiveIntensity:2.5,roughness:.3});
  const orange=new THREE.MeshStandardMaterial({color:0xff9a43,emissive:0xff6d20,emissiveIntensity:2.6});
  const weakCyan=new THREE.MeshStandardMaterial({color:0x2d6675,emissive:0x2093aa,emissiveIntensity:1.2});
  function box(x,y,z,w,h,d,mat=concrete,solid=false) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);
    if(mat===concrete||mat===darkConcrete||mat===floor){const pos=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.uv,tile=mat===floor?4:3;for(let i=0;i<pos.count;i++){const px=pos.getX(i)+x,py=pos.getY(i)+y,pz=pos.getZ(i)+z;if(Math.abs(n.getY(i))>.5)uv.setXY(i,px/tile,pz/tile);else if(Math.abs(n.getX(i))>.5)uv.setXY(i,pz/tile,py/tile);else uv.setXY(i,px/tile,py/tile);}uv.needsUpdate=true;}
    if(solid)colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));
    return m;
  }
  function pipe(a,b,r=.18,mat=steel) {
    const av=new THREE.Vector3(...a), bv=new THREE.Vector3(...b), delta=bv.clone().sub(av);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),12),mat);
    m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;group.add(m);return m;
  }
  function point(x,y,z,color,intensity=12,dist=13) {const l=new THREE.PointLight(color,intensity,dist,2);l.position.set(x,y,z);group.add(l);return l;}
  function sign(text,sub,x,y,z,width=5,height=1.8,color='#b0d0d5'){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle='#111e24';ctx.fillRect(0,0,1024,256);ctx.fillStyle=color;ctx.font='700 100px sans-serif';ctx.font=`700 ${Math.min(100,100*948/Math.max(1,ctx.measureText(text).width))}px sans-serif`;ctx.fillText(text,38,126);
    ctx.font='26px monospace';const subSize=Math.min(26,26*940/Math.max(1,ctx.measureText(sub).width));ctx.font=`${subSize}px monospace`;ctx.fillStyle='#728f99';ctx.fillText(sub,42,194);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:tex,emissive:0x8dbac9,emissiveMap:tex,emissiveIntensity:.25,roughness:.6}));m.position.set(x,y,z);group.add(m);return m;
  }

  // A broad cloud-light environment gives wet metal a readable reflected horizon.
  const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;
  const ec=envCanvas.getContext('2d'),eg=ec.createLinearGradient(0,0,0,512);
  eg.addColorStop(0,'#172c42');eg.addColorStop(.42,'#8098a8');eg.addColorStop(.51,'#a4a7a3');eg.addColorStop(.54,'#263340');eg.addColorStop(1,'#07121d');ec.fillStyle=eg;ec.fillRect(0,0,1024,512);
  ec.fillStyle='#bad6e0';ec.fillRect(340,128,110,50);ec.fillStyle='#bf7950';ec.fillRect(700,220,170,15);
  const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;scene.environment=env;scene.environmentIntensity=.45;
  // A deterministic overcast panorama, authored here rather than fetched from
  // a stock HDRI. Clouds soften toward the humid, pale harbor horizon.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;
  const sc=skyCanvas.getContext('2d'),si=sc.createImageData(1024,512);
  const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iy),hash(ix+1,iy),u),THREE.MathUtils.lerp(hash(ix,iy+1),hash(ix+1,iy+1),u),v);};
  for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
    const horizon=Math.exp(-Math.pow((y/512-.48)*4,2));
    let cloud=0,amp=.5;for(let k=0;k<5;k++){cloud+=amp*noise(x/100*2**k,y/40*2**k);amp*=.5;}
    const light=cloud*cloud*35,haze=horizon*34;
    const i=(y*1024+x)*4;
    si.data[i]=19+haze+light;si.data[i+1]=35+haze+light;si.data[i+2]=48+haze+light;si.data[i+3]=255;
  }
  sc.putImageData(si,0,0);
  const sky=new THREE.CanvasTexture(skyCanvas);sky.mapping=THREE.EquirectangularReflectionMapping;sky.colorSpace=THREE.SRGBColorSpace;scene.background=sky;
  scene.add(new THREE.HemisphereLight(0x91c0dc,0x15232a,1.55));
  const sun=new THREE.DirectionalLight(0xb5d7ed,2.7);sun.position.set(-28,48,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-48,right:48,top:50,bottom:-50,near:1,far:130});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(sun);sun.target.position.set(0,0,-5);scene.add(sun.target);
  const rim=new THREE.DirectionalLight(0xf59c63,1.1);rim.position.set(40,8,-65);scene.add(rim);

  // Flat, readable combat space; visual layering comes from the station outside it.
  box(0,-.3,0,78,.6,90,floor);
  box(0,-1.2,0,84,1.5,96,darkConcrete);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),new THREE.MeshStandardMaterial({color:0x142f40,roughness:.18,metalness:.7}));sea.rotation.x=-Math.PI/2;sea.position.y=-2.1;scene.add(sea);
  for(let side of [-1,1]){
    box(side*39,1,0,2,3,90,concrete,true);
    box(side*39,2.55,0,2.2,.12,90,edge);
    for(let z=-42;z<44;z+=7){
      box(side*38,2,z,.16,2,.16,edge);
      box(side*38,1.2,z,1.6,.12,.7,amber);
      box(side*38,2.5,z,.1,.09,2,weakCyan);
    }
    pipe([side*38,2.8,-44],[side*38,2.8,44],.065,edge);
    for(let z=-34;z<40;z+=12){
      box(side*43,7,z,6,14,8,darkConcrete);
      box(side*42.5,14.3,z,7,.6,9,steel);
      for(let y=4;y<12;y+=2.3)box(side*39.94,y,z,.08,.12,5,weakCyan);
      pipe([side*40,4,z-3],[side*40,12,z-3],.35,steel);
      for(let y=4;y<12;y+=2)pipe([side*40,y,z-3.02],[side*40,y,z-2.98],.48,edge);
    }
  }
  box(0,1,44,78,2,2,concrete,true);box(0,1,-44,78,2,2,concrete,true);
  // Rear facade and colossal turbine portal establish the hero vista.
  box(0,10,-49,60,20,8,darkConcrete);
  box(0,21,-49,64,2,10,concrete);
  box(-25,13,-43.8,6,26,8,concrete);box(25,13,-43.8,6,26,8,concrete);
  for(let x=-21;x<=21;x+=6){box(x,9,-44.8,1,18,1.2,steel);box(x,17,-44.1,.16,1.4,.12,weakCyan);}
  box(0,7,-44.85,19,13,.6,black);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(5.3,.38,12,80),edge);ring.position.set(0,8,-44.1);group.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(4.8,.065,8,80),cyan);ring2.position.set(0,8,-43.65);group.add(ring2);
  const turbine=new THREE.Group();turbine.userData.dynamic=true;turbine.position.set(0,8,-43.9);group.add(turbine);
  for(let i=0;i<14;i++){
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.85,4.4,.12),steel);const a=i*Math.PI*2/14;
    blade.position.set(Math.sin(a)*2.5,Math.cos(a)*2.5,0);blade.rotation.z=-a+.38;turbine.add(blade);
  }
  animated.push(t=>turbine.rotation.z=t*.06);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),steel);hub.scale.z=.4;hub.position.set(0,8,-43.3);group.add(hub);
  sign('BLACKWATER','TIDAL ARRAY  /  STATION 09',0,18.4,-44.1,17,3.5);
  sign('CONTROL','SIGNAL LOST · MANUAL RESTORE',0,3.4,-44.1,8,1.8,'#eeaa73');
  point(0,8,-40,0x32b8db,110,23);
  // Suspended cable gantry frames the skyline without obstructing the player.
  for(const z of [-27,20]){
    box(0,12,z,78,.8,1.2,steel);
    for(const x of [-35,35])box(x,6,z,1.2,12,1.6,concrete,true);
    for(let x=-32;x<34;x+=8)box(x,11.5,z,.3,.12,1.6,orange);
    for(let x=-24;x<34;x+=24){
      const lamp=new THREE.SpotLight(0xa6dbe7,55,25,.7,.6,1.3);lamp.position.set(x,11,z);lamp.target.position.set(x,0,z-2);group.add(lamp,lamp.target);
    }
  }
  for(const x of [-12,12]){
    const pts=[];for(let i=0;i<=24;i++){const z=-46+i*4;pts.push(new THREE.Vector3(x,18-4*Math.sin(i/24*Math.PI),z));}
    const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),64,.035,5,false),black);group.add(cable);
  }
  // Central splitter and compact cover islands support flanking, not a corridor.
  box(0,1.65,-8,9,3.3,5,concrete,true);box(0,3.35,-8,9.3,.12,5.3,steel);
  box(0,2.2,-5.46,5.5,.15,.08,cyan);sign('09 / INDUCTION','HIGH VOLTAGE · KEEP CLEAR',0,1.4,-5.45,5,1);
  for(const x of [-3.5,3.5]){box(x,1.6,-5.46,.15,2.3,.05,amber);pipe([x,3.5,-8],[x,4.4,-8],.24,edge);}
  for(const x of [-14,14]){
    box(x,.55,9,4.8,1.1,3.8,darkConcrete,true);
    box(x,1.15,9,5,.1,4,edge);
    for(let i=0;i<9;i++)box(x-1.8+i*.45,1.24,9,.22,.15,3.4,steel);
    box(x,1.4,7.05,4.8,.7,.15,steel);
  }
  for(const x of [-30,30]){
    box(x,2,9,5,4,6,darkConcrete,true);box(x,4.1,9,5.3,.2,6.3,steel);
    for(let z=6.4;z<12;z+=.65)box(x,4.23,z,4.6,.05,.28,edge);
    sign(x<0?'A / WEST':'B / EAST','CAPACITOR BANK',x,2.8,12.05,4,1.1);
    box(x,1.8,12.06,3.5,.08,.05,weakCyan);
  }
  // Original modular Blender props, shared geometry/materials between instances.
  const loader=new GLTFLoader();
  const [pylonAsset,barricadeAsset]=await Promise.all([
    loader.loadAsync(`${import.meta.env.BASE_URL}assets/signal-pylon.glb`),loader.loadAsync(`${import.meta.env.BASE_URL}assets/barricade.glb`)
  ]);
  for(const a of [pylonAsset,barricadeAsset])a.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  function prop(asset,x,z,rot=0){const obj=asset.scene.clone(true);obj.position.set(x,0,z);obj.rotation.y=rot;group.add(obj);return obj;}
  for(const [x,z] of [[-24,-20],[24,-20],[0,-38]]){
    const pylon=prop(pylonAsset,x,z);pylon.userData.dynamic=true;
    const materials=[];pylon.traverse(o=>{if(o.isMesh){o.material=o.material.clone();materials.push({material:o.material,color:o.material.emissive.clone(),intensity:o.material.emissiveIntensity});}});
    const beacon=point(x,3,z,0x26c8eb,18,10);coreVisuals.push({pylon,materials,beacon});
    sign(x<0?'WEST ARCHIVE':x>0?'EAST ARCHIVE':'THE HEART','MEMORY RECOVERY / AUTHORIZED PERSONNEL',x,6.15,z+.5,6,1.3);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-1.5,0,z-1.5),new THREE.Vector3(x+1.5,5,z+1.5)));
    // Technical floor pad makes each signal site recognizable.
    box(x,.018,z,7,.035,7,steel);
    for(const s of [-1,1]){box(x+s*3.5,.045,z,.08,.025,7,weakCyan);box(x,.045,z+s*3.5,7,.025,.08,weakCyan);}
  }
  // Authored memory furniture lives in perimeter bays, outside the generous
  // archive approaches. Matching simple collision envelopes prevent ghost props.
  const stories=await Promise.all(['medical','engineering','relay'].map(n=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/memory-${n}.glb`)));
  for(const [i,x,z] of [[0,-33,-19],[1,33,-19],[2,7,-40]]){
    prop(stories[i],x,z);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-1.7,0,z-1.6),new THREE.Vector3(x+1.7,2.4,z+1)));
    const colors=[0x76e4b0,0xffb347,0x6acbff], labels=['TRIAGE / LAST FERRY','REPAIR / MANUAL CUTOFF','RELAY / STILL HERE'];
    sign(labels[i],['MARA · THE CHILDREN MADE IT','ELIAN · THE STATION CAN WAIT','SERA · EVERY SIGNAL IS A PERSON'][i],x,3.6,z-.9,7,1.5,['#94e4b9','#ffc078','#8edbff'][i]);
    point(x,3,z,colors[i],24,12);
    for(const dx of [-3,3])box(x+dx,.03,z,.1,.04,6,[weakCyan,amber,cyan][i]);
  }
  // Physical warning placard is mounted beside the lane, not over the target.
  box(-8,2.2,23.01,3.6,.82,.08,steel,true);
  for(const x of [-9.3,-6.7])box(x,1.72,22.8,.09,.4,.1,edge);
  sign('INDUCTION GUARD','CAUTION / ACTIVE INDUCTION FIELD',-8,2.2,23.06,3.5,.75,'#ffc078');
  const cover=[[-8,22,0],[8,22,0],[-22,0,.35],[22,0,-.35],[-10,-23,.15],[10,-23,-.15],[-29,-32,0],[29,-32,0]];
  for(const [x,z,rot]of cover){prop(barricadeAsset,x,z,rot);const hw=1.95,hd=.95;colliders.push(new THREE.Box3(new THREE.Vector3(x-hw,0,z-hd),new THREE.Vector3(x+hw,1.6,z+hd)));}
  // Industrial surface detail: drainage, puddles, service paint and hazard markings.
  const puddle=new THREE.MeshPhysicalMaterial({color:0x293c47,metalness:.55,roughness:.18,transparent:true,opacity:.68,clearcoat:1});
  for(let i=0;i<36;i++){
    const m=new THREE.Mesh(new THREE.CircleGeometry(1,24),puddle);m.rotation.x=-Math.PI/2;m.scale.set(1+rng()*3,.4+rng()*1.6,1);m.position.set((rng()-.5)*70,.012,(rng()-.5)*78);m.receiveShadow=true;group.add(m);
  }
  for(const x of [-33,33]){
    box(x,.014,0,.65,.025,85,black);
    for(let z=-41;z<42;z+=1.3)box(x,.036,z,.7,.025,.055,edge);
  }
  for(let z=-36;z<39;z+=4){box(-3,.016,z,.09,.025,2,amber);box(3,.016,z,.09,.025,2,amber);}
  for(const z of [-2,18,35]){
    for(let i=0;i<12;i++){const stripe=box(-5.5+i,.025,z,.5,.03,.4,amber);stripe.rotation.y=-.5;}
  }
  // Warm service lights are deliberate counterpoints to the cold signal technology.
  for(const [x,z]of [[-35,-9],[35,-9],[-35,27],[35,27]]){
    box(x,3.5,z,.25,7,.25,steel);box(x,7,z,.6,.15,1.2,orange);point(x,6.7,z,0xff994f,40,16);
  }
  for(const side of [-1,1])for(let i=0;i<6;i++){
    const x=side*(58+rng()*50), z=-70+rng()*130, h=12+rng()*35;
    box(x,h/2-2,z,10+rng()*12,h,12+rng()*8,darkConcrete);
    for(let j=0;j<4;j++)box(x-4+j*2,h*.75,z+7,.22,.25,.06,orange);
    if(i%2===0){pipe([x,h,z],[x,h+12,z],.12,steel);const beacon=box(x,h+12,z,.25,.3,.25,orange);beacon.userData.dynamic=true;animated.push(t=>beacon.visible=Math.sin(t*2+i)>0);}
  }
  // Far harbor cranes and radio masts create an authored horizon silhouette.
  for(const [x,z]of [[-63,-80],[67,-85],[-87,12]]){
    box(x,21,z,1.5,42,2,steel);box(x+8,40,z,26,1,1,steel);
    pipe([x,40,z],[x+19,40,z],.16,edge);pipe([x+17,40,z],[x+17,17,z],.055,black);
    for(let y=5;y<39;y+=5){const brace=box(x,y,z,1,.15,2,edge);brace.rotation.z=.5;}
  }
  // Rain is one transparent draw call; world update only translates it.
  const rainN=1700, rainPositions=new Float32Array(rainN*6),rainSpeeds=new Float32Array(rainN);
  for(let i=0;i<rainN;i++){const x=(rng()-.5)*92,y=rng()*24,z=(rng()-.5)*100;rainPositions.set([x,y,z,x-.08,y-.8-rng()*.5,z+.02],i*6);rainSpeeds[i]=10+rng()*8;}
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0x91baca,transparent:true,opacity:.19,depthWrite:false}));rain.frustumCulled=false;group.add(rain);
  // Merge static geometry by material after placing it. This keeps a detailed
  // modular environment from costing one draw call per bolt or concrete slab.
  group.updateMatrixWorld(true);
  const batches=new Map(),originals=[];
  group.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    for(let p=o;p&&p!==scene;p=p.parent)if(p.userData.dynamic)return;
    const key=o.material.uuid;
    if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});
    const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);
    // Different source meshes may carry an unnecessary second UV channel.
    for(const attr of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(attr))geometry.deleteAttribute(attr);
    if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
    batches.get(key).geometries.push(geometry.index?geometry.toNonIndexed():geometry);originals.push(o);
  });
  for(const o of originals)o.removeFromParent();
  for(const {material,geometries}of batches.values()){
    const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('Static environment batching failed');
    const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
    for(const g of geometries)g.dispose();
  }
  // Ground-level mist cards are omitted to preserve targets and contrast.
  return {
    colliders,
    setCoreState(id,restored){const v=coreVisuals[id];if(!v)return;v.pylon.userData.restored=restored;v.beacon.color.setHex(restored?0x65d6a0:0x26c8eb);v.beacon.intensity=restored?6:18;for(const m of v.materials){m.material.emissive.copy(restored&&m.intensity>1?new THREE.Color(0x47bd85):m.color);m.material.emissiveIntensity=restored&&m.intensity>1?.8:m.intensity;}},
    playerSpawn:new THREE.Vector3(0,1.7,31),
    spawnPoints:[new THREE.Vector3(-30,0,-28),new THREE.Vector3(30,0,-28),new THREE.Vector3(-22,0,-5),new THREE.Vector3(22,0,-5),new THREE.Vector3(-15,0,-35),new THREE.Vector3(15,0,-35),new THREE.Vector3(-31,0,20),new THREE.Vector3(31,0,20)],
    corePositions:[new THREE.Vector3(-24,0,-15),new THREE.Vector3(24,0,-15),new THREE.Vector3(0,0,-33)],
    bounds:{minX:-37,maxX:37,minZ:-42,maxZ:42},
    update(dt,time){
      for(const fn of animated)fn(time);
      for(let i=0;i<rainN;i++){const p=i*6,dy=rainSpeeds[i]*dt;rainPositions[p+1]-=dy;rainPositions[p+4]-=dy;rainPositions[p]+=.8*dt;rainPositions[p+3]+=.8*dt;if(rainPositions[p+1]<0){rainPositions[p+1]=24;rainPositions[p+4]=23;}}
      rainGeometry.attributes.position.needsUpdate=true;
    }
  };
}
