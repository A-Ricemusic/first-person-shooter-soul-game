import { BODY_HEIGHT } from './movement.js';
import { CORE_SITES, RECOVERY_RADIUS, extractionBounds, extractionCenter } from './mission.js';
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
  if(s.exit){const b=extractionBounds(s.exit),[x,y]=t.point(b.xMin,b.zMin);ctx.strokeStyle=s.cores===s.totalCores&&(!s.custodian||s.custodian.dead)?'#9cffbd':'#d8c59d';ctx.lineWidth=1.5;ctx.strokeRect(x,y,(b.xMax-b.xMin)*t.scale,(b.zMax-b.zMin)*t.scale);}
  for(const c of s.coreMarkers||[]){const [x,y]=t.point(c.x,c.z);const color=c.collected?'#91c5a0':'#78f1ff';circle(c.x,c.z,RECOVERY_RADIUS,color);ctx.fillStyle=color;ctx.fillRect(x-3,y-3,6,6);ctx.font=labels?'bold 12px sans-serif':'12px monospace';ctx.fillText(labels?`${c.id+1} ${CORE_SITES[c.id].name}${c.collected?' ✓':''}`:String(c.id+1),x+9,y-7);}
  if(s.custodian){const [x,y]=t.point(s.custodian.x,s.custodian.z);ctx.fillStyle=s.custodian.dead?'#536568':'#ffb76e';ctx.fillRect(x-4,y-4,8,8);if(labels)ctx.fillText(s.custodian.dead?'CUSTODIAN / SPENT':'CUSTODIAN / JAMMER',x+10,y-5);}
  if(labels&&s.exit){const center=extractionCenter(s.exit),[x,y]=t.point(center.x,center.z);ctx.fillStyle='#d8c59d';ctx.fillText('EXTRACTION',x+12,y+5);}
}
export function paintPlayer(ctx,p,t,size=10){const [x,y]=t.point(p.x,p.z);ctx.save();ctx.translate(x,y);ctx.rotate(-p.yaw);ctx.fillStyle='#fff';ctx.strokeStyle='#07151e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.6,size*.7);ctx.lineTo(0,size*.3);ctx.lineTo(-size*.6,size*.7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}

// North-up local planning, clamped to keep the player and facility edges useful.
export function planningTransform(bounds,width,height,focus,zoom=1){
 const base=mapTransform(bounds,width,height,40);if(zoom<=1)return base;
 const scale=base.scale*Math.min(2,zoom),clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const halfX=Math.min((bounds.maxX-bounds.minX)/2,(width-80)/(2*scale)),halfZ=Math.min((bounds.maxZ-bounds.minZ)/2,(height-80)/(2*scale));
 const cx=clamp(focus.x,bounds.minX+halfX,bounds.maxX-halfX),cz=clamp(focus.z,bounds.minZ+halfZ,bounds.maxZ-halfZ);
 return {scale,point:(x,z)=>[width/2+(x-cx)*scale,height/2+(z-cz)*scale],world:(x,y)=>[cx+(x-width/2)/scale,cz+(y-height/2)/scale]};
}
export function paintPlanningRoute(ctx,path,t){
 if(path.length<2)return;
 ctx.save();ctx.beginPath();path.forEach((p,i)=>{const a=t.point(p.x,p.z);i?ctx.lineTo(...a):ctx.moveTo(...a)});ctx.lineJoin=ctx.lineCap='round';ctx.strokeStyle='#061a20';ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#7fffe0';ctx.lineWidth=5;ctx.stroke();
 const last=path.at(-1);ctx.fillStyle='#e6fff6';ctx.beginPath();ctx.arc(...t.point(last.x,last.z),6,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function paintPlanningSites(ctx,s,t,font=24){
 ctx.save();ctx.font=`bold ${font}px sans-serif`;
 const label=(text,x,y,color)=>{const a=t.point(x,y);if(a[0]<24||a[0]>616||a[1]<24||a[1]>616)return;ctx.fillStyle=color;ctx.fillRect(a[0]-4,a[1]-4,8,8);const w=ctx.measureText(text).width,px=Math.max(28,Math.min(612-w,a[0]+12+w<=612?a[0]+12:a[0]-12-w)),py=Math.max(28+font,Math.min(610,a[1]-12));ctx.fillStyle='#081c26';ctx.fillRect(px-3,py-font,w+6,font+5);ctx.fillStyle=color;ctx.fillText(text,px,py)};
 for(const c of s.coreMarkers||[]){const a=t.point(c.x,c.z);ctx.strokeStyle=c.collected?'#91c5a0':'#78f1ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...a,RECOVERY_RADIUS*t.scale,0,Math.PI*2);ctx.stroke();label(CORE_SITES[c.id].person.split(' ')[0]+(c.collected?' ✓':''),c.x,c.z,ctx.strokeStyle)}
 if(s.custodian)label(s.custodian.dead?'JAMMER OFF':'JAMMER',s.custodian.x,s.custodian.z,s.custodian.dead?'#91c5a0':'#ffb76e');
 if(s.exit){const b=extractionBounds(s.exit),a=t.point(b.xMin,b.zMin);const ready=s.cores===s.totalCores&&s.custodian?.dead,color=ready?'#9cffbd':'#d8c59d';ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(...a,(b.xMax-b.xMin)*t.scale,(b.zMax-b.zMin)*t.scale);const c=extractionCenter(s.exit);label('UPLINK',c.x,c.z,color)}
 ctx.restore();
}

// Drops were left by defeated enemies; no live-enemy locations are exposed.
export function paintPlanningSupplies(ctx,s,t,font=24){
 ctx.save();ctx.font=`bold ${font}px sans-serif`;
 for(const p of s.supplies||[]){const [x,y]=t.point(p.x,p.z);if(x<24||x>616||y<24||y>616)continue;const selected=s.routeGoal===`supply-${p.id}`,size=selected?10:7;ctx.fillStyle=selected?'#fff4bb':'#7fffe0';ctx.strokeStyle='#071b23';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size,y);ctx.lineTo(x,y+size);ctx.lineTo(x-size,y);ctx.closePath();ctx.fill();ctx.stroke();if(selected){const label='SUPPLY',w=ctx.measureText(label).width,px=Math.max(28,Math.min(612-w,x+14)),py=Math.max(28+font,y-14);ctx.fillStyle='#071b23';ctx.fillRect(px-3,py-font,w+6,font+5);ctx.fillStyle='#fff4bb';ctx.fillText(label,px,py)}}ctx.restore();
}
