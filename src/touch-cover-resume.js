import {touchDirectTarget} from './touch-targeting.js';
import {rememberCoverStop,coverStop,forgetCoverStop} from './touch-cover-state.js';

// A held trigger may recover from cover when a live surface becomes clear.
// Recheck at most 12.5 times per game-second while stopped and held. An exact
// current physical ray must reach a live target; no tolerance or target memory.
export function resumeTouchFire(g) {
  if (!g.touchMode || g.options.touchAimAssist===false || g.phase!=='playing' ||
      g.activeWeapon!=='rifle' || !g.mouseDown || g.touchFireLatch!=='COVER' ||
      g.reloading || g.vault || g.ammo<=0) {
    forgetCoverStop(g); return false;
  }
  const prior=coverStop(g);
  if (!prior || prior.impact!==g.rifleImpact || g.runTime<prior.time) {
    rememberCoverStop(g); return false;
  }
  if (g.fireTimer>0 || g.runTime-prior.time<.08) return false;
  rememberCoverStop(g);
  if (!touchDirectTarget(g,undefined,{ignoreViewmodel:true})) return false;
  g.touchFireLatch=null; g.touchCoverGuard=false; forgetCoverStop(g);
  return true;
}
