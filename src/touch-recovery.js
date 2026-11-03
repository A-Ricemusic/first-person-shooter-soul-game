// Holding USE is an explicit request to recover. Once the same grounded reach
// check accepts a receiver, brake until that contact is released. Retain the
// brake after completion so a held movement thumb cannot launch an unseen step.
// Dash, vault and airborne motion keep their existing physical movement.
export function touchRecoveryBrake(g,nearby){
 if(!g.touchMode||!g.touchUse||g.phase!=='playing'||!g.grounded||g.vault||g.dashTime>0){
  g.touchRecoveryBraked=false;return false;
 }
 if(nearby)g.touchRecoveryBraked=true;
 return !!g.touchRecoveryBraked;
}
