import {Ray,Vector3} from 'three';
import L from './build69-custodian-layout.json';

// Static standing firing approaches on either broad face. These are navigation
// destinations, not live targets: shutters and other actors still block shots.
export function inCustodianApproach(p,margin=0){
 const x=p.x-L.origin[0],z=p.z-L.origin[2];
 return Math.abs(x)<=1+margin&&Math.abs(z)>=6-margin&&Math.abs(z)<=7+margin;
}
const coils=L.parts.filter(p=>/^Coil\d$/.test(p.name)).map(p=>new Vector3(...p.p).add(new Vector3(...L.origin)));
export function clearCustodianApproach(world,p){
 if(!inCustodianApproach(p))return false;
 const from=new Vector3(p.x,1.7,p.z),hit=new Vector3(),ray=new Ray();
 return coils.every(target=>{
  const length=from.distanceTo(target);ray.set(from,target.clone().sub(from).normalize());
  return !world.colliders.some(box=>!box.custodian&&(box.containsPoint(from)||(ray.intersectBox(box,hit)&&hit.distanceTo(from)<=length)));
 });
}
