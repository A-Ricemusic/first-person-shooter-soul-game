// Representation only: Game owns eligibility, range and optic LOS.
export function threatVisor(markers, previousFocus) {
 const enemies=markers.filter(m=>m.kind==='enemy');
 const visible=m=>m.front&&Math.abs(m.x)<.86&&Math.abs(m.y)<.68;
 const candidates=enemies.filter(m=>visible(m)&&Math.hypot(m.x,m.y)<.5);
 const nearest=candidates.toSorted((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y))[0];
 const previous=candidates.find(m=>m.id===previousFocus);
 // A challenger must be meaningfully closer to the reticle. No timer or stale
 // target survives the Game's eligibility gate, death, or a turn away.
 const focused=previous&&nearest&&Math.hypot(previous.x,previous.y)<Math.hypot(nearest.x,nearest.y)+.075?previous:nearest;
 const groups=new Map(),cues=[];
 for(const m of enemies){
  if(visible(m)){cues.push({...m,onscreen:true,count:1,charges:Number(m.charging),fires:Number(!m.charging&&m.recent),hits:Number(!m.charging&&!m.recent),members:[m.id]});continue;}
  const angle=Math.atan2(Math.sin(m.bearing),Math.cos(m.bearing));
  const sector=(Math.round(angle/(Math.PI/6)+1e-10)+12)%12;
  if(!groups.has(sector))groups.set(sector,[]);groups.get(sector).push(m);
 }
 for(const [sector,members]of groups){const m=members[0];const bearing=Math.atan2(members.reduce((s,m)=>s+Math.sin(m.bearing),0),members.reduce((s,m)=>s+Math.cos(m.bearing),0));cues.push({...m,id:`bearing-${sector}`,bearing,sector,onscreen:false,charging:members.some(m=>m.charging),recent:members.some(m=>m.recent),charges:members.filter(m=>m.charging).length,fires:members.filter(m=>!m.charging&&m.recent).length,hits:members.filter(m=>!m.charging&&!m.recent).length,count:members.length,members:members.map(m=>m.id)});}
 return {cues,focused};
}
