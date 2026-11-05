// The result of one scene-tap request, never a target lock or hit prediction.
export function recordTouchAim(g,accepted){
 if(g.touchMode){g.rifleResult=null;g.rifleConfirmation=null;g.rifleImpact=null;g.touchAimNotice={kind:accepted?'aim-set':'aim-unchanged',label:accepted?'AIM SET':'AIM UNCHANGED',time:g.runTime};}
}
export function touchAimReadout(g){
 const notice=g.touchAimNotice,age=notice?g.runTime-notice.time:Infinity;
 return g.touchMode&&g.phase==='playing'&&!g.reloading&&age>=0&&age<1?notice:null;
}
