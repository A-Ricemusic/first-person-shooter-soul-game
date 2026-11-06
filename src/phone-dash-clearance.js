import {feetY,profileOf,PLAYER_RADIUS} from './movement.js';

// Conservative envelopes for the owned rigs, including moving appendages.
// These stop phone dashes; they do not add walking, shot or enemy colliders.
export const PHONE_DASH_BODIES=Object.freeze({
 warden:Object.freeze({radius:1.1,height:2.6}),
 sentinel:Object.freeze({radius:.6,height:2.1}),
 stalker:Object.freeze({radius:.75,height:2.1})
});
export function phoneDashTravel(g,requested){
 if(!g.touchMode||!(requested>0))return requested;
 const profile=profileOf(g),feet=feetY(g.player,profile),top=feet+profile.bodyHeight;
 let distance=requested;
 for(const e of g.enemies){
  const body=PHONE_DASH_BODIES[e.type],p=e.group.position;
  if(!body||!(e.health>0)||feet>=p.y+body.height||top<=p.y)continue;
  const x=p.x-g.player.x,z=p.z-g.player.z,r=body.radius+PLAYER_RADIUS+.15;
  const along=x*g.dashVector.x+z*g.dashVector.z;
  // Always permit escape from a pre-existing overlap. No push or teleport.
  if(along<=0)continue;
  const separation=x*x+z*z,side=separation-along*along;
  if(side>=r*r)continue;
  const hit=Math.max(0,along-Math.sqrt(Math.max(0,r*r-side)));
  if(hit<distance){
   // Architecture resolves through normal movement. A hidden body's padded
   // envelope must not shorten a dash on the near side of its wall.
   const eye=g.player.clone().set(p.x,p.y+1.3,p.z);
   if(g.hasLineOfSight(g.player,eye,0))distance=hit;
  }
 }
 return distance;
}
