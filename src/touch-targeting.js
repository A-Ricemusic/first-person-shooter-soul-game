import * as T from 'three';
import {capacitorShot} from './capacitors.js';

export const TOUCH_TAP_RANGE=36;
const raycaster=new T.Raycaster(),meshes=[];
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
function surface(model){
 if(!model||!visible(model))return null;
 model.updateWorldMatrix(true,true);meshes.length=0;
 model.traverseVisible(o=>{if(o.isMesh)meshes.push(o)});
 const hit=raycaster.intersectObjects(meshes,false).find(h=>{
  const m=Array.isArray(h.object.material)?h.object.material[h.face?.materialIndex||0]:h.object.material;
  return m&&m.visible!==false&&(!m.transparent||m.opacity>0);
 });meshes.length=0;
 return hit;
}
// One query at the tapped pixel. The first physical surface wins, including
// armored/dead machine parts as occluders. No enlarged targets, scan cone,
// prediction, target memory, tracking, or shot is generated here.
export function touchTapTarget(g,ndc){
 if(!g.touchMode||g.options.touchTapAim===false||g.phase!=='playing'||g.vault)return null;
 g.syncCamera();raycaster.setFromCamera(ndc,g.camera);
 if(surface(g.weapon))return null;
 const cover=capacitorShot(raycaster.ray,raycaster,g.world.capacitors,g.world.colliders,TOUCH_TAP_RANGE);
 let distance=Math.min(TOUCH_TAP_RANGE,cover.distance),selected=null;
 for(const e of g.enemies){
  const hit=surface((e.wardenRig||e.droneRig)?.model||e.group);
  if(hit&&hit.distance<distance-.001){distance=hit.distance;selected=e.health>0?{point:hit.point.clone(),key:`enemy-${e.id}`}:null;}
 }
 const c=g.custodian,hit=surface(c.model);
 if(hit&&hit.distance<=distance+.001){
  selected=null;
  const coil=hit.object.userData.coil;
  if(hit.distance<cover.distance-.001&&hit.distance<TOUCH_TAP_RANGE&&c.active&&!c.dead&&Number.isInteger(coil)&&c.coils[coil]?.hp>0)
   selected={point:hit.point.clone(),key:`coil-${coil}`};
 }
 return selected;
}
