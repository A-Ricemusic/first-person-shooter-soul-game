// Keep a usable horizontal view on narrow touch screens. The square reference
// preserves existing landscape/desktop lenses; the vertical cap bounds edge
// distortion on unusually tall viewports. This changes projection, not aim.
export function worldVerticalFov(referenceFov,aspect,touchMode){
 if(!touchMode||!Number.isFinite(aspect)||aspect<=0||aspect>=1)return referenceFov;
 return Math.min(120,2*Math.atan(Math.tan(referenceFov*Math.PI/360)/aspect)*180/Math.PI);
}
