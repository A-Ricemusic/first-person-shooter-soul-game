export const CORE_SITES = [
  {name:'WEST ARCHIVE',person:'MARA SOLBERG',role:'Station medic',memory:'If someone finds this… the children made the last ferry. Tell them I kept the light on.'},
  {name:'EAST ARCHIVE',person:'ELIAN VALE',role:'Relay engineer',memory:'I could erase the station. I could not erase the people inside it. Bring them home.'},
  {name:'THE HEART',person:'SERA NORD',role:'Night operator',memory:'Every signal is a person. If you can hear me, we are still here.'},
];
export const RECOVERY_SECONDS = .9;
export const EXTRACTION_SECONDS = 6;

// These optional platforms share their world placement with the approach cue.
export const SERVICE_ROUTES = [-14,14].map(x=>({x,z:9,rearMin:11.45,rearMax:12.85}));
export function serviceRouteAt(player){
  if(!player?.grounded||Math.abs(player.y-1.7)>.12||Math.cos(player.yaw)<.5)return null;
  return SERVICE_ROUTES.find(r=>Math.abs(player.x-r.x)<1.8&&player.z>=r.rearMin&&player.z<=r.rearMax)||null;
}
