import * as T from 'three';
import {capacitorShot} from './capacitors.js';
import {touchTapBlocks,touchScenePoint} from './touch-tap-regions.js';

export const TOUCH_TAP_RANGE=36;
export const TOUCH_TAP_TOLERANCE=10; // CSS pixels, independent of device pixel ratio.
export const TOUCH_TAP_MAX_PROBES=12;
const raycaster=new T.Raycaster(),corner=new T.Vector3(),worldBounds=new T.Box3(),cameraOrigin=new T.Vector3();
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
function materialVisible(m){return m&&m.visible!==false&&(!m.transparent||m.opacity>0);}
function surface(model,cache){
 if(!model||!visible(model))return null;
 let meshes=cache.get(model);
 if(!meshes){
  // All probes are synchronous: one current transform/mesh snapshot per gesture.
  model.updateWorldMatrix(true,true);meshes=[];
  model.traverseVisible(o=>{if(o.isMesh)meshes.push(o)});cache.set(model,meshes);
 }
 return raycaster.intersectObjects(meshes,false).find(h=>materialVisible(Array.isArray(h.object.material)?h.object.material[h.face?.materialIndex||0]:h.object.material));
}

// Every probe resolves the first real surface. Geometry and shot hit volumes
// stay unchanged; tolerance never turns a bounding rectangle into a hit.
function query(g,ndc,cache,ignoreViewmodel=false){
 raycaster.setFromCamera(ndc,g.camera);
 if(!ignoreViewmodel&&surface(g.weapon,cache))return{selected:null,weapon:true};
 const cover=capacitorShot(raycaster.ray,raycaster,g.world.capacitors,g.world.colliders,TOUCH_TAP_RANGE);
 let distance=Math.min(TOUCH_TAP_RANGE,cover.distance),selected=null,actorSurface=false;
 for(const e of g.enemies){
  const hit=surface((e.wardenRig||e.droneRig)?.model||e.group,cache);
  if(hit&&hit.distance<distance-.001){distance=hit.distance;actorSurface=true;selected=e.health>0?{point:hit.point.clone(),key:`enemy-${e.id}`}:null;}
 }
 const c=g.custodian,hit=surface(c.model,cache);
 if(hit&&hit.distance<=distance+.001){
  selected=null;actorSurface=true;distance=hit.distance;
  const coil=hit.object.userData.coil;
  if(hit.distance<cover.distance-.001&&hit.distance<TOUCH_TAP_RANGE&&c.active&&!c.dead&&Number.isInteger(coil)&&c.coils[coil]?.hp>0)
   selected={point:hit.point.clone(),key:`coil-${coil}`};
 }
 return{selected,distance,actorSurface};
}
function candidates(g,view,x,y,maxDistance){
 const points=[],seen=new Set(),limit=TOUCH_TAP_TOLERANCE**2;cameraOrigin.setFromMatrixPosition(g.camera.matrixWorld);
 const add=(px,py)=>{const d=(px-x)**2+(py-y)**2;if(d<.0001||d>limit||px<view.left||py<view.top||px>view.right||py>view.bottom)return;const key=`${Math.round(px*4)},${Math.round(py*4)}`;if(seen.has(key))return;seen.add(key);points.push({x:px,y:py,d});};
 const model=m=>{
  if(!m||!visible(m))return;
  m.traverseVisible(o=>{
   if(!o.isMesh||!(Array.isArray(o.material)?o.material.some(materialVisible):materialVisible(o.material)))return;
   if(o.isInstancedMesh){o.computeBoundingBox();}else if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
   const box=o.isInstancedMesh?o.boundingBox:o.geometry.boundingBox;if(!box||box.isEmpty())return;
   // A conservative bound can reject distant work; it never awards selection.
   worldBounds.copy(box).applyMatrix4(o.matrixWorld);if(worldBounds.distanceToPoint(cameraOrigin)>maxDistance+.001)return;
   let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
   for(let i=0;i<8;i++){
    corner.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(o.matrixWorld).applyMatrix4(g.camera.matrixWorldInverse);
    if(corner.z>=-g.camera.near)return; // Conservative near-plane exclusion.
    corner.applyMatrix4(g.camera.projectionMatrix);
    const px=view.left+(corner.x+1)*view.width/2,py=view.top+(1-corner.y)*view.height/2;
    left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
   }
   const dx=Math.max(left-x,0,x-right),dy=Math.max(top-y,0,y-bottom);if(dx*dx+dy*dy>limit)return;
   const padx=Math.min(.6,(right-left)/2),pady=Math.min(.6,(bottom-top)/2),px=T.MathUtils.clamp(x,left+padx,right-padx),py=T.MathUtils.clamp(y,top+pady,bottom-pady),cx=(left+right)/2,cy=(top+bottom)/2;
   add(px,py);const n=Math.hypot(cx-px,cy-py);if(n>0)add(px+(cx-px)/n*Math.min(1.5,n),py+(cy-py)/n*Math.min(1.5,n));add(cx,cy);
  });
 };
 for(const e of g.enemies)if(e.health>0)model((e.wardenRig||e.droneRig)?.model||e.group);
 if(g.custodian.active&&!g.custodian.dead)model(g.custodian.model);
 return points.sort((a,b)=>a.d-b.d);
}
// An exact physical selection wins first. Only a miss tries a bounded number
// of nearby physical pixels. No prediction, target memory or ongoing tracking.
export function touchTapTarget(g,ndc){
 if(!g.touchMode||g.options.touchTapAim===false||g.phase!=='playing'||g.vault)return null;
 g.syncCamera();const cache=new Map(),center=query(g,ndc,cache);
 if(center.selected||center.weapon||center.actorSurface)return center.selected;
 const view=g.canvas?.getBoundingClientRect();if(!view?.width||!view?.height)return null;
 const x=view.left+(ndc.x+1)*view.width/2,y=view.top+(1-ndc.y)*view.height/2,blocks=touchTapBlocks();
 if(!touchScenePoint(x,y,blocks))return null;
 let probes=0;
 for(const p of candidates(g,view,x,y,center.distance)){
  if(!touchScenePoint(p.x,p.y,blocks))continue;
  if(probes++>=TOUCH_TAP_MAX_PROBES)break;
  const hit=query(g,{x:(p.x-view.left)*2/view.width-1,y:1-(p.y-view.top)*2/view.height},cache);
  if(hit.selected&&hit.distance<=center.distance+.001)return hit.selected;
 }
 return null;
}

// A fresh physical centre/scene ray, without the tap-tolerance search.
export function touchDirectTarget(g,ndc={x:0,y:0},{ignoreViewmodel=false}={}){
 if(!g.touchMode||g.phase!=='playing'||g.vault)return null;
 g.syncCamera();return query(g,ndc,new Map(),ignoreViewmodel).selected;
}
