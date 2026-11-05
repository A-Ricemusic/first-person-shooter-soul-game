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
