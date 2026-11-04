// Turn only to the broad direction already shown by the public warning.
// No actor identity, exact bearing, prediction, aim pitch or shot is selected.
export function requestThreatTurn(g,heading,sampledAt){
 if(!g.touchMode||g.phase!=='playing'||!Number.isFinite(heading)||!Number.isFinite(sampledAt)||g.runTime-sampledAt<0||g.runTime-sampledAt>.35)return false;
 g.touchRouteManualLook=!!g.touchUse;
 if(g.options.reducedMotion){g.yaw=heading;g.touchThreatTurn=null;g.syncCamera();}
 else g.touchThreatTurn={heading};
 g.emit();return true;
}
export function updateThreatTurn(g,dt){
 const turn=g.touchThreatTurn;if(!turn)return;
 if(!g.touchMode||g.phase!=='playing'){g.touchThreatTurn=null;return;}
 const delta=Math.atan2(Math.sin(turn.heading-g.yaw),Math.cos(turn.heading-g.yaw));
 const step=Math.max(0,dt)*12;
 if(Math.abs(delta)<=step){g.yaw+=delta;g.touchThreatTurn=null;}
 else g.yaw+=Math.sign(delta)*step;
}
