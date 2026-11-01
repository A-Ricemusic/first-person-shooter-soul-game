import * as THREE from 'three';
const Y=new THREE.Vector3(0,1,0);
export function attachLegs(model,group){
 if(!model.getObjectByName('UpperLeft'))return null;
 return ['Left','Right'].map((side,i)=>({side,x:i?.23:-.23,upper:model.getObjectByName('Upper'+side),lower:model.getObjectByName('Lower'+side),knee:model.getObjectByName('Knee'+side),foot:model.getObjectByName('Foot'+side),world:new THREE.Vector3(i?.23:-.23,.065,i?-.15:.15).applyAxisAngle(Y,group.rotation.y).add(group.position),swing:false}));
}
export function animateLegs(r,group,delta,dt){
 if(!r.legs)return;
 const distance=delta.length();r.travel=(r.travel||0)+distance;
 const direction=distance>1e-7?delta.clone().normalize():r.direction||new THREE.Vector3(0,0,1);r.direction=direction;
 const yaw=group.rotation.y;
 const lateral=Math.abs(direction.clone().applyAxisAngle(Y,-yaw).x);
 const stride=.6-.28*lateral;
 r.cycle=(r.cycle||0)+distance/stride;
 for(const [i,l]of r.legs.entries()){
  const phase=(r.cycle+i*.5)%1,swing=phase>=.5 && distance>1e-7;
  const home=new THREE.Vector3(l.x*.7,.065,0).applyAxisAngle(Y,yaw).add(group.position);
  if(swing){
   if(!l.swing)l.start=l.world.clone();
   const t=(phase-.5)*2,target=home.clone().addScaledVector(direction,stride/4);
   l.world.copy(l.start||home).lerp(target,t);l.world.y=.065+Math.sin(Math.PI*t)*.12;
  }else if(l.swing){l.world.copy(home).addScaledVector(direction,stride/4);}
  if(distance<1e-7)l.world.y=THREE.MathUtils.damp(l.world.y,.065,22,dt);
  l.swing=swing;
  // During pivots a foot replants rather than twisting outside the narrow hull clearance.
  const foot=l.world.clone().sub(group.position).applyAxisAngle(Y,-yaw);
  foot.x=THREE.MathUtils.clamp(foot.x,-.25,.25);foot.z=THREE.MathUtils.clamp(foot.z,-.22,.22);
  const reach=Math.hypot(foot.x,foot.z);
  if(reach>.30){foot.x*=.30/reach;foot.z*=.30/reach;}
  l.world.copy(foot).applyAxisAngle(Y,yaw).add(group.position);
  const hip=new THREE.Vector3(l.x,.77,0),ankle=foot.clone().setY(Math.max(.065,foot.y));
  const mid=hip.clone().add(ankle).multiplyScalar(.5);mid.z+=Math.sqrt(Math.max(0,.405**2-hip.distanceToSquared(ankle)/4));
  mid.z=Math.min(.22,mid.z);
  function link(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());mesh.scale.set(1,a.distanceTo(b),1);}
  link(l.upper,hip,mid);link(l.lower,mid,ankle);l.knee.position.copy(mid);l.foot.position.copy(ankle);l.foot.rotation.y=-yaw+(l.heading??yaw);
  if(swing)l.heading=yaw;
 }
}
// Download failure retains the same sight anchor and movement language using simple owned geometry.
export function fallbackDrone(hover){
 const model=new THREE.Group();
 const armor=new THREE.MeshStandardMaterial({color:0x34454b,metalness:.6,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x101b20}),optic=new THREE.MeshStandardMaterial({color:0xff693c,emissive:0xff341c,emissiveIntensity:.65});
 const box=(name,x,y,z,w,h,d,material=armor)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.name=name;m.position.set(x,y,z);model.add(m);return m;};
 box('Hull',0,1.3,.08,.38,.30,.42);box('Optic',0,1.3,.418,.22,.16,.024,optic);
 box('ShutterTop',0,1.51,.23,.38,.10,.14);box('ShutterBottom',0,1.09,.23,.38,.10,.14);
 for(const [i,side]of ['Left','Right'].entries()){
  const x=i?.23:-.23;
  box('Vane'+side,x,1.1,-.06,.12,.035,.20);
  if(hover){const duct=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,16),armor);duct.rotation.x=Math.PI/2;duct.position.set(x,1.17,-.06);model.add(duct);}
  else{box('Upper'+side,x,.57,0,.10,1,.10);box('Lower'+side,x,.25,0,.07,1,.07);box('Knee'+side,x,.43,.13,.12,.12,.12);box('Foot'+side,x,.065,0,.15,.10,.23,dark);}
 }
 box('Spine',0,.96,-.04,.15,.4,.22,dark);return model;
}
