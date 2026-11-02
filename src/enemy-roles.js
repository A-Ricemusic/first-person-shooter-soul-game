// Physical sight and discrete shot events are the only mobile-hunter knowledge sources.
export function createRole(position, role = 'hunter') {
  return { role, home: position.clone(), duty: 'hold', lastSeen: position.clone(), observedVelocity: position.clone().set(0,0,0), unseen: 0, searchTime: 0, searchIndex: -1, searchGoal: position.clone(), contactAge: 0, returnTime: 0 };
}
export const HUNTER_MEMORY = 3, HUNTER_SEARCH = 5, SHOT_HEARING_RADIUS = 24;
export function hearShot(enemy, origin) {
  if (enemy.role === 'guard' || enemy.group.position.distanceTo(origin)>SHOT_HEARING_RADIUS) return false;
  enemy.lastSeen.copy(origin); enemy.observedVelocity.set(0,0,0);
  enemy.unseen=0; enemy.contactAge=0; enemy.searchTime=0; enemy.searchIndex=-1; enemy.duty='chase';
  return true;
}
function hunterGoal(enemy, player, visible, dt, navigation) {
  if (visible) {
    enemy.lastSeen.copy(player); enemy.unseen=0; enemy.contactAge=0;
    enemy.searchTime=0; enemy.searchIndex=-1; enemy.duty='chase';
  } else {
    enemy.unseen+=dt;
    if(enemy.duty==='chase') {
      enemy.contactAge+=dt;
      if(enemy.contactAge>=HUNTER_MEMORY) {enemy.duty='search';enemy.searchTime=0;enemy.searchIndex=-1;}
    } else if(enemy.duty==='search') {
      enemy.searchTime+=dt;
      if(enemy.searchTime>=HUNTER_SEARCH) {enemy.duty='return';enemy.returnTime=0;}
    }
  }
  if(enemy.duty==='search') {
    const index=Math.min(3,Math.floor(enemy.searchTime/1.25));
    if(index!==enemy.searchIndex) {
      enemy.searchIndex=index; enemy.searchHeading=enemy.group.rotation?.y||0; enemy.searchGoal.copy(enemy.lastSeen).setY(0);
      // Four deterministic samples, never farther than 3m from the perceived point.
      // Reject blocked or disconnected samples using the same NPC navigation grid.
      for(let n=0;n<4;n++) {
        const angle=((enemy.id||0)*2.399+index*1.571+n*1.571);
        const candidate=enemy.lastSeen.clone().setY(0);candidate.x+=Math.sin(angle)*3;candidate.z+=Math.cos(angle)*3;
        if(navigation && navigation.can(candidate.x,candidate.z,.55) &&
          (navigation.clear(enemy.group.position,candidate)||navigation.path(enemy.group.position,candidate).length)) {enemy.searchGoal.copy(candidate);break;}
      }
      // If no reachable sample exists, scan in place instead of orbiting a wall.
      if(navigation && !navigation.clear(enemy.group.position,enemy.searchGoal) && !navigation.path(enemy.group.position,enemy.searchGoal).length) enemy.searchGoal.copy(enemy.group.position);
      enemy.navNext=0;enemy.navClearNext=0;
    }
    return enemy.searchGoal;
  }
  if(enemy.duty==='return') {
    enemy.returnTime+=dt;
    if(enemy.group.position.distanceTo(enemy.home)<1 || enemy.returnTime>=20) enemy.duty='hold';
  }
  if(enemy.duty==='hold')return enemy.group.position;
  return enemy.duty==='chase'?enemy.lastSeen:enemy.home;
}
export function dutyGoal(enemy, player, visible, dt, navigation) {
  if (enemy.role !== 'guard') return hunterGoal(enemy,player,visible,dt,navigation);
  const p = enemy.group.position, home = enemy.home;
  // Hidden movement cannot shorten the three-second local sight memory.
  const perceived = visible ? player : enemy.lastSeen;
  const playerHome = Math.hypot(perceived.x-home.x, perceived.z-home.z);
  const bodyHome = Math.hypot(p.x-home.x, p.z-home.z);
  if (visible) { enemy.lastSeen.copy(player); enemy.unseen=0; }
  else enemy.unseen += dt;
  // Acquisition inside 12m, pursuit out to 18m, own-body limit 16m.
  // Return is sticky until home: neither a brief LOS flash nor threshold jitter
  // repeatedly reverses navigation. Weapon state is deliberately independent.
  if (enemy.duty === 'chase' && (playerHome>18 || bodyHome>16 || enemy.unseen>3)) enemy.duty='return';
  if (enemy.duty === 'return' && bodyHome<1) enemy.duty='hold';
  if (enemy.duty === 'hold' && visible && playerHome<12) enemy.duty='chase';
  return enemy.duty==='chase' ? enemy.lastSeen : home;
}
