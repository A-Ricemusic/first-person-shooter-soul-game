import * as THREE from 'three';
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const wrist=new THREE.Vector3(),elbow=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
/** Deterministic visual pose only. Reload mechanics and camera are game-owned. */
export function poseHandling(g,{ads,progress,bob}){
 const reach=smooth(.03,.24,progress)*(1-smooth(.78,1,progress));
 const pull=smooth(.26,.44,progress)*(1-smooth(.59,.77,progress));
 if(g.supportHand){g.supportHand.position.set(-.033*reach,(-.037-.155*pull)*reach,(.175+.045*pull)*reach);g.supportHand.rotation.set(0,0,0)}
 if(g.reloadCell&&g.cellHome){g.reloadCell.position.copy(g.cellHome);g.reloadCell.position.y-=.31*pull;g.reloadCell.position.z-=.09*pull}
 const handling=Math.sin(progress*Math.PI);
 g.weapon.position.set(.3*(1-ads),-.27+ads*.115-Math.abs(bob)+handling*.15,-.35+g.kick*.065);
 g.weapon.rotation.set(g.kick*.035-handling*.12,handling*.08,-handling*.16-bob*.8);
 // Sleeves bridge a fixed elbow to each wrist. Hand geometry never scales.
 for(const [side,x,y,z] of [['Support',-.27,-.34,-.06],['Grip',.23,-.36,.10]]){
  const sleeve=g.handsAsset?.getObjectByName(side+'Sleeve'),anchor=g.handsAsset?.getObjectByName(side+'Wrist');
  if(!sleeve||!anchor)continue;
  g.handsAsset.updateWorldMatrix(true,true);anchor.getWorldPosition(wrist);g.handsAsset.worldToLocal(wrist);elbow.set(x,y,z);direction.copy(wrist).sub(elbow);
  sleeve.position.copy(elbow);sleeve.quaternion.setFromUnitVectors(up,direction.clone().normalize());sleeve.scale.set(1,direction.length(),1);
 }
}
export function disposeAsset(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});
 geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());
}
