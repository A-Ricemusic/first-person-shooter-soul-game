// Only resolved rifle impacts feed this readout. It never samples aim targets,
// actors behind cover, or future exposure windows.
export function recordRifleImpact(g,kind,label){
 if(g.touchMode){
  g.rifleImpact={kind,label,time:g.runTime};
  // A completion is an event acknowledgement, separate from the latest shot.
  if(kind==='kill'){g.rifleConfirmation={label,time:g.runTime};if(g.mouseDown&&g.activeWeapon==='rifle')g.touchFireLatch=label;}
 }
}
export function rifleReadout(g){
 const hit=g.rifleImpact,age=hit?g.runTime-hit.time:Infinity;
 return g.touchMode&&g.phase==='playing'&&g.activeWeapon==='rifle'&&!g.reloading&&age>=0&&age<.8?hit:null;
}

export function rifleConfirmation(g){
 const value=g.rifleConfirmation,age=value?g.runTime-value.time:Infinity;
 return g.touchMode&&g.phase==='playing'&&g.activeWeapon==='rifle'&&age>=0&&age<.65?value:null;
}
