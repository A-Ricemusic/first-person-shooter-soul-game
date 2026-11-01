// Player cylinder: floor-relative feet, 1.7 m eye, 1.9 m head clearance.
// Enemy navigation deliberately retains its separate grounded footprint.
export const EYE_HEIGHT = 1.7, BODY_HEIGHT = 1.9, PLAYER_RADIUS = .4;
export const JUMP_SPEED = 8, GRAVITY = 21;
const EPS = 1e-6;
function overlaps(x, z, box, radius) {
  const dx = x - Math.max(box.min.x, Math.min(x, box.max.x));
  const dz = z - Math.max(box.min.z, Math.min(z, box.max.z));
  return dx * dx + dz * dz < radius * radius;
}
export function canPlayerOccupy(world, x, eyeY, z, radius = PLAYER_RADIUS) {
  const b = world.bounds, feet = eyeY - EYE_HEIGHT;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  return !world.colliders.some(box => box.max.y > feet + EPS && box.min.y < feet + BODY_HEIGHT - EPS && overlaps(x, z, box, radius));
}
function supported(world, p) {
  const feet = p.y - EYE_HEIGHT;
  return Math.abs(feet) < EPS || world.colliders.some(b => Math.abs(b.max.y - feet) < EPS && overlaps(p.x, p.z, b, PLAYER_RADIUS));
}
export function jumpPlayer(body, world) {
  if (!body.grounded || !supported(world, body.player)) return false;
  body.velocityY = JUMP_SPEED; body.grounded = false; return true;
}
// Time and distance substeps keep diagonal dashes and vertical/horizontal corner
// transitions bounded; vertical boundary crossings are swept, never snapped up.
export function movePlayer(body, world, dx, dz, dt) {
  const p = body.player;
  const count = Math.max(1, Math.ceil(dt / (1 / 120)), Math.ceil(Math.hypot(dx, dz) / .08));
  const h = dt / count;
  for (let i = 0; i < count; i++) {
    if (body.grounded && !supported(world, p)) body.grounded = false;
    if (!body.grounded) {
      const feet = p.y - EYE_HEIGHT;
      const dy = body.velocityY * h - GRAVITY * h * h / 2;
      body.velocityY -= GRAVITY * h;
      let next = feet + dy, hit = false;
      if (dy <= 0) {
        let floor = 0;
        for (const b of world.colliders) if (b.max.y <= feet + EPS && b.max.y >= next - EPS && overlaps(p.x, p.z, b, PLAYER_RADIUS)) floor = Math.max(floor, b.max.y);
        if (next <= floor) { next = floor; hit = true; body.grounded = true; }
      } else {
        for (const b of world.colliders) if (b.min.y >= feet + BODY_HEIGHT - EPS && b.min.y <= next + BODY_HEIGHT && overlaps(p.x, p.z, b, PLAYER_RADIUS)) {
          next = Math.min(next, b.min.y - BODY_HEIGHT); hit = true;
        }
      }
      p.y = next + EYE_HEIGHT;
      if (hit) body.velocityY = 0;
    }
    if (canPlayerOccupy(world, p.x + dx / count, p.y, p.z)) p.x += dx / count;
    if (canPlayerOccupy(world, p.x, p.y, p.z + dz / count)) p.z += dz / count;
    if (body.grounded && !supported(world, p)) body.grounded = false;
  }
}
