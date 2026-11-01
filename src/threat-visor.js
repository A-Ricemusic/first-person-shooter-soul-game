// Representation only: eligibility and optic LOS remain owned by Game.
export function threatVisor(markers) {
 const enemies=markers.filter(m=>m.kind==='enemy');
 const visible=m=>m.front&&Math.abs(m.x)<.86&&Math.abs(m.y)<.68;
 const focused=enemies.filter(m=>visible(m)&&Math.hypot(m.x,m.y)<.5).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y)||Number(b.charging)-Number(a.charging))[0];
 const groups=new Map(),cues=[];
 for(const m of enemies){
  if(visible(m)){cues.push({...m,onscreen:true,count:1,members:[m.id]});continue;}
  const angle=Math.atan2(Math.sin(m.bearing),Math.cos(m.bearing));
  // Both sides of the rear angle seam belong to the same physical sector.
  const sector=(Math.round(angle/(Math.PI/6))+12)%12;
  const key=`${sector}:${m.type}`;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);
 }
 for(const [key,members]of groups){const m=members[0];const bearing=Math.atan2(members.reduce((s,m)=>s+Math.sin(m.bearing),0),members.reduce((s,m)=>s+Math.cos(m.bearing),0));cues.push({...m,id:`bearing-${key}`,bearing,onscreen:false,charging:members.some(m=>m.charging),charges:members.filter(m=>m.charging).length,fires:members.filter(m=>!m.charging&&m.recent).length,hits:members.filter(m=>!m.charging&&!m.recent).length,count:members.length,members:members.map(m=>m.id)});}
 return {cues,focused};
}
