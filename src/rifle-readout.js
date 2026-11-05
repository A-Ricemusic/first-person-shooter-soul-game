// Only resolved rifle impacts feed this readout. It never samples aim targets,
// actors behind cover, or future exposure windows.
export function recordRifleImpact(g,kind,label,identity=null){
 if(g.touchMode){
  g.rifleImpact={kind,label,time:g.runTime};
  // A completion is an event acknowledgement, separate from the latest shot.
  if(kind==='kill'){
   g.rifleConfirmation={label,time:g.runTime};
   const result=identity?`${identity} DOWN`:label;
   g.rifleResult={kind:'result',label:`LAST · ${result}`,time:g.runTime};
   g.touchFieldNotes?.record(`${result} · RIFLE`,g.runTime,true);
   if(g.mouseDown&&g.activeWeapon==='rifle')g.touchFireLatch=label;
  }
 }
}
export function rifleReadout(g){
 const hit=g.rifleImpact,age=hit?g.runTime-hit.time:Infinity;
 if(!g.touchMode||g.phase!=='playing'||g.activeWeapon!=='rifle'||g.reloading)return null;
 if(age>=0&&age<.8)return hit;
 const result=g.rifleResult,resultAge=result?g.runTime-result.time:Infinity;
 return resultAge>=0&&resultAge<2.4?result:null;
}

export function rifleConfirmation(g){
 const value=g.rifleConfirmation,age=value?g.runTime-value.time:Infinity;
 return g.touchMode&&g.phase==='playing'&&g.activeWeapon==='rifle'&&age>=0&&age<.65?value:null;
}
