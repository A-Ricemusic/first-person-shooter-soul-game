import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {capacitorShot,activateCapacitor} from './capacitors.js';
import {hitCustodian} from './custodian.js';
import {disposeAsset} from './viewmodel.js';
export const BREACHER={pellets:8,spread:.065,adsSpread:.048,cadence:.88,reload:.55};
export const falloff=d=>d<=6?1:Math.max(0,1-(d-6)/18);
export function shootBreacher(g){
 if(g.phase!=='playing'||g.fireTimer>0)return;
 // Held empty fire must let the first shell seat before interruption.
 if(g.reloading){if(g.ammo<=0)return;g.reloading=false;g.reloadTimer=0;}
 if(g.ammo<=0){g.reload();return;}
 g.ammo--;g.shotsFired++;g.fireTimer=.88;g.kick=1;g.recoil=Math.min(.1,g.recoil+.028);
 g.audio.tone(78,.19,'sawtooth',.12,32);g.muzzle.visible=true;g.flashLight.intensity=5;g.flashTimer=.045;g.flashJustTriggered=true;
 const forward=g.camera.getWorldDirection(new T.Vector3()),right=new T.Vector3(1,0,0).applyQuaternion(g.camera.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(g.camera.quaternion);
 const actors=new Map(),bossHits=[],banks=new Set();let connected=false;
 for(let i=0;i<8;i++){
  const radius=Math.sqrt(Math.random())*(g.aim?.048:.065),angle=Math.random()*Math.PI*2;
  const dir=forward.clone().addScaledVector(right,Math.cos(angle)*radius).addScaledVector(up,Math.sin(angle)*radius).normalize();
  g.ray.set(g.player,dir);g.raycaster.set(g.player,dir);
  const prop=capacitorShot(g.ray,g.raycaster,g.world.capacitors,g.world.colliders);let distance=Math.min(24,prop.distance),target=null,impact=null;
  // Every pellet chooses its nearest actual mesh, including shutters and foreign actors.
  for(const e of g.enemies){e.group.updateWorldMatrix(true,true);const model=(e.wardenRig||e.droneRig)?.model||e.group;const h=g.raycaster.intersectObject(model,true)[0];if(h&&h.distance<distance){distance=h.distance;target=e;impact=h;}}
  g.custodian.group.updateWorldMatrix(true,true);const bh=g.raycaster.intersectObject(g.custodian.model,true)[0];
  if(bh&&bh.distance<distance){distance=bh.distance;target=null;impact=bh;}
  const scale=falloff(distance),end=g.player.clone().addScaledVector(dir,distance);
  if(target&&scale>0){const optic=/^(Optic|RecessedOptic|OpticalPupil)$/.test(impact.object.name);const damage=(optic?21:target.type==='warden'&&!(target.armorOpen>0)?7:14)*scale;const entry=actors.get(target)||{damage:0,optic:false};entry.damage+=damage;entry.optic ||= optic;actors.set(target,entry);connected=true;}
  else if(impact&&scale>0)bossHits.push({impact,scale});
  else if(prop.bank&&prop.distance<=24)banks.add(prop.bank);
  g.tracer(g.muzzle.getWorldPosition(new T.Vector3()),end,0xffd29a,.055);
 }
 // Resolve after tracing so killed/removed actors cannot uncover later pellets.
 for(const [e,v] of actors){e.health-=v.damage;e.lastHit=g.runTime;e.hitFlash=.08;e.red.emissive.setHex(0xffffff);g.audio.hit(v.optic);g.event('hit',v.optic?'OPTIC':'',{damage:v.damage,headshot:v.optic});if(e.health<=0)g.killEnemy(e,v.optic);}
 for(const {impact,scale} of bossHits){const volley={scale,hit:false};hitCustodian(g,impact,volley);connected ||= volley.hit;}
 for(const bank of banks)activateCapacitor(g,bank);
 if(connected)g.shotsHit++;
 g.event('shot','',{ammo:g.ammo});
}
export function buildBreacher(g){
 const root=new T.Group();g.weapon.add(root);g.breacherRoot=root;
 // A separately owned fallback always exists, including connected hands/sleeves.
 const fallback=new T.Group(),mat=new T.MeshStandardMaterial({color:0x39474e,metalness:.7,roughness:.4});root.add(fallback);
 for(const [name,p,s] of [['Receiver',[0,0,-.4],[.17,.19,.38]],['Barrel',[0,.035,-.84],[.07,.07,.6]],['Pump',[0,-.075,-.72],[.14,.12,.22]],['Grip',[0,-.15,-.25],[.09,.25,.1]],['SupportHand',[-.06,-.13,-.72],[.11,.09,.16]],['SupportSleeve',[-.14,-.24,-.36],[.12,.14,.65]],['GripHand',[.03,-.15,-.25],[.12,.12,.12]],['GripSleeve',[.17,-.27,0],[.12,.14,.55]]]){const m=new T.Mesh(new T.BoxGeometry(...s),mat);m.name=name;m.position.set(...p);fallback.add(m);}
 g.breacherModel=fallback;
 new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/pump-breacher.glb`,asset=>{
  if(g.disposed){disposeAsset(asset.scene);return;}
  if(!['Pump','Receiver','MuzzleAnchor','Shell','SupportHand'].every(n=>asset.scene.getObjectByName(n))){disposeAsset(asset.scene);return;}
  root.remove(fallback);disposeAsset(fallback);root.add(asset.scene);g.breacherModel=asset.scene;
 },undefined,()=>{});
}
export function poseBreacher(g,{ads,bob}){
 const active=g.activeWeapon==='breacher';g.breacherRoot.visible=active;if(!active)return;
 const model=g.breacherModel,cycle=g.options.reducedMotion?0:Math.sin(Math.min(1,(.88-g.fireTimer)/.65)*Math.PI)*.13;
 const progress=g.reloading?1-g.reloadTimer/.55:0,insert=Math.sin(progress*Math.PI);
 g.weapon.position.set(.3*(1-ads),-.28+ads*.13-Math.abs(bob),-.28+g.kick*.07*(g.options.reducedMotion?0:1));
 g.weapon.rotation.set(0,0,0);
 for(const name of ['Pump','SupportHand']){const o=model.getObjectByName(name);if(o){o.userData.home??=o.position.clone();o.position.copy(o.userData.home);o.position.z+=cycle;if(name==='SupportHand'){o.position.y-=insert*.12;o.position.z+=insert*.35;}}}
 // Bridge each moving wrist to its fixed off-screen elbow; hands never scale.
 for(const [side,elbow,length] of [['Support',new T.Vector3(-.24,-.34,-.03),.62],['Grip',new T.Vector3(.25,-.36,.25),.5]]){
  const sleeve=model.getObjectByName(side+'Sleeve'),hand=model.getObjectByName(side+'Hand');if(!sleeve||!hand)continue;
  const wrist=hand.position.clone(),direction=wrist.clone().sub(elbow);sleeve.position.copy(elbow).add(wrist).multiplyScalar(.5);sleeve.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction.clone().normalize());sleeve.scale.set(1,1,direction.length()/length);
 }
 const shell=model.getObjectByName('Shell');if(shell){shell.visible=g.reloading;shell.position.y=-.16-insert*.08;shell.position.z=-.35+insert*.12;}
 for(let i=0;i<6;i++){const rib=model.getObjectByName('PumpRib'+i);if(rib){rib.userData.home??=rib.position.clone();rib.position.copy(rib.userData.home);rib.position.z+=cycle;}}
 const anchor=model.getObjectByName('MuzzleAnchor');if(anchor){model.updateWorldMatrix(true,true);g.muzzle.position.copy(g.weapon.worldToLocal(anchor.getWorldPosition(new T.Vector3())));}else g.muzzle.position.set(0,.035,-1.14);
}
