// A lower hip carry reveals more of the phone scene. Blend to the original
// aimed pose exactly; this never changes the camera, projectile ray or hand rig.
export const PHONE_HIP_LOWERING=.08;
export function phoneHipLowering(touchMode,ads){
 return touchMode?PHONE_HIP_LOWERING*(1-Math.max(0,Math.min(1,ads))):0;
}

// Uniform presentation scale for the complete authored rig, not its anatomy.
// Blend to the original lens-aligned size at full ADS. World projection and
// hit rays are independent; desktop keeps its original viewmodel everywhere.
export function phoneHipScale(touchMode,aspect,ads){
 if(!touchMode)return 1;
 const narrow=Number.isFinite(aspect)?Math.max(0,Math.min(1,(1-aspect)/.5)):0;
 const hip=.86-.08*narrow,blend=Math.max(0,Math.min(1,ads));
 return hip+(1-hip)*blend;
}
