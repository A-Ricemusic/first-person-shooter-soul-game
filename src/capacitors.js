import * as THREE from 'three';
import parts from './capacitor-parts.json';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const OVERLOAD_SECONDS=1.1, BLAST_RADIUS=6;
// Inclusive 3D body-centre test. Only the emitting bank's owned solids are excluded.
export function blastReaches(bank,body,colliders){
  const delta=body.clone().sub(bank.origin),length=delta.length();
  if(length>BLAST_RADIUS)return false;
  if(length<1e-8)return true;
  const ray=new THREE.Ray(bank.origin,delta.divideScalar(length)),point=new THREE.Vector3();
  return !colliders.some(box=>box.capacitor!==bank&&(box.containsPoint(bank.origin)||(ray.intersectBox(box,point)&&point.distanceTo(bank.origin)<length-1e-6)));
}
// A world solid wins ties; an owned envelope yields only to its actual target mesh.
export function capacitorShot(ray,raycaster,banks,colliders,maxDistance=120){
  let distance=maxDistance,bank=null;
  // The Custodian has its own exact mesh query in Game.shoot; movement bounds are not rifle surfaces.
  for(const box of colliders){
    if(box.custodian)continue;
    const p=ray.intersectBox(box,new THREE.Vector3());if(!p)continue;
    let d=p.distanceTo(ray.origin),target=null;
    if(box.capacitor){
      const b=box.capacitor;b.model.updateWorldMatrix(true,true);
      const hit=raycaster.intersectObject(b.model,true)[0];
      if(hit){d=hit.distance;target=b.targets.includes(hit.object)?b:null;}
    }
    if(d<distance){distance=d;bank=target;}
  }
  return {distance,bank};
}
export async function createCapacitors(group,colliders,sign){
  let asset;
  try{asset=(await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/capacitor-bank.glb`)).scene;}catch{/* Metadata is also the full original fallback. */}
  const banks=[];
  for(const [x,z] of [[29,-12],[19,-22]]){
    const model=asset?asset.clone(true):new THREE.Group();model.userData.dynamic=true;model.position.set(x,0,z);group.add(model);
    if(!asset)for(const p of parts){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...p.size),new THREE.MeshStandardMaterial({color:new THREE.Color(...p.color),emissive:new THREE.Color(...p.color),emissiveIntensity:p.emission,metalness:.65,roughness:.38}));mesh.name=p.name;mesh.position.set(...p.position);model.add(mesh);}
    const bank={model,origin:new THREE.Vector3(x,1.7,z),state:'intact',timer:0,flash:0,targets:[],lamps:[],materials:[],fallback:!asset};
    model.traverse(o=>{if(!o.isMesh)return;const p=parts.find(p=>THREE.PropertyBinding.sanitizeNodeName(p.name)===THREE.PropertyBinding.sanitizeNodeName(o.name));o.castShadow=o.receiveShadow=true;if(asset)o.material=o.material.clone();o.material.userData.baseColor=o.material.color.clone();bank.materials.push(o.material);if(p?.target)bank.targets.push(o);if(p?.emission||p?.name==='Conductor'){o.material.emissive.setHex(0xffad44);bank.lamps.push(o);}});
    for(const p of parts)if(p.solid){const c=new THREE.Vector3(...p.position).add(model.position),half=new THREE.Vector3(...p.size).multiplyScalar(.5),box=new THREE.Box3(c.clone().sub(half),c.clone().add(half));box.capacitor=bank;colliders.push(box);}
    const label=sign('SHOOT ISOLATOR','STAND CLEAR / 6 m / SINGLE DISCHARGE',x,1.59,z+.512,1.25,.22,'#ffc078');label.userData.dynamic=true;
    const shell=new THREE.Mesh(new THREE.SphereGeometry(6,24,12),new THREE.MeshBasicMaterial({color:0xffb85c,wireframe:true,transparent:true,opacity:.1,depthWrite:false}));shell.position.copy(bank.origin);shell.visible=false;group.add(shell);shell.userData.dynamic=true;bank.shell=shell;
    banks.push(bank);
  }
  return banks;
}
export function cancelCapacitors(banks){for(const b of banks){if(b.state==='warning')b.state='spent';b.timer=b.flash=0;visualCapacitor(b,false);}}
export function resetCapacitors(banks){for(const b of banks){b.state='intact';b.timer=b.flash=0;visualCapacitor(b,false);}}
export function visualCapacitor(b,reduced){
  for(const m of b.materials)m.color.copy(m.userData.baseColor).multiplyScalar(b.state==='spent'?.55:1);
  for(const o of b.lamps){o.material.emissiveIntensity=b.state==='spent'?.015:b.state==='warning'?1+2*(1-b.timer/OVERLOAD_SECONDS):.8;o.material.color.setHex(b.state==='spent'?0x332d25:0xffad44);}
  b.shell.visible=b.state==='warning'||b.flash>0;b.shell.material.opacity=b.flash>0?(reduced?.035:.11):.025;
}
export function activateCapacitor(game,bank){if(game.phase!=='playing'||bank.state!=='intact')return;bank.state='warning';bank.timer=OVERLOAD_SECONDS;game.audio.tone(430,.18,'triangle',.12,850);visualCapacitor(bank,game.options.reducedMotion);}
export function updateCapacitors(game,dt){
  for(const b of game.world.capacitors){
    if(game.phase!=='playing')return;
    b.flash=Math.max(0,b.flash-dt);
    if(b.state==='warning'){
      b.timer=Math.max(0,b.timer-dt);
      if(b.timer<1e-8){
        b.state='spent';b.flash=.18;
        game.audio.burst(.16,.23,1800);game.audio.tone(80,.16,'triangle',.18,30);
        // Resolve actual enemy kills before possible player loss; no iteration over a mutating list.
        for(const enemy of [...game.enemies])if(blastReaches(b,enemy.group.position.clone().add(new THREE.Vector3(0,enemy.type==='warden'?1.3:1.2,0)),game.world.colliders)){
          enemy.health-=90;enemy.lastHit=game.runTime;enemy.hitFlash=.08;if(enemy.health<=0)game.killEnemy(enemy,false);
        }
        if(blastReaches(b,game.player.clone().add(new THREE.Vector3(0,-.5,0)),game.world.colliders))game.damage(35,b.origin,null);
      }
    }
    visualCapacitor(b,game.options.reducedMotion);
  }
}
