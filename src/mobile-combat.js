// Admission and warning duration only. Existing actions and hazards still resolve.
export const MOBILE_ATTACK_RECOVERY=.8;
export function mobileCadence(g){return !!g.touchMode&&['standard','story'].includes(g.activeDifficulty??g.options?.difficulty??'standard');}
export function attackCapacity(g){return mobileCadence(g)?1:g.activeDifficulty==='veteran'?3:2;}
export function attackRecoveryReady(g){return !mobileCadence(g)||!(g.mobileAttackRecovery>1e-8);}
export function advanceAttackRecovery(g,dt){g.mobileAttackRecovery=Math.max(0,(g.mobileAttackRecovery||0)-Math.max(0,dt));}
export function resolveMobileAttack(g){if(mobileCadence(g))g.mobileAttackRecovery=Math.max(g.mobileAttackRecovery||0,MOBILE_ATTACK_RECOVERY);}
// Sample the actual view only at admission. Turning cannot restart or shorten a charge.
export function warningDuration(g,base,inView){return mobileCadence(g)?Math.max(base,inView?.9:1.4):base;}
export function rangedChargeProgress(e){const duration=e.windupDuration||(e.type==='warden'?1.6:e.type==='stalker'?.42:.65);return Math.max(0,Math.min(1,1-Math.max(0,e.windup)/duration));}
