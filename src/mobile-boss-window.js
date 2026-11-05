// Read the current exposure, never predict the next attack or a successful hit.
// The fixed three-second scale includes both existing volley and phase-break windows.
export const BOSS_WINDOW_SCALE=3,SHORT_BOSS_WINDOW=.6;
export function mobileBossWindow(s,blocked=false){
 const c=s.custodian;
 if(c.charging)return{text:'CHARGE · COVER',mode:'charging',ratio:0,seconds:0};
 if(blocked)return{text:'MAP · FIND ENTRY',mode:'route',ratio:0,seconds:0};
 if(!c.open)return{text:'ARMORED · MOVE',mode:'armored',ratio:0,seconds:0};
 const seconds=Number.isFinite(c.openRemaining)?Math.max(0,c.openRemaining):0;
 if(!seconds)return{text:'OPEN · FIND COIL',mode:'open',ratio:0,seconds:0};
 // Truncate rather than promise more time than the captured state has.
 const clock=seconds>BOSS_WINDOW_SCALE?'3.0s+':seconds<.1?'<0.1s':`${(Math.floor(seconds*10)/10).toFixed(1)}s`;
 return{text:`OPEN · ${clock}`,mode:seconds<=SHORT_BOSS_WINDOW?'closing':'open',ratio:Math.min(1,seconds/BOSS_WINDOW_SCALE),seconds};
}
