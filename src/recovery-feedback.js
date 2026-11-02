// Nearby feedback never changes the planned route or the recovery rules.
export const LOCAL_RECEIVER_RANGE=8;
export function nearbyReceiver(markers){
 return markers.filter(c=>!c.collected&&c.distance<LOCAL_RECEIVER_RANGE).sort((a,b)=>a.distance-b.distance)[0]||null;
}

export function recoveryApproachText(s){
 if(!s.localRecovery)return 'STEP INSIDE THE FLOOR RING';
 if(!s.player.grounded&&s.localRecovery.remaining===0)return 'LAND BEFORE RECOVERY';
 if(s.localRecovery.remaining===0)return 'STEP INSIDE THE FLOOR RING';
 const gap=Math.max(.1,Math.ceil(s.localRecovery.remaining*10)/10);
 return `${gap.toFixed(1)} M OUTSIDE REACH · STEP INSIDE THE FLOOR RING`;
}
