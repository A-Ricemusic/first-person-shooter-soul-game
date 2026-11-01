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
  const carriage = new THREE.Group(); carriage.name='CrawlerSwivel'; model.add(carriage);
  carriage.add(model.getObjectByName('TrackSupport'));
  const shoe = model.getObjectByName('TrackShoe');
  const tracks = [-1, 1].map(sign => {
    const belt = new THREE.InstancedMesh(shoe.geometry, shoe.material.clone(), 32);
    belt.name = sign < 0 ? 'BeltLeft' : 'BeltRight';
    belt.userData.sharedGeometry = true; belt.castShadow = true;
    carriage.add(belt);
    return { sign, belt, travel: 0, wheelPhase: 0, rollers: ['Front','Rear'].map(end => (() => { const node=model.getObjectByName(`Roller${sign<0?'Left':'Right'}${end}`); const axle=new THREE.Group(); axle.position.copy(node.position); carriage.add(axle); node.position.set(0,0,0); axle.add(node); return axle; })()) };
  });
  model.remove(shoe); shoe.material.dispose();
  group.add(model);
  const shutters = ['ArmorLeft', 'ArmorRight'].map(name => {
    const node = model.getObjectByName(name);
    return { node, home: node.position.clone(), rotation: node.rotation.clone() };
  });
  const rig = { model, shutters, emitters, carriage, fan: model.getObjectByName('Fan'), tracks, previous: group.position.clone(), heading: group.rotation.y, yaw: group.rotation.y, open: 0, charge: 0 };
  animateWarden({wardenRig:rig,group},0);
  return rig;
}

const angleDelta = (to, from) => Math.atan2(Math.sin(to-from), Math.cos(to-from));

// A crawler steers before translating. Backing away uses reverse drive instead
// of spinning the undercarriage through 180 degrees beneath a stationary turret.
export function steerWarden(enemy, move, dt) {
  const rig = enemy.wardenRig;
  if (!rig || move.lengthSq() < 1e-10) return;
  const amount = move.length();
  let desired = Math.atan2(move.x, move.z);
  const reverse = Math.abs(angleDelta(desired, rig.heading)) > Math.PI/2;
  if (reverse) desired += Math.PI;
  const step = THREE.MathUtils.clamp(angleDelta(desired, rig.heading), -2.8*dt, 2.8*dt);
  rig.heading = angleDelta(rig.heading + step, 0);
  const alignment = Math.max(0, Math.cos(angleDelta(desired, rig.heading)));
  const drive = amount * alignment * alignment * (reverse ? -1 : 1);
  move.set(Math.sin(rig.heading)*drive, 0, Math.cos(rig.heading)*drive);
}

export function animateWarden(enemy, dt) {
  const rig = enemy.wardenRig;
  if (!rig) return;
  // Called after movement on every AI path. No elapsed-time treadmill or restart offset.
  const dx = enemy.group.position.x-rig.previous.x, dz = enemy.group.position.z-rig.previous.z;
  // Steering sets a bounded heading before collision resolution. Belt advance
  // uses only actual translation plus differential travel from the real pivot.
  const yaw = rig.heading;
  rig.carriage.rotation.y = yaw-enemy.group.rotation.y;
  const turn = Math.atan2(Math.sin(yaw-rig.yaw), Math.cos(yaw-rig.yaw));
  const middle = rig.yaw + turn/2;
  const forward = dx*Math.sin(middle)+dz*Math.cos(middle);
  const perimeter = .72 + Math.PI*.24;
  const dummy = rig.dummy ||= new THREE.Object3D();
  for (const track of rig.tracks) {
    const distance = forward - track.sign*.23*turn;
    track.wheelPhase = THREE.MathUtils.euclideanModulo(track.wheelPhase + distance/.12, Math.PI*2);
    track.travel = THREE.MathUtils.euclideanModulo(track.travel + distance, perimeter);
    if (track.initialized && Math.abs(distance)<1e-10) continue;
    track.initialized=true;
    track.rollers.forEach(roller => { roller.rotation.x = track.wheelPhase; });
    for(let i=0;i<32;i++) {
      // Top goes forward relative to chassis, bottom backward: stationary ground contact.
      let t = THREE.MathUtils.euclideanModulo(i*perimeter/32 + track.travel, perimeter);
      let y,z,angle;
      if(t<.36){z=-.18+t;y=.26;angle=0;}
      else if((t-=.36)<Math.PI*.12){const a=t/.12;z=.18+Math.sin(a)*.12;y=.14+Math.cos(a)*.12;angle=a;}
      else if((t-=Math.PI*.12)<.36){z=.18-t;y=.02;angle=Math.PI;}
      else {t-=.36;const a=t/.12;z=-.18-Math.sin(a)*.12;y=.14-Math.cos(a)*.12;angle=Math.PI+a;}
      dummy.position.set(track.sign*.23,y,z);dummy.rotation.set(angle,0,0);dummy.updateMatrix();track.belt.setMatrixAt(i,dummy.matrix);
    }
    track.belt.instanceMatrix.needsUpdate=true;
    track.belt.computeBoundingSphere();
  }
  rig.previous.copy(enemy.group.position); rig.yaw=yaw;
  const blend = 1 - Math.exp(-dt * 12);
  rig.open += ((enemy.armorOpen > 0 ? 1 : 0) - rig.open) * blend;
  rig.charge += ((enemy.windup > 0 && !(enemy.stagger > 0) ? 1 : 0) - rig.charge) * blend;
  // Guided sliding shutters uncover the frontal core; never cross the fixed optic.
  rig.shutters.forEach(({ node, home, rotation }, i) => {
    node.position.copy(home);
    node.position.x += (i ? 1 : -1) * (rig.open * .10 - rig.charge * .025);
    node.position.z -= rig.open * .08;
    node.rotation.copy(rotation);
    node.rotation.z += (i ? -1 : 1) * rig.open * .09;
  });
  rig.fan.rotation.z += dt * (enemy.windup > 0 ? 10 : 4);
}
