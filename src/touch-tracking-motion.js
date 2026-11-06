export const TOUCH_TRACK_GAIN=1,TOUCH_TRACK_LEASH=8*Math.PI/180,TOUCH_TRACK_SPEED=Math.PI/2;
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
// Enemy movement is observed one simulation step later. Tiny remainder steps
// must carry their rate-limited correction, rather than permanently losing it.
// This debt contains target motion only; it never measures a manual aim offset.
export function trackedMotionStep(track,dyaw,dpitch,dt){
 const yaw=wrap((track.pendingYaw||0)+dyaw),pitch=(track.pendingPitch||0)+dpitch,length=Math.hypot(yaw,pitch);
 if(length>TOUCH_TRACK_LEASH)return null;
 const gain=length?Math.min(TOUCH_TRACK_GAIN,TOUCH_TRACK_SPEED*Math.max(0,dt)/length):0;
 const step={yaw:yaw*gain,pitch:pitch*gain};
 track.pendingYaw=yaw-step.yaw;track.pendingPitch=pitch-step.pitch;
 return step;
}
