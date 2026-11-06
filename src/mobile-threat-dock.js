const overlaps=(a,b,pad=0)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;

// Only the public, LOS-gated marker projection is an input. Never reveal a
// hidden actor, move a scene anchor, select a target or change aiming.
export function threatTargetRects(markers,{width,height}){
 return markers.filter(m=>!m.occluded&&!m.suppressed&&m.front&&['enemy','component'].includes(m.kind)&&Number.isFinite(m.x)&&Number.isFinite(m.y)&&Math.abs(m.x)<1&&Math.abs(m.y)<1).map(m=>{
  const x=(m.x+1)*width/2,y=(1-m.y)*height/2,r=m.kind==='component'?28:24;
  return {left:x-r,right:x+r,top:y-r,bottom:y+r};
 });
}

// Two familiar thumb-side docks, not a freely roaming control. Keep the
// current side until it actually covers a target and the other side is clear.
// If neither fits, retain the warning rather than hiding or clipping it.
export function chooseThreatDock(candidates,targets,occupied,viewport,previous='right'){
 const fits=c=>c.rect.left>=8&&c.rect.right<=viewport.width-8&&c.rect.top>=8&&c.rect.bottom<=viewport.height-8&&!occupied.some(r=>overlaps(c.rect,r,4));
 const clear=c=>!targets.some(r=>overlaps(c.rect,r,4));
 const current=candidates.find(c=>c.id===previous)||candidates[0];
 if(fits(current)&&clear(current))return current.id;
 return candidates.find(c=>fits(c)&&clear(c))?.id||current.id;
}
