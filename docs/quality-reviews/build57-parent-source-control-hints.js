import {feetY,profileOf} from './movement.js';

// Teach a lower posture near actual waist-high architecture. This only describes
// a control; it neither promises protection nor consults hidden enemy positions.
export function nearLowCover(body,world){
 if(body.phase!=='playing'||body.crouchLearned||!body.grounded||body.vault||body.dashTime>0||profileOf(body).eyeHeight<1.7-1e-6)return false;
 const p=body.player,feet=feetY(p,profileOf(body)),fx=-Math.sin(body.yaw),fz=-Math.cos(body.yaw);
 return world.colliders.some(box=>{
  const height=box.max.y-feet;
  if(height<1.15||height>1.5||box.min.y>feet+.25)return false;
  const dx=Math.max(box.min.x,Math.min(box.max.x,p.x))-p.x,dz=Math.max(box.min.z,Math.min(box.max.z,p.z))-p.z,distance=Math.hypot(dx,dz);
  return distance>.01&&distance<=1.25&&(dx*fx+dz*fz)/distance>.2;
 });
}
