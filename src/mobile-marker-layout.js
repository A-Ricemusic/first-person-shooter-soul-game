// An annotation may move; its scene anchor never does. No hit testing or tracking.
const overlaps=(a,b,pad=6)=>a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
export function mobileMarkerCaption(anchor,size,viewport,occupied=[]){
 const {width:w,height:h}=size,pad=8,gap=32;
 const candidates=[[-gap-w,-h/2],[gap,-h/2],[-w/2,-gap-h],[-w/2,gap],[-gap-w,-gap-h],[gap,-gap-h],[-gap-w,gap],[gap,gap]];
 for(const [dx,dy] of candidates){
  const r={left:anchor.x+dx,right:anchor.x+dx+w,top:anchor.y+dy,bottom:anchor.y+dy+h};
  if(r.left<pad||r.right>viewport.width-pad||r.top<pad||r.bottom>viewport.height-pad||occupied.some(p=>overlaps(r,p)))continue;
  return {dx,dy,rect:r};
 }
 return null;
}
export function mobileMarkerAnchorVisible(anchor,viewport,occupied=[]){
 const r={left:anchor.x-10,right:anchor.x+10,top:anchor.y-10,bottom:anchor.y+10};
 return r.left>=8&&r.right<=viewport.width-8&&r.top>=8&&r.bottom<=viewport.height-8&&!occupied.some(p=>overlaps(r,p,2));
}

// Empty corner marks surround the existing optic projection. Opaque phone UI
// can hide the cue, but never displace it onto a different scene surface.
export function mobileOpticMarker(marker,viewport,occupied=[]){
 const x=(marker.x+1)*viewport.width/2,y=(1-marker.y)*viewport.height/2,size=24;
 const rect={left:x-size/2,right:x+size/2,top:y-size/2,bottom:y+size/2};
 const visible=marker.front&&marker.onscreen&&rect.left>=8&&rect.right<=viewport.width-8&&rect.top>=8&&rect.bottom<=viewport.height-8&&!occupied.some(p=>overlaps(rect,p,2));
 return {x,y,rect,visible};
}

// The same eligible optic points compete only for screen space. Charging and
// recent attackers win crowded clusters; ties use distance then stable identity.
// No target metadata, hit testing, tracking or camera state is changed.
export function mobileOpticLayout(markers,viewport,occupied=[]){
 const layout=new Map(),reserved=[...occupied];
 const ordered=[...markers].sort((a,b)=>Number(!!b.charging)-Number(!!a.charging)||Number(!!b.recent)-Number(!!a.recent)||(a.distance??Infinity)-(b.distance??Infinity)||String(a.id).localeCompare(String(b.id)));
 for(const m of ordered){
  const cue=mobileOpticMarker(m,viewport,reserved);
  if(m.type==='custodian')cue.visible=false;
  layout.set(m.id,cue);if(cue.visible)reserved.push(cue.rect);
 }
 return layout;
}
