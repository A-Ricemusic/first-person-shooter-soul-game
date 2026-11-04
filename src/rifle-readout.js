// Only resolved rifle impacts feed this readout. It never samples aim targets,
// actors behind cover, or future exposure windows.
export function recordRifleImpact(g,kind,label){
 if(g.touchMode)g.rifleImpact={kind,label,time:g.runTime};
}
export function rifleReadout(g){
 const hit=g.rifleImpact,age=hit?g.runTime-hit.time:Infinity;
 return g.touchMode&&g.phase==='playing'&&g.activeWeapon==='rifle'&&!g.reloading&&age>=0&&age<.8?hit:null;
}
