import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildWorld } from './world.js';
import { SoulAudio } from './audio.js';
import { CORE_SITES, RECOVERY_SECONDS, EXTRACTION_SECONDS } from './mission.js';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const DIFFICULTIES = {
  story: { damage: 0.55, health: 0.8, speed: 0.8, fire: 1.35, label: 'Story' },
  standard: { damage: 1, health: 1, speed: 1, fire: 1, label: 'Standard' },
  veteran: { damage: 1.3, health: 1.2, speed: 1.15, fire: 0.8, label: 'Veteran' },
};

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); return m;
}


/** A single, owned simulation loop. Rendering is separate from game state. */
export class Game {
  constructor({ canvas, onState = () => {}, onEvent = () => {}, onMarkers = () => {} }) {
    this.canvas = canvas; this.onState = onState; this.onEvent = onEvent; this.onMarkers = onMarkers;
    this.phase = 'ready'; this.options = { difficulty: 'standard', sensitivity: 1, volume: 0.65, reducedMotion: false, quality: 'balanced' };
    this.audio = new SoulAudio(); this.keys = new Set(); this.cleanups = [];
    this.mouseDown = false; this.aim = false; this.dragging = false; this.pointerFallback = false;
    this.yaw = 0; this.pitch = 0; this.animTime = 0; this.runTime = 0; this.lastFrame = 0; this.emitTimer = 0;
    this.enemies = []; this.projectiles = []; this.effects = []; this.pickups = []; this.coreNodes = [];
    this.playerVelocity = new THREE.Vector3(); this.nextEnemyId = 0;
    this.player = new THREE.Vector3(); this.velocityY = 0; this.grounded = true;
    this.dashVector = new THREE.Vector3(); this.dashTime = 0; this.dashCooldown = 0;
    this.health = 100; this.shield = 60; this.ammo = 30; this.reserve = 180;
    this.kills = 0; this.cores = 0; this.score = 0; this.phaseDodges = 0; this.dashCount = 0; this.headshots = 0; this.shotsFired = 0; this.shotsHit = 0;
    this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0; this.lastDamage = -100;
    this.recoil = 0; this.kick = 0; this.aimBlend = 0; this.stepDistance = 0; this.footTimer = 0;
    this.ray = new THREE.Ray(); this.raycaster = new THREE.Raycaster(); this.wallPoint = new THREE.Vector3();
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 260);
    this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    this.world = await buildWorld(this.scene);
    this.player.copy(this.world.playerSpawn); this.player.y = 1.7;
    this.yaw = Math.atan2(this.player.x, this.player.z); this.pitch = -0.02;
    this.scene.add(new THREE.HemisphereLight(0x9cc6db, 0x1a1c20, 0.8));
    try {
      const asset = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/sentinel.glb`);
      const bounds = new THREE.Box3().setFromObject(asset.scene), size = bounds.getSize(new THREE.Vector3());
      asset.scene.scale.setScalar(1.15 / Math.max(size.y, 0.1));
      const normalized = new THREE.Box3().setFromObject(asset.scene);
      asset.scene.position.y += 0.72 - normalized.min.y;
      this.sentinelAsset = asset.scene;
    } catch (_) { /* Procedural combat silhouette remains a robust loading fallback. */ }
    this.buildWeapon(); this.buildCores(); this.buildExtraction(); this.bindInput(); this.resize();
    if (new URLSearchParams(location.search).get('test') === '1') this.installDebug();
    this.loaded = true; this.emit(); this.frameId = requestAnimationFrame(t => this.frame(t)); return this;
  }

  buildWeapon() {
    this.weapon = new THREE.Group(); this.camera.add(this.weapon);
    const steel = new THREE.MeshStandardMaterial({ color: 0x34414c, metalness: 0.86, roughness: 0.27 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x12181e, metalness: 0.5, roughness: 0.65 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x6ef8ff, emissive: 0x25cfde, emissiveIntensity: 2 });
    this.weaponFallback = new THREE.Group(); this.weapon.add(this.weaponFallback);
    this.weaponFallback.add(mesh(new THREE.BoxGeometry(0.16, 0.22, 0.65), steel, 0, 0, -0.24));
    this.weaponFallback.add(mesh(new THREE.BoxGeometry(0.1, 0.14, 0.55), dark, 0, 0.08, -0.55));
    const barrel = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.48, 12), steel, 0, 0.03, -0.82); barrel.rotation.x = Math.PI / 2; this.weaponFallback.add(barrel);
    const grip = mesh(new THREE.BoxGeometry(0.1, 0.28, 0.13), dark, 0, -0.2, -0.15); grip.rotation.x = -0.2; this.weaponFallback.add(grip);
    this.weaponFallback.add(mesh(new THREE.BoxGeometry(0.015, 0.025, 0.35), glow, 0.088, 0.035, -0.25));
    this.weaponFallback.add(mesh(new THREE.BoxGeometry(0.09, 0.06, 0.13), dark, 0, 0.15, -0.28));
    this.weaponFallback.add(mesh(new THREE.BoxGeometry(0.03, 0.022, 0.04), glow, 0, 0.19, -0.28));
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x242e34, roughness: 0.92 });
    const leftArm = mesh(new THREE.CapsuleGeometry(0.065, 0.3, 4, 8), sleeve, -0.17, -0.17, -0.37); leftArm.rotation.set(1.1, 0, -0.45); this.weaponFallback.add(leftArm);
    this.muzzle = new THREE.Group(); this.muzzle.position.set(0, 0.04, -1.08); this.weapon.add(this.muzzle);
    const flash = mesh(new THREE.ConeGeometry(0.12, 0.32, 6), new THREE.MeshBasicMaterial({ color: 0xc8ffff, transparent: true, opacity: 0.8 }), 0, 0, -0.05); flash.rotation.x = -Math.PI / 2; this.muzzle.add(flash); this.muzzle.visible = false;
    this.flashLight = new THREE.PointLight(0xa1f8ff, 0, 7); this.muzzle.add(this.flashLight);
    // Blender source and exported asset are produced by the environment pipeline.
    new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/coil-rifle.glb`, gltf => {
      this.weaponFallback.visible = false; const asset = gltf.scene; asset.rotation.y = Math.PI;
      asset.scale.setScalar(0.5); asset.position.z = -0.3;
      this.weapon.add(asset); this.weaponAsset = asset;
      asset.traverse(obj => { if (obj.isMesh) { obj.frustumCulled = false; obj.castShadow = false; } });
    }, undefined, () => {});
  }

  buildCores() {
    const cyan = new THREE.MeshStandardMaterial({ color: 0x80f6ff, emissive: 0x13d6ef, emissiveIntensity: 3.5, metalness: 0.7, roughness: 0.25 });
    this.world.corePositions.forEach((position, i) => {
      const group = new THREE.Group(); group.position.copy(position); group.position.y = 0;
      const base = mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.23, 12), new THREE.MeshStandardMaterial({ color: 0x202c33, metalness: 0.8, roughness: 0.4 }), 0, 0.15, 0); group.add(base);
      const crystal = mesh(new THREE.OctahedronGeometry(0.36), cyan.clone(), 0, 1.2, 0); group.add(crystal);
      const ring = mesh(new THREE.TorusGeometry(0.64, 0.025, 8, 40), cyan.clone(), 0, 1.2, 0); ring.rotation.x = Math.PI / 2; group.add(ring);
      const pillar = mesh(new THREE.CylinderGeometry(0.07, 0.22, 11, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x25d6ed, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 5.5, 0); group.add(pillar);
      const light = new THREE.PointLight(0x29dced, 3, 8); light.position.y = 1.8; group.add(light);
      this.scene.add(group); this.coreNodes.push({ group, crystal, ring, light, position: position.clone(), collected: false, id: i });
    });
  }

  buildExtraction() {
    this.exit = new THREE.Group(); this.exit.position.copy(this.world.playerSpawn); this.exit.position.y = 0.04;
    this.exitRing = mesh(new THREE.TorusGeometry(2.5, 0.06, 8, 80), new THREE.MeshBasicMaterial({ color: 0x637b83, transparent: true, opacity: 0.5 })); this.exitRing.rotation.x = Math.PI / 2; this.exit.add(this.exitRing);
    this.exitBeam = mesh(new THREE.CylinderGeometry(.25, 2.3, 16, 24, 1, true), new THREE.MeshBasicMaterial({color:0x65ffb7,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),0,8,0); this.exitBeam.visible=false; this.exit.add(this.exitBeam);
    const exitLight = new THREE.PointLight(0x65ffb7, 7, 13); exitLight.position.y=2; this.exitBeam.add(exitLight);
    this.scene.add(this.exit);
  }

  bindInput() {
    const listen = (target, event, callback, opts) => { target.addEventListener(event, callback, opts); this.cleanups.push(() => target.removeEventListener(event, callback, opts)); };
    listen(window, 'resize', () => this.resize());
    listen(document, 'keydown', e => {
      if (e.code === 'Escape' && this.phase === 'playing') { this.pause(); return; }
      if (this.phase !== 'playing' || e.target.closest('input,select,textarea,dialog')) return;
      // Ctrl is sprint: suppress Ctrl+W/R/S browser shortcuts while the game owns input.
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (e.code === 'KeyR') this.reload();
        if (e.code === 'KeyE') this.interact();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dash();
        if (e.code === 'Space' && this.grounded) { this.velocityY = 7; this.grounded = false; }
      }
      this.keys.add(e.code);
    });
    listen(document, 'keyup', e => this.keys.delete(e.code));
    listen(this.canvas, 'contextmenu', e => e.preventDefault());
    listen(this.canvas, 'mousedown', e => {
      if (this.phase !== 'playing') return;
      this.audio.wake(); if (e.button === 0) this.mouseDown = true; if (e.button === 2) this.aim = true;
      this.dragging = true;
      if (!document.pointerLockElement && !this.pointerFallback) this.requestLock();
    });
    listen(document, 'mouseup', e => { if (e.button === 0) this.mouseDown = false; if (e.button === 2) this.aim = false; this.dragging = false; });
    listen(document, 'mousemove', e => {
      if (this.phase !== 'playing' || (document.pointerLockElement !== this.canvas && !(this.pointerFallback && this.dragging))) return;
      const sensitivity = clamp(Number(this.options.sensitivity) || 1, 0.2, 3) * (this.aim ? 0.00125 : 0.002);
      this.yaw -= e.movementX * sensitivity; this.pitch = clamp(this.pitch - e.movementY * sensitivity, -1.44, 1.44);
    });
    listen(document, 'pointerlockchange', () => { if (document.pointerLockElement !== this.canvas && this.phase === 'playing' && !this.pointerFallback) this.pause(); });
    listen(document, 'pointerlockerror', () => this.enableFallback());
    listen(window, 'blur', () => { if (this.phase === 'playing') this.pause(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && this.phase === 'playing') this.pause(); });
    listen(this.canvas, 'webglcontextlost', e => { e.preventDefault(); this.pause(); this.event('error', 'Graphics context lost. Reload the page to reconnect.'); });
  }

  requestLock() {
    try { const result = this.canvas.requestPointerLock?.(); if (result?.catch) result.catch(() => this.enableFallback()); if (!this.canvas.requestPointerLock) this.enableFallback(); }
    catch (_) { this.enableFallback(); }
  }
  enableFallback() {
    if (this.pointerFallback) return;
    this.pointerFallback = true; this.event('notice', 'Mouse capture unavailable. Hold a mouse button and drag to look.');
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix();
  }

  setSettings(options = {}) {
    this.options = { ...this.options, ...options }; this.audio.setVolume(this.options.volume);
    if (this.renderer && options.quality) { this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.quality === 'low' ? 1 : options.quality === 'high' ? 2 : 1.5)); this.renderer.shadowMap.enabled = options.quality !== 'low'; }
    this.resize?.();
  }
  start(options = {}) {
    if (!this.loaded) return;
    this.setSettings(options); this.audio.wake(); this.clearRun(); this.canvas.tabIndex = -1; this.canvas.focus({ preventScroll: true });
    this.activeDifficulty = this.options.difficulty; this.extractionSeconds=this.activeDifficulty==='story'?4:this.activeDifficulty==='veteran'?8:EXTRACTION_SECONDS; this.difficulty = DIFFICULTIES[this.activeDifficulty] || DIFFICULTIES.standard;
    this.health = 100; this.shield = 60; this.ammo = 30; this.reserve = 180; this.kills = 0; this.cores = 0; this.score = 0; this.phaseDodges = 0; this.dashCount = 0; this.headshots = 0; this.shotsFired = 0; this.shotsHit = 0;
    this.nextWarning=0; this.coreProgress = 0; this.channelCore = null; this.extractionProgress = 0; this.extractionWave = false; this.playerVelocity.set(0, 0, 0);
    this.runTime = 0; this.lastDamage = -100; this.dashCooldown = 0; this.dashTime = 0; this.invulnerable = 0; this.reloading = false; this.fireTimer = 0; this.velocityY = 0; this.grounded = true;
    this.aimBlend = 0; this.recoil = 0; this.kick = 0; this.stepDistance = 0; this.footTimer = 0; this.flashTimer = 0; this.flashJustTriggered = false;
    this.muzzle.visible = false; this.flashLight.intensity = 0; this.camera.fov = 75;
    this.player.copy(this.world.playerSpawn); this.player.y = 1.7;
    this.yaw = Math.atan2(this.player.x, this.player.z); this.pitch = 0;
    this.coreNodes.forEach(core => { core.collected = false; core.group.visible = true; this.world.setCoreState?.(core.id, false); });
    this.exitRing.material.color.setHex(0x637b83); this.exitBeam.visible = false;
    this.spawnWave(7); this.phase = 'playing'; this.animate(0); this.requestLock(); this.event('phase', 'The station is waking. Recover the three signal cores.'); this.emit();
  }
  restart(options = {}) { this.start(options); }
  pause() {
    if (this.phase !== 'playing') return;
    this.phase = 'paused'; this.clearInput(); if (document.pointerLockElement === this.canvas) document.exitPointerLock?.(); this.emit();
  }
  resume() { if (this.phase !== 'paused') return; this.phase = 'playing'; this.canvas.focus({ preventScroll: true }); this.audio.wake(); this.requestLock(); this.emit(); }
  clearInput() { this.keys.clear(); this.mouseDown = false; this.aim = false; this.dragging = false; }
  clearRun() {
    this.clearInput();
    [...this.enemies, ...this.projectiles, ...this.effects, ...this.pickups].forEach(item => {
      const object = item.mesh || item.group;
      if (object) { this.scene.remove(object); object.traverse(node => { if (!node.userData.sharedGeometry) node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach(m => m.dispose()); else node.material?.dispose(); }); }
    });
    this.enemies = []; this.projectiles = []; this.effects = []; this.pickups = [];
  }

  spawnWave(count) {
    for (let i = 0; i < count; i++) {
      const points = this.world.spawnPoints.filter(p => p.distanceTo(this.player) > 10);
      const position = (points.length ? points : this.world.spawnPoints)[(this.kills + i * 3 + this.cores) % (points.length || this.world.spawnPoints.length)];
      if (!position) continue;
      this.spawnEnemy(position.clone(), i % 3 === 2 ? 'stalker' : 'sentinel', i);
    }
  }
  spawnEnemy(position, type = 'sentinel', offset = 0) {
    const group = new THREE.Group(); group.position.copy(position); group.position.y = 0;
    const armor = new THREE.MeshStandardMaterial({ color: type === 'stalker' ? 0x3c3432 : 0x243640, metalness: 0.7, roughness: 0.35 });
    const black = new THREE.MeshStandardMaterial({ color: 0x0e171d, roughness: 0.75, metalness: 0.45 });
    const red = new THREE.MeshStandardMaterial({ color: 0xff693c, emissive: 0xff341c, emissiveIntensity: 2 });
    const torso = mesh(new THREE.BoxGeometry(0.72, 0.65, 0.42), armor, 0, 1.13, 0); group.add(torso);
    const head = mesh(new THREE.BoxGeometry(0.37, 0.28, 0.33), armor, 0, 1.68, 0); group.add(head);
    group.add(mesh(new THREE.BoxGeometry(0.29, 0.055, 0.025), red, 0, 1.7, 0.18));
    group.add(mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), red, 0, 1.2, 0.23));
    const leftLeg = mesh(new THREE.BoxGeometry(0.22, 0.65, 0.24), black, -0.23, 0.43, 0), rightLeg = mesh(new THREE.BoxGeometry(0.22, 0.65, 0.24), black, 0.23, 0.43, 0);
    group.add(leftLeg, rightLeg);
    const leftArm = mesh(new THREE.BoxGeometry(0.2, 0.57, 0.22), armor, -0.49, 1.08, 0), rightArm = mesh(new THREE.BoxGeometry(0.2, 0.57, 0.22), armor, 0.49, 1.08, 0);
    group.add(leftArm, rightArm);
    const gun = mesh(new THREE.BoxGeometry(0.17, 0.15, 0.6), black, 0.43, 1.04, 0.32); group.add(gun);
    const light = new THREE.PointLight(0xff482b, 0.5, 3); light.position.set(0, 1.5, 0.3); group.add(light);
    group.traverse(m => { if (m.isMesh) m.castShadow = true; }); this.scene.add(group);
    if (this.sentinelAsset) {
      [...group.children].forEach(child => { if (child !== light) child.visible = false; });
      const authored = this.sentinelAsset.clone(true);
      authored.traverse(node => { if (node.isMesh) { node.material = node.material.clone(); if(type === 'stalker' && node.material.metalness > .4 && node.material.emissiveIntensity < 2)node.material.color.lerp(new THREE.Color(0xc99749), .7); node.userData.sharedGeometry = true; node.castShadow = true; } });
      group.add(authored);
      // A readable telegraph stays visible on both Blender variants and fallback silhouettes.
      const charge = mesh(new THREE.SphereGeometry(0.085, 8, 8), red, 0, 1.3, 0.43); group.add(charge);
    }
    this.enemies.push({ id: ++this.nextEnemyId, lastHit: -100, group, leftLeg, rightLeg, red, light, type, health: (type === 'stalker' ? 70 : 100) * this.difficulty.health, maxHealth: (type === 'stalker' ? 70 : 100) * this.difficulty.health, cooldown: 1 + offset * 0.3, windup: 0, target: this.player.clone(), avoidSign: offset % 2 ? 1 : -1, phase: offset * 1.7, stuck: 0, visible: false });
  }

  reload() {
    if (this.phase !== 'playing' || this.reloading || this.ammo === 30 || this.reserve <= 0) return;
    this.reloading = true; this.reloadTimer = 1.65; this.audio.reload(); this.event('reload', 'Reloading'); this.emit();
  }
  dash() {
    if (this.phase !== 'playing' || this.dashCooldown > 0) return;
    this.dashVector.copy(this.moveDirection());
    if (this.dashVector.lengthSq() < 0.01) this.dashVector.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.dashCount++; this.dashTime = 0.22; this.invulnerable = 0.4; this.dashCooldown = 4.5; this.audio.dash();
    this.event('dash', 'SOUL SHIFT');
    for (let i = 0; i < 12; i++) this.particle(this.player.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() - 1, (Math.random() - 0.5) * 0.6)), 0x62eeff, 0.8, 0.08);
  }
  interact() {
    if (this.phase !== 'playing') return;
    const core = this.coreNodes.find(c => !c.collected && Math.hypot(c.position.x-this.player.x,c.position.z-this.player.z)<2.8);
    if (!core) { this.event('notice', 'Approach a cyan archive beacon. Hold E to recover its memory.'); return; }
    this.channelCore = core;
  }
  recoverCore(core) {
    if (this.phase !== 'playing' || core.collected) return;
    core.collected = true; core.group.visible = false; this.cores++; this.score += 1000;
    const heal = this.activeDifficulty === 'story' ? 30 : this.activeDifficulty === 'veteran' ? 10 : 20;
    this.health = Math.min(100, this.health + heal); this.shield = Math.min(60,this.shield+(this.activeDifficulty==='story'?60:35)); this.reserve = Math.min(360, this.reserve + 60);
    this.world.setCoreState?.(core.id,true); this.coreProgress=0; this.channelCore=null;
    this.audio.core(); this.event('core', `${CORE_SITES[core.id].name} // MEMORY SECURED +1000`);
    this.event('memory', '', { ...CORE_SITES[core.id], id:core.id });
    for (let i = 0; i < 28; i++) this.particle(core.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x62eaff, 1.5, 0.1);
    if (this.cores < this.coreNodes.length) this.spawnWave(2+this.cores);
    else { this.exitRing.material.color.setHex(0x65ffb7); this.exitBeam.visible=true; this.spawnWave(3); this.event('notice','ALL MEMORIES SECURED. Reach the green beacon and hold the extraction zone.'); }
    this.emit();
  }

  shoot() {
    if (this.fireTimer > 0 || this.reloading || this.phase !== 'playing') return;
    if (this.ammo <= 0) { this.reload(); if (!this.reloading) { this.fireTimer = 0.4; this.audio.tone(100, 0.04, 'square', 0.1); this.event('notice', 'No ammunition. Recover a core or collect a fallen sentinel’s supply.'); } return; }
    this.ammo--; this.shotsFired++; this.fireTimer = 0.105; this.recoil = Math.min(0.1, this.recoil + 0.018); this.kick = 1;
    this.audio.shoot(); this.muzzle.visible = true; this.flashLight.intensity = 5; this.flashTimer = 0.045; this.flashJustTriggered = true;
    const direction = new THREE.Vector3(); this.camera.getWorldDirection(direction);
    const spread = this.aim ? 0.0014 : 0.006; direction.x += (Math.random() - 0.5) * spread; direction.y += (Math.random() - 0.5) * spread; direction.normalize();
    this.ray.set(this.player, direction); let distance = 120, hit = null, headshot = false;
    for (const box of this.world.colliders) {
      const p = this.ray.intersectBox(box, this.wallPoint); if (p) distance = Math.min(distance, p.distanceTo(this.player));
    }
    for (const enemy of this.enemies) {
      const body = new THREE.Sphere(enemy.group.position.clone().add(new THREE.Vector3(0, this.sentinelAsset ? 1.3 : 1.04, 0)), this.sentinelAsset ? 0.68 : 0.53);
      const head = new THREE.Sphere(enemy.group.position.clone().add(new THREE.Vector3(0, this.sentinelAsset ? 1.3 : 1.68, this.sentinelAsset ? 0.43 : 0).applyAxisAngle(UP, enemy.group.rotation.y)), 0.24);
      const h = this.ray.intersectSphere(head, new THREE.Vector3()), b = this.ray.intersectSphere(body, new THREE.Vector3());
      const point = h || b;
      if (point && point.distanceTo(this.player) < distance) { distance = point.distanceTo(this.player); hit = enemy; headshot = !!h; }
    }
    const end = this.player.clone().addScaledVector(direction, distance);
    const muzzle = new THREE.Vector3(); this.muzzle.getWorldPosition(muzzle); this.tracer(muzzle, end, 0x9cfaff, 0.055);
    if (hit) {
      this.shotsHit++; hit.lastHit=this.runTime; this.audio.hit(headshot); hit.health -= headshot ? 82 : 34;
      hit.red.emissive.setHex(0xffffff); hit.hitFlash = 0.08;
      for (let i = 0; i < 4; i++) this.particle(end, headshot ? 0xffffff : 0xff9a45, 0.35, 0.045);
      this.event('hit', headshot ? 'CRITICAL' : '', { headshot, damage: headshot ? 82 : 34 });
      if (hit.health <= 0) this.killEnemy(hit, headshot);
    } else for (let i = 0; i < 3; i++) this.particle(end, 0xffbf75, 0.3, 0.03);
    this.event('shot', '', { ammo: this.ammo });
  }

  killEnemy(enemy, headshot = false) {
    const index = this.enemies.indexOf(enemy); if (index === -1) return;
    this.enemies.splice(index, 1); this.kills++; this.score += headshot ? 180 : 100; if (headshot) this.headshots++;
    this.audio.kill(); this.event('kill', headshot ? 'SENTINEL // CRITICAL +180' : 'SENTINEL // NEUTRALIZED +100', { headshot });
    for (let i = 0; i < 12; i++) this.particle(enemy.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)), i % 2 ? 0x73efff : 0xff9a57, 0.8, 0.08);
    // Every enemy leaves a guaranteed supply; aggressive play sustains the fight.
    const pickup = mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0x80ffff, emissive: 0x21b7c5, emissiveIntensity: 2 }), enemy.group.position.x, 0.5, enemy.group.position.z);
    this.scene.add(pickup); this.pickups.push({ mesh: pickup, life: 90 });
    this.scene.remove(enemy.group); enemy.group.traverse(node => { if (!node.userData.sharedGeometry) node.geometry?.dispose(); node.material?.dispose(); });
    this.emit();
  }

  moveDirection() {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    return new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(UP, this.yaw);
  }

  canOccupy(x, z, radius = 0.4) {
    const bounds = this.world.bounds;
    if (x < bounds.minX + radius || x > bounds.maxX - radius || z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
    for (const box of this.world.colliders) {
      // Feet remain grounded; low decorative slabs may be stepped over.
      if (box.max.y < 0.32 || box.min.y > 1.8) continue;
      const nearestX = clamp(x, box.min.x, box.max.x), nearestZ = clamp(z, box.min.z, box.max.z);
      if ((x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius * radius) return false;
    }
    return true;
  }
  moveEntity(position, dx, dz, radius = 0.4) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
    for (let i = 0; i < steps; i++) {
      if (this.canOccupy(position.x + dx / steps, position.z, radius)) position.x += dx / steps;
      if (this.canOccupy(position.x, position.z + dz / steps, radius)) position.z += dz / steps;
    }
  }
  hasLineOfSight(from, to, endpointMargin = 0.2) {
    const direction = to.clone().sub(from), length = direction.length(); this.ray.set(from, direction.normalize());
    for (const box of this.world.colliders) {
      if (box.containsPoint(from)) return false;
      const point = this.ray.intersectBox(box, this.wallPoint);
      if (point && point.distanceTo(from) <= length - endpointMargin) return false;
    }
    return true;
  }

  damage(amount, from = null) {
    if (this.phase !== 'playing') return;
    if(this.invulnerable>0){if(from){this.phaseDodges++;this.score+=75;this.event('phaseDodge','PHASE EVADE +75');}return;}
    amount *= this.difficulty.damage; const absorbed = Math.min(this.shield, amount); this.shield -= absorbed; this.health -= amount - absorbed;
    this.lastDamage = this.runTime; this.audio.hurt(); this.event('damage', '', { amount, direction: from ? Math.atan2(from.x-this.player.x,-(from.z-this.player.z))+this.yaw : null });
    if (this.health <= 0) { this.health = 0; this.finish(false); } this.emit();
  }
  finish(won) {
    this.phase = won ? 'won' : 'lost'; this.clearInput();
    if (won) { this.score += Math.round(this.health * 10 + Math.max(0, 600 - this.runTime) * 4); this.audio.win(); } else this.audio.lose();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    this.event(won ? 'win' : 'lose', won ? 'SIGNAL RESTORED. YOU BROUGHT THEM HOME.' : 'SIGNAL LOST. EVERY SOUL DESERVES ANOTHER CHANCE.'); this.emit();
  }

  update(dt) {
    this.runTime += dt; this.fireTimer = Math.max(0, this.fireTimer - dt); this.dashCooldown = Math.max(0, this.dashCooldown - dt); this.invulnerable = Math.max(0, (this.invulnerable || 0) - dt);
    if (this.runTime - this.lastDamage > 5) this.shield = Math.min(60, this.shield + dt * 9);
    if (this.reloading) { this.reloadTimer -= dt; if (this.reloadTimer <= 0) { const needed = Math.min(30 - this.ammo, this.reserve); this.ammo += needed; this.reserve -= needed; this.reloading = false; this.event('reloadComplete', 'Weapon ready.'); } }
    const previousPlayer=this.player.clone();
    const direction = this.moveDirection(), sprint = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const speed = this.aim ? 3.1 : sprint ? 8 : 5.5;
    if (this.dashTime > 0) { this.dashTime -= dt; this.moveEntity(this.player, this.dashVector.x * dt * 27, this.dashVector.z * dt * 27); }
    else this.moveEntity(this.player, direction.x * speed * dt, direction.z * speed * dt);
    if (!this.grounded) { this.velocityY -= dt * 21; this.player.y += this.velocityY * dt; if (this.player.y <= 1.7) { this.player.y = 1.7; this.velocityY = 0; this.grounded = true; } }
    if (direction.lengthSq() > 0.1 && this.grounded) { this.stepDistance += dt * speed; this.footTimer -= dt; if (this.footTimer <= 0) { this.audio.footstep(sprint); this.footTimer = sprint ? 0.28 : 0.39; } }
    if(dt>0){this.playerVelocity.copy(this.player).sub(previousPlayer).divideScalar(dt);this.playerVelocity.y=0;}
    this.syncCamera(); // Fire from this input frame, rather than the previous render pose.
    if (this.mouseDown) this.shoot();
    this.updateEnemies(dt); this.updateProjectiles(dt); this.updatePickups(dt);
    if(this.phase !== 'playing')return;
    const nearby=this.coreNodes.find(c=>!c.collected&&Math.hypot(c.position.x-this.player.x,c.position.z-this.player.z)<2.8);
    if(nearby&&this.keys.has('KeyE')) { if(this.channelCore!==nearby){this.channelCore=nearby;this.coreProgress=0;} this.coreProgress+=dt; if(this.coreProgress>=RECOVERY_SECONDS)this.recoverCore(nearby); }
    else {this.channelCore=null;this.coreProgress=0;}
    if(this.cores===this.coreNodes.length){
      const distance=Math.hypot(this.player.x-this.world.playerSpawn.x,this.player.z-this.world.playerSpawn.z);
      if(distance<12&&!this.extractionWave){this.extractionWave=true;for(const x of [-18,18])if(this.canOccupy(x,23,.5))this.spawnEnemy(new THREE.Vector3(x,0,23),'stalker',2);this.event('notice',`INTERCEPTORS INBOUND. Hold the green zone for ${this.extractionSeconds} seconds.`);}
      this.extractionProgress=distance<2.7?this.extractionProgress+dt:Math.max(0,this.extractionProgress-dt*2);
      if(this.extractionProgress+1e-8>=this.extractionSeconds)this.finish(true);
    }
  }

  updateEnemies(dt) {
    let charging=this.enemies.filter(e=>e.windup>0).length; const maxCharging=this.activeDifficulty==='veteran'?3:2;
    for (const enemy of this.enemies) {
      enemy.phase += dt; enemy.cooldown -= dt;
      const position = enemy.group.position, delta = this.player.clone().sub(position); delta.y = 0;
      const distance = delta.length(), dir = delta.clone().normalize();
      const eye = position.clone().add(new THREE.Vector3(0, 1.3, 0));
      enemy.visible = this.hasLineOfSight(eye, this.player);
      if (enemy.hitFlash > 0) { enemy.hitFlash -= dt; if (enemy.hitFlash <= 0) enemy.red.emissive.setHex(0xff341c); }
      if (enemy.windup > 0) {
        if(enemy.type==='stalker' && enemy.windup>.16) { const lead=Math.min(1.7,distance/18+.16); enemy.target.copy(this.player).addScaledVector(this.playerVelocity,lead); }
        enemy.windup -= dt; enemy.light.intensity = 1.5 + Math.sin(this.runTime * 35) * 1;
        enemy.red.emissiveIntensity = 4;
        if (enemy.windup <= 0) { charging--; this.enemyFire(enemy); enemy.cooldown = (enemy.type === 'stalker' ? 1.65 : 2.25) * this.difficulty.fire + Math.random() * 0.5; enemy.red.emissiveIntensity = 2; enemy.light.intensity = 0.5; }
      } else if (enemy.cooldown <= 0 && distance < 36 && enemy.visible && charging<maxCharging) {
        charging++; enemy.windup = enemy.type === 'stalker' ? 0.42 : 0.65;
        enemy.target.copy(this.player); // Telegraph aims at the current point; lateral movement evades it.
        if (distance < 30 && this.runTime>(this.nextWarning||0)){this.audio.warning();this.nextWarning=this.runTime+.45;}
      }
      const move = new THREE.Vector3();
      if (distance > (enemy.type === 'stalker' ? 8 : 16) || !enemy.visible) move.add(dir);
      else if (distance < 5) move.addScaledVector(dir, -0.7);
      if (enemy.visible) move.add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(enemy.phase * 0.65) * 0.65));
      // Local obstacle steering and separation keep a group from collapsing into one target.
      if (move.lengthSq() > 0.001) {
        move.normalize(); const speed = (enemy.type === 'stalker' ? 3.2 : 2.1) * this.difficulty.speed * (enemy.windup > 0 ? 0.25 : 1);
        if (!this.canOccupy(position.x + move.x * 1.2, position.z + move.z * 1.2, 0.45)) {
          const tangent = new THREE.Vector3(-move.z * enemy.avoidSign, 0, move.x * enemy.avoidSign);
          if (!this.canOccupy(position.x + tangent.x, position.z + tangent.z, 0.45)) enemy.avoidSign *= -1;
          move.copy(tangent);
        }
        for (const other of this.enemies) if (other !== enemy) { const separation = position.clone().sub(other.group.position); separation.y = 0; const d = separation.length(); if (d < 1.4 && d > 0.01) move.addScaledVector(separation.normalize(), (1.4 - d) * 1.5); }
        move.clampLength(0, 1); this.moveEntity(position, move.x * speed * dt, move.z * speed * dt, 0.45);
        enemy.leftLeg.rotation.x = Math.sin(enemy.phase * 7) * 0.45; enemy.rightLeg.rotation.x = -enemy.leftLeg.rotation.x;
      }
      enemy.group.rotation.y = Math.atan2(delta.x, delta.z);
      if (distance < 1.4 && (enemy.meleeCooldown || 0) <= 0) { this.damage(15,position); enemy.meleeCooldown = 1; } enemy.meleeCooldown = (enemy.meleeCooldown || 0) - dt;
    }
  }

  enemyFire(enemy) {
    const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const velocity = enemy.target.clone().sub(origin).normalize().multiplyScalar(enemy.type === 'stalker' ? 18 : 15);
    const projectile = mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6a31 })); projectile.position.copy(origin); this.scene.add(projectile);
    this.projectiles.push({ mesh: projectile, origin: origin.clone(), velocity, life: 4, damage: enemy.type === 'stalker' ? 13 : 19 });
    this.tracer(origin, origin.clone().addScaledVector(velocity, 0.05), 0xff6033, 0.12);
  }
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i], previous = p.mesh.position.clone(); p.mesh.position.addScaledVector(p.velocity, dt); p.life -= dt;
      // Exact swept collision, independent of AI sight tolerance and step alignment.
      const travel = previous.distanceTo(p.mesh.position);
      this.ray.set(previous, p.mesh.position.clone().sub(previous).normalize());
      let wallDistance = Infinity, playerDistance = Infinity;
      for (const box of this.world.colliders) {
        if (box.containsPoint(previous)) { wallDistance = 0; break; }
        const hit = this.ray.intersectBox(box, this.wallPoint);
        if (hit) wallDistance = Math.min(wallDistance, previous.distanceTo(hit));
      }
      const body = new THREE.Sphere(this.player.clone().add(new THREE.Vector3(0, -0.5, 0)), 0.65);
      const head = new THREE.Sphere(this.player, 0.38);
      for (const sphere of [body, head]) {
        if (sphere.containsPoint(previous)) { playerDistance = 0; break; }
        const hit = this.ray.intersectSphere(sphere, this.wallPoint);
        if (hit) playerDistance = Math.min(playerDistance, previous.distanceTo(hit));
      }
      if (wallDistance <= travel && wallDistance <= playerDistance) p.life = 0;
      else if (playerDistance <= travel) { this.damage(p.damage,p.origin); p.life = 0; }
      if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.projectiles.splice(i, 1); }
    }
  }
  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.life -= dt; p.mesh.rotation.y += dt * 2; p.mesh.position.y = 0.6 + Math.sin(this.runTime * 3 + i) * 0.1;
      const distance = Math.hypot(p.mesh.position.x - this.player.x, p.mesh.position.z - this.player.z);
      if (distance < 4) { p.mesh.position.x = THREE.MathUtils.damp(p.mesh.position.x, this.player.x, 3, dt); p.mesh.position.z = THREE.MathUtils.damp(p.mesh.position.z, this.player.z, 3, dt); }
      if (distance < 1.2) { this.reserve = Math.min(360, this.reserve + 24); this.health = Math.min(100, this.health + 6); this.shield = Math.min(60, this.shield + 10); p.life = 0; this.audio.tone(640, 0.15, 'sine', 0.07, 940); this.event('supply', '+24 rounds · +6 health · +10 armor'); }
      if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.pickups.splice(i, 1); }
    }
  }

  particle(position, color, life = 0.4, size = 0.05) {
    if (this.effects.length > 220) return;
    const m = mesh(new THREE.IcosahedronGeometry(size, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })); m.position.copy(position); this.scene.add(m);
    this.effects.push({ mesh: m, life, maxLife: life, velocity: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), gravity: 4 });
  }
  tracer(from, to, color, life) {
    const g = new THREE.BufferGeometry().setFromPoints([from, to]); const m = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })); this.scene.add(m); this.effects.push({ mesh: m, life, maxLife: life });
  }
  syncCamera() {
    const motion = this.options.reducedMotion ? 0 : 1;
    const moving = this.phase === 'playing' && this.moveDirection().lengthSq() > 0.1;
    const bob = moving && this.grounded ? Math.sin(this.stepDistance * 2.1) * 0.025 * motion : 0;
    this.camera.position.copy(this.player); this.camera.position.y += bob;
    this.camera.rotation.set(this.pitch + this.recoil * motion, this.yaw, this.dashTime > 0 ? -0.035 * motion : 0, 'YXZ');
    this.camera.updateWorldMatrix(true, false);
  }

  animate(dt) {
    this.animTime += dt; this.world.update?.(dt, this.animTime);
    for (const c of this.coreNodes) if (!c.collected) { c.crystal.rotation.y += dt * 0.6; c.crystal.position.y = 1.35 + Math.sin(this.animTime * 1.8 + c.id) * 0.12; c.ring.rotation.z += dt * 0.6; }
    this.exitRing.material.opacity = this.cores === this.coreNodes.length ? 0.7 + Math.sin(this.animTime * 3) * 0.2 : 0.35;
    this.exitRing.rotation.z += dt * 0.1;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]; effect.life -= dt;
      if (effect.velocity) { effect.mesh.position.addScaledVector(effect.velocity, dt); effect.velocity.y -= (effect.gravity || 0) * dt; }
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
      if (effect.life <= 0) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); this.effects.splice(i, 1); }
    }
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, 12, dt); this.kick = THREE.MathUtils.damp(this.kick, 0, 18, dt);
    this.aimBlend = THREE.MathUtils.damp(this.aimBlend, this.aim ? 1 : 0, 12, dt);
    const moving = this.phase === 'playing' && this.moveDirection().lengthSq() > 0.1;
    const motion = this.options.reducedMotion ? 0 : 1;
    const bob = moving && this.grounded ? Math.sin(this.stepDistance * 2.1) * 0.025 * motion : 0;
    this.syncCamera();
    const desiredFov = this.aim ? 56 : this.dashTime > 0 ? 86 : 75;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, desiredFov, 12, dt); this.camera.updateProjectionMatrix();
    this.weapon.visible = !['ready', 'won', 'lost'].includes(this.phase);
    const ads = this.aimBlend;
    this.weapon.position.set(0.3 * (1 - ads), -0.27 + ads * 0.115 - Math.abs(bob) - (this.reloading ? Math.sin((1.65 - this.reloadTimer) / 1.65 * Math.PI) * 0.23 : 0), -0.35 + this.kick * 0.065);
    this.weapon.rotation.set(this.kick * 0.035 + (this.reloading ? -0.32 : 0), 0, this.reloading ? -0.28 : -bob * 0.8);
    if (this.flashTimer > 0) {
      // A shot generated during a slow frame must appear in at least one render.
      if (!this.flashJustTriggered) this.flashTimer -= dt;
      this.muzzle.rotation.z = Math.random() * Math.PI;
      if (this.flashTimer <= 0) { this.muzzle.visible = false; this.flashLight.intensity = 0; }
    }
    this.flashJustTriggered = false;
  }

  frame(timestamp) {
    if (this.disposed) return;
    // Catch up ordinary slow frames in small simulation steps. Only extreme stalls
    // (>250 ms) are clipped; focus loss pauses rather than simulating time away.
    const dt = this.lastFrame ? Math.min(0.25, Math.max(0, (timestamp - this.lastFrame) / 1000)) : 0;
    this.lastFrame = timestamp;
    for (let remaining = dt; remaining > 1e-7 && this.phase === 'playing';) {
      const step = Math.min(1 / 120, remaining); this.update(step); remaining -= step;
    }
    this.animate(this.phase === 'paused' ? 0 : dt); this.renderer.render(this.scene, this.camera);
    this.onMarkers(this.captureMarkers());
    this.emitTimer -= dt; if (this.emitTimer <= 0) { this.emit(); this.emitTimer = 0.1; }
    this.frameId = requestAnimationFrame(t => this.frame(t));
  }
  captureMarkers() {
    if(this.phase!=='playing')return [];
    const project=(position)=>{const delta=position.clone().sub(this.camera.position),forward=new THREE.Vector3();this.camera.getWorldDirection(forward);const front=delta.dot(forward)>0;const p=position.clone().project(this.camera);return {x:p.x,y:p.y,front,distance:delta.length(),bearing:Math.atan2(delta.x,-delta.z)+this.yaw};};
    const markers=this.coreNodes.filter(c=>!c.collected).map(c=>({id:`core-${c.id}`,kind:'core',label:CORE_SITES[c.id].name,...project(c.position.clone().add(new THREE.Vector3(0,2.5,0)))}));
    if(this.cores===this.coreNodes.length)markers.push({id:'extraction',kind:'exit',label:'EXTRACTION',...project(this.world.playerSpawn.clone().setY(3))});
    for(const e of this.enemies)if(e.visible&&(e.lastHit>this.runTime-3||e.windup>0)){const p=project(e.group.position.clone().add(new THREE.Vector3(0,2.2,0)));if(p.distance<32)markers.push({id:`enemy-${e.id}`,kind:'enemy',label:e.type==='stalker'?'INTERCEPTOR':'SENTINEL',health:e.health/e.maxHealth,charging:e.windup>0,...p});}
    return markers;
  }
  captureState() {
    const coreMarkers = this.coreNodes.map(c => ({ x: c.position.x, z: c.position.z, id: c.id, collected: c.collected, distance: Math.hypot(c.position.x - this.player.x, c.position.z - this.player.z) }));
    const closest = coreMarkers.filter(c => !c.collected).sort((a, b) => a.distance - b.distance)[0];
    return {
      phase: this.phase, health: Math.ceil(this.health), maxHealth: 100, shield: Math.ceil(this.shield), maxShield: 60,
      ammo: this.ammo, reserve: this.reserve, reloading: this.reloading, reloadProgress: this.reloading ? 1 - this.reloadTimer / 1.65 : 0,
      kills: this.kills, cores: this.cores, totalCores: this.coreNodes.length, time: this.runTime, dashCooldown: this.dashCooldown,
      objective: this.cores === this.coreNodes.length ? (this.extractionProgress>0?'HOLD THE EXTRACTION ZONE':'RETURN TO EXTRACTION') : closest?.distance < 2.8 ? 'HOLD E TO RECOVER MEMORY' : 'RECOVER THE THREE MEMORIES',
      coreProgress:Math.min(1,this.coreProgress/RECOVERY_SECONDS)||0, extractionProgress:Math.min(1,this.extractionProgress/(this.extractionSeconds||EXTRACTION_SECONDS))||0, extractionSeconds:this.extractionSeconds||EXTRACTION_SECONDS, phaseDodges:this.phaseDodges||0, dashCount:this.dashCount||0,
      score: this.score, enemiesAlive: this.enemies.length, headshots: this.headshots, accuracy: this.shotsFired ? Math.round(this.shotsHit / this.shotsFired * 100) : 0,
      difficulty: this.activeDifficulty || this.options.difficulty, player: { x: this.player.x, z: this.player.z, yaw: this.yaw }, coreMarkers,
      nearestCoreDistance: closest?.distance ?? null, interaction: closest?.distance < 2.8 ? `RECOVER // ${CORE_SITES[closest.id].name}` : '', heading: ((-this.yaw * 180 / Math.PI) % 360 + 360) % 360,
      exitDistance: this.world ? Math.hypot(this.player.x - this.world.playerSpawn.x, this.player.z - this.world.playerSpawn.z) : 0,
      exit: this.world ? { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z } : null,
      bounds: this.world?.bounds, pointerFallback: this.pointerFallback,
    };
  }
  emit() { this.onState(this.captureState()); }
  event(type, message, extra = {}) { this.onEvent({ type, message, ...extra }); }

  installDebug() {
    this.debug = {
      teleport: (x, z) => { if (!this.canOccupy(x, z)) throw new Error('Target is inside a collider'); this.player.set(x, 1.7, z); this.emit(); },
      collectCore: i => { const c = this.coreNodes[i]; this.player.set(c.position.x, 1.7, c.position.z); this.recoverCore(c); },
      extract: () => { this.player.copy(this.world.playerSpawn); this.player.y = 1.7; this.extractionProgress=this.extractionSeconds||EXTRACTION_SECONDS; this.update(0.001); },
      damage: n => this.damage(n),
      killAll: () => [...this.enemies].forEach(e => this.killEnemy(e)),
      advance: seconds => { for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) if (this.phase === 'playing') this.update(1 / 60); this.emit(); },
      aimAtEnemy: (index = 0, head = false) => { const e = this.enemies[index]; if (!e) return false; const target = e.group.position.clone().add(new THREE.Vector3(0, this.sentinelAsset ? 1.3 : head ? 1.68 : 1.1, this.sentinelAsset && head ? 0.43 : 0).applyAxisAngle(UP, e.group.rotation.y)); const delta = target.sub(this.player); this.yaw = Math.atan2(-delta.x, -delta.z); this.pitch = Math.atan2(delta.y, Math.hypot(delta.x, delta.z)); this.animate(0); return true; },
      shoot: () => { this.fireTimer = 0; this.shoot(); },
      reload: () => this.reload(),
      dash: () => this.dash(),
      canOccupy: (x, z) => this.canOccupy(x, z),
      colliders: () => this.world.colliders.map(b => ({ min: b.min.toArray(), max: b.max.toArray() })),
      enemyPositions: () => this.enemies.map(e => ({ x: e.group.position.x, z: e.group.position.z, health: e.health })),
    };
  }
  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frameId); this.cleanups.forEach(fn => fn());
    this.audio.dispose(); this.scene?.traverse(o => { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); }); this.renderer?.dispose();
  }
}
