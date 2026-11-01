// Bottom-centre anchored labels. Try nearby rows and then adjacent columns;
// clamp candidates before collision testing so the bottom row cannot pile up.
export function placeMarker(x,y,width,height,viewport,occupied){
 const pad=8,left=width/2+pad,right=viewport.width-width/2-pad;
 const top=120+height,bottom=viewport.height-150;
 let best,score=Infinity;
 for(const dx of [0,...Array.from({length:12},(_,i)=>[-i-1,i+1]).flat()])for(const dy of [0,-1,1,-2,2,-3,3,-4,4,-5,5,-6,6]){
  const cx=Math.max(left,Math.min(right,x+dx*(width+pad))),cy=Math.max(top,Math.min(bottom,y+dy*(height+pad)));
  const r={left:cx-width/2,right:cx+width/2,top:cy-height,bottom:cy};
  if(occupied.some(p=>r.left<p.right+pad&&r.right>p.left-pad&&r.top<p.bottom+pad&&r.bottom>p.top-pad))continue;
  const cost=Math.abs(cx-x)*1.5+Math.abs(cy-y);if(cost<score){best={x:cx,y:cy,rect:r};score=cost;}
 }
 return best||{x:Math.max(left,Math.min(right,x)),y:Math.max(top,Math.min(bottom,y)),rect:null};
}
