import {profileOf,feetY,EYE_HEIGHT} from './movement.js';
import {startVault} from './traversal.js';

export const TOUCH_VAULT_HOLD=.28;
// Sustained forward pressure, not proximity, requests the existing vault.
// A cancelled/released contact must earn a fresh hold after it resumes.
export function updateTouchVault(g,direction,dt,intended,progress){
 const stick=g.touchMove,mag=Math.hypot(stick.x,stick.z);
 const eligible=g.touchMode&&g.options.touchAutoVault!==false&&g.phase==='playing'&&
  g.grounded&&!g.vault&&!(g.dashTime>0)&&!g.crouchRequested&&
  profileOf(g).eyeHeight>=EYE_HEIGHT-1e-6&&Math.abs(feetY(g.player,profileOf(g)))<1e-6&&
  !g.aim&&!g.mouseDown&&!g.touchUse&&!g.channelCore&&!g.reloading&&
  mag>=.75&&-stick.z/mag>=.85;
 if(!eligible){g.touchVaultContact=null;return false;}
 const len=Math.hypot(direction.x,direction.z);if(len<.1){g.touchVaultContact=null;return false;}
 const x=direction.x/len,z=direction.z/len;
 let contact=g.touchVaultContact;
 if(!contact||contact.x*x+contact.z*z<Math.cos(Math.PI/15))contact=g.touchVaultContact={seconds:0,nextProbe:0,sampleSeconds:0,intended:0,progress:0,x,z};
 // The loop also emits fractional remainder substeps. Judge movement over
 // a short window so a fraction of a millimetre cannot reset a blocked hold.
 contact.sampleSeconds+=Math.max(0,Math.min(dt,.05));
 contact.intended+=intended;contact.progress+=progress;
 if(contact.sampleSeconds<1/30)return false;
 contact.seconds=contact.intended>.001&&contact.progress<contact.intended*.18?contact.seconds+contact.sampleSeconds:0;
 contact.sampleSeconds=contact.intended=contact.progress=0;
 if(contact.seconds<TOUCH_VAULT_HOLD||g.runTime<contact.nextProbe)return false;
 contact.nextProbe=g.runTime+.12;
 if(!startVault(g,g.traversalWorld(),{x,z}))return false;
 g.autoVaults=(g.autoVaults||0)+1;g.touchVaultContact=null;return true;
}
