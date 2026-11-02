import SUIT from './suit-service-layout.json' with {type:'json'};
import {createCapacitors} from './capacitors.js';
import terminalParts from './build70-access-terminal-parts.json';
import ACCESS from './build70-access-layout.json';
import * as THREE from 'three';
import MEDICAL from './medical-layout.json';
import WORKSHOP from './workshop-layout.json';
import INDUCTION from './induction-layout.json';
import UPLINK from './uplink-layout.json' with {type:'json'};
import { CORE_SITES, SERVICE_ROUTES } from './mission.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original Blender-authored props are combined with modular architectural geometry.
// World coordinates: Y up, floor 0; front entrance at +Z.
export async function buildWorld(scene) {
  const rng = (() => { let s = 51319; return () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296); })();
  const colliders = [], animated = [], coreVisuals = [], receivers = [];
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
  for(const {x} of SERVICE_ROUTES){
    box(x,.55,9,4.8,1.1,3.8,darkConcrete,true);
    box(x,1.15,9,5,.1,4,edge,true);
    // Continuous grate support at the rendered bar tops (1.315 m).
    colliders.push(new THREE.Box3(new THREE.Vector3(x-1.91,1.2,7.3),new THREE.Vector3(x+1.91,1.315,10.7)));
    for(let i=0;i<9;i++)box(x-1.8+i*.45,1.24,9,.22,.15,3.4,steel,true);
    box(x,1.4,7.05,4.8,.7,.15,steel,true);
    // Rear service access: a small physical placard and close-approach paint.
    sign('SERVICE','REAR ACCESS',x+.9,.65,10.925,1.25,.28,'#b8ccc8');
    box(x,.03,12.3,1.25,.025,.09,amber);
    for(const side of [-1,1]){const arrow=box(x+side*.2,.03,11.85,.55,.025,.07,amber);arrow.rotation.y=side*.7;}

  }
  for(const x of [-30,30]){
    box(x,2,9,5,4,6,darkConcrete,true);box(x,4.1,9,5.3,.2,6.3,steel);
    for(let z=6.4;z<12;z+=.65)box(x,4.23,z,4.6,.05,.28,edge);
    sign(x<0?'A / WEST':'B / EAST','CAPACITOR BANK',x,2.8,12.05,4,1.1);
    box(x,1.8,12.06,3.5,.08,.05,weakCyan);
  }
  // Original modular Blender props, shared geometry/materials between instances.
  const loader=new GLTFLoader();
  const barricadeAsset=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/barricade.glb`);
  for(const a of [barricadeAsset])a.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  function prop(asset,x,z,rot=0){const obj=asset.scene.clone(true);obj.position.set(x,0,z);obj.rotation.y=rot;group.add(obj);return obj;}
  // One authored asset, shared geometry; per-terminal mutable display materials.
  let receiverAsset;
  try { receiverAsset=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/build70-access-receiver.glb`)).scene; }
  catch (_) { /* Honest cabinet fallback uses exactly the same solid envelope. */ }
  for(const [i,x,z] of [[0,MEDICAL.core[0],MEDICAL.core[1]],[1,24,-15],[2,0,-33]]) {
    const model=receiverAsset?receiverAsset.clone(true):new THREE.Group();
    model.position.set(x,0,z);model.rotation.y=0;model.userData.dynamic=true;group.add(model);
    if(!receiverAsset)for(const p of terminalParts){
      const mat=new THREE.MeshStandardMaterial({color:new THREE.Color(...p.color),emissive:new THREE.Color(...p.color),emissiveIntensity:p.emission,roughness:.6});
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(...p.size),mat);mesh.name=p.name;mesh.position.set(...p.position);model.add(mesh);
    }
    for(const p of terminalParts)if(p.name!=='Progress'){
      const c=new THREE.Vector3(...p.position).add(model.position),h=new THREE.Vector3(...p.size).multiplyScalar(.5);
      colliders.push(new THREE.Box3(c.clone().sub(h),c.clone().add(h)));
    }
    const beacon=point(x,3.5,z,0x26c8eb,18,10),materials=[];
    model.traverse(o=>{if(o.isMesh&&o.name==='Beacon'){o.material=o.material.clone();materials.push({material:o.material,color:o.material.emissive.clone(),intensity:o.material.emissiveIntensity});}});
    coreVisuals.push({pylon:model,materials,beacon});
    box(x,.018,z,3,.035,3,steel);
    model.updateMatrixWorld(true);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
      // Each visible solid supplies its own matching bounds, including controls.
      if(o.material.emissiveIntensity>0&&o.name==='Progress')o.material=o.material.clone();
      if(receiverAsset&&o.name!=='Progress'&&o.name!=='MemoryCassette'&&o.name!=='Beacon')o.userData.batchHousing=true;
    }});
    const progress=model.getObjectByName('Progress'),cassette=model.getObjectByName('MemoryCassette');
    receivers.push({model,progress,cassette});
    for(const [dx,dz,rot,width] of [[0,.166,0,1.1],[0,-.686,Math.PI,1.1],[.616,-.26,Math.PI/2,.72],[-.616,-.26,-Math.PI/2,.72]]){const face=sign(CORE_SITES[i].person,'MEMORY / ARCHIVE',x+dx,2.64,z+dz,width,.28);face.rotation.y=rot;}
    sign(CORE_SITES[i].person,`MEMORY RECEIVER / ${CORE_SITES[i].role.toUpperCase()}`,x,.53,z+.415,1.03,.24);
  }
  // Build51: instantiate before navigation/map caches; every visible solid has the same bounds.
  let inductionAsset;
  try{inductionAsset=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/induction-hall-build68.glb`)).scene;}catch(_){}
  const inductionMaterials={concrete:concrete,steel,edge,roof:darkConcrete,enamel:amber,ceramic:new THREE.MeshStandardMaterial({color:0xada882,roughness:.7}),copper:amber,dark:black,mark:new THREE.MeshStandardMaterial({color:0xb4a571,roughness:.9})};
  for(const p of INDUCTION.parts){
    const c=new THREE.Vector3(...p.center),h=new THREE.Vector3(...p.size).multiplyScalar(.5);
    if(p.solid){const b=new THREE.Box3(c.clone().sub(h),c.clone().add(h));b.induction=true;colliders.push(b);}
    if(!inductionAsset)box(...p.center,...p.size,inductionMaterials[p.material]);
  }
  if(inductionAsset){inductionAsset.traverse(o=>{if(o.isMesh){if(o.material.name==='Induction concrete')o.material=concrete;if(o.material.name==='Induction roof')o.material=darkConcrete;o.castShadow=true;o.receiveShadow=true;}});group.add(inductionAsset);}
  sign('CUSTODIAN / INDUCTION','I / II / III — SERVICE BAYS',11,4.2,23.16,8,.8,'#dfc797');
  sign('CUSTODIAN / NORTH ENTRY','SHUTTERS LIFT / FIRE AT CLEAR COILS',9.5,4.3,10.34,3.6,.8,'#dfc797');
  const southExit=sign('UPLINK ←','SOUTH SERVICE EXIT',4.3,2.8,21.3,2.8,.7,'#b5d2c2');southExit.rotation.y=Math.PI/2;
  for(const z of [12,19])point(11,4.6,z,0xf2d7a6,35,12);
  // Build43: one authoritative parts list supplies authored and load-failure geometry.
  let workshopAsset;
  try{workshopAsset=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/engineering-workshop.glb`)).scene;}catch(_){}
  const workshopColors={roof:0x3b4a4d,steel:0x172429,edge:0x5e6e6e,enamel:0x546e64,concrete:0x30383b,ceramic:0xada882,copper:0x66381f,dark:0x060909};
  const workshopMaterials={};
  for(const p of WORKSHOP.parts){
    if(p.solid){const c=new THREE.Vector3(...p.center),h=new THREE.Vector3(...p.size).multiplyScalar(.5);colliders.push(new THREE.Box3(c.clone().sub(h),c.clone().add(h)));}
    if(!workshopAsset){workshopMaterials[p.material]??=new THREE.MeshStandardMaterial({color:workshopColors[p.material],roughness:.65,metalness:.35});box(...p.center,...p.size,workshopMaterials[p.material]);}
  }
  if(workshopAsset){workshopAsset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(workshopAsset);}
  sign('ENGINEERING / MAINTENANCE','ISOLATED BUS / MANUAL REPAIR',29,6.2,-8.87,8,.85,'#c4c7b1');
  for(const z of [-11,-27])point(29,6.3,z,0xd9d1ae,24,12);
  const triage=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/west-triage.glb`);
  triage.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name==='Reinforced slate concrete')o.material=concrete;if(o.material.name==='Canopy concrete')o.material=darkConcrete;}});group.add(triage.scene);
  for(const p of MEDICAL.parts)if(p.solid){const c=new THREE.Vector3(...p.center),half=new THREE.Vector3(...p.size).multiplyScalar(.5);colliders.push(new THREE.Box3(c.clone().sub(half),c.clone().add(half)));}
  sign('TRIAGE / EVACUATION','LAST FERRY · INTAKE → ARCHIVE',-25,5.1,-8.66,7,1.1,'#b5d2c2');
  const service=MEDICAL.openings.find(o=>o.name==='service');
  const serviceSign=sign('MEDICAL / SERVICE','EAST ACCESS',service.center[0]+.34,5.2,service.center[1],4,.9,'#b5d2c2');serviceSign.rotation.y=Math.PI/2;
  const wayfinding=MEDICAL.wayfinding;
  const exitSign=sign('EXIT','COURTYARD',...wayfinding.serviceSign,3.7,.7,'#c0d9ad');exitSign.rotation.y=-Math.PI/2;
  const wallExit=sign('EXIT →','COURTYARD / LAST FERRY',...wayfinding.wallSign,3.6,.78,'#c0d9ad');wallExit.rotation.y=-Math.PI/2;
  const intakeExit=sign('EXIT / INTAKE','LAST FERRY',...wayfinding.intakeSign,3.9,.7,'#c0d9ad');intakeExit.rotation.y=Math.PI;
  for(const z of [-12,-22]){for(const x of [-27,-23])box(x,7.02,z,.05,.34,.05,steel);box(-25,6.8,z,5,.1,.3,weakCyan);point(-25,5.7,z,0xc2ddcf,42,14);}
  // Warm, restrained intake lamp; overhead lighting reveals silhouettes under canopy.
  point(-18,3.5,-14,0xe3c69b,16,8);
  // Authored memory furniture lives in perimeter bays, outside the generous
  // archive approaches. Matching simple collision envelopes prevent ghost props.
  const stories=await Promise.all(['medical','engineering','relay'].map(n=>loader.loadAsync(`${import.meta.env.BASE_URL}assets/memory-${n}.glb`)));
  for(const [i,x,z] of [[0,...MEDICAL.story],[1,33,-19],[2,7,-40]]){
    prop(stories[i],x,z);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-1.7,0,z-1.6),new THREE.Vector3(x+1.7,2.4,z+1)));
    const colors=[0x76e4b0,0xffb347,0x6acbff], labels=['TRIAGE / LAST FERRY','REPAIR / MANUAL CUTOFF','RELAY / STILL HERE'];
    const storySign=sign(labels[i],['MARA · THE CHILDREN MADE IT','ELIAN · THE STATION CAN WAIT','SERA · EVERY SIGNAL IS A PERSON'][i],x,3.6,z-.9,7,1.5,['#94e4b9','#ffc078','#8edbff'][i]);
    if(i===0){storySign.position.set(-36.18,3.6,-19);storySign.rotation.y=Math.PI/2;}
    point(x,3,z,colors[i],24,12);
    for(const dx of [-3,3])box(x+dx,.03,z,.1,.04,6,[weakCyan,amber,cyan][i]);
  }
  // Build70: original aisle architecture shares authored/fallback/collision metadata.
  let accessAsset;
  try{accessAsset=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/build70-access-architecture.glb`)).scene;}catch(_){}
  const accessMaterials={steel,edge,concrete,amber,paint:new THREE.MeshStandardMaterial({color:0x6b8278,roughness:.95})};
  for(const p of ACCESS.parts){
    if(p.solid){const c=new THREE.Vector3(...p.center),h=new THREE.Vector3(...p.size).multiplyScalar(.5);colliders.push(new THREE.Box3(c.clone().sub(h),c.clone().add(h)));}
    if(!accessAsset)box(...p.center,...p.size,accessMaterials[p.material]);
  }
  if(accessAsset){accessAsset.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(accessAsset);}
  sign('INDUCTION','ACTIVE FIELD',-3.5,2.05,23.056,1.02,.54,'#ffc078');
  const cover=[[-22,0,.35],[22,0,-.35],[-10,-23,.15],[10,-23,-.15],[-29,-32,0],[29,-32,0]];
  for(const [x,z,rot]of cover){const object=prop(barricadeAsset,x,z,rot);object.updateMatrixWorld(true);object.traverse(o=>{if(o.isMesh)if(o.name!=='Progress')colliders.push(new THREE.Box3().setFromObject(o));});}
  // Split defense: fixed physical cover, open 2.8m center and exposed flanks.
  // Register the authored envelope before any navigation or route cache exists.
  const suitCenter=new THREE.Vector3(...SUIT.center),sh=new THREE.Vector3(...SUIT.size).multiplyScalar(.5);
  const suitBounds=new THREE.Box3(suitCenter.clone().sub(sh),suitCenter.clone().add(sh));suitBounds.suitService=true;colliders.push(suitBounds);
  let suit;
  try{suit=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/suit-service.glb`)).scene;}catch(_){
    suit=new THREE.Group();const housing=new THREE.Mesh(new THREE.BoxGeometry(...SUIT.size),steel);housing.position.copy(suitCenter);suit.add(housing);
    const identity=sign('EMERGENCY SUIT SERVICE','UPLINK / ONE USE / 40 HP + AEGIS 60',SUIT.face[0],1.15,SUIT.face[2]-.004,.95,.24);identity.rotation.y=Math.PI;
  }
  suit.name='EmergencySuitService';suit.userData.dynamic=true;group.add(suit);
  const suitDisplays=[];
  suit.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.name==='ServiceStatus'||o.name.startsWith('ChargeCell')){o.material=o.material.clone();suitDisplays.push(o);}else o.userData.batchHousing=true;}});
  // Physical face status panel remains with the cabinet, never a HUD marker.
  const suitCanvas=document.createElement('canvas');suitCanvas.width=512;suitCanvas.height=128;
  const suitTexture=new THREE.CanvasTexture(suitCanvas),suitPanel=new THREE.Mesh(new THREE.PlaneGeometry(.82,.205),new THREE.MeshBasicMaterial({map:suitTexture,side:THREE.DoubleSide}));
  suitPanel.position.set(SUIT.face[0],.69,SUIT.face[2]-.003);suitPanel.rotation.y=Math.PI;suit.add(suitPanel);let suitSignature='';
  function setSuitServiceState(a){
    const signature=`${a.state}:${Math.floor(a.progress*8)}`;if(signature===suitSignature)return;suitSignature=signature;
    const color=a.spent?'#60716e':!a.powered?'#d2a16a':a.progress>0?'#eef7c1':'#72f0c0',ctx=suitCanvas.getContext('2d');ctx.fillStyle='#10201f';ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 42px monospace';ctx.fillText(a.state,256,52);ctx.font='21px monospace';ctx.fillText(a.spent?'CARTRIDGE EXPENDED':!a.powered?'3 MEMORIES + CUSTODIAN OFF':a.progress>0?`${Math.floor(a.progress*100)}% / KEEP HOLDING`:'HOLD E 2s / +40 HP / ARMOR 60',256,95);suitTexture.needsUpdate=true;
    for(const o of suitDisplays){o.material.color.set(color);o.material.emissive?.set(color);o.material.emissiveIntensity=o.name==='ServiceStatus'||a.progress>Number(o.name.slice(-2))/8?.6:.05;}
  }
  setSuitServiceState({state:'LOCKED',powered:false,spent:false,progress:0});
  let uplinkAsset;
  try{uplinkAsset=(await loader.loadAsync(`${import.meta.env.BASE_URL}assets/uplink-defense.glb`)).scene;}catch(_){}
  const uplink=uplinkAsset||new THREE.Group();uplink.userData.dynamic=true;group.add(uplink);
  const cells=[];
  for(const p of UPLINK.parts){
    const c=new THREE.Vector3(...p.center),half=new THREE.Vector3(...p.size).multiplyScalar(.5);
    const bounds=new THREE.Box3(c.clone().sub(half),c.clone().add(half));bounds.uplink=true;colliders.push(bounds);
    if(!uplinkAsset){const m=new THREE.Mesh(new THREE.BoxGeometry(...p.size),steel);m.position.copy(c);uplink.add(m);}
  }
  // Fallback uses the same authored footprint, flush and non-blocking.
  if(!uplinkAsset){const f=UPLINK.footprint,[cx,cz]=UPLINK.center;
    const deckMat=new THREE.MeshStandardMaterial({color:0x253d40,metalness:.7,roughness:.65});
    for(let x=0;x<10;x++)for(let z=0;z<6;z++){
      const w=(f.xMax-f.xMin)/10,d=(f.zMax-f.zMin)/6;
      const panel=new THREE.Mesh(new THREE.BoxGeometry(w-.025,.02,d-.025),deckMat);
      panel.position.set(cx+f.xMin+(x+.5)*w,-.008,cz+f.zMin+(z+.5)*d);uplink.add(panel);
    }
  }
  if(!uplinkAsset)for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.075,.025,.25),weakCyan.clone());m.name=`UplinkCell${String(i).padStart(2,'0')}`;m.position.set(-.55+i*.1,.92,34.2);uplink.add(m);}
  uplink.traverse(o=>{if(o.isMesh){if(uplinkAsset&&!o.name.startsWith('UplinkCell')&&o.name!=='Beacon')o.userData.batchHousing=true;o.castShadow=true;o.receiveShadow=true;if(o.name.startsWith('UplinkCell')||o.name==='Beacon'){o.material=o.material.clone();cells.push(o);}}});
  // Flush stance inlays are paint, not extra collision or a promise of flank safety.
  const stancePaint=new THREE.MeshStandardMaterial({color:0x9ca995,roughness:.93});
  const stanceDark=new THREE.MeshStandardMaterial({color:0x263f39,roughness:.95});
  for(const x of [-1.85,1.85]){
    const patch=new THREE.Mesh(new THREE.PlaneGeometry(.82,1.0),stanceDark);
    patch.rotation.x=-Math.PI/2;patch.position.set(x,.073,31.02);group.add(patch);
    for(const dx of [-.23,.23]){
      const foot=new THREE.Mesh(new THREE.PlaneGeometry(.14,.36),stancePaint);
      foot.rotation.x=-Math.PI/2;foot.position.set(x+dx,.075,31.06);group.add(foot);
    }
    for(const dz of [-.49,.49]){
      const border=new THREE.Mesh(new THREE.PlaneGeometry(.82,.035),stancePaint);
      border.rotation.x=-Math.PI/2;border.position.set(x,.075,31.02+dz);group.add(border);
    }
  }
  const routeLights=new THREE.Group();routeLights.userData.dynamic=true;group.add(routeLights);
  const routeMaterial=new THREE.MeshStandardMaterial({color:0x80bb99,emissive:0x65c791,emissiveIntensity:.7});
  for(const route of UPLINK.routes)for(let j=1;j<route.length;j++){
    const a=route[j-1],b=route[j],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=0;d<length;d+=2){const t=d/length,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.025,.65),routeMaterial);m.position.set(x,.065,z);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);routeLights.add(m);
    }
  }
  routeLights.visible=false;
  sign('UPLINK / FACE THE YARD','SPLIT BAFFLES · KEEP MOVING · WATCH BOTH FLANKS',0,1.18,34.57,3.1,.65,'#94d4aa').rotation.y=Math.PI;
  sign('RETURN / EITHER AISLE','UPLINK THROUGH THE CENTRAL GATE',0,3.7,-10.6,5,.65,'#94d4aa').rotation.y=Math.PI;
  const capacitors=await createCapacitors(group,colliders,sign);
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
  const roof=WORKSHOP.parts.find(p=>p.name===WORKSHOP.roofPart);
  const shelters=[INDUCTION.shelter,MEDICAL.shelter,{minX:roof.center[0]-roof.size[0]/2,maxX:roof.center[0]+roof.size[0]/2,minZ:roof.center[2]-roof.size[2]/2,maxZ:roof.center[2]+roof.size[2]/2,ceiling:roof.center[1]-roof.size[1]/2}];
  function maskRain(r,p){if(shelters.some(sh=>r[p]>=sh.minX&&r[p]<=sh.maxX&&r[p+2]>=sh.minZ&&r[p+2]<=sh.maxZ&&r[p+4]<sh.ceiling)){r[p+1]=24;r[p+4]=23;}}
  const rainN=1700, rainPositions=new Float32Array(rainN*6),rainSpeeds=new Float32Array(rainN);
  for(let i=0;i<rainN;i++){const x=(rng()-.5)*92,y=rng()*24,z=(rng()-.5)*100;rainPositions.set([x,y,z,x-.08,y-.8-rng()*.5,z+.02],i*6);rainSpeeds[i]=10+rng()*8;maskRain(rainPositions,i*6);}
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0x91baca,transparent:true,opacity:.19,depthWrite:false}));rain.frustumCulled=false;group.add(rain);
  // Merge static geometry by material after placing it. This keeps a detailed
  // modular environment from costing one draw call per bolt or concrete slab.
  group.updateMatrixWorld(true);
  const batches=new Map(),originals=[];
  group.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material))return;
    for(let p=o;p&&p!==scene;p=p.parent)if(p.userData.dynamic&&!o.userData.batchHousing)return;
    const key=o.material.uuid;
    if(!batches.has(key))batches.set(key,{material:o.material,geometries:[]});
    const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);
    // Different source meshes may carry an unnecessary second UV channel.
    for(const attr of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(attr))geometry.deleteAttribute(attr);
    if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
    if(geometry.index){const expanded=geometry.toNonIndexed();geometry.dispose();batches.get(key).geometries.push(expanded);}else batches.get(key).geometries.push(geometry);originals.push(o);
  });
  for(const o of originals){if(o.userData.batchHousing)o.visible=false;else o.removeFromParent();}
  for(const {material,geometries}of batches.values()){
    const merged=mergeGeometries(geometries,false);if(!merged)throw new Error('Static environment batching failed');
    const m=new THREE.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;group.add(m);
    for(const g of geometries)g.dispose();
  }
  // Ground-level mist cards are omitted to preserve targets and contrast.
  return {
    capacitors, colliders, medical:MEDICAL, workshop:WORKSHOP, induction:INDUCTION, shelters, rainPositions,
    receivers, uplink, routeLights, suit, suitBounds, setSuitServiceState,
    setUplinkState(powered,progress){if(uplink.userData.powered===powered&&uplink.userData.progress===progress)return;routeLights.visible=powered;uplink.userData.powered=powered;uplink.userData.progress=progress;for(const c of cells){const on=powered&&(c.name==='Beacon'||Number(c.name.slice(-2))<Math.floor(progress*12));c.material.emissiveIntensity=on?1.4:.02;c.material.color.setHex(on?0x83e6aa:0x29463b);}},
    setReceiverState(id,progress,recovered){const r=receivers[id];if(!r)return;if(r.model.userData.progress===progress&&r.model.userData.recovered===recovered)return;
      if(r.progress){r.progress.scale.x=recovered?1:.12+.88*progress;r.progress.material.emissiveIntensity=recovered?.18:.35+.55*progress;r.progress.material.color.setHex(recovered?0x548875:0x287d88);}
      // Cassette remains physically docked: no disappearing cover or changing bounds.
      if(r.cassette)r.cassette.visible=true;
      r.model.userData.recovered=recovered;r.model.userData.progress=progress;
    },
    setCoreState(id,restored){const v=coreVisuals[id];if(!v)return;v.pylon.userData.restored=restored;v.beacon.color.setHex(restored?0x65d6a0:0x26c8eb);v.beacon.intensity=restored?6:18;for(const m of v.materials){m.material.emissive.copy(restored&&m.intensity>1?new THREE.Color(0x47bd85):m.color);m.material.emissiveIntensity=restored&&m.intensity>1?.8:m.intensity;}},
    playerSpawn:new THREE.Vector3(0,1.7,31),
    spawnPoints:[new THREE.Vector3(-30,0,-28),new THREE.Vector3(30,0,-28),new THREE.Vector3(-22,0,-5),new THREE.Vector3(22,0,-5),new THREE.Vector3(-15,0,-35),new THREE.Vector3(15,0,-35),new THREE.Vector3(-31,0,20),new THREE.Vector3(31,0,20)],
    corePositions:[new THREE.Vector3(MEDICAL.core[0],0,MEDICAL.core[1]),new THREE.Vector3(24,0,-15),new THREE.Vector3(0,0,-33)],
    bounds:{minX:-37,maxX:37,minZ:-42,maxZ:42},
    update(dt,time){
      for(const fn of animated)fn(time);
      for(let i=0;i<rainN;i++){const p=i*6,dy=rainSpeeds[i]*dt;rainPositions[p+1]-=dy;rainPositions[p+4]-=dy;rainPositions[p]+=.8*dt;rainPositions[p+3]+=.8*dt;
        maskRain(rainPositions,p);
        if(rainPositions[p+1]<0){rainPositions[p+1]=24;rainPositions[p+4]=23;}}
      rainGeometry.attributes.position.needsUpdate=true;
    }
  };
}
