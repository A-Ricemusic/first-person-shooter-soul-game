// Player cylinder: floor-relative feet, 1.7 m eye, 1.9 m head clearance.
// Enemy navigation deliberately retains its separate grounded footprint.
export const EYE_HEIGHT = 1.7, BODY_HEIGHT = 1.9, PLAYER_RADIUS = .4;
export const JUMP_SPEED = 8, GRAVITY = 21;
export const STANDING = Object.freeze({eyeHeight:EYE_HEIGHT,bodyHeight:BODY_HEIGHT});
export const CROUCHED = Object.freeze({eyeHeight:1.05,bodyHeight:1.25});
export const profileOf = body => body.profile || STANDING;
export const feetY = (position, profile=STANDING) => position.y-profile.eyeHeight;
// Profile belongs to the body, never to a cloned position vector.
export function updatePosture(body,world,dt) {
  if(!body.grounded || body.vault || body.dashTime>0)return;
  const current=profileOf(body),feet=feetY(body.player,current);
  if(!canPlayerOccupy(world,body.player.x,body.player.y,body.player.z,PLAYER_RADIUS,current))return;
  const target=body.crouchRequested?CROUCHED:STANDING;
  body.standBlocked=target===STANDING&&!canPlayerOccupy(world,body.player.x,feet+EYE_HEIGHT,body.player.z);
  if(body.standBlocked)return;
  const delta=Math.sign(target.eyeHeight-current.eyeHeight)*Math.min(Math.abs(target.eyeHeight-current.eyeHeight),Math.max(0,dt)*3.25);
  const next={eyeHeight:current.eyeHeight+delta,bodyHeight:current.bodyHeight+delta};
  if(!canPlayerOccupy(world,body.player.x,feet+next.eyeHeight,body.player.z,PLAYER_RADIUS,next))return;
  body.profile=next;body.player.y=feet+next.eyeHeight;
}
export function toggleCrouch(body) {
 if(!body.grounded||body.vault||body.dashTime>0)return false;
 body.crouchRequested=!body.crouchRequested;return true;
}
export function playerHitProfile(body){
 const p=profileOf(body),t=Math.max(0,Math.min(1,(EYE_HEIGHT-p.eyeHeight)/.65));
 return {torsoOffset:-.5+.075*t,torsoRadius:.65-.25*t,headOffset:-.04*t,headRadius:t>0?Math.min(.38-.18*t,p.bodyHeight-p.eyeHeight+.04*t):.38};
}
const EPS = 1e-6;
function overlaps(x, z, box, radius) {
  const dx = x - Math.max(box.min.x, Math.min(x, box.max.x));
  const dz = z - Math.max(box.min.z, Math.min(z, box.max.z));
  return dx * dx + dz * dz < radius * radius;
}
export function canPlayerOccupy(world, x, eyeY, z, radius = PLAYER_RADIUS, profile = STANDING) {
  const b = world.bounds, feet = eyeY - profile.eyeHeight;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  return !world.colliders.some(box => box.max.y > feet + EPS && box.min.y < feet + profile.bodyHeight - EPS && overlaps(x, z, box, radius));
}
function supported(world, p, profile=STANDING) {
  const feet = feetY(p,profile);
  return Math.abs(feet) < EPS || world.colliders.some(b => Math.abs(b.max.y - feet) < EPS && overlaps(p.x, p.z, b, PLAYER_RADIUS));
}
export function jumpPlayer(body, world) {
  if (!body.grounded || !supported(world, body.player,profileOf(body))) return false;
  body.velocityY = JUMP_SPEED; body.grounded = false; return true;
}
// Time and distance substeps keep diagonal dashes and vertical/horizontal corner
// transitions bounded; vertical boundary crossings are swept, never snapped up.
export function movePlayer(body, world, dx, dz, dt) {
  const p = body.player, profile=profileOf(body);
  const count = Math.max(1, Math.ceil(dt / (1 / 120)), Math.ceil(Math.hypot(dx, dz) / .08));
  const h = dt / count;
  for (let i = 0; i < count; i++) {
    if (body.grounded && !supported(world, p,profile)) body.grounded = false;
    if (!body.grounded) {
      const feet = p.y - profile.eyeHeight;
      const dy = body.velocityY * h - GRAVITY * h * h / 2;
      body.velocityY -= GRAVITY * h;
      let next = feet + dy, hit = false;
      if (dy <= 0) {
        let floor = 0;
        for (const b of world.colliders) if (b.max.y <= feet + EPS && b.max.y >= next - EPS && overlaps(p.x, p.z, b, PLAYER_RADIUS)) floor = Math.max(floor, b.max.y);
        if (next <= floor) { next = floor; hit = true; body.grounded = true; }
      } else {
        for (const b of world.colliders) if (b.min.y >= feet + profile.bodyHeight - EPS && b.min.y <= next + profile.bodyHeight && overlaps(p.x, p.z, b, PLAYER_RADIUS)) {
          next = Math.min(next, b.min.y - profile.bodyHeight); hit = true;
        }
      }
      p.y = next + profile.eyeHeight;
      if (hit) body.velocityY = 0;
    }
    if (canPlayerOccupy(world, p.x + dx / count, p.y, p.z, PLAYER_RADIUS,profile)) p.x += dx / count;
    if (canPlayerOccupy(world, p.x, p.y, p.z + dz / count,PLAYER_RADIUS,profile)) p.z += dz / count;
    if (body.grounded && !supported(world, p,profile)) body.grounded = false;
  }
}
