// A lower hip carry reveals more of the phone scene. Blend to the original
// aimed pose exactly; this never changes the camera, projectile ray or hand rig.
export const PHONE_HIP_LOWERING=.08;
export function phoneHipLowering(touchMode,ads){
 return touchMode?PHONE_HIP_LOWERING*(1-Math.max(0,Math.min(1,ads))):0;
}
