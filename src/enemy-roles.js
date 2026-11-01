// Authored sites opt in. Arbitrary/debug spawns retain legacy mobile pursuit.
export function createRole(position, role = 'hunter') {
  return { role, home: position.clone(), duty: 'hold', lastSeen: position.clone(), unseen: 0 };
}
export function dutyGoal(enemy, player, visible, dt) {
  if (enemy.role !== 'guard') return player;
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
