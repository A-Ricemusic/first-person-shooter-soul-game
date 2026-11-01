import { BODY_HEIGHT } from './movement.js';
import { CORE_SITES, RECOVERY_RADIUS, EXTRACTION_RADIUS } from './mission.js';
// Ground-level standing clearance, identical vertical overlap to player collision.
// Keep individual bounds: merging room envelopes would erase real doorways.
export function facilityFootprints(colliders) {
  return Object.freeze(colliders.filter(b=>b.max.y>1e-6&&b.min.y<BODY_HEIGHT-1e-6).map(b=>Object.freeze({
    x:b.min.x,z:b.min.z,w:b.max.x-b.min.x,d:b.max.z-b.min.z,
    kind:b.max.y<BODY_HEIGHT?'cover':'wall'
  })));
}
export function mapTransform(bounds,width,height,padding=30) {
  const scale=Math.min((width-2*padding)/(bounds.maxX-bounds.minX),(height-2*padding)/(bounds.maxZ-bounds.minZ));
  const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
  return {scale,point:(x,z)=>[width/2+(x-cx)*scale,height/2+(z-cz)*scale],world:(x,y)=>[cx+(x-width/2)/scale,cz+(y-height/2)/scale]};
}
export function paintArchitecture(ctx,layout,t){
  for(const f of layout||[]){const [x,y]=t.point(f.x,f.z);ctx.fillStyle=f.kind==='wall'?'#a7bec7':'#4c6c78';ctx.fillRect(x,y,f.w*t.scale,f.d*t.scale);}
}
export function paintSites(ctx,s,t,labels=false){
  const circle=(x,z,r,color)=>{ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(...t.point(x,z),r*t.scale,0,Math.PI*2);ctx.stroke();};
  if(s.exit)circle(s.exit.x,s.exit.z,EXTRACTION_RADIUS,s.cores===s.totalCores?'#9cffbd':'#d8c59d');
  for(const c of s.coreMarkers||[]){const [x,y]=t.point(c.x,c.z);const color=c.collected?'#91c5a0':'#78f1ff';circle(c.x,c.z,RECOVERY_RADIUS,color);ctx.fillStyle=color;ctx.fillRect(x-3,y-3,6,6);ctx.font=labels?'bold 12px sans-serif':'12px monospace';ctx.fillText(labels?`${c.id+1} ${CORE_SITES[c.id].name}${c.collected?' ✓':''}`:String(c.id+1),x+9,y-7);}
  if(labels&&s.exit){const [x,y]=t.point(s.exit.x,s.exit.z);ctx.fillStyle='#d8c59d';ctx.fillText('EXTRACTION',x+12,y+5);}
}
export function paintPlayer(ctx,p,t){const [x,y]=t.point(p.x,p.z);ctx.save();ctx.translate(x,y);ctx.rotate(-p.yaw);ctx.fillStyle='#fff';ctx.strokeStyle='#07151e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(6,7);ctx.lineTo(0,3);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
