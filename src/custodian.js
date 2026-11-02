import {actorOccludes} from './actor-surfaces.js';
import {hitNormal} from './combat-feedback.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import L from './custodian-layout.json';
import {AttackCoordinator} from './attack-coordinator.js';
// Mission-owned static object. Awaited at initialization, before nav cache creation.
export async function createCustodian(g){
 const group=new T.Group();group.position.fromArray(L.origin);g.scene.add(group);
 let model,fallback=false;try{model=(await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/custodian.glb`)).scene;for(const p of L.parts)if(!model.getObjectByName(T.PropertyBinding.sanitizeNodeName(p.name)))throw Error('Incomplete rig');}catch{fallback=true;let surfaces;try{surfaces=(await import('./custodian-surfaces.json')).default;}catch(error){throw new Error('Custodian model and exact backup could not load. Retry the connection.',{cause:error});}model=new T.Group();for(const p of L.parts){const surface=surfaces[p.name];const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(surface.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(surface.normals,3));const m=new T.Mesh(geometry,new T.MeshStandardMaterial({color:{dark:0x10191d,steel:0x83959e,ceramic:0xdbcfae,copper:0xb16f3c,mark:0xe8d595}[p.mat],metalness:p.mat==='ceramic'?.1:.75,roughness:.38}));m.name=p.name;m.position.fromArray(p.p);model.add(m);}}
 group.add(model);const c={coordination:new AttackCoordinator(),group,model,fallback,active:false,dead:false,windup:0,cooldown:2,open:0,stagger:0,coils:L.coils.map((p,i)=>({hp:160,parts:[],shutters:[],origin:new T.Vector3(L.origin[0]+(i-1)*1.65,2.85,L.origin[2]+.55),pivot:new T.Group(),muzzle:new T.Object3D(),metadata:p}))};
 for(const n of c.coils){n.pivot.position.fromArray(n.metadata.pivot);model.add(n.pivot);n.muzzle.position.fromArray(n.metadata.muzzle);n.pivot.add(n.muzzle);}
 c.lastAttack=-100;
 for(const p of L.parts){const m=model.getObjectByName(T.PropertyBinding.sanitizeNodeName(p.name))||model.getObjectByName(p.name);m.userData.baseColor=m.material.color.clone();m.userData.conductor=p.mat==='copper';m.userData.coil=p.coil;m.userData.shutter=p.shutter;m.userData.restY=m.position.y;if(p.head){const n=c.coils[p.coil];n.pivot.attach(m);}m.material=m.material.clone();if(p.coil>=0){c.coils[p.coil].parts.push(m);if(p.shutter)c.coils[p.coil].shutters.push(m);}if(p.solid||p.form==='cylinder'&&!p.head){const pos=new T.Vector3(...p.p).add(group.position),half=new T.Vector3(...p.s).multiplyScalar(.5);const b=new T.Box3(pos.clone().sub(half),pos.clone().add(half));b.custodian=true;if(p.form==='cylinder'){for(let j=0;j<8;j++){const z0=-half.z+j*p.s[2]/8,z1=z0+p.s[2]/8,w=half.x*Math.sqrt(Math.max(0,1-Math.max(z0*z0,z1*z1)/(half.z*half.z)));if(w>0){const slice=new T.Box3(new T.Vector3(pos.x-w,b.min.y,pos.z+z0),new T.Vector3(pos.x+w,b.max.y,pos.z+z1));slice.custodian=true;g.world.colliders.push(slice);}}}else g.world.colliders.push(b);}}
 return c;
}
export function resetCustodian(g){const c=g.custodian;c.coordination.reset();c.active=false;c.dead=false;c.cueIndex=null;c.lastAttack=-100;c.windup=0;c.cooldown=2;c.open=0;c.stagger=0;for(const n of c.coils)n.hp=160*g.difficulty.health;pose(c);}
function pose(c,dt=0){for(const n of c.coils){
 if(n.hp>0&&c.active&&n.target){const worldPivot=new T.Vector3(...n.metadata.pivot).add(c.group.position);n.pivot.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n.target.clone().sub(worldPivot).normalize());}
 if(!c.active){n.pivot.quaternion.identity();n.target=null;}
 for(const m of n.parts){m.material.emissive.setHex(!m.userData.conductor||!c.active||n.hp<=0?0:c.windup>0?0xc64b12:c.open>0?0x7b3412:0x381104);m.material.emissiveIntensity=.28;m.material.color.copy(n.hp<=0?new T.Color(0x22282b):m.userData.baseColor);if(m.name.startsWith('Winding'))m.rotation.z=n.hp<=0?.14:0;}
 for(const m of n.shutters)m.position.y=dt>0?T.MathUtils.damp(m.position.y,m.userData.restY+(n.hp<=0||c.open>0?.95:0),18,dt):m.userData.restY+(n.hp<=0||c.open>0?.95:0);
 n.pivot.position.fromArray(n.metadata.pivot);if(n.hp>0&&c.open>2.35&&c.open<=2.6)n.pivot.position.add(new T.Vector3(0,0,-.09).applyQuaternion(n.pivot.quaternion));
}c.group.updateWorldMatrix(true,true);}
// Only foreign world cover clips telegraphs; the machine's physical meshes still block rifle shots.
function clipped(g,from,to){const ray=new T.Ray(from,to.clone().sub(from).normalize());let d=from.distanceTo(to);for(const box of g.world.colliders){if(box.custodian)continue;const p=ray.intersectBox(box,new T.Vector3());if(p)d=Math.min(d,from.distanceTo(p));}return ray.at(d,new T.Vector3());}
// Objective visibility considers foreign cover, not the machine's own collision
// slices. A mission bearing is not an aim target or a promise of a walkable path.
export function custodianObjectiveVisible(g){
 const c=g.custodian;if(c.dead)return false;
 const point=new T.Vector3(),hit=new T.Vector3(),ray=new T.Ray();
 for(const n of c.coils){
  if(n.hp<=0)continue;
  const body=n.parts.find(m=>m.name.startsWith('Coil'));
  const targets=body?[body.getWorldPosition(point).clone(),n.origin]:[n.origin];
  for(const target of targets){
   const length=g.player.distanceTo(target);ray.set(g.player,target.clone().sub(g.player).normalize());
   if(!g.world.colliders.some(box=>!box.custodian&&(box.containsPoint(g.player)||(ray.intersectBox(box,hit)&&hit.distanceTo(g.player)<=length))))return true;
  }
 }
 return false;
}
export function custodianAim(g){
 const c=g.custodian;if(!c.active||c.dead)return null;
 g.raycaster.set(g.player,g.camera.getWorldDirection(new T.Vector3()));
 const h=g.raycaster.intersectObject(c.model,true)[0];if(!h)return null;
 // The exact machine mesh already selects the first physical surface. Its
 // conservative movement boxes must not hide that surface's classification.
 const ray=g.raycaster.ray,point=new T.Vector3();
 if(g.world.colliders.some(box=>!box.custodian&&(box.containsPoint(g.player)||(ray.intersectBox(box,point)&&point.distanceTo(g.player)<=h.distance))))return null;
 if(actorOccludes(g,g.raycaster,h.distance))return null;
 const i=h.object.userData.coil,n=c.coils[i];
 return {point:h.point,label:n?`COIL ${i+1} / ${n.hp<=0?'INERT COVER':c.open>0&&!h.object.userData.shutter?'EXPOSED COMPONENT':'ARMORED'}`:'INERT HOUSING / AIM AT NUMBERED COILS',health:n?n.hp/(160*g.difficulty.health):1};
}
// A later pellet must not replace the kill effect from the same shell.
export function hitCustodian(g,intersection,volley=null){const c=g.custodian,i=intersection.object.userData.coil,n=c.coils[i];if(!c.active||c.dead||!n||n.hp<=0){if(!volley?.wasLive)g.combatFeedback?.impact(intersection.point,hitNormal(intersection,g.ray.direction),'surface',g.options.reducedMotion);return;}const critical=c.open>0&&!intersection.object.userData.shutter,damage=volley?(critical?14:7)*volley.scale:critical?82:17;n.hp=Math.max(0,n.hp-damage);g.combatFeedback?.impact(intersection.point,hitNormal(intersection,g.ray.direction),n.hp===0?'kill':critical?'critical':'armor',g.options.reducedMotion);if(!volley)g.shotsHit++;else volley.hit=true;g.audio.hit(critical);g.event('hit',critical?'COIL EXPOSED':`ARMORED · CHIP ${damage}`,{headshot:critical,damage});if(n.hp===0){if(n.line){n.line.removeFromParent();n.line.geometry.dispose();n.line.material.dispose();n.line=null;}g.event('notice','BROADCAST COIL DISABLED · ONE LESS FIRING LANE');if(c.coils.every(n=>n.hp<=0)){c.dead=true;c.coordination.reset();clearCustodianLines(c);c.windup=0;c.open=0;g.kills++;g.score+=100;g.audio.kill();g.exitBoundary.material.color.setHex(0x65ffb7);g.exitBeam.visible=true;g.event('kill','CUSTODIAN DISABLED +100 · UPLINK RELEASED · WEST PLATE SUIT SERVICE READY · ONE USE');}}
 pose(c);
}
export function updateCustodian(g,dt){const c=g.custodian;if(!c.active||c.dead)return;c.open=Math.max(0,c.open-dt);c.stagger=Math.max(0,c.stagger-dt);c.cooldown-=dt;
 const live=c.coils.filter(n=>n.hp>0),visible=n=>g.hasLineOfSight(g.player,n.origin,0);
 if(c.windup>0&&g.dashTime>0&&live.some(n=>n.origin.distanceTo(g.player)<4.8&&visible(n))){const toward=c.group.position.clone().sub(g.player).setY(0);if(g.dashVector.dot(toward.normalize())>.65)g.dashTime=0;c.windup=0;c.open=3;c.stagger=.8;c.cooldown=4;c.coordination.resolve(c.open);g.phaseInterrupts++;g.event('phaseInterrupt','CUSTODIAN PHASE BREAK · COILS OPEN 3s');}
 if(c.windup>0){c.windup-=dt;if(c.windup<=0){for(const n of live){pose(c);const origin=n.muzzle.getWorldPosition(new T.Vector3()),direction=new T.Vector3(0,0,1).applyQuaternion(n.pivot.quaternion);if(!g.hasLineOfSight(n.origin,origin,0))continue;const m=new T.Mesh(new T.CylinderGeometry(.04,.04,.3,6),new T.MeshBasicMaterial({color:0xff823c}));m.position.copy(origin);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);g.scene.add(m);c.lastAttack=g.runTime;g.projectiles.push({mesh:m,origin:origin.clone(),velocity:direction.multiplyScalar(12),life:4,damage:13,attacker:c,custodianCoil:n});}c.open=2.6;c.cooldown=4.8;c.coordination.resolve(c.open);}}
 else if(custodianReady(g)&&c.coordination.retry<=0&&g.enemies.every(e=>e.windup<=0)) {c.coordination.start();c.windup=1.8;for(const n of live)n.target=g.player.clone().add(new T.Vector3((c.coils.indexOf(n)-1)*1.6,0,0));g.event('notice','CUSTODIAN LOCKING LANES · MOVE TO COVER / SHIFT CLOSE TO BREAK');g.audio.warning(0,15);}
 pose(c,dt);
 // Locked rays are visible during windup and vanish immediately on disable.
 for(const n of c.coils){if(c.windup>0&&n.hp>0){if(!n.line){const geometry=new T.BufferGeometry().setFromPoints([n.muzzle.getWorldPosition(new T.Vector3()),clipped(g,n.muzzle.getWorldPosition(new T.Vector3()),n.target)]);n.line=new T.Line(geometry,new T.LineBasicMaterial({color:0xff963d,transparent:true,opacity:.45}));g.scene.add(n.line);}}else if(n.line){n.line.removeFromParent();n.line.geometry.dispose();n.line.material.dispose();n.line=null;}}
}
export function clearCustodianLines(c){for(const n of c.coils)if(n.line){n.line.removeFromParent();n.line.geometry.dispose();n.line.material.dispose();n.line=null;}}

// Readiness is physical sight, never camera gaze. Queuing does not expose a phase target.
export function custodianReady(g){const c=g.custodian;return c.active&&!c.dead&&c.cooldown<=0&&c.stagger<=0&&g.player.distanceTo(c.group.position)<38&&c.coils.some(n=>n.hp>0&&g.hasLineOfSight(g.player,n.origin,0));}
export function prepareCustodianTurn(g,dt){const c=g.custodian;return c.coordination.advance(dt,{alive:c.active&&!c.dead,charging:c.windup>0,ready:custodianReady(g)});}
