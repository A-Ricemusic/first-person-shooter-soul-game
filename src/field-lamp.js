import * as THREE from 'three';

// A helmet-mounted work light illuminates ordinary surfaces, including cover.
// It never queries actors, targeting, visibility or combat state. No shadow pass.
export function createFieldLamp(camera) {
  const lamp = new THREE.SpotLight(0xf1e4ca, 7, 36, .65, .8, 1);
  lamp.name = 'Helmet work lamp';
  lamp.position.set(.16, -.10, -.20);
  lamp.target.position.set(0, 0, -20);
  lamp.castShadow = false;
  lamp.visible = false;
  camera.add(lamp, lamp.target);
  return lamp;
}

export function updateFieldLamp(game) {
  if (game.fieldLamp) game.fieldLamp.visible = game.touchMode && game.options.mobileLamp !== false;
}
