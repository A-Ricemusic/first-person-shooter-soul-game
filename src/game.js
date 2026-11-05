import {fallbackPaint} from './enemy-paint.js';
import {supplyKey,liveSupplies,selectedSupply,clearSupplyFields,selectSupplyRoute,removeSupplyRoute,emptyAmmoAdvice} from './supply-route.js';
import {updateThreatTurn} from './touch-threat-turn.js';
import {updateTouchRouteView} from './touch-route-view.js';
import {inCustodianApproach} from './custodian-approach.js';
import {recordRifleImpact,rifleReadout,rifleConfirmation} from './rifle-readout.js';
import {recordTouchAim,touchAimReadout} from './touch-aim-readout.js';
import {mobileCadence,attackCapacity,attackRecoveryReady,advanceAttackRecovery,resolveMobileAttack,warningDuration,rangedChargeProgress} from './mobile-combat.js';
import {clearTouchRoute,touchRouteStep} from './touch-route-follow.js';
import {worldVerticalFov} from './projection.js';
import {updateTouchVault} from './touch-vault.js';
import {touchRifleTarget} from './touch-assist.js';
import {touchTapTarget} from './touch-targeting.js';
import {touchRecoveryBrake} from './touch-recovery.js';
import {clearTouchApproach,touchApproachStep} from './touch-approach.js';
import {serviceStatus,resetService,updateService} from './suit-service.js';
import {nearbyReceiver} from './recovery-feedback.js';
import {receiverSight} from './receiver-sight.js';
import {focusedCustodianTarget} from './custodian-targets.js';
import {CombatFeedback,fireOrigin,hitNormal,updateCharge} from './combat-feedback.js';
import {nearLowCover} from './control-hints.js';
import {shootBreacher,buildBreacher,poseBreacher} from './breacher.js';
import {CONTACT_WINDUP,fallbackContact,attachContact,contactReach,animateContact,cancelContact} from './contact-discharge.js';
import {prepareCustodianTurn,custodianAim,custodianObjectiveVisible,createCustodian,resetCustodian,updateCustodian,hitCustodian,clearCustodianLines} from './custodian.js';
import {capacitorShot,activateCapacitor,updateCapacitors,resetCapacitors,cancelCapacitors,visualCapacitor} from './capacitors.js';
import {poseHandling,disposeAsset} from './viewmodel.js';
import { facilityFootprints } from './facility-map.js';
import * as THREE from 'three';
import {attachLegs,animateLegs,fallbackDrone} from './drone-motion.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachWarden, animateWarden, steerWarden } from './warden.js';
import MEDICAL from './build84-medical-layout.json';
import { createRole, dutyGoal, hearShot } from './enemy-roles.js';
import { RouteHelp } from './route-help.js';
import { PlayerRoute } from './player-route.js';
import { StaticNavigation } from './navigation.js';
import { buildWorld } from './world.js';
import { advanceUpload } from './upload.js';
import { movePlayer, jumpPlayer, STANDING, profileOf, feetY, updatePosture, toggleCrouch, playerHitProfile } from './movement.js';
import {planVault,startVault,advanceVault,VAULT_SECONDS} from './traversal.js';
import { SoulAudio } from './audio.js';
import { CORE_SITES, RECOVERY_SECONDS, RECOVERY_RADIUS, recoveryDistance, EXTRACTION_SECONDS, EXTRACTION_FOOTPRINT, extractionMargin, extractionDistance, extractionCenter, isInsideExtraction } from './mission.js';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const SENTINEL_RECOVERY_SECONDS = .45;
const DIFFICULTIES = {
  story: { damage: 0.55, health: 0.8, speed: 0.8, fire: 1.35, label: 'Story' },
  standard: { damage: 1, health: 1, speed: 1, fire: 1, label: 'Standard' },
  veteran: { damage: 1.3, health: 1.2, speed: 1.15, fire: 0.8, label: 'Veteran' },
};

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); return m;
}


function wardenEmission(material,opened,charging,hit=false){
  material.color.setHex(opened?0x11343c:0x3b2815);
  material.emissive.setHex(hit?0xd6e6ec:opened?0x269cb3:0xf09336);
  material.emissiveIntensity=hit?1.8:charging?1.5:opened?1.1:.7;
}

/** A single, owned simulation loop. Rendering is separate from game state. */
export class Game {
  constructor({ canvas, onState = () => {}, onEvent = () => {}, onMarkers = () => {} }) {
    this.canvas = canvas; this.onState = onState; this.onEvent = onEvent; this.onMarkers = onMarkers;
    this.touchMode = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches && (globalThis.navigator?.maxTouchPoints || 0) > 0;
    this.mobileLastAttackId=0;this.mobileAttackRecovery=0;this.touchMove={x:0,z:0}; this.touchRecoveryBraked=false;this.touchUse=false; this.touchSprint=false;
    this.weaponSlots={rifle:{ammo:30,reserve:180,reloading:false,reloadTimer:0,fireTimer:0},breacher:{ammo:6,reserve:24,reloading:false,reloadTimer:0,fireTimer:0}};this.activeWeapon='rifle';
    this.phase = 'ready'; this.options = { difficulty: 'standard', sensitivity: 1, touchSensitivity: 1, touchAimAssist: true, touchTapAim: true, touchAutoVault: true, volume: 0.65, reducedMotion: false, quality: 'balanced' };
    this.audio = new SoulAudio(); this.keys = new Set(); this.cleanups = [];
    this.mouseDown = false; this.aim = false; this.dragging = false; this.pointerFallback = false;
    this.yaw = 0; this.pitch = 0; this.animTime = 0; this.runTime = 0; this.lastFrame = 0; this.emitTimer = 0;
    this.enemies = []; this.projectiles = []; this.effects = []; this.pickups = []; this.coreNodes = [];
    this.playerVelocity = new THREE.Vector3(); this.nextEnemyId = 0;
    this.player = new THREE.Vector3(); this.velocityY = 0; this.grounded = true; this.vault=null;
    this.dashVector = new THREE.Vector3(); this.dashTime = 0; this.dashCooldown = 0;
    this.health = 100; this.shield = 60; this.ammo = 30; this.reserve = 180;
    this.kills = 0; this.cores = 0; this.score = 0; this.phaseDodges = 0; this.dashCount = 0; this.phaseInterrupts = 0; this.headshots = 0; this.shotsFired = 0; this.shotsHit = 0; this.assistedShots=0;this.tapAims=0;this.approachAssists=0;this.routeAssists=0;clearTouchRoute(this);clearTouchApproach(this);this.touchFocusUntil=-1;this.touchAssistUntil=-1;this.autoVaults=0;this.touchVaultContact=null;
    this.reloading = false; this.reloadTimer = 0; this.fireTimer = 0; this.lastDamage = -100;
    this.touchAimNotice=null;this.recoil = 0; this.kick = 0; this.aimBlend = 0; this.stepDistance = 0; this.footTimer = 0;
    this.ray = new THREE.Ray(); this.raycaster = new THREE.Raycaster(); this.wallPoint = new THREE.Vector3();
  }

  get ammo(){return this.weaponSlots[this.activeWeapon].ammo} set ammo(v){this.weaponSlots[this.activeWeapon].ammo=v}
  get reserve(){return this.weaponSlots[this.activeWeapon].reserve} set reserve(v){this.weaponSlots[this.activeWeapon].reserve=v}
  get reloading(){return this.weaponSlots[this.activeWeapon].reloading} set reloading(v){this.weaponSlots[this.activeWeapon].reloading=v}
  get reloadTimer(){return this.weaponSlots[this.activeWeapon].reloadTimer} set reloadTimer(v){this.weaponSlots[this.activeWeapon].reloadTimer=v}
  get fireTimer(){return this.weaponSlots[this.activeWeapon].fireTimer} set fireTimer(v){this.weaponSlots[this.activeWeapon].fireTimer=v}
  selectWeapon(name){
    if(this.phase!=='playing'||!this.weaponSlots[name]||name===this.activeWeapon)return;
    this.rifleImpact=null;this.rifleConfirmation=null;this.touchAimNotice=null;this.reloading=false;this.reloadTimer=0;this.activeWeapon=name;this.muzzle.visible=false;this.flashLight.intensity=0;this.emit();
  }
  supply(rifle,shells){this.weaponSlots.rifle.reserve=Math.min(360,this.weaponSlots.rifle.reserve+rifle);this.weaponSlots.breacher.reserve=Math.min(36,this.weaponSlots.breacher.reserve+shells)}
  async init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.touchMode, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.touchMode ? 1 : 1.75));
    this.renderer.shadowMap.enabled = !this.touchMode; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene(); this.combatFeedback=new CombatFeedback(this.scene); this.camera = new THREE.PerspectiveCamera(75, 1, 0.08, 260);
    this.referenceFov=75;this.camera.rotation.order = 'YXZ'; this.scene.add(this.camera);
    this.world = await buildWorld(this.scene,{mobile:this.touchMode});
    this.custodian=await createCustodian(this);
    this.navigation=new StaticNavigation((x,z,r)=>this.canOccupy(x,z,r),this.world.bounds);
    this.player.copy(this.world.playerSpawn); this.player.y = 1.7; this.profile=STANDING; this.crouchRequested=false; this.standBlocked=false;
    this.yaw = Math.atan2(this.player.x, this.player.z); this.pitch = -0.02;
    this.scene.add(new THREE.HemisphereLight(0x9cc6db, 0x1a1c20, 0.8));
    try {
      const asset = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/build104-sentinel.glb`);
      if(!['Optic','ShutterTop','ShutterBottom','VaneLeft','VaneRight'].every(name=>asset.scene.getObjectByName(name)?.isMesh))throw new Error('Incomplete Sentinel rig');
      this.sentinelAsset = asset.scene;
    } catch (_) {
      // Defer exact new geometry until the new URL fails; never silently restore the old body.
      const {default:payload}=await import('./build104-sentinel-fallback.js');
      const bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));
      this.sentinelAsset=(await new GLTFLoader().parseAsync(bytes.buffer,'')).scene;
    }
    try {
      const asset = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/build104-warden.glb`);
      const required = ['ArmorLeft','ArmorRight','Fan','Emitter','WeakpointAnchor','BodyAnchor'];
      if (!required.every(name => asset.scene.getObjectByName(name))) throw new Error('Incomplete Warden rig');
      this.wardenAsset = asset.scene;
    } catch (_) { /* Original primitive Warden remains available if loading fails. */ }
    try { const scene=(await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/build104-interceptor.glb`)).scene;if(!['Optic','ShutterTop','ShutterBottom','VaneLeft','VaneRight'].every(name=>scene.getObjectByName(name)?.isMesh))throw new Error('Incomplete Interceptor rig');this.interceptorAsset=scene; } catch (_) { /* Existing primitive Interceptor geometry retains the candidate paint on download failure. */ }
    try {
      const asset=(await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/contact-discharge.glb`)).scene;
      if(!Array.from({length:6},(_,i)=>asset.getObjectByName('Shutter'+i)?.isMesh).every(Boolean)||!['DischargeAmber','DischargeSteel','DischargeInsulator'].every(n=>asset.getObjectByName(n)?.isMesh)||!asset.getObjectByName('DischargeAmber')?.material?.emissive) { disposeAsset(asset); throw Error('Incomplete discharge'); }
      this.contactAsset=asset;
    } catch (_) { this.contactAsset=fallbackContact(); }
    this.facilityLayout = facilityFootprints(this.world.colliders);
    this.buildWeapon(); buildBreacher(this); this.buildHands(); this.buildCores(); this.buildExtraction(); this.buildPlayerRoute(); this.bindInput(); this.resize();
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
    new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/coil-rifle-handling.glb`, gltf => {
      if(this.disposed){disposeAsset(gltf.scene);return;}
      if(!['RifleBody','ReloadCell','MuzzleAnchor','SightCenter'].every(n=>gltf.scene.getObjectByName(n))){disposeAsset(gltf.scene);return;}
      this.weaponFallback.visible = false;if(this.handsAsset)this.handsAsset.visible=true; const asset = gltf.scene; asset.rotation.y = Math.PI;
      asset.scale.setScalar(0.5); asset.position.z = -0.3;
      this.weapon.add(asset); this.weaponAsset = asset;
      const muzzleAnchor=asset.getObjectByName('MuzzleAnchor');if(muzzleAnchor){asset.updateWorldMatrix(true,true);this.muzzle.position.copy(this.weapon.worldToLocal(muzzleAnchor.getWorldPosition(new THREE.Vector3())));}
      this.reloadCell = asset.getObjectByName("ReloadCell"); if(this.reloadCell)this.cellHome=this.reloadCell.position.clone();
      asset.traverse(obj => { if (obj.isMesh) { obj.frustumCulled = false; obj.castShadow = false; } });
    }, undefined, () => {});
  }

  buildHands() {
    new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/operator-hands.glb`, gltf => {
      if(this.disposed){disposeAsset(gltf.scene);return;}
      this.weapon.add(gltf.scene); this.handsAsset=gltf.scene;gltf.scene.visible=!!this.weaponAsset;
      this.supportHand=gltf.scene.getObjectByName('SupportHand');
      gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;}});
    }, undefined, ()=>{});
  }

  buildCores() {
    this.world.corePositions.forEach((position, i) => {
      // Recoverable cue only. Physical receiver belongs to world and persists.
      const group = new THREE.Group(); group.position.copy(position); group.position.y = 0;
      // A static projected boundary marks the actual grounded interaction reach.
      // Depth testing keeps this cue behind physical cover rather than on top.
      const reach = mesh(new THREE.RingGeometry(RECOVERY_RADIUS-.025,RECOVERY_RADIUS+.025,64),new THREE.MeshBasicMaterial({color:0x8ee8e0,transparent:true,opacity:.24,depthWrite:false}),0,.055,0);
      reach.rotation.x=-Math.PI/2;reach.visible=false;group.add(reach);
      this.scene.add(group); this.coreNodes.push({ group, reach, position: position.clone(), collected: false, id: i });
    });
  }

  buildExtraction() {
    this.exit = new THREE.Group(); this.exit.position.copy(this.world.playerSpawn); this.exit.position.y = 0.04;
    const f=EXTRACTION_FOOTPRINT;
    const shape=new THREE.Shape();shape.moveTo(f.xMin,-f.zMin);shape.lineTo(f.xMax,-f.zMin);shape.lineTo(f.xMax,-f.zMax);shape.lineTo(f.xMin,-f.zMax);shape.closePath();
    const hole=new THREE.Path();hole.moveTo(f.xMin+.06,-f.zMin-.06);hole.lineTo(f.xMin+.06,-f.zMax+.06);hole.lineTo(f.xMax-.06,-f.zMax+.06);hole.lineTo(f.xMax-.06,-f.zMin-.06);hole.closePath();shape.holes.push(hole);
    this.exitBoundary=mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x637b83,transparent:true,opacity:.5,side:THREE.DoubleSide}));this.exitBoundary.rotation.x=-Math.PI/2;this.exitBoundary.position.y=-.034;this.exit.add(this.exitBoundary);
    this.exitBeam = mesh(new THREE.CylinderGeometry(.12, .12, 3, 12, 1, true), new THREE.MeshBasicMaterial({color:0x65ffb7,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),0,4,3.2); this.exitBeam.visible=false; this.exit.add(this.exitBeam);
    const exitLight = new THREE.PointLight(0x65ffb7, 7, 13); exitLight.position.y=2; this.exitBeam.add(exitLight);
    this.scene.add(this.exit);
  }

  buildPlayerRoute() {
    this.routeHelp=new RouteHelp();
    this.playerRoute=new PlayerRoute(this.world,this.coreNodes);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24*12),3));geometry.setDrawRange(0,0);
    this.routeTrace=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x8ee8e0,transparent:true,opacity:.72,depthTest:true,depthWrite:false}));
    this.routeTrace.frustumCulled=false;this.routeTrace.visible=false;this.scene.add(this.routeTrace);
    this.routeGoal=null;this.routeNext=0;
  }
  selectRoute(key='auto') {
    if(this.phase!=='planning')return;
    if(key!=='auto'&&!this.coreNodes.some(c=>`core-${c.id}`===key&&!c.collected))return;
    clearSupplyFields(this);this.supplyRouteStatus='';this.routeHelp.reset();this.routeWaypoint=null;this.routeGoal=key==='auto'?null:key;this.routeManual=key!=='auto';this.routeNext=0;this.updateRouteGoal();this.emit();
  }
  selectSupplyRoute(){return selectSupplyRoute(this);}
  updateRouteGoal() {
    if(this.touchMode&&selectedSupply(this))return;
    const available=this.coreNodes.filter(c=>!c.collected);
    if(!available.length){const key=this.custodian.dead?'extraction':'custodian';if(this.routeGoal!==key){this.routeGoal=key;this.routeNext=0;}return;}
    if(available.some(c=>`core-${c.id}`===this.routeGoal))return;
    const sorted=available.map(c=>({key:`core-${c.id}`,d:this.playerRoute.distance(this.player,`core-${c.id}`)})).sort((a,b)=>a.d-b.d);
    this.routeGoal=sorted[0].key;this.routeManual=false;this.routeNext=0;
  }
  planningPath() { this.updateRouteGoal();return this.playerRoute.path(this.player,this.routeGoal,this.grounded&&!this.vault,profileOf(this)); }

  updateRouteTrace() {
    this.updateRouteGoal();this.routeTrace.visible=false;this.routeWaypoint=null;
    const explicit=this.keys.has('Tab');
    if(explicit)this.routeHelp.reset();
    const local=nearbyReceiver(this.coreNodes.filter(c=>!this.touchUseGoal||this.touchUseGoal===`core-${c.id}`).map(c=>({id:c.id,collected:c.collected,distance:recoveryDistance(this.player,c.position,profileOf(this))})));
    const following=this.touchRouteActive&&this.touchRoute;
    const approaching=this.touchApproachActive&&this.touchApproach||following;
    const goal=following?following.key:approaching?`core-${approaching.id}`:!explicit&&!this.routeManual&&local?`core-${local.id}`:this.routeGoal;
    if(this.routeCacheGoal!==goal){this.routeCacheGoal=goal;this.routeNext=0;this.routePath=[];}
    if(this.routeHelp.goal&&this.routeHelp.goal!==goal)this.routeHelp.reset();
    const walkingTrace=this.touchMode&&(Math.hypot(this.touchMove.x,this.touchMove.z)>.025&&!this.touchUse||approaching);
    if(walkingTrace)this.touchRouteUntil=this.runTime+.8;
    const mobileTrace=this.touchMode&&this.runTime<(this.touchRouteUntil||0);
    const automatic=(this.options.contextualRouteHelp!==false||following)&&(mobileTrace||this.routeHelp.remaining>0)&&(!(this.touchMode&&this.touchUse)||approaching)&&!this.aim&&!this.mouseDown&&!this.channelCore&&!(local&&local.distance<RECOVERY_RADIUS)&&!(serviceStatus(this).valid&&serviceStatus(this).powered&&!serviceStatus(this).spent);
    if(this.phase!=='playing'||(!explicit&&!automatic))return;
    if(this.vault||this.dashTime>0||(profileOf(this).eyeHeight<1.7-1e-6&&!following)||!this.grounded||Math.abs(feetY(this.player,profileOf(this)))>.025){this.routeStatus='Return to floor for ground trace';return;}
    if(approaching)this.routePath=approaching.path;
    else if(this.runTime>=this.routeNext){this.routePath=this.playerRoute.path(this.player,goal,this.grounded,profileOf(this));this.routeNext=this.runTime+.35;}
    const path=this.routePath||[];let join=-1;
    // A cached start or passed corner must never win over a reachable future step.
    // Held approach uses its actual next walking segment; manual tracing can
    // safely shortcut to the furthest remaining point with a clear capsule.
    if(approaching){const i=approaching.index;if(path[i]&&this.playerRoute.clear(this.player,path[i]))join=i;}
    else for(let i=Math.min(path.length-1,12);i>=1;i--)if(this.playerRoute.clear(this.player,path[i])){join=i;break;}
    if(join<0){this.routeStatus='No ground route from this position';return;}
    this.routeStatus='';
    if(automatic){
      const to=path[join];
      if(to&&Math.hypot(to.x-this.player.x,to.z-this.player.z)>.5&&this.playerRoute.clear(this.player,to)){
        const d=Math.hypot(to.x-this.player.x,to.z-this.player.z),t=Math.min(1,(this.touchMode?5:2)/d);
        this.routeWaypoint={x:this.player.x+(to.x-this.player.x)*t,z:this.player.z+(to.z-this.player.z)*t,goal,label:goal.startsWith('core-')?CORE_SITES[Number(goal.split('-')[1])].name:goal.startsWith('supply-')?'SUPPLY':goal==='custodian'?'CUSTODIAN':'EXTRACTION'};
      }
    }
    const a=this.routeTrace.geometry.attributes.position;let count=0,remaining=12,spacing=.8,from=this.player;
    for(let i=join;i<path.length&&remaining>0;i++){
      const to=path[i],dx=to.x-from.x,dz=to.z-from.z,len=Math.hypot(dx,dz);if(len<.001)continue;
      const limit=Math.min(len,remaining),ux=dx/len,uz=dz/len;
      for(let d=spacing;d<limit&&count<96;d+=1.15){const x=from.x+ux*d,z=from.z+uz*d;
        for(const sign of [-1,1]){a.setXYZ(count++,x-ux*.22+uz*.16*sign,.065,z-uz*.22-ux*.16*sign);a.setXYZ(count++,x,.065,z);}}
      spacing=.45;remaining-=limit;from=to;
    }
    a.needsUpdate=true;this.routeTrace.geometry.setDrawRange(0,count);this.routeTrace.visible=count>0;
    this.routeTrace.material.opacity=this.touchMode&&!walkingTrace&&this.routeHelp.remaining<=0?.72*Math.min(1,Math.max(0,(this.touchRouteUntil-this.runTime)/.8)):.72;
  }

  bindInput() {
    const listen = (target, event, callback, opts) => { target.addEventListener(event, callback, opts); this.cleanups.push(() => target.removeEventListener(event, callback, opts)); };
    listen(window, 'resize', () => {this.clearInput();this.resize();});
    listen(document, 'keydown', e => {
      if (e.code === 'Escape' && ['playing','planning'].includes(this.phase)) { this.pause(); return; }
      if (this.phase !== 'playing' || e.target.closest('input,select,textarea,dialog')) return;
      if (e.repeat && !this.keys.has(e.code)) return; // Held across pause requires release before reuse.
      // Ctrl is sprint: suppress Ctrl+W/R/S browser shortcuts while the game owns input.
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyE', 'KeyC', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (e.code === 'Digit1') this.selectWeapon('rifle');
        if (e.code === 'Digit2') this.selectWeapon('breacher');
        if (e.code === 'KeyC') this.action('crouch');
        if (e.code === 'KeyR') this.reload();
        if (e.code === 'KeyE') this.interact();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.dash();
        if (e.code === 'Space') this.action('jump');
      }
      this.keys.add(e.code);
    });
    listen(document, 'keyup', e => {this.keys.delete(e.code);if(e.code==='Tab'){this.routeTrace.visible=false;this.routeStatus='';}});
    listen(this.canvas, 'contextmenu', e => e.preventDefault());
    listen(this.canvas, 'mousedown', e => {
      if (this.touchMode || this.phase !== 'playing') return;
      this.audio.wake(); if (e.button === 0) this.mouseDown = true; if (e.button === 2) this.aim = true;
      this.dragging = true;
      if (!document.pointerLockElement && !this.pointerFallback) this.requestLock();
    });
    listen(document, 'mouseup', e => { if (e.button === 0) this.mouseDown = false; if (e.button === 2) this.aim = false; this.dragging = e.buttons !== 0; });
    listen(document, 'mousemove', e => {
      if (this.touchMode || this.phase !== 'playing' || (document.pointerLockElement !== this.canvas && !(this.pointerFallback && this.dragging))) return;
      const sensitivity = clamp(Number(this.options.sensitivity) || 1, 0.2, 3) * (this.aim ? 0.00125 : 0.002);
      this.yaw -= e.movementX * sensitivity; this.pitch = clamp(this.pitch - e.movementY * sensitivity, -1.44, 1.44);
    });
    listen(document, 'pointerlockchange', () => {
      // Map close can precede the queued unlock event. Consume that known
      // release without interpreting it as a fresh loss of gameplay focus.
      if(this.planningUnlock && document.pointerLockElement!==this.canvas){this.planningUnlock=false;if(this.phase==='playing')this.requestLock();return;}
      if(document.pointerLockElement===this.canvas)this.planningUnlock=false;
      if(!this.touchMode&&document.pointerLockElement!==this.canvas&&this.phase==='playing'&&!this.pointerFallback)this.pause();
    });
    listen(document, 'pointerlockerror', () => this.enableFallback());
    listen(window, 'blur', () => { if (['playing','planning'].includes(this.phase)) this.pause(); });
    listen(document, 'visibilitychange', () => { if (document.hidden && ['playing','planning'].includes(this.phase)) this.pause(); });
    listen(this.canvas, 'webglcontextlost', e => { e.preventDefault(); this.pause(); this.event('error', 'Graphics context lost. Reload the page to reconnect.'); });
  }

  requestLock() {
    if (this.touchMode) return;
    try { const result = this.canvas.requestPointerLock?.(); if (result?.catch) result.catch(() => this.enableFallback()); if (!this.canvas.requestPointerLock) this.enableFallback(); }
    catch (_) { this.enableFallback(); }
  }
  enableFallback() {
    if (this.pointerFallback) return;
    this.pointerFallback = true; this.event('notice', 'Mouse capture unavailable. Hold a mouse button and drag to look.');
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / Math.max(1, h); this.camera.fov=worldVerticalFov(this.referenceFov??75,this.camera.aspect,this.touchMode);this.camera.updateProjectionMatrix(); this.renderDirty=true;
  }

  setSettings(options = {}) {
    if(options.difficulty && options.difficulty!==this.options.difficulty)this.invalidateAnchor();
    this.options = { ...this.options, ...options }; this.routeHelp?.reset();this.routeWaypoint=null;if(this.routeTrace)this.routeTrace.visible=false;this.routePath=[];this.routeNext=0; this.audio.setVolume(this.options.volume);
    if (this.renderer && options.quality) { this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.quality === 'low' ? 1 : options.quality === 'high' ? (this.touchMode?1.5:2) : (this.touchMode?1:1.5))); this.renderer.shadowMap.enabled = options.quality === 'high' || (!this.touchMode && options.quality !== 'low'); }
    this.resize?.();
  }
  invalidateAnchor() { this.finaleAnchor=null; this.anchorInvalidated=true; }
  canRetryAnchor() { return this.phase==='lost' && !!this.finaleAnchor && !this.anchorInvalidated && this.activeDifficulty===this.options.difficulty; }
  earnAnchor() {
    if(this.finaleAnchor || this.anchorInvalidated)return;
    const stats={};for(const k of ['kills','score','phaseDodges','dashCount','phaseInterrupts','headshots','shotsFired','shotsHit','assistedShots','tapAims','approachAssists','routeAssists','autoVaults'])stats[k]=this[k];
    const snapshot={difficulty:this.activeDifficulty,stats,cores:this.coreNodes.map(c=>c.collected),encounters:[...this.encounters],caps:this.world.capacitors.map(b=>b.state==='intact'?'intact':'spent'),actors:this.enemies.map(e=>({id:e.id,type:e.type,role:e.role,home:e.home.toArray(),health:e.health,maxHealth:e.maxHealth}))};
    const freeze=o=>{Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v)});return Object.freeze(o)};
    this.finaleAnchor=freeze(snapshot);
  }
  retryAnchor() {
    if(!this.canRetryAnchor())return false;
    const anchor=this.finaleAnchor, placements=[];
    // Validate the complete finite plan before destroying the failed life. Never drop an actor.
    for(const actor of anchor.actors){
      const home=new THREE.Vector3(...actor.home);
      const point=[home,...this.world.spawnPoints].find(p=>this.canOccupy(p.x,p.z,.55)&&Math.hypot(p.x-this.world.playerSpawn.x,p.z-this.world.playerSpawn.z)>=8&&placements.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=1.2));
      if(!point){this.event('notice','Uplink retry unavailable: defender placement blocked. Start fresh.');return false;}
      placements.push(point.clone());
    }
    this.resetRun({}, {anchor,placements,time:this.runTime,retries:(this.anchorRetries||0)+1});return true;
  }
  start(options = {}) { this.resetRun(options); }
  resetRun(options = {}, retry = null) {
    if (!this.loaded) return;
    this.lastFrame=0;this.emitTimer=0;this.planningUnlock=false;
    this.routeGoal=null;this.routeManual=false;this.routePath=[];this.routeNext=0; this.setSettings(options); if(!retry){this.finaleAnchor=null;this.anchorInvalidated=false;this.anchorRetries=0;} this.audio.clearTransient();this.audio.wake(); this.clearRun(); resetCapacitors(this.world.capacitors); this.canvas.tabIndex = -1; this.canvas.focus({ preventScroll: true });
    this.activeDifficulty = this.options.difficulty; this.extractionSeconds=this.activeDifficulty==='story'?4:this.activeDifficulty==='veteran'?8:EXTRACTION_SECONDS; this.difficulty = DIFFICULTIES[this.activeDifficulty] || DIFFICULTIES.standard;
    this.activeWeapon='rifle';this.weaponSlots.rifle={ammo:30,reserve:180,reloading:false,reloadTimer:0,fireTimer:0};this.dashVector.set(0,0,0);this.weaponSlots.breacher={ammo:6,reserve:24,reloading:false,reloadTimer:0,fireTimer:0};
    this.health = 100; this.shield = 60; this.ammo = 30; this.reserve = 180; this.kills = 0; this.cores = 0; this.score = 0; this.phaseDodges = 0; this.dashCount = 0; this.phaseInterrupts = 0; this.headshots = 0; this.shotsFired = 0; this.shotsHit = 0; this.assistedShots=0;this.tapAims=0;this.approachAssists=0;this.routeAssists=0;clearTouchRoute(this);clearTouchApproach(this);this.touchFocusUntil=-1;this.touchAssistUntil=-1;this.autoVaults=0;this.touchVaultContact=null;
    resetService(this); this.serviceDamaged=false; this.nextWarning=0; this.coreProgress = 0; this.channelCore = null; this.extractionProgress = 0; this.extractionBuffer = 0; this.extractionWave = false; this.playerVelocity.set(0, 0, 0);
    this.damageSource=null; this.damageOrigin=null; this.runTime = 0; this.lastDamage = -100; this.dashCooldown = 0; this.dashTime = 0; this.invulnerable = 0; this.reloading = false; this.fireTimer = 0; this.velocityY = 0; this.grounded = true; this.vault=null;
    this.aimBlend = 0; this.recoil = 0; this.kick = 0; this.stepDistance = 0; this.footTimer = 0; this.flashTimer = 0; this.flashJustTriggered = false;
    this.muzzle.visible = false; this.flashLight.intensity = 0; this.referenceFov=75;this.camera.fov=worldVerticalFov(75,this.camera.aspect,this.touchMode);this.camera.updateProjectionMatrix();
    this.player.copy(this.world.playerSpawn); this.player.y = 1.7; this.profile=STANDING; this.crouchRequested=false; this.standBlocked=false;
    this.yaw = Math.atan2(this.player.x, this.player.z); this.pitch = 0;
    this.coreNodes.forEach(core => { core.collected = false; core.group.visible = true; this.world.setCoreState?.(core.id, false); });
    this.exitBoundary.material.color.setHex(0x637b83); this.exitBeam.visible = false;
    this.contactHint=false; this.crouchLearned=false; resetCustodian(this); this.encounters = new Set(); this.phaseCueAt = -100;
    if(retry){
      const {anchor,placements}=retry;this.runTime=retry.time;this.anchorRetries=retry.retries;
      Object.assign(this,anchor.stats);this.cores=anchor.cores.filter(Boolean).length;
      this.coreNodes.forEach((c,i)=>{c.collected=anchor.cores[i];c.group.visible=!c.collected;this.world.setCoreState?.(c.id,c.collected)});
      this.encounters=new Set(anchor.encounters);
      this.world.capacitors.forEach((b,i)=>{b.state=anchor.caps[i];visualCapacitor(b,this.options.reducedMotion)});
      anchor.actors.forEach((a,i)=>{this.spawnEnemy(placements[i],a.type,i,a.role);const e=this.enemies.at(-1);e.id=a.id;e.health=a.health;e.maxHealth=a.maxHealth;e.home.fromArray(a.home)});
      this.nextEnemyId=Math.max(0,...anchor.actors.map(a=>a.id));
      this.custodian.active=true;this.custodian.cooldown=2.5;
    }else this.spawnEnemy(new THREE.Vector3(0,0,22),'warden',5,'guard');
    this.phase = 'playing'; this.audio.setActive(true); this.animate(0); this.requestLock();
    this.event('phase',retry?'UPLINK RETRY · Cached memories, fresh suit. Custodian reset.':this.touchMode?'Tap the guard to aim, then hold FIRE. Swipe the scene to turn. DASH breaks its charge.':'Induction guard ahead. Break its amber charge with Shift, aim at its optic, or flank via either side.'); this.emit();
  }
  restart(options = {}) { this.start(options); }
  openPlanning() {
    if (this.phase !== 'playing') return;
    this.planningUnlock=document.pointerLockElement===this.canvas;
    this.phase = 'planning'; this.lastFrame = 0; this.clearInput(); this.audio.setActive(false);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    this.emit();
  }
  closePlanning() {
    if (this.phase !== 'planning') return;
    this.phase = 'paused'; this.resume();
  }
  pause() {
    if (!['playing','planning'].includes(this.phase)) return;
    this.phase = 'paused'; this.audio.setActive(false); this.clearInput(); if (document.pointerLockElement === this.canvas) document.exitPointerLock?.(); this.emit();
  }
  resume() { if (this.phase !== 'paused') return; this.phase = 'playing'; this.lastFrame = 0; this.clearInput(); this.canvas.focus({ preventScroll: true }); this.audio.wake(); this.audio.setActive(true); this.requestLock(); this.emit(); }
  clearInput() { this.rifleConfirmation=null;this.touchAimNotice=null;this.touchThreatTurn=null;this.touchThreatCue=null;clearTouchRoute(this);clearTouchApproach(this);this.touchFocusUntil=-1;this.touchRecoveryBraked=false;this.touchVaultContact=null;this.touchAssistUntil=-1;this.touchRouteUntil=0;this.touchInput?.clear(); this.touchMove.x=0;this.touchMove.z=0;this.touchUse=false;this.touchSprint=false; if(this.suitService)this.suitService.progress=0; if(this.routeTrace)this.routeTrace.visible=false;this.routeHelp?.clearInput();this.routeWaypoint=null;if(!['paused','planning','playing'].includes(this.phase))this.routeHelp?.reset();this.routeStatus='';this.routeNext=0;this.routePath=[]; this.keys.clear(); this.mouseDown = false; this.aim = false; this.dragging = false; }
  clearRun() {
    this.rifleImpact=null;
    this.mobileAttackRecovery=0;this.mobileLastAttackId=0;
    this.routeHelp?.reset();this.routeWaypoint=null;this.nextEnemyId=0;
    this.vault=null; this.combatFeedback?.clear();
    this.clearInput(); if(this.custodian){clearCustodianLines(this.custodian);this.custodian.coordination.reset();}
    [...this.enemies, ...this.projectiles, ...this.effects, ...this.pickups].forEach(item => {
      const object = item.mesh || item.group;
      if (object) { this.scene.remove(object); object.traverse(node => { if (node.isInstancedMesh) node.dispose(); if (!node.userData.sharedGeometry) node.geometry?.dispose(); if (Array.isArray(node.material)) node.material.forEach(m => m.dispose()); else node.material?.dispose(); }); }
    });
    this.enemies = []; this.projectiles = []; this.effects = []; this.pickups = [];clearSupplyFields(this);this.supplyRouteStatus='';
  }

  spawnWave(count) {
    for (let i = 0; i < count; i++) {
      const points = this.world.spawnPoints.filter(p => p.distanceTo(this.player) > 10);
      const position = (points.length ? points : this.world.spawnPoints)[(this.kills + i * 3 + this.cores) % (points.length || this.world.spawnPoints.length)];
      if (!position) continue;
      this.spawnEnemy(position.clone(), i % 3 === 2 ? 'stalker' : 'sentinel', i,'hunter');
    }
  }
  spawnEnemy(position, type = 'sentinel', offset = 0, role = 'hunter') {
    const group = new THREE.Group(); group.position.copy(position); group.position.y = 0;
    const armor = new THREE.MeshStandardMaterial(fallbackPaint(type==='warden'?'warden':type==='stalker'?'interceptor':'sentinel'));
    const black = new THREE.MeshStandardMaterial({ color: 0x0e171d, roughness: 0.75, metalness: 0.45 });
    let red = new THREE.MeshStandardMaterial({ color: 0xff693c, emissive: 0xff341c, emissiveIntensity: .65 });
    let droneRig;
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
    if (type!=='warden') {
      [...group.children].forEach(child => { if (child !== light) child.visible = false; });
      const source=type==='stalker'?this.interceptorAsset:this.sentinelAsset;
      const authored=source?source.clone(true):fallbackDrone(type==='stalker');
      authored.traverse(node => { if (node.isMesh) { if(source)node.material = node.material.clone(); node.userData.sharedGeometry = !!(type==='stalker'?this.interceptorAsset:this.sentinelAsset); node.castShadow = true; } });
      group.add(authored);
      red=authored.getObjectByName('Optic').material;
      droneRig={model:authored,top:authored.getObjectByName('ShutterTop'),bottom:authored.getObjectByName('ShutterBottom'),vanes:[authored.getObjectByName('VaneLeft'),authored.getObjectByName('VaneRight')],previous:position.clone(),speed:0};
      droneRig.legs=attachLegs(authored,group);
      droneRig.topY=droneRig.top.position.y;droneRig.bottomY=droneRig.bottom.position.y;
    }
    let wardenRig;
    if(type==='warden' && this.wardenAsset) {
      [...group.children].forEach(child => { if(child!==light)child.visible=false; });
      wardenRig=attachWarden(this.wardenAsset,group);
      red=wardenRig.emitters[0];
      wardenEmission(red,false,false);
    } else if(type==='warden') {
      wardenEmission(red,false,false);
      // Broad segmented induction shoulders remain distinct from the round drones.
      const shell=new THREE.MeshStandardMaterial(fallbackPaint('warden'));
      for(const x of [-.68,.68])group.add(mesh(new THREE.BoxGeometry(.38,.95,.6),shell,x,1.3,0));
      group.add(mesh(new THREE.TorusGeometry(.42,.07,8,24),red,0,1.3,.4));
      group.add(mesh(new THREE.SphereGeometry(.24,12,8),red,0,2,.3));
    }
    const contactRig=attachContact(this.contactAsset,group,type,type==='warden'&&!this.wardenAsset);
    this.enemies.push({ contactRig, contactWindup:0, meleeCooldown:0, fireRecovery:0, ...createRole(position,role), id: ++this.nextEnemyId, lastHit: -100, lastAttack: -100, droneRig, wardenRig, group, leftLeg, rightLeg, red, light, type, health: (type === 'warden' ? 150 : type === 'stalker' ? 70 : 100) * this.difficulty.health, maxHealth: (type === 'warden' ? 150 : type === 'stalker' ? 70 : 100) * this.difficulty.health, cooldown: 1 + offset * 0.3, windup: 0, target: position.clone(), avoidSign: offset % 2 ? 1 : -1, phase: offset * 1.7, stuck: 0, visible: false });
  }

  traversalWorld() {
    const actors=this.enemies.map(e=>({min:{x:e.group.position.x-.45,y:0,z:e.group.position.z-.45},max:{x:e.group.position.x+.45,y:2.1,z:e.group.position.z+.45}}));
    return {...this.world,colliders:[...this.world.colliders,...actors]};
  }

  reload() {
    if (this.phase !== 'playing' || this.reloading || this.ammo === (this.activeWeapon==='breacher'?6:30) || this.reserve <= 0) return;
    this.reloading = true; this.reloadTimer = this.activeWeapon==='breacher'?.55:1.65; this.audio.reload(); this.event('reload', 'Reloading'); this.emit();
  }
  dash() {
    if (this.vault || this.phase !== 'playing' || this.dashCooldown > 0) return;
    this.dashVector.copy(this.moveDirection());
    if (this.dashVector.lengthSq() < 1e-12) this.dashVector.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.dashVector.normalize();
    clearTouchRoute(this,true);clearTouchApproach(this,true);this.dashCount++; this.dashTime = 0.22; this.invulnerable = 0.4; this.dashCooldown = 4.5; this.audio.dash();
    this.event('dash', 'SOUL SHIFT');
    for (let i = 0; i < 12; i++) this.particle(this.player.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() - 1, (Math.random() - 0.5) * 0.6)), 0x62eeff, 0.8, 0.08);
  }
  interact() {
    if (this.phase !== 'playing'||!this.grounded||this.vault) return;
    const core = this.coreNodes.find(c => !c.collected && (!this.touchUseGoal||this.touchUseGoal===`core-${c.id}`) && recoveryDistance(this.player,c.position,profileOf(this))<RECOVERY_RADIUS);
    // Local receiver/service feedback already describes reach and availability.
    // An idle E press must not replace current combat or upload notices.
    if (!core) return;
    this.channelCore = core;
  }
  recoverCore(core) {
    if (this.phase !== 'playing' || core.collected) return;
    core.collected = true; core.group.visible = false; this.cores++; this.score += 1000;
    const heal = this.activeDifficulty === 'story' ? 30 : this.activeDifficulty === 'veteran' ? 10 : 20;
    this.health = Math.min(100, this.health + heal); this.shield = Math.min(60,this.shield+(this.activeDifficulty==='story'?60:35)); this.supply(60,8);
    this.world.setCoreState?.(core.id,true); this.coreProgress=0; this.channelCore=null;
    this.audio.core(); this.event('core', `${CORE_SITES[core.id].name} // MEMORY SECURED +1000`);
    this.event('memory', '', { ...CORE_SITES[core.id], id:core.id });
    for (let i = 0; i < (this.options.reducedMotion?0:6); i++) this.particle(core.position.clone().add(new THREE.Vector3(0, .85, 0)), 0x4297a6, .35, .025);
    if (this.cores < this.coreNodes.length) this.event('notice','Memory secured. Supplies restored. Choose your next archive.');
    else { this.custodian.active=true; this.custodian.cooldown=2.5; this.spawnWave(2); this.earnAnchor(); this.event('notice','UPLINK CACHE EARNED · MEMORIES SECURED · STATION COUNTERMEASURE ARMING. Disable the three Custodian coils to release the uplink.'); }
    this.emit();
  }

  emitShotNoise(origin) {
    if(this.phase!=='playing')return;
    const point=origin.clone();
    for(const enemy of this.enemies)hearShot(enemy,point);
  }

  touchRifleTarget(direction) { return touchRifleTarget(this,direction); }

  tapAimAt(clientX,clientY) {
    if(!this.touchMode||this.options.touchTapAim===false||this.phase!=='playing'||this.vault)return false;
    const r=this.canvas.getBoundingClientRect();
    if(!r.width||!r.height||clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return false;
    const target=touchTapTarget(this,new THREE.Vector2((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2));
    if(!target){recordTouchAim(this,false);this.emit();return false;}
    const delta=target.point.sub(this.player),pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
    // syncCamera adds current recoil; compensate so the rendered centre, not
    // only the stored base pitch, points at the actual tapped surface.
    const basePitch=pitch-this.recoil*(this.options.reducedMotion?0:1);if(Math.abs(basePitch)>1.44){recordTouchAim(this,false);this.emit();return false;}
    this.yaw=Math.atan2(-delta.x,-delta.z);this.pitch=basePitch;
    recordTouchAim(this,true);this.tapAims++;this.touchFocusUntil=this.runTime+.25;this.syncCamera();this.emit();return true;
  }

  shoot() {
    if(this.vault)return;
    this.touchAimNotice=null;
    if(this.activeWeapon==='breacher'){shootBreacher(this);return;}
    if (this.fireTimer > 0 || this.reloading || this.phase !== 'playing') return;
    if (this.ammo <= 0) { this.reload(); if (!this.reloading) { this.fireTimer = 0.4; this.audio.tone(100, 0.04, 'square', 0.1); this.event('notice', emptyAmmoAdvice(this)); } return; }
    this.ammo--; this.shotsFired++; this.fireTimer = 0.105; this.recoil = Math.min(0.1, this.recoil + 0.018); this.kick = 1;
    this.emitShotNoise(this.player);
    this.audio.shoot(); this.muzzle.visible = true; this.flashLight.intensity = 5; this.flashTimer = 0.045; this.flashJustTriggered = true;
    const direction = new THREE.Vector3(); this.camera.getWorldDirection(direction);
    const assistance=this.touchRifleTarget(direction);
    if(assistance){direction.copy(assistance.direction);this.assistedShots++;this.touchAssistUntil=this.runTime+.18;}
    const spread = this.aim ? 0.0014 : 0.006; direction.x += (Math.random() - 0.5) * spread; direction.y += (Math.random() - 0.5) * spread; direction.normalize();
    this.ray.set(this.player, direction); let distance = 120, hit = null, headshot = false, actorNormal=null;
    this.raycaster.set(this.player,direction);
    const propHit=capacitorShot(this.ray,this.raycaster,this.world.capacitors,this.world.colliders);
    distance=propHit.distance;
    for (const enemy of this.enemies) {
      const body = new THREE.Sphere(enemy.group.position.clone().add(new THREE.Vector3(0, this.sentinelAsset ? 1.3 : 1.04, 0)), this.sentinelAsset ? 0.68 : 0.53);
      const head = new THREE.Sphere(enemy.group.position.clone().add(new THREE.Vector3(0, enemy.type==='warden' ? 2 : 1.3, enemy.type==='warden' ? .3 : .43).applyAxisAngle(UP, enemy.group.rotation.y)), 0.24);
      const h = this.ray.intersectSphere(head, new THREE.Vector3());
      let b,enemyNormal=direction.clone().negate();
      if (enemy.wardenRig || enemy.droneRig) {
        // Authored shoulders/skids are physical body targets; the old sphere both
        // missed visible armor edges and admitted empty-space hits. Precision
        // remains the same fixed 0.24m sphere, independent of shutter motion.
        enemy.group.updateWorldMatrix(true, true);
        this.raycaster.set(this.player, direction);
        const intersection=this.raycaster.intersectObject((enemy.wardenRig||enemy.droneRig).model, true)[0]; b=intersection?.point; enemyNormal=hitNormal(intersection,direction);
      } else b = this.ray.intersectSphere(body, new THREE.Vector3());
      const precision = h && h.distanceTo(this.player)<distance;
      const point = precision ? h : b;
      if (point && point.distanceTo(this.player) < distance) { distance = point.distanceTo(this.player); hit = enemy; headshot = !!precision; actorNormal=precision?point.clone().sub(head.center).normalize():enemyNormal; }
    }
    this.custodian.group.updateWorldMatrix(true,true);
    let bossHit=this.raycaster.intersectObject(this.custodian.model,true)[0];
    if(bossHit&&bossHit.distance<distance){distance=bossHit.distance;hit=null;}else bossHit=null;
    const end = this.player.clone().addScaledVector(direction, distance);
    const muzzle = new THREE.Vector3(); this.muzzle.getWorldPosition(muzzle); this.tracer(muzzle, end, 0x9cfaff, 0.055);
    if(bossHit) {
      const index=bossHit.object.userData.coil,coil=this.custodian.coils[index];
      const live=this.custodian.active&&!this.custodian.dead&&coil?.hp>0;
      const exposed=this.custodian.open>0&&!bossHit.object.userData.shutter;
      hitCustodian(this,bossHit);
      recordRifleImpact(this,live?(coil.hp<=0?'kill':exposed?'hit':'armor'):'cover',live?`COIL ${['I','II','III'][index]} ${coil.hp<=0?'OFF':exposed?'HIT':'ARMOR'}`:'INERT COVER');
    } else if (hit) {
      const damage=headshot ? 82 : hit.type==='warden' && !(hit.armorOpen>0) ? 17 : 34;
      this.shotsHit++; hit.lastHit=this.runTime; this.audio.hit(headshot); hit.health -= damage;
      hit.red.emissive.setHex(0xffffff); hit.hitFlash = 0.08;
      hit.feedbackKind=headshot?'critical':hit.type==='warden'&&!(hit.armorOpen>0)?'armor':'damage';this.combatFeedback.impact(end,actorNormal,hit.health<=0?'kill':hit.feedbackKind,this.options.reducedMotion);
      this.event('hit', headshot ? 'CRITICAL' : '', { headshot, damage });
      recordRifleImpact(this,hit.health<=0?'kill':hit.feedbackKind,hit.health<=0?'TARGET DOWN':hit.feedbackKind==='armor'?'ARMOR HIT':headshot?'OPTIC HIT':'TARGET HIT');
      if (hit.health <= 0) this.killEnemy(hit, headshot);
    } else { if(propHit.bank)activateCapacitor(this,propHit.bank); if(propHit.point)this.combatFeedback.impact(propHit.point,propHit.normal,'surface',this.options.reducedMotion);recordRifleImpact(this,propHit.point?'cover':'miss',propHit.bank?'CAPACITOR':propHit.point?'COVER':'NO IMPACT'); }
    this.event('shot', '', { ammo: this.ammo });
  }

  killEnemy(enemy, headshot = false) {
    const index = this.enemies.indexOf(enemy); if (index === -1) return;
    if(enemy.windup>0||enemy.contactWindup>0)resolveMobileAttack(this);
    this.enemies.splice(index, 1); this.kills++; this.score += headshot ? 180 : 100; if (headshot) this.headshots++;
    const identity = enemy.type === 'warden' ? 'WARDEN' : enemy.type === 'stalker' ? 'INTERCEPTOR' : 'SENTINEL';
    this.audio.kill(); this.event('kill', `${identity} // ${headshot ? 'CRITICAL +180' : 'NEUTRALIZED +100'}`, { headshot });
    for (let i = 0; i < 12; i++) this.particle(enemy.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)), i % 2 ? 0x73efff : 0xff9a57, 0.8, 0.08);
    // Every enemy leaves a guaranteed supply; aggressive play sustains the fight.
    const pickup = mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0x80ffff, emissive: 0x21b7c5, emissiveIntensity: 2 }), enemy.group.position.x, 0.5, enemy.group.position.z);
    this.scene.add(pickup); this.pickups.push({ id:this.pickupSerial=(this.pickupSerial||0)+1,mesh: pickup, life: 90 });
    this.scene.remove(enemy.group); enemy.group.traverse(node => { if (node.isInstancedMesh) node.dispose(); if (!node.userData.sharedGeometry) node.geometry?.dispose(); node.material?.dispose(); });
    this.emit();
  }

  action(name) {
    if(this.phase!=='playing')return;
    this.audio.wake();this.touchVaultContact=null;
    if(name==='reload')this.reload();
    if(name==='dash')this.dash();
    if(name==='crouch')toggleCrouch(this);
    if(name==='swap')this.selectWeapon(this.activeWeapon==='rifle'?'breacher':'rifle');
    if(name==='ads')this.aim=!this.aim;
    if(name==='sprint')this.touchSprint=!this.touchSprint;
    if(name==='jump'&&!this.vault){clearTouchRoute(this,true);clearTouchApproach(this,true);const d=this.moveDirection();if(d.lengthSq()<.01)d.set(-Math.sin(this.yaw),0,-Math.cos(this.yaw));d.normalize();if(!startVault(this,this.traversalWorld(),d))jumpPlayer(this,this.world);}
  }
  useHeld(){return this.touchUse||this.keys.has('KeyE')}
  moveDirection() {
    if(this.touchMode)return new THREE.Vector3(this.touchMove.x,0,this.touchMove.z).applyAxisAngle(UP,this.yaw);
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
      const clearance=box.uplink&&radius>=.45?Math.max(radius,1.02):radius;
      if ((x - nearestX) ** 2 + (z - nearestZ) ** 2 < clearance * clearance) return false;
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

  damage(amount, from = null, attacker = null) {
    if (this.phase !== 'playing') return;
    if(this.invulnerable>0){if(from){this.phaseDodges++;this.score+=75;this.event('phaseDodge','PHASE EVADE +75');}return;}
    if(amount>0){this.serviceDamaged=true;if(this.suitService)this.suitService.progress=0;}
    this.damageSource=attacker&&(this.enemies.includes(attacker)||(attacker===this.custodian&&attacker.active&&!attacker.dead))?attacker:null;
    this.damageOrigin=from?from.clone():null;
    if(this.damageSource)attacker.lastAttack=this.runTime;
    amount *= this.difficulty.damage; const absorbed = Math.min(this.shield, amount); this.shield -= absorbed; this.health -= amount - absorbed;
    this.lastDamage = this.runTime; this.audio.hurt(); this.event('damage', '', { amount, direction: from ? Math.atan2(from.x-this.player.x,-(from.z-this.player.z))+this.yaw : null });
    if (this.health <= 0) { this.health = 0; this.finish(false); } this.emit();
  }
  finish(won) {
    this.combatFeedback?.clear();for(const e of this.enemies)if(e.chargeLine)e.chargeLine.visible=false;
    cancelCapacitors(this.world.capacitors);
    for(const e of this.enemies){e.contactWindup=0;e.contactFlash=0;animateContact(e,0);}
    clearCustodianLines(this.custodian); this.vault=null; this.phase = won ? 'won' : 'lost';for(const e of this.enemies){e.hitFlash=0;updateCharge(this,e);} this.audio.setActive(false, false); this.clearInput();
    if (won) { this.invalidateAnchor(); this.score += Math.round(this.health * 10 + Math.max(0, 600 - this.runTime) * 4); this.audio.win(); } else this.audio.lose();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
    this.event(won ? 'win' : 'lose', won ? 'SIGNAL RESTORED. YOU BROUGHT THEM HOME.' : 'SIGNAL LOST. EVERY SOUL DESERVES ANOTHER CHANCE.'); this.emit();
  }

  update(dt) {
    if(this.phase !== 'playing')return;
    this.runTime += dt; for(const slot of Object.values(this.weaponSlots))slot.fireTimer=Math.max(0,slot.fireTimer-dt); this.dashCooldown = Math.max(0, this.dashCooldown - dt); this.invulnerable = Math.max(0, (this.invulnerable || 0) - dt);
    if (this.runTime - this.lastDamage > 5) this.shield = Math.min(60, this.shield + dt * 9);
    if (this.reloading) { this.reloadTimer -= dt; if (this.reloadTimer <= 0) {
      const shell=this.activeWeapon==='breacher',needed=Math.min(shell?1:30-this.ammo,this.reserve);this.ammo+=needed;this.reserve-=needed;
      this.reloading=shell&&this.ammo<6&&this.reserve>0;this.reloadTimer=this.reloading?.55:0;
      this.event('reloadComplete',this.reloading?'Shell seated.':'Weapon ready.');
    } }
    updateThreatTurn(this,dt);
    const previousPlayer=this.player.clone();
    const direction = this.moveDirection(), sprint = this.touchSprint || this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    if(sprint&&this.grounded&&!this.vault&&!(this.dashTime>0))this.crouchRequested=false;
    updatePosture(this,this.world,dt);
    if(this.crouchRequested&&profileOf(this).eyeHeight<=1.05+1e-6)this.crouchLearned=true;
    const baseSpeed = profileOf(this).eyeHeight<1.7-1e-6 ? 3 : this.aim ? 3.1 : sprint ? 8 : 5.5;
    // Manual held-USE steps stay careful. With MOVE released, an explicit
    // held USE can follow a short clear route; phase/vault remain physical.
    const careful=this.touchMode&&this.touchUse&&this.grounded&&this.coreNodes.some(c=>!c.collected&&recoveryDistance(this.player,c.position,profileOf(this))<6);
    const receiverInReach=this.coreNodes.find(c=>!c.collected&&(!this.touchUseGoal||this.touchUseGoal===`core-${c.id}`)&&recoveryDistance(this.player,c.position,profileOf(this))<RECOVERY_RADIUS);
    const approach=touchApproachStep(this,direction,dt);
    const routeFollow=touchRouteStep(this,direction,dt,!!approach),guided=approach||routeFollow;
    if(guided)direction.set(guided.x,0,guided.z);
    updateTouchRouteView(this,routeFollow||(this.touchUseGoal?approach:null),dt);
    const speed = touchRecoveryBrake(this,receiverInReach)?0:guided?Math.min(baseSpeed,approach?3.1:5.5,guided.distance/Math.max(dt,1e-6)):careful?Math.min(baseSpeed,2.2):baseSpeed;
    const routeSpecial=!!this.vault||this.dashTime>0;
    if(this.vault)advanceVault(this,this.traversalWorld(),dt);
    else if (this.dashTime > 0) { this.dashTime -= dt; movePlayer(this, this.world, this.dashVector.x * dt * 27, this.dashVector.z * dt * 27, dt); }
    else movePlayer(this, this.world, direction.x * speed * dt, direction.z * speed * dt, dt);
    if(routeFollow&&!this.touchRouteCounted&&Math.hypot(this.player.x-previousPlayer.x,this.player.z-previousPlayer.z)>.001){this.routeAssists++;this.touchRouteCounted=true;}
    if(approach&&!this.touchApproachCounted&&Math.hypot(this.player.x-previousPlayer.x,this.player.z-previousPlayer.z)>.001){this.approachAssists++;this.touchApproachCounted=true;}
    updateTouchVault(this,direction,dt,direction.length()*speed*dt,Math.hypot(this.player.x-previousPlayer.x,this.player.z-previousPlayer.z));
    this.routeHelp.tick(dt,{eligible:!routeFollow&&this.options.contextualRouteHelp!==false&&this.grounded&&Math.abs(feetY(this.player,profileOf(this)))<.025&&profileOf(this).eyeHeight>=1.7-1e-6&&!routeSpecial&&!this.vault&&!this.aim&&!this.mouseDown&&!this.keys.has('Tab'),intended:direction.length()*speed*dt,progress:Math.hypot(this.player.x-previousPlayer.x,this.player.z-previousPlayer.z),goal:this.routeCacheGoal||this.routeGoal});
    if (speed > 0 && direction.lengthSq() > 0.1 && this.grounded) { this.stepDistance += dt * speed; this.footTimer -= dt; if (this.footTimer <= 0) { this.audio.footstep(sprint); this.footTimer = sprint ? 0.28 : 0.39; } }
    if(dt>0){this.playerVelocity.copy(this.player).sub(previousPlayer).divideScalar(dt);this.playerVelocity.y=0;}
    this.syncCamera(); // Fire from this input frame, rather than the previous render pose.
    if (this.mouseDown) this.shoot();
    updateCapacitors(this,dt); if(this.phase!=='playing')return;
    this.updateEncounters(); this.updatePhaseInterrupts(); this.updateEnemies(dt); updateCustodian(this,dt); this.updateProjectiles(dt); this.updatePickups(dt);
    if(this.phase !== 'playing')return;
    if(this.touchMode&&this.touchUseGoal?.startsWith('supply-'))this.suitService.progress=0;else updateService(this,dt);
    const nearby=this.coreNodes.find(c=>!c.collected&&(!this.touchUseGoal||this.touchUseGoal===`core-${c.id}`)&&recoveryDistance(this.player,c.position,profileOf(this))<RECOVERY_RADIUS);
    if(nearby&&this.grounded&&!this.vault&&this.useHeld()) { if(this.channelCore!==nearby){this.channelCore=nearby;this.coreProgress=0;} this.coreProgress+=dt; if(this.coreProgress>=RECOVERY_SECONDS)this.recoverCore(nearby); }
    else {this.channelCore=null;this.coreProgress=0;}
    if(this.cores===this.coreNodes.length){
      // Build44 replaces distance-triggered extraction Interceptors with the fixed jammer.
      this.extractionWave=true;
      if(!this.custodian.dead){this.extractionProgress=0;this.extractionBuffer=0;return;}
      const inside=this.grounded&&!this.vault&&isInsideExtraction(this.player,this.world.playerSpawn,profileOf(this));
      const upload=advanceUpload(this.extractionProgress,this.extractionBuffer,inside,dt);
      this.extractionProgress=upload.progress;this.extractionBuffer=upload.buffer;
      if(inside&&this.extractionProgress+1e-8>=this.extractionSeconds)this.finish(true);
    }
  }

  updateEncounters() {
    const stage=(id,condition,message,units)=>{
      if(!condition||this.encounters.has(id))return;
      this.encounters.add(id); this.event('notice',message);
      for(const [x,z,type] of units)this.spawnEnemy(new THREE.Vector3(x,0,z),type,5,['medical','heart'].includes(id)?'guard':'hunter');
    };
    stage('ingress',this.player.z<13,'PERIMETER PATROL · Two contacts beyond the entry. Side lanes remain open.',[[-22,-5,'sentinel'],[22,-5,'sentinel']]);
    for(const c of this.coreNodes){
      const near=Math.hypot(this.player.x-c.position.x,this.player.z-c.position.z)<14;
      if(c.id===0)stage('medical',near,'WEST TRIAGE · North opening leads toward the relay.',MEDICAL.spawns);
      if(c.id===1)stage('engineering',near,'EAST / MAINTENANCE · Interceptors track movement. Change direction after their charge.',[[31,-25,'stalker'],[16,-25,'stalker']]);
      if(c.id===2)stage('heart',near,'HEART / RELAY GUARD · Break the warden to open armor, or fire precisely at its optic.',[[0,-40.5,'warden'],[-16,-35,'sentinel']]);
    }
  }

  updatePhaseInterrupts() {
    if(this.dashTime<=0)return;
    for(const e of this.enemies){
      if(!(e.windup>0||e.contactWindup>0) || e.group.position.distanceTo(this.player)>4.8)continue;
      const eye=e.group.position.clone().add(new THREE.Vector3(0,1.3,0));
      if(!this.hasLineOfSight(this.player,eye))continue;
      // Stop a committed approach at the successful break, preserving the follow-up
      // target in view. Dodges away from/across a threat keep their normal travel.
      const toward=e.group.position.clone().sub(this.player);toward.y=0;
      if(toward.lengthSq()>.01 && this.dashVector.dot(toward.normalize())>.65)this.dashTime=0;
      const contact=e.contactWindup>0;if(contact)cancelContact(e);resolveMobileAttack(this); e.windup=0; e.stagger=.8; if(e.type==='warden')e.armorOpen=3; e.cooldown=1.6; e.light.intensity=.3;
      e.red.emissive.setHex(0x47eaff); e.red.emissiveIntensity=3;if(e.type==='warden')wardenEmission(e.red,true,false);
      this.phaseInterrupts++; this.audio.tone(680,.22,'triangle',.15,160);
      this.event('phaseInterrupt','PHASE BREAK · '+(contact?'DISCHARGE CANCELED':'SHOT CANCELED') + (e.type==='warden'?' · ARMOR OPEN 3s':''), {enemyId:e.id});
    }
  }

  attackInView(enemy) {
    const p=this.enemyOpticPosition(enemy).project(this.camera);
    return p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;
  }

  updateEnemies(dt) {
    advanceAttackRecovery(this,dt);const coordinated=mobileCadence(this);
    const patrolBlocked=prepareCustodianTurn(this,dt);
    let charging=this.enemies.filter(e=>e.windup>0||coordinated&&e.contactWindup>0).length+(this.custodian.windup>0?1:0); const maxCharging=attackCapacity(this);
    const first=coordinated?Math.max(0,this.enemies.findIndex(e=>e.id>(this.mobileLastAttackId||0))):0;
    for(let slot=0;slot<this.enemies.length;slot++){
      const enemy=this.enemies[(first+slot)%this.enemies.length];
      if(['won','lost'].includes(this.phase))break;
      const recovering=enemy.fireRecovery>0;
      enemy.fireRecovery=Math.max(0,(enemy.fireRecovery||0)-dt);
      enemy.phase += dt; enemy.cooldown -= dt; enemy.meleeCooldown=Math.max(0,(enemy.meleeCooldown||0)-dt); enemy.armorOpen=Math.max(0,(enemy.armorOpen||0)-dt);
      if(enemy.hitFlash>0){enemy.hitFlash=Math.max(0,enemy.hitFlash-dt);if(!enemy.hitFlash&&enemy.type!=='warden')enemy.red.emissive.setHex(0xff341c);}
      if(enemy.stagger>0){if(enemy.contactWindup>0)cancelContact(enemy);animateContact(enemy,dt);enemy.stagger=Math.max(0,enemy.stagger-dt);if(enemy.type==='warden')wardenEmission(enemy.red,enemy.armorOpen>0,false,enemy.hitFlash>0);else if(!enemy.stagger){enemy.red.emissive.setHex(0xff341c);enemy.red.emissiveIntensity=2;}animateWarden(enemy,dt);this.animateDrone(enemy,dt);continue;}
      const position = enemy.group.position, delta = this.player.clone().sub(position); delta.y = 0;
      const distance = delta.length(), dir = delta.clone().normalize();
      const eye = position.clone().add(new THREE.Vector3(0, 1.3, 0));
      enemy.visible = (enemy.role==='guard' || distance<36) && this.hasLineOfSight(eye, this.player);
      if(enemy.visible)enemy.observedVelocity.copy(this.playerVelocity);
      const goal = dutyGoal(enemy,this.player,enemy.visible,dt,this.navigation);
      const perceivedDelta=goal.clone().sub(position).setY(0), perceivedDistance=perceivedDelta.length();
      const perceivedDir=perceivedDelta.clone().normalize();
      // A newly armed contact never consumes this frame's elapsed time.
      const rangedCommitted=enemy.windup>0;
      const contactCommitted=enemy.contactWindup>0;
      if(!rangedCommitted && !contactCommitted && enemy.meleeCooldown<=0 && contactReach(this,enemy)&&(!coordinated||!patrolBlocked&&attackRecoveryReady(this)&&charging<maxCharging)){
        if(coordinated){charging++;this.mobileLastAttackId=enemy.id;}enemy.contactWindupDuration=warningDuration(this,CONTACT_WINDUP,this.attackInView(enemy));enemy.contactWindup=enemy.contactWindupDuration;enemy.contactCanceled=false;enemy.contactFlash=0;
        if(!this.contactHint){this.contactHint=true;this.event('notice','PERIMETER DISCHARGE · Back away, break cover sight, or Shift to interrupt.');}
        this.audio.tone(250,.18,'triangle',.08,420);
      }
      const braced=enemy.contactWindup>0;
      if(contactCommitted){
        enemy.contactWindup=Math.max(0,enemy.contactWindup-dt);
        if(enemy.contactWindup<=1e-8){
          enemy.contactWindup=0;if(coordinated)charging--;resolveMobileAttack(this);enemy.meleeCooldown=1;enemy.contactFlash=.22;enemy.contactCanceled=false;
          enemy.lastAttack=this.runTime;
          this.audio.tone(100,.12,'triangle',.10,55);
          if(contactReach(this,enemy))this.damage(15,position,enemy);
        }
      }
      if (rangedCommitted) {
        if(enemy.type==='stalker' && enemy.windup>.16 && enemy.visible) { const lead=Math.min(1.7,distance/18+.16); enemy.target.copy(this.player).addScaledVector(enemy.observedVelocity,lead); }
        enemy.windup -= dt; enemy.light.intensity = 1.5 + Math.sin(this.runTime * 35) * 1;
        enemy.red.emissiveIntensity = 4;
        if (enemy.windup <= 0) { charging--; this.enemyFire(enemy); enemy.cooldown = (enemy.type === 'stalker' ? 1.65 : 2.25) * this.difficulty.fire + Math.random() * 0.5; enemy.red.emissiveIntensity = 2; enemy.light.intensity = 0.5; }
      } else if (!braced && !contactCommitted && enemy.cooldown <= 0 && distance < 36 && enemy.visible && !patrolBlocked && !recovering && attackRecoveryReady(this) && charging<maxCharging) {
        charging++;if(coordinated)this.mobileLastAttackId=enemy.id;enemy.windupDuration=warningDuration(this,enemy.type==='warden'?1.6:enemy.type==='stalker'?.42:.65,this.attackInView(enemy));enemy.windup=enemy.windupDuration;
        enemy.target.copy(this.player); // Telegraph aims at the current point; lateral movement evades it.
        if (distance < 30 && this.runTime>(this.nextWarning||0)){this.audio.warning(Math.sin(Math.atan2(position.x-this.player.x,-(position.z-this.player.z))+this.yaw),distance);this.nextWarning=this.runTime+.45;}
      }
      const guarding = !enemy.visible && enemy.duty!=='chase' || enemy.role==='guard' && enemy.duty!=='chase';
      const move = new THREE.Vector3();
      const approaching = (enemy.visible?distance:perceivedDistance) > (enemy.type === 'warden' ? 6 : enemy.type === 'stalker' ? 8 : 16) || !enemy.visible;
      if (approaching && (enemy.visible || perceivedDistance>.7)) move.add(enemy.visible?dir:perceivedDir);
      else if (enemy.visible && distance < 5) move.addScaledVector(dir, -0.7);
      if (enemy.visible && enemy.type!=='warden') move.add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(enemy.phase * 0.65) * 0.65));
      if(!enemy.visible && !guarding){move.copy(goal).sub(position).setY(0);if(move.length()<.7)move.set(0,0,0);}
      if(guarding) { move.copy(goal).sub(position);move.y=0;if(move.length()<.7)move.set(0,0,0); }
      // A route to the target must not turn a visible retreat/strafe into a rush.
      // Returning guards still navigate home, including while engaging a target.
      const routing = guarding ? move.lengthSq()>.001 : approaching;
      const waypoint=routing?this.navigation.steer(enemy,goal,this.runTime):null;
      if(waypoint)move.set(waypoint.x-position.x,0,waypoint.z-position.z);
      // Sentinels plant for the full shot and its mechanical recovery.
      // Committed shots/projectiles still resolve; Interceptors keep moving.
      const planted=braced || enemy.type==='sentinel'&&(rangedCommitted||enemy.windup>0||recovering||enemy.fireRecovery>0);
      if(planted)move.set(0,0,0);
      // Local obstacle steering and separation keep a group from collapsing into one target.
      if (move.lengthSq() > 0.001) {
        move.normalize(); const speed = (enemy.type === 'stalker' ? 3.2 : 2.1) * this.difficulty.speed * (enemy.windup > 0 ? 0.25 : 1);
        if (!this.canOccupy(position.x + move.x * 1.2, position.z + move.z * 1.2, 0.45)) {
          const tangent = new THREE.Vector3(-move.z * enemy.avoidSign, 0, move.x * enemy.avoidSign);
          if (!this.canOccupy(position.x + tangent.x, position.z + tangent.z, 0.45)) enemy.avoidSign *= -1;
          move.copy(tangent);
        }
        for (const other of this.enemies) if (other !== enemy) { const separation = position.clone().sub(other.group.position); separation.y = 0; const d = separation.length(); if (d < 1.4 && d > 0.01) move.addScaledVector(separation.normalize(), (1.4 - d) * 1.5); }
        move.clampLength(0, 1); steerWarden(enemy,move,dt);
        this.moveEntity(position, move.x * speed * dt, move.z * speed * dt, 0.45);
        enemy.leftLeg.rotation.x = Math.sin(enemy.phase * 7) * 0.45; enemy.rightLeg.rotation.x = -enemy.leftLeg.rotation.x;
      }
      // A returning rig faces its travel unless visibly engaging or committed.
      const scan=enemy.duty==='search'?Math.sin(enemy.searchTime*2)*.65:0;
      const facingDelta=!enemy.visible
        ? (enemy.windup>0 ? enemy.target.clone().sub(position).setY(0) : move.lengthSq()>.001 ? move : new THREE.Vector3(Math.sin((enemy.duty==='search'?enemy.searchHeading:enemy.group.rotation.y)+scan),0,Math.cos((enemy.duty==='search'?enemy.searchHeading:enemy.group.rotation.y)+scan))) : delta;
      const facing = Math.atan2(facingDelta.x, facingDelta.z);
      if(enemy.wardenRig){
        const turn=Math.atan2(Math.sin(facing-enemy.group.rotation.y),Math.cos(facing-enemy.group.rotation.y));
        enemy.group.rotation.y+=clamp(turn,-4*dt,4*dt);
      }else enemy.group.rotation.y=facing;
      if(enemy.type==='warden') {
        wardenEmission(enemy.red,enemy.armorOpen>0,enemy.windup>0,enemy.hitFlash>0);
        if(enemy.windup>0 && distance<11 && enemy.visible && this.dashCooldown<=0 && this.runTime-this.phaseCueAt>5){
          this.phaseCueAt=this.runTime;this.event('notice','WARDEN CHARGING · W + Shift toward amber ring to break. Or strafe / shoot optic.');
        }
      }
      animateWarden(enemy,dt);
      this.animateDrone(enemy,dt);
      animateContact(enemy,dt);
    }
    for(const enemy of this.enemies)updateCharge(this,enemy);
  }

  animateDrone(enemy,dt) {
    const r=enemy.droneRig;if(!r||dt<=0)return;
    const displacement=enemy.group.position.clone().sub(r.previous);
    const speed=displacement.length()/dt;r.previous.copy(enemy.group.position);
    animateLegs(r,enemy.group,displacement,dt);
    r.speed=THREE.MathUtils.damp(r.speed,enemy.stagger>0?0:speed,12,dt);
    // Linkages and propulsion move independently of the stabilized precision optic.
    const charge=enemy.windup>0?rangedChargeProgress(enemy):0;
    const recoil=Math.max(0,1-(this.runTime-enemy.lastAttack)/.22);
    const settle=enemy.type==='sentinel'?Math.min(1,(enemy.fireRecovery||0)/SENTINEL_RECOVERY_SECONDS):0;
    r.top.position.y=r.topY+charge*.07+recoil*.045+settle*.035;
    r.bottom.position.y=r.bottomY-charge*.07-recoil*.045-settle*.035;
    r.vanes.forEach((v,i)=>{if(r.legs)v.rotation.x=(i?1:-1)*(Math.min(.18,r.speed*.05)+charge*.12+settle*.08+Math.min(.1,(enemy.hitFlash||0)*.5));else {v.rotation.y+=(enemy.stagger>0?4:18+Math.min(20,r.speed*5))*dt;}});
    if(!(enemy.hitFlash>0)&&!(enemy.stagger>0))enemy.red.emissiveIntensity=enemy.windup>0?.65+charge*.65:.65;
    if(enemy.stagger>0 && !(enemy.hitFlash>0))enemy.red.emissiveIntensity=.8;
    enemy.light.intensity=enemy.windup>0?.12:.03;
  }
  enemyFire(enemy) {
    resolveMobileAttack(this);
    if(enemy.type==='sentinel')enemy.fireRecovery=SENTINEL_RECOVERY_SECONDS;
    enemy.lastAttack=this.runTime;
    const origin = fireOrigin(enemy);
    const velocity = enemy.target.clone().sub(origin).normalize().multiplyScalar(enemy.type === 'stalker' ? 18 : 15);
    const projectile = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xff6a31 }));
    projectile.quaternion.setFromUnitVectors(UP, velocity.clone().normalize());
    projectile.position.copy(origin); this.scene.add(projectile);
    this.projectiles.push({ mesh: projectile, origin: origin.clone(), attacker:enemy, velocity, life: 4, damage: enemy.type === 'stalker' ? 13 : 19 });
    this.tracer(origin, origin.clone().addScaledVector(velocity, 0.05), 0xff6033, 0.12);
  }
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if(this.projectiles[i].custodianCoil?.hp<=0){const p=this.projectiles[i];this.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();this.projectiles.splice(i,1);continue;}
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
      const hitProfile=playerHitProfile(this);
      const body = new THREE.Sphere(this.player.clone().add(new THREE.Vector3(0, hitProfile.torsoOffset, 0)), hitProfile.torsoRadius);
      const head = new THREE.Sphere(this.player.clone().add(new THREE.Vector3(0,hitProfile.headOffset,0)), hitProfile.headRadius);
      for (const sphere of [body, head]) {
        if (sphere.containsPoint(previous)) { playerDistance = 0; break; }
        const hit = this.ray.intersectSphere(sphere, this.wallPoint);
        if (hit) playerDistance = Math.min(playerDistance, previous.distanceTo(hit));
      }
      if (wallDistance <= travel && wallDistance <= playerDistance) p.life = 0;
      else if (playerDistance <= travel) { this.damage(p.damage,p.origin,p.attacker); p.life = 0; }
      if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.projectiles.splice(i, 1); }
    }
  }
  updatePickups(dt) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.life -= dt; p.mesh.rotation.y += dt * 2; p.mesh.position.y = 0.6 + Math.sin(this.runTime * 3 + i) * 0.1;
      const torso = this.player.clone().add(new THREE.Vector3(0, -.5, 0));
      const distance = p.mesh.position.distanceTo(torso);
      const reachable = this.hasLineOfSight(p.mesh.position, torso, 0);
      if (reachable && distance < 4) { p.mesh.position.x = THREE.MathUtils.damp(p.mesh.position.x, this.player.x, 3, dt); p.mesh.position.z = THREE.MathUtils.damp(p.mesh.position.z, this.player.z, 3, dt); }
      const collected=p.life>0&&reachable&&distance<1.2;
      if (collected) { this.supply(24,4); this.health = Math.min(100, this.health + 6); this.shield = Math.min(60, this.shield + 10); p.life = 0; this.audio.tone(640, 0.15, 'sine', 0.07, 940); this.event('supply', '+24 rounds · +6 health · +10 armor'); }
      if (p.life <= 0) { removeSupplyRoute(this,p,collected);this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.pickups.splice(i, 1); }
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
    const moving = this.phase === 'playing' && (this.moveDirection().lengthSq() > 0.1 || this.touchRouteActive || this.touchApproachActive);
    const bob = moving && this.grounded ? Math.sin(this.stepDistance * 2.1) * 0.025 * motion : 0;
    this.camera.position.copy(this.player); // Physical eye and shot origin remain identical; weapon retains optional bob.
    this.camera.rotation.set(this.pitch + this.recoil * motion, this.yaw, this.dashTime > 0 ? -0.035 * motion : 0, 'YXZ');
    this.camera.updateWorldMatrix(true, false);
  }

  animate(dt) {
    this.combatFeedback?.update(dt);
    if(this.suitService)this.world.setSuitServiceState?.(serviceStatus(this));
    this.animTime += dt; this.world.update?.(dt, this.animTime);
    for (const c of this.coreNodes) {
      const progress=this.channelCore===c?Math.min(1,this.coreProgress/RECOVERY_SECONDS):0;
      this.world.setReceiverState(c.id,progress,c.collected);
      const distance=recoveryDistance(this.player,c.position,profileOf(this));
      c.reach.visible=!c.collected&&distance<7.5;
      c.reach.material.opacity=distance < RECOVERY_RADIUS ? .4 : .24;
    }
    this.world.setUplinkState(this.cores===this.coreNodes.length&&this.custodian.dead,Math.min(1,this.extractionProgress/(this.extractionSeconds||EXTRACTION_SECONDS)));
    this.exitBoundary.material.opacity = this.cores === this.coreNodes.length ? 0.8 : 0.35;

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]; effect.life -= dt;
      if (effect.velocity) { effect.mesh.position.addScaledVector(effect.velocity, dt); effect.velocity.y -= (effect.gravity || 0) * dt; }
      effect.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
      if (effect.life <= 0) { this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose(); this.effects.splice(i, 1); }
    }
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, 12, dt); this.kick = THREE.MathUtils.damp(this.kick, 0, 18, dt);
    this.aimBlend = THREE.MathUtils.damp(this.aimBlend, this.aim && !this.reloading && !this.vault ? 1 : 0, 12, dt);
    const moving = this.phase === 'playing' && (this.moveDirection().lengthSq() > 0.1 || this.touchRouteActive || this.touchApproachActive);
    const motion = this.options.reducedMotion ? 0 : 1;
    const bob = moving && this.grounded ? Math.sin(this.stepDistance * 2.1) * 0.025 * motion : 0;
    this.syncCamera();
    const desiredFov = this.aim && !this.reloading && !this.vault ? 56 : this.dashTime > 0 ? 86 : 75;
    this.referenceFov=THREE.MathUtils.damp(this.referenceFov??75,desiredFov,12,dt);this.camera.fov=worldVerticalFov(this.referenceFov,this.camera.aspect,this.touchMode);this.camera.updateProjectionMatrix();
    this.weapon.visible = !['ready', 'won', 'lost'].includes(this.phase);
    const ads = this.aimBlend;
    const progress=this.reloading?1-this.reloadTimer/1.65:0;
    poseHandling(this,{ads,progress,bob});
    const breaching=this.activeWeapon==='breacher';
    if(this.weaponAsset)this.weaponAsset.visible=!breaching;
    this.weaponFallback.visible=!breaching&&!this.weaponAsset;
    if(this.handsAsset)this.handsAsset.visible=!breaching&&!!this.weaponAsset;
    poseBreacher(this,{ads,bob});
    // Both original weapon/hand rigs move together: wrists retain sleeve bridges.
    if(this.vault){const t=this.vault.elapsed/VAULT_SECONDS,reach=Math.sin(Math.PI*t);this.weapon.position.y-=.24*reach;this.weapon.position.z-=.10*reach;this.weapon.rotation.x+=.3*reach;this.weapon.rotation.z-=.08*reach*(this.options.reducedMotion?0:1);}
    if(!breaching&&this.weaponAsset){this.weaponAsset.updateWorldMatrix(true,true);this.muzzle.position.copy(this.weapon.worldToLocal(this.weaponAsset.getObjectByName('MuzzleAnchor').getWorldPosition(new THREE.Vector3())));}

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
    const frozen=['planning','paused','won','lost'].includes(this.phase);
    if(!frozen||this.renderDirty||this.renderedPhase!==this.phase){
      this.updateRouteTrace();this.animate(frozen?0:dt);this.renderer.render(this.scene,this.camera);
      this.renderDirty=false;this.renderedPhase=this.phase;
    }
    this.onMarkers(this.captureMarkers());
    this.emitTimer -= dt; if (this.emitTimer <= 0) { this.emit(); this.emitTimer = 0.1; }
    this.frameId = requestAnimationFrame(t => this.frame(t));
  }
  enemyOpticPosition(enemy) {
    return enemy.group.position.clone().add(new THREE.Vector3(0,enemy.type==='warden'?2:1.3,enemy.type==='warden'?.3:.43).applyAxisAngle(UP,enemy.group.rotation.y));
  }
  captureMarkers() {
    if(this.phase!=='playing')return [];
    const project=(position)=>{const delta=position.clone().sub(this.camera.position),forward=new THREE.Vector3();this.camera.getWorldDirection(forward);const front=delta.dot(forward)>0;const p=position.clone().project(this.camera);return {x:p.x,y:p.y,front,distance:delta.length(),bearing:Math.atan2(delta.x,-delta.z)+this.yaw};};
    const shelter=MEDICAL.shelter;
    const inMedicalBay=this.player.x>=shelter.minX&&this.player.x<=shelter.maxX&&this.player.z>=shelter.minZ&&this.player.z<=shelter.maxZ&&this.player.y<shelter.ceiling;
    const local=nearbyReceiver(this.coreNodes.filter(c=>!this.touchUseGoal||this.touchUseGoal===`core-${c.id}`).map(c=>({id:c.id,collected:c.collected,distance:recoveryDistance(this.player,c.position,profileOf(this))})));
    const markers=this.coreNodes.filter(c=>!c.collected&&(local?c.id===local.id:!this.routeGoal||`core-${c.id}`===this.routeGoal)).map(c=>{
      const distance=recoveryDistance(this.player,c.position,profileOf(this));
      const ready=distance<RECOVERY_RADIUS&&this.grounded&&!this.vault;
      const sight=receiverSight(this.world,this.player,c.id);
      const approachHint=inMedicalBay?(c.id===0?'GO AROUND TRIAGE STORAGE':c.id===2?'USE THE NORTH OPENING':'USE EAST SERVICE / SOUTH INTAKE'):(c.id===0?'USE A MARKED TRIAGE ENTRY':'FIND AN OPEN APPROACH');
      return {id:`core-${c.id}`,kind:'core',suppressed:c.id===local?.id&&ready,approach:c.id===local?.id&&distance<4.5&&!ready,approachHint,occluded:!sight,label:CORE_SITES[c.id].name,...project(sight||c.position.clone().add(new THREE.Vector3(0,.75,0))),distance,inRange:ready};
    });
    const supply=this.touchMode&&selectedSupply(this);
    if(supply){markers.length=0;const point=supply.mesh.position;markers.push({id:supplyKey(supply),kind:'supply',label:'SUPPLY / 24 ROUNDS + 4 SHELLS',occluded:!this.hasLineOfSight(this.player,point,0),...project(point)});}
    if(!supply&&this.cores===this.coreNodes.length){
      const center=extractionCenter(this.world.playerSpawn),target=this.world.playerSpawn.clone().set(center.x,1.7,center.z);
      if(!this.custodian.dead){
        const target=focusedCustodianTarget(this);
        if(target)markers.push({id:'custodian-component',kind:'component',label:['I','II','III'][target.index],exposed:target.exposed,...project(target.point)});
        else markers.push({id:'custodian',kind:'exit',occluded:!custodianObjectiveVisible(this),approachHint:this.touchMode?'USE A HALL OPENING · MAP TO PLAN':'USE A HALL OPENING · HOLD TAB FOR GROUND TRACE',label:'DISABLE CUSTODIAN',...project(this.custodian.group.position.clone().setY(3))});
      }
      else markers.push({id:'extraction',kind:'exit',occluded:!this.hasLineOfSight(this.player,target,0),label:'EXTRACTION',...project(target.clone().setY(3)),distance:extractionDistance(this.player,target),inZone:isInsideExtraction(this.player,this.world.playerSpawn,profileOf(this))});
    }
    // A doorway is actionable only along a swept, walkable approach. This is
    // local aperture guidance, never a cached route through unseen architecture.
    const west=markers.find(m=>m.id==='core-0');
    if(west?.occluded&&!inMedicalBay){
      const doors=[{x:-25,z:-7,label:'WEST / SOUTH INTAKE'},{x:-12,z:-15.25,label:'WEST / EAST SERVICE'},{x:-12,z:-23.25,label:'WEST / EAST RELAY'},{x:-24,z:-31,label:'WEST / NORTH RELAY'}];
      const door=doors.filter(p=>Math.hypot(p.x-this.player.x,p.z-this.player.z)<25&&this.navigation.clear(this.player,p)&&this.hasLineOfSight(this.player,new THREE.Vector3(p.x,1.7,p.z),0)).sort((a,b)=>Math.hypot(a.x-this.player.x,a.z-this.player.z)-Math.hypot(b.x-this.player.x,b.z-this.player.z))[0];
      if(door)markers.push({id:'west-door',kind:'core',doorway:true,label:door.label,...project(new THREE.Vector3(door.x,1.7,door.z))});
    }
    if(this.routeWaypoint){
      for(let i=markers.length-1;i>=0;i--)if(markers[i].kind!=='enemy'&&markers[i].kind!=='component')markers.splice(i,1);
      const w=this.routeWaypoint;markers.push({id:'ground-step',kind:'core',label:`GROUND / ${w.label}`,doorway:true,...project(new THREE.Vector3(w.x,.15,w.z))});
    }
    for(const e of this.enemies)if(this.hasLineOfSight(this.player,this.enemyOpticPosition(e),0)&&(e.lastHit>this.runTime-3||e.lastAttack>this.runTime-2.4||(e.windup>0||e.contactWindup>0))){const p=project(this.enemyOpticPosition(e));if(p.distance<32)markers.push({id:`enemy-${e.id}`,kind:'enemy',type:e.type,label:e.contactWindup>0?'DISCHARGE / SHIFT OR BACK AWAY':e.type==='warden'?(e.armorOpen>0?'WARDEN / ARMOR OPEN':'WARDEN / SHIFT OR OPTIC'):e.type==='stalker'?'INTERCEPTOR':'SENTINEL',health:e.health/e.maxHealth,charging:e.windup>0||e.contactWindup>0,recent:e.lastAttack>this.runTime-2.4,...p});}
    if(this.custodian.active&&!this.custodian.dead){
      const aimed=custodianAim(this);
      if(aimed||this.custodian.coils.some(n=>n.hp>0&&this.hasLineOfSight(this.player,n.origin,0))){
        const p=project(aimed?.point||this.custodian.group.position.clone().setY(2.18));
        if(p.distance<32)markers.push({id:'custodian-focus',kind:'enemy',type:'custodian',aimed:!!aimed,label:aimed?.label||(this.custodian.open>0?'CUSTODIAN / OPEN WINDOW':'CUSTODIAN / ARMORED SHUTTERS'),health:aimed?.health??this.custodian.coils.reduce((s,n)=>s+n.hp,0)/(480*this.difficulty.health),charging:this.custodian.windup>0,recent:this.custodian.lastAttack>this.runTime-2.4,...p});
      }
    }
    const focus=this.enemies.filter(e=>e.visible).map(e=>project(e.group.position.clone().add(new THREE.Vector3(0,e.type==='warden'?2:1.3,.3)))).filter(p=>p.front&&Math.abs(p.x)<.3&&Math.abs(p.y)<.4);
    for(const m of markers)if(m.kind!=='enemy'&&m.kind!=='component')m.suppressed=!!m.suppressed||m.front&&Math.abs(m.x)<.28&&Math.abs(m.y)<.3&&(this.aim||focus.some(p=>p.distance<m.distance&&Math.abs(p.x-m.x)<.3&&Math.abs(p.y-m.y)<.35));
    return markers;
  }
  damageCuePosition() {
    // A hit records where the shot came from. It must not become a live tracker
    // or vanish when its shooter moves behind cover or is subsequently defeated.
    return this.damageOrigin;
  }
  captureState() {
    if(this.playerRoute&&['playing','planning'].includes(this.phase))this.updateRouteGoal();
    const damagePoint=this.damageCuePosition();
    const coreMarkers = this.coreNodes.map(c => ({ x: c.position.x, z: c.position.z, id: c.id, collected: c.collected, distance: recoveryDistance(this.player,c.position,profileOf(this)) }));
    const usableGoal=this.touchUseGoal||(this.touchMode&&this.routeGoal?.startsWith('supply-')?this.routeGoal:null);
    const usableMarkers=coreMarkers.filter(c=>!usableGoal||usableGoal===`core-${c.id}`);
    const closest = usableMarkers.filter(c => !c.collected).sort((a, b) => a.distance - b.distance)[0];
    return {
      localRecovery:nearbyReceiver(usableMarkers)?{id:closest.id,distance:closest.distance,remaining:Math.max(0,closest.distance-RECOVERY_RADIUS)}:null,
      crouchHint:!(closest?.distance<4.5)&&nearLowCover(this,this.world),
      damageDirection:this.phase==='playing'&&this.runTime-this.lastDamage<1.1&&damagePoint ? Math.atan2(damagePoint.x-this.player.x,-(damagePoint.z-this.player.z))+this.yaw : null,
      routeHelp:this.routeWaypoint?.label||'',routeGoal:this.routeGoal,routeManual:!!this.routeManual,routeStatus:this.keys.has('Tab')?this.routeStatus:'',
      touchBossApproach:this.touchMode&&this.custodian?.active&&!this.custodian.dead&&this.grounded&&!this.vault&&profileOf(this).eyeHeight>=1.7&&Math.abs(feetY(this.player,profileOf(this)))<.025&&inCustodianApproach(this.player,.05),
      anchorEligible:this.canRetryAnchor(),anchorRetries:this.anchorRetries||0,checkpointAssisted:(this.anchorRetries||0)>0,
      phase: this.phase, health: Math.ceil(this.health), maxHealth: 100, shield: Math.ceil(this.shield), maxShield: 60,
      mobileCadence:mobileCadence(this),mobileAttackRecovery:this.mobileAttackRecovery||0,
      autoVaults:this.autoVaults||0,assistedShots:this.assistedShots||0,tapAims:this.tapAims||0,approachAssists:this.approachAssists||0,routeAssists:this.routeAssists||0,touchRouteActive:!!this.touchRouteActive,touchRouteArrived:!!this.touchRouteArrived,touchRouteFraming:!!this.touchRouteFraming,touchRouteStatus:this.touchRouteStatus||'',touchRouteGoal:this.touchRoute?.key||null,touchApproachActive:!!this.touchApproachActive,touchApproachAvailable:this.touchMode&&this.grounded&&!this.vault&&Math.abs(feetY(this.player,profileOf(this)))<.025,touchApproachStatus:this.touchApproachStatus||'',touchAssistActive:this.phase==='playing'&&(this.activeWeapon==='rifle'&&this.runTime<this.touchAssistUntil||this.runTime<this.touchFocusUntil),touchRecoveryBraked:this.phase==='playing'&&this.touchUse&&!!this.touchRecoveryBraked,
      supplies:this.touchMode?liveSupplies(this).map(p=>({id:p.id,x:p.mesh.position.x,z:p.mesh.position.z,life:Math.ceil(p.life)})):[],supplyRouteStatus:this.supplyRouteStatus||'',touchSupplyCollected:!!this.touchSupplyCollected,
      weapon:this.activeWeapon, ammo: this.ammo, reserve: this.reserve, reloading: this.reloading, reloadProgress: this.reloading ? 1 - this.reloadTimer / (this.activeWeapon==='breacher'?.55:1.65) : 0,
      rifleReadout:rifleReadout(this),rifleConfirmation:rifleConfirmation(this),touchAimReadout:touchAimReadout(this),
      kills: this.kills, cores: this.cores, totalCores: this.coreNodes.length, time: this.runTime, dashCooldown: this.dashCooldown,
      objective: this.cores === this.coreNodes.length ? (!this.custodian.dead?'DISABLE UPLINK CUSTODIAN':isInsideExtraction(this.player,this.world.playerSpawn,profileOf(this))?'HOLD THE EXTRACTION ZONE':'RETURN TO EXTRACTION') : closest?.distance < RECOVERY_RADIUS ? 'HOLD E TO RECOVER MEMORY' : 'RECOVER THE THREE MEMORIES',
      suitService:this.suitService?serviceStatus(this):null,
      coreProgress:Math.min(1,this.coreProgress/RECOVERY_SECONDS)||0, extractionProgress:Math.min(1,this.extractionProgress/(this.extractionSeconds||EXTRACTION_SECONDS))||0, extractionSeconds:this.extractionSeconds||EXTRACTION_SECONDS, extractionBuffer:this.extractionBuffer||0, phaseDodges:this.phaseDodges||0, dashCount:this.dashCount||0, phaseInterrupts:this.phaseInterrupts||0,
      score: this.score, enemiesAlive: this.enemies.length, headshots: this.headshots, accuracy: this.shotsFired ? Math.round(this.shotsHit / this.shotsFired * 100) : 0,
      difficulty: this.activeDifficulty || this.options.difficulty, player: { x: this.player.x, y: this.player.y, z: this.player.z, yaw: this.yaw, grounded: this.grounded, eyeHeight:profileOf(this).eyeHeight, feetY:feetY(this.player,profileOf(this)), crouched:profileOf(this).eyeHeight<1.7-1e-6, standBlocked:this.standBlocked }, coreMarkers,
      nearestCoreDistance: closest?.distance ?? null, recoveryReady:this.grounded&&!this.vault&&closest?.distance < RECOVERY_RADIUS, interaction: this.suitService&&serviceStatus(this).near&&serviceStatus(this).valid ? `SUIT SERVICE // ${serviceStatus(this).state}` : !this.vault&&this.grounded&&closest?.distance < RECOVERY_RADIUS ? `RECOVER // ${CORE_SITES[closest.id].name}` : this.touchMode&&this.grounded&&!this.vault&&!this.standBlocked&&!this.mouseDown&&!this.aim&&this.moveDirection().lengthSq()<=.000625&&Math.abs(feetY(this.player,profileOf(this)))<.025&&closest?.distance<8 ? `${this.touchApproachActive?'APPROACHING':'APPROACH'} // ${CORE_SITES[closest.id].name}` : closest?.distance < 4.5 ? `MOVE CLOSER // ${CORE_SITES[closest.id].name}` : (this.grounded&&!this.vault&&planVault(this,this.traversalWorld(),this.moveDirection().lengthSq()>.01?this.moveDirection():{x:-Math.sin(this.yaw),z:-Math.cos(this.yaw)})?'Space · Vault':this.standBlocked?'CROUCHED · HEADROOM BLOCKED':profileOf(this).eyeHeight<1.7-1e-6?'CROUCHED · C TO STAND':''), heading: ((-this.yaw * 180 / Math.PI) % 360 + 360) % 360,
      // Centre navigation distance only; extractionMargin owns all edge guidance.
      exitDistance: this.world ? extractionDistance(this.player,extractionCenter(this.world.playerSpawn)) : 0,
      extractionMargin: this.world ? extractionMargin(this.player,this.world.playerSpawn) : 0,
      insideExtraction: this.world ? this.grounded&&!this.vault&&isInsideExtraction(this.player,this.world.playerSpawn,profileOf(this)) : false,
      exit: this.world ? { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z } : null,
      custodian:{x:11,z:16,active:this.custodian?.active,dead:this.custodian?.dead,open:this.custodian?.open>0,charging:this.custodian?.windup>0,coils:this.custodian?.coils.map(n=>Math.max(0,n.hp/(160*(this.difficulty?.health||1))))},
      facilityLayout:this.facilityLayout, bounds: this.world?.bounds, pointerFallback: this.pointerFallback,
    };
  }
  emit() { this.onState(this.captureState()); }
  event(type, message, extra = {}) { this.onEvent({ type, message, ...extra }); }

  installDebug() {
    this.debug = {
      teleport: (x, z) => { if (!this.canOccupy(x, z)) throw new Error('Target is inside a collider'); this.player.set(x, 1.7, z); this.emit(); },
      collectCore: i => { const c = this.coreNodes[i]; this.player.set(c.position.x, 1.7, c.position.z+1.5); this.recoverCore(c); },
      extract: () => { this.player.copy(this.world.playerSpawn); this.player.y = 1.7; this.profile=STANDING; this.crouchRequested=false; this.standBlocked=false; this.extractionProgress=this.extractionSeconds||EXTRACTION_SECONDS; this.update(0.001); },
      damage: n => this.damage(n),
      killAll: () => [...this.enemies].forEach(e => this.killEnemy(e)),
      advance: seconds => { for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) if (this.phase === 'playing') this.update(1 / 60); this.emit(); },
      aimAtEnemy: (index = 0, head = false) => { const e = this.enemies[index]; if (!e) return false; const target = e.group.position.clone().add(new THREE.Vector3(0, e.type==='warden' && head ? 2 : this.sentinelAsset ? 1.3 : head ? 1.68 : 1.1, e.type==='warden' && head ? .3 : this.sentinelAsset && head ? 0.43 : 0).applyAxisAngle(UP, e.group.rotation.y)); const delta = target.sub(this.player); this.yaw = Math.atan2(-delta.x, -delta.z); this.pitch = Math.atan2(delta.y, Math.hypot(delta.x, delta.z)); this.animate(0); return true; },
      shoot: () => { this.fireTimer = 0; this.shoot(); },
      reload: () => this.reload(),
      dash: () => this.dash(),
      canOccupy: (x, z) => this.canOccupy(x, z),
      colliders: () => this.world.colliders.map(b => ({ min: b.min.toArray(), max: b.max.toArray() })),
      enemyPositions: () => this.enemies.map(e => ({ x: e.group.position.x, z: e.group.position.z, health: e.health })),
    };
  }
  dispose() {
    this.vault=null;
    this.disposed = true; cancelAnimationFrame(this.frameId); this.cleanups.forEach(fn => fn());
    this.audio.dispose(); this.combatFeedback?.dispose();
    // Scene clones and unloaded templates share geometry. Release each resource
    // once, including template parts not present in a live actor.
    this.scene?.traverse(o => { if(o.isInstancedMesh)o.dispose(); });
    const roots=[this.scene,this.weaponAsset,this.handsAsset,this.contactAsset,this.wardenAsset,this.sentinelAsset,this.interceptorAsset];
    disposeAsset({traverse:fn=>{for(const root of roots)root?.traverse(fn);}});
    this.renderer?.dispose();
  }
}
