import * as THREE from 'three';

// Rigid authored parts share geometry; each enemy owns disposable materials.
export function attachWarden(template, group) {
  const model = template.clone(true);
  const emitters = [];
  model.traverse(node => {
    if (!node.isMesh) return;
    node.userData.sharedGeometry = true; node.castShadow = true;
    node.material = node.material.clone();
    if (node.material.name === 'Warden_Emitter') emitters.push(node.material);
  });
  group.add(model);
  const shutters = ['ArmorLeft', 'ArmorRight'].map(name => {
    const node = model.getObjectByName(name);
    return { node, home: node.position.clone() };
  });
  return { model, shutters, emitters, fan: model.getObjectByName('Fan'), open: 0, charge: 0 };
}

export function animateWarden(enemy, dt) {
  const rig = enemy.wardenRig;
  if (!rig) return;
  const blend = 1 - Math.exp(-dt * 12);
  rig.open += ((enemy.armorOpen > 0 ? 1 : 0) - rig.open) * blend;
  rig.charge += ((enemy.windup > 0 && !(enemy.stagger > 0) ? 1 : 0) - rig.charge) * blend;
  // Guided sliding shutters uncover the frontal core; never cross the fixed optic.
  rig.shutters.forEach(({ node, home }, i) => {
    node.position.copy(home);
    node.position.x += (i ? 1 : -1) * (rig.open * .10 - rig.charge * .025);
    node.position.z -= rig.open * .08;
    node.rotation.z = (i ? -1 : 1) * rig.open * .09;
  });
  rig.fan.rotation.z += dt * (enemy.windup > 0 ? 10 : 4);
}
