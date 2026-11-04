const DIRECTIONS=['FRONT','FRONT RIGHT','RIGHT','REAR RIGHT','REAR','REAR LEFT','LEFT','FRONT LEFT'];

export function relativeSector(bearing){
 if(!Number.isFinite(bearing))return null;
 const angle=Math.atan2(Math.sin(bearing),Math.cos(bearing));
 return (Math.round(angle/(Math.PI/4))+8)%8;
}

// Presentation only. Eligibility and expiry still belong to Game. The path
// marker is an actual swept-clear next step, never a direct objective bearing.
export function mobileCompassCues(markers,visor,damageDirection=null){
 const path=markers.find(m=>m.id==='ground-step'&&!m.suppressed);
 const pathSector=path?relativeSector(path.bearing):null;
 const offscreen=visor.cues.filter(m=>!m.onscreen&&relativeSector(m.bearing)!==null);
 const ordered=offscreen.toSorted((a,b)=>Number(!!b.charging)-Number(!!a.charging)||Number(!!b.recent)-Number(!!a.recent)||(b.count||1)-(a.count||1)||(a.sector??0)-(b.sector??0));
 const charge=ordered.find(m=>m.charging),hitSector=relativeSector(damageDirection);
 let selected=charge?{sector:relativeSector(charge.bearing),kind:'CHARGE'}:hitSector!==null?{sector:hitSector,kind:'HIT FROM'}:ordered[0]?{sector:relativeSector(ordered[0].bearing),kind:ordered[0].recent?'FIRE':'DAMAGED'}:null;
 if(selected){
  const others=new Set(offscreen.map(m=>relativeSector(m.bearing)).filter(s=>s!==selected.sector));
  selected={...selected,direction:DIRECTIONS[selected.sector],otherDirections:others.size};
 }
 return{route:pathSector===null?null:{direction:DIRECTIONS[pathSector],sector:pathSector},threat:selected};
}
