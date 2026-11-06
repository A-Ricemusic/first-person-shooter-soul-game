// Keep the tap-intent radius, but do not apply those first six pixels as a
// sudden camera jump. Recover their distance gradually; swipes of 30px or
// more keep the original endpoint. This is displacement mapping, not a timer.
export function sceneDragOffset(x,y) {
  const distance=Math.hypot(x,y);
  if (distance<=6) return {x:0,y:0};
  const t=Math.min(1,(distance-6)/24);
  const recovered=t*t*(3-2*t);
  const scale=(distance-6+6*recovered)/distance;
  return {x:x*scale,y:y*scale};
}
