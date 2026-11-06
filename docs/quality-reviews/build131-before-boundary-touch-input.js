import {fireDragSpeed} from './touch-fire-speed.js';
import {beginTouchTracking} from './touch-tracking.js';
import {installFieldNotes} from './mobile-field-notes.js';
import {phoneBrightness} from './mobile-visibility.js';
import {TOUCH_FOCUS_GAIN} from './touch-focus.js';
import {touchScenePoint} from './touch-tap-regions.js';
import {requestThreatTurn} from './touch-threat-turn.js';
import {clearTouchRoute} from './touch-route-follow.js';
import {clearTouchApproach} from './touch-approach.js';
import {requestComponentAim} from './touch-component-aim.js';
// Use the long axis for stable pixel gain across rotation; vertical correction
// is deliberately finer. Neither gesture speed nor event batching changes gain.
export function touchLookGain(width,height,sensitivity=1,aim=false){
 const axis=Math.max(1,Number(width)||1,Number(height)||1);
 const setting=Math.max(.25,Math.min(2.5,Number(sensitivity)||1));
 const factor=setting*(aim?TOUCH_FOCUS_GAIN:1);
 return {x:3.2/axis*factor,y:1.8/axis*factor};
}

// Scene turning uses the horizontal space actually available to the thumb.
// FIRE/utility corrections retain the finer long-axis pixel gain above.
export function touchSceneGain(width,height,sensitivity=1,aim=false){
 const gain=touchLookGain(width,height,sensitivity,aim);
 gain.x*=Math.max(1,Number(width)||1,Number(height)||1)/Math.max(1,Number(width)||1);
 return gain;
}

// Integrate a bounded gain ramp over displacement. The same swipe has the
// same result with one coalesced event or many, and reversing returns to zero.
// Small corrections and all FIRE/AIM gestures retain the linear gain above.
export function sceneTurnDisplacement(pixels,width,height){
 const axis=Math.max(1,Number(width)||1,Number(height)||1),fine=.08*axis,ramp=.3*axis;
 const distance=Math.abs(pixels),excess=Math.max(0,distance-fine),r=Math.min(excess,ramp);
 return Math.sign(pixels)*(distance+.5*r*r/ramp+Math.max(0,excess-ramp));
}

// A firing thumb needs fine corrections before a broad turn. Integrate the
// gain ramp over raw travel so event coalescing and reversal stay predictable.
// Each axis is independent: vertical correction never introduces yaw.
export function fireAimDisplacement(pixels,width,height){
 const axis=Math.max(1,Number(width)||1,Number(height)||1),fine=.06*axis,ramp=.12*axis;
 const distance=Math.abs(pixels),excess=Math.max(0,distance-fine),r=Math.min(excess,ramp);
 return Math.sign(pixels)*(.55*distance+.45*(.5*r*r/ramp+Math.max(0,excess-ramp)));
}

// Each pointer owns one role until release; phase changes invalidate all ownership.
export function installTouch(game,{map,onBrightness,onSensitivity,onFireSpeed,onFastTurns,onAimAssist,onAutoVault,onTapAim}){
 if(!game.touchMode)return;
 document.body.classList.add('touch-mode');
 game.touchFieldNotes=installFieldNotes();
 const weaponName=document.getElementById('weapon-name');for(const node of [...weaponName.parentNode.childNodes])if(node!==weaponName)node.remove();
 const root=document.createElement('div');root.id='touch-controls';root.className='hidden';
 root.innerHTML=`<div id="touch-look" aria-label="Drag to look"></div><div id="touch-stick" aria-label="Movement joystick"><i></i><span>MOVE</span></div><button id="touch-use" data-action="use">HOLD ROUTE</button><div id="touch-actions">${[['ads','AIM'],['dash','DASH'],['jump','JUMP']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}<button id="touch-fire" data-action="fire">FIRE<br><small>drag aim</small></button><button id="touch-more" data-action="tools" aria-label="Open tools: manual reload, weapon swap, crouch and run" aria-expanded="false" aria-controls="touch-extra">KIT</button><div id="touch-extra" class="hidden" role="group" aria-label="Additional controls">${[['reload','RELOAD'],['swap','SWAP'],['crouch','CROUCH'],['sprint','RUN']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}</div></div><button id="touch-map">MAP</button>`;
 for(const id of ['touch-route-cue','touch-threat-cue']){const cue=document.createElement(id==='touch-threat-cue'?'button':'div');if(cue.tagName==='BUTTON')cue.type='button';cue.id=id;cue.className='touch-compass-cue hidden';cue.innerHTML='<small></small><b></b>';document.querySelector('.hud-top').append(cue)}
 document.querySelector('.bearing').append(document.querySelector('#timer'));
 document.body.append(root);const owners=new Map(),stick=root.querySelector('#touch-stick'),knob=stick.querySelector('i');
 // A phase-opening touch can release over a newly revealed button. Consume
 // only its compatibility click; a new gesture or keyboard activation is free.
 let phaseTouch=null;
 const touchPhases=new Map();
 document.addEventListener('pointerdown',e=>{phaseTouch=null;if(e.pointerType!=='mouse')touchPhases.set(e.pointerId,game.phase)},true);
 document.addEventListener('pointercancel',e=>{touchPhases.delete(e.pointerId);if(e.pointerId===phaseTouch)phaseTouch=null},true);
 document.addEventListener('click',e=>{
  const began=touchPhases.get(e.pointerId);touchPhases.delete(e.pointerId);
  // Chromium can retarget a held contact's release to a result-screen button
  // after the playing controls disappear. Only a fresh gesture may act there.
  if(e.pointerId===phaseTouch||(began!==undefined&&began!==game.phase)){phaseTouch=null;e.preventDefault();e.stopImmediatePropagation()}
 },true);
 const phasePress=(e,open)=>{e.preventDefault();phaseTouch=e.pointerId;open()};
 root.querySelector('#touch-ads').setAttribute('aria-label','Toggle magnified sights; drag more finely while zoomed');
 const more=root.querySelector('#touch-more'),extra=root.querySelector('#touch-extra');
 const setTools=open=>{document.body.classList.toggle('touch-tools-open',open);extra.classList.toggle('hidden',!open);more.setAttribute('aria-expanded',String(open));};
 const clear=()=>{game.touchTrackSeed=null;game.touchTrack=null;game.touchCoverGuard=false;game.touchFireLatch=null;game.touchThreatTurn=null;game.touchThreatCue=null;clearTouchRoute(game);clearTouchApproach(game);game.touchVaultContact=null;game.touchRecoveryBraked=false;for(const [id,p]of owners){delete p.el.dataset.held;try{p.el.releasePointerCapture(id)}catch{}}owners.clear();setTools(false);knob.style.transform='';game.touchMove.x=game.touchMove.z=0;game.mouseDown=false;game.touchUse=false;root.querySelectorAll('[aria-pressed]').forEach(e=>e.setAttribute('aria-pressed','false'));};
 game.touchInput={clear,root};
 const threat=document.querySelector('#touch-threat-cue');root.append(threat);
 threat.addEventListener('pointerdown',e=>{
  const cue=game.touchThreatCue;
  if(game.phase!=='playing'||e.pointerType==='mouse'||!cue||threat.classList.contains('hidden')||[...owners.values()].some(p=>p.role==='threat'))return;
  e.preventDefault();threat.setPointerCapture(e.pointerId);threat.dataset.held='true';setTools(false);game.audio.wake();
  owners.set(e.pointerId,{el:threat,role:'threat',startX:e.clientX,startY:e.clientY,travel:0,started:performance.now(),heading:cue.heading,sampledAt:cue.time});
 });
 threat.onclick=e=>{if(e.detail===0&&game.touchThreatCue&&!threat.classList.contains('hidden'))requestThreatTurn(game,game.touchThreatCue.heading,game.touchThreatCue.time)};

 root.addEventListener('pointerdown',e=>{
  if(game.phase!=='playing'||e.pointerType==='mouse')return;
  const el=e.target.closest('button,#touch-stick,#touch-look');if(!el||el.id==='touch-threat-cue')return;if(el.id==='touch-map'){phasePress(e,map);return;}
  if(el.classList.contains('component-aim')){
   if(el.disabled||[...owners.values()].some(p=>p.role==='component'))return;
   e.preventDefault();el.setPointerCapture(e.pointerId);setTools(false);game.audio.wake();game.touchThreatTurn=null;
   if(game.touchUse)game.touchRouteManualLook=true;
   owners.set(e.pointerId,{el,role:'component',index:Number(el.dataset.coil),startX:e.clientX,startY:e.clientY,travel:0,started:performance.now()});return;
  }
  const role=el.dataset.action||(el===stick?'move':'look');if([...owners.values()].some(p=>p.role===role))return;
  if(role==='look'){game.touchTrackSeed=null;game.touchCoverGuard=false;}
  if(['look','dash','jump'].includes(role))game.touchThreatTurn=null;
  if(['move','dash','jump'].includes(role)&&game.touchRoute)clearTouchRoute(game,true);
  if(role==='look'&&game.touchUse)game.touchRouteManualLook=true;
  e.preventDefault();el.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();owners.set(e.pointerId,{el,role,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now(),travel:0,sceneDragging:false,appliedX:0,appliedY:0,looking:role==='look'||role==='fire',cx:r.x+r.width/2,cy:r.y+r.height/2});
  if(['fire','ads','dash','jump','use'].includes(role))setTools(false);
  if(!['move','look'].includes(role))game.touchVaultContact=null;
  game.audio.wake();if(role==='tools')setTools(more.getAttribute('aria-expanded')!=='true');else if(role==='fire'){game.rifleResult=null;game.touchFireLatch=null;game.mouseDown=true;beginTouchTracking(game);}else if(role==='use'){clearTouchRoute(game);clearTouchApproach(game);game.touchRouteManualLook=[...owners.values()].some(p=>p.role==='look');game.touchUseGoal=game.routeGoal?.startsWith('supply-')?game.routeGoal:null;game.touchUse=true;game.interact()}else if(!['move','look'].includes(role)){game.action(role);el.setAttribute('aria-pressed',String(role==='ads'?game.aim:role==='sprint'?game.touchSprint:role==='crouch'?game.crouchRequested:false))}
  if(role==='move')move(e);
 });
 function move(e){
  const p=owners.get(e.pointerId);if(!p||game.phase!=='playing')return;e.preventDefault();if(p.role==='tools')return;
  if(p.role==='threat'||p.role==='component'){p.travel=Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY));return;}
  if(p.role==='move'){
   const dx=(e.clientX-p.cx)/46,dy=(e.clientY-p.cy)/46,len=Math.hypot(dx,dy),mag=Math.min(1,Math.max(0,(len-.14)/.86))**1.5;
   game.touchMove.x=len?dx/len*mag:0;game.touchMove.z=len?dy/len*mag:0;
   knob.style.transform=`translate(${game.touchMove.x*36}px,${game.touchMove.z*36}px)`;
  }else{
   let dx=e.clientX-p.x,dy=e.clientY-p.y;
   p.travel=Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY));
   if(!p.looking){
    dx=e.clientX-p.startX;dy=e.clientY-p.startY;const distance=Math.hypot(dx,dy);
    // Apply only travel beyond the tap dead zone, even if native move events
    // coalesce. A utility tap acts once and small tap jitter never turns view.
    if(distance>=6){p.looking=true;dx*=1-6/distance;dy*=1-6/distance}else dx=dy=0;
   }
   const gain=(p.role==='look'?touchSceneGain:touchLookGain)(innerWidth,innerHeight,game.options.touchSensitivity,game.aim);
   if(p.role==='fire'){
    dx=fireAimDisplacement(e.clientX-p.startX,innerWidth,innerHeight)-fireAimDisplacement(p.x-p.startX,innerWidth,innerHeight);
    dy=fireAimDisplacement(e.clientY-p.startY,innerWidth,innerHeight)-fireAimDisplacement(p.y-p.startY,innerWidth,innerHeight);
    const speed=fireDragSpeed(game.options.touchFireSpeed);dx*=speed;dy*=speed;
   }
   if(p.role==='look'){
    const x=e.clientX-p.startX,y=e.clientY-p.startY;
    if(p.travel>6||game.options.touchTapAim===false)p.sceneDragging=true;
    if(!p.sceneDragging)dx=dy=0;
    else{
     dx=!game.aim&&game.options.fastSceneTurns!==false?sceneTurnDisplacement(x,innerWidth,innerHeight)-sceneTurnDisplacement(p.appliedX,innerWidth,innerHeight):x-p.appliedX;
     dy=y-p.appliedY;p.appliedX=x;p.appliedY=y;
    }
   }
   if(game.touchUse&&p.looking&&(dx||dy))game.touchRouteManualLook=true;
   if(dx||dy){game.touchCoverGuard=false;game.touchThreatTurn=null;game.touchAimNotice=null;}
   game.yaw-=dx*gain.x;
   game.pitch=Math.max(-1.44,Math.min(1.44,game.pitch-dy*gain.y));
  }
  p.x=e.clientX;p.y=e.clientY;
 }
 root.addEventListener('pointermove',move);

 function up(e){const p=owners.get(e.pointerId);if(!p)return;owners.delete(e.pointerId);
  if(p.role==='threat')delete threat.dataset.held;
  if(p.role==='component'&&e.type==='pointerup'&&!p.el.disabled&&Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY))<=6&&performance.now()-p.started<=350)requestComponentAim(game,p.index);
  if(p.role==='threat'&&e.type==='pointerup'&&Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY))<=6&&performance.now()-p.started<=350&&game.touchThreatCue&&!threat.classList.contains('hidden'))requestThreatTurn(game,p.heading,p.sampledAt);
  if(e.type==='pointerup'&&p.role==='look'&&!p.sceneDragging&&Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY))<=6&&performance.now()-p.started<=350&&game.phase==='playing'&&touchScenePoint(e.clientX,e.clientY))game.tapAimAt(e.clientX,e.clientY);
  if(p.role==='move'){game.touchVaultContact=null;game.touchMove.x=game.touchMove.z=0;knob.style.transform=''}if(p.role==='fire'){game.touchTrackSeed=null;game.touchTrack=null;game.touchCoverGuard=false;game.touchFireLatch=null;game.mouseDown=false;}if(p.role==='use'){game.touchUse=false;game.touchRecoveryBraked=false;clearTouchRoute(game);clearTouchApproach(game);}if(['reload','swap','crouch','sprint'].includes(p.role))setTools(false);if((p.looking||p.role==='use')&&game.phase==='playing')game.emit();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,up);
 root.addEventListener('click',e=>{const el=e.target.closest('.component-aim');if(e.detail===0&&el&&!el.disabled)requestComponentAim(game,Number(el.dataset.coil))});
 // Touch-down also works while the movement thumb is held. Keyboard activation
 // remains available; suppress a second action from the later touch click.
 root.querySelector('#touch-map').onclick=e=>{if(e.detail===0&&game.phase==='playing')map()};
 document.querySelector('#pause-button').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&game.phase==='playing')phasePress(e,()=>game.pause())});
 document.querySelector('#memory-card .micro-label').textContent='MEMORY SAVED';
 const notices=document.createElement('div');notices.id='touch-notices';notices.append(document.querySelector('#memory-card'),document.querySelector('#announcement'));document.querySelector('#hud').append(notices);
 document.querySelector('#pointer-help').textContent='Left stick moves · swipe RIGHT to turn right, LEFT to turn left · steady scene turning · faster turns optional in Settings. Left ROUTE travels while the right thumb defends. The TURN warning can use either thumb side to leave an alerted target visible. Rifle kills, coil shutdowns and assisted solid-cover shots end the held burst: lift FIRE, then press again. Empty weapons reload automatically; KIT holds manual RELOAD, SWAP, CROUCH and RUN. AIM magnifies distant targets. FIRE drag speed is adjustable in Settings. Landscape recommended.';
 const help=document.createElement('p');help.textContent='TOUCH: Left stick moves proportionally. Drag the scene outside the movement stick to look. Hold FIRE and drag the same thumb to aim while moving. With rifle assistance enabled, FIRE helps follow the motion of a target you aim at; FOLLOW appears on the button. Your fine drag corrections stay manual. Drag away or lift to release; cover, defeated targets and reload cancel follow. Lift and press again to acquire another target. AIM toggles a magnified view for distant targets, with finer drag control. The numbered coil AIM badge centers a target; it does not toggle AIM. During the Custodian fight, OPEN shows current opening time; its thin meter uses a fixed three-second scale. The last moments turn amber while the coil remains open. Shots may meet armor as the window closes. Armor takes reduced chip damage; an open copper coil takes stronger hits. The numbered AIM badge centers the currently visible coil without firing; FIRE remains separate. Cover changes can reject the selection. Existing projectiles remain dangerous. A confirmed rifle elimination or coil shutdown ends the held burst; lift FIRE and press again for the next target. With rifle assistance enabled, any actual solid-cover hit ends that burst, including manual aim and inert machine housing. COVER · LIFT FIRE means release, reposition and press again. A fresh press fires again and stops after another solid-cover hit. Live armor and capacitor targets remain shootable. Disabling rifle assistance keeps continuous manual bursts. Dragging still turns your view while the burst is stopped. LAST on the weapon line names a recent confirmed rifle elimination, not your current target. Paused FIELD MESSAGES retain timestamped confirmations. Empty weapons reload automatically after the shot recovers when reserve ammunition remains. KIT opens manual RELOAD, SWAP, CROUCH and RUN; actions close the tray and play continues. RUN toggles sprint. DASH follows the stick direction, or goes forward when the stick is centered. Hold MOVE forward against low cover to vault automatically; JUMP also vaults. Auto vault pauses while aiming, firing or holding the left action button. Hold the left action button while entering a receiver ring or suit service. MAP pauses and selects a route. Held action buttons can also drag the view.';document.querySelector('#controls-dialog h2').after(help);
 // Keep the full tactical handbook while translating its keyboard instructions.
 for(const panel of document.querySelectorAll('#controls-dialog,#briefing-dialog')){
  const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())node.textContent=node.textContent.replace(/Press 1 for the precision rifle or 2 for the pump breacher\./g,'Tap SWAP to switch between precision rifle and pump breacher.').replace(/R inserts/g,'RELOAD inserts').replace(/Shift close/g,'DASH close').replace(/C toggles/g,'CROUCH toggles').replace(/Ctrl requests standing/g,'Tap CROUCH again to request standing').replace(/C changes/g,'Stance changes').replace(/Press Space/g,'Tap JUMP').replace(/Hold Tab while moving for a short ground approach to the selected objective; M selects on the paused map\./g,'Tap MAP to pause and select an objective.').replace(/Press M for paused facility planning\./g,'Tap MAP for paused facility planning.').replace(/M or Close resumes; Escape opens the pause menu\./g,'CLOSE MAP resumes; Pause opens the pause menu.').replace(/held Tab trace/g,'selected route').replace(/hold E/gi,'hold the left action button').replace(/WASD/g,'the left stick').replace(/mouse/gi,'right drag').replace(/\bShift\b/gi,'DASH').replace(/Soul DASH/gi,'Soul Shift').replace(/Patrol perimeter shutters lift amber for 0\.55 seconds before a radial proximity discharge\./g,'Patrol perimeter shutters lift amber before a radial proximity discharge. Standard and Story phone warnings last at least 0.9 seconds, or 1.4 seconds when starting outside the view. Veteran keeps 0.55 seconds.');
 }
 // Keep the full handbook available without making it the first phone lesson.
 const handbook=document.querySelector('#controls-dialog'),details=document.createElement('details');
 details.id='touch-handbook';const summary=document.createElement('summary');summary.textContent='FULL TACTICAL HANDBOOK';details.append(summary);
 for(const child of [...(handbook.querySelector('.handbook-content')||handbook).children])if(child!==help&&child.matches('p,.control-list'))details.append(child);
 const lesson=document.createElement('ol');lesson.id='touch-quickstart';
 for(const text of ['MOVE with the left thumb. Swipe the scene to turn quickly. Tap a visible enemy or coil to center your aim, then hold FIRE. FIRE drags make fine corrections; AIM zooms and steadies them; tap AIM again for the wide view. Empty weapons reload automatically; KIT has manual RELOAD. Tap TURN on a warning to face offscreen danger.', 'Hold the left ROUTE control to travel; keep it held while firing or using AIM to defend. Scene touch gives free look. MOVE, DASH or JUMP takes over. Near a receiver, keep holding to recover; release after SAVED. MAP pauses for planning.', 'After three memories, destroy the numbered copper coils. Tap a numbered AIM badge or visible coil to center the view, then FIRE. ARMOR means chip damage; cyan OPEN means stronger hits. Move to a clear face.', 'When the jammer falls, return to the marked uplink deck and survive the upload. DASH helps reposition; JUMP becomes VAULT near low cover.']){const item=document.createElement('li');item.textContent=text;lesson.append(item)}
 help.replaceWith(lesson);lesson.after(details);const scrollHint=document.createElement('span');scrollHint.id='handbook-scroll-hint';scrollHint.textContent='SWIPE INSTRUCTIONS ↑';scrollHint.setAttribute('aria-hidden','true');handbook.querySelector('.dialog-header').append(scrollHint);const compassHelp=document.createElement('p');compassHelp.textContent='COMPASS CUES: PATH names the existing clear ground step relative to your view. Turn toward FRONT before walking forward. Tap TURN on CHARGE, HIT FROM or FIRE to face that broad direction; then tap a visible enemy and FIRE. A turn keeps pitch, never fires, and preserves a held walking route with free look until the action button is released. Swipe to take over. These cues name one prioritized alerted direction; DAMAGED recalls a target you recently hit. +N counts other offscreen alerted directions. Charging takes priority over a recent hit, then recent fire. They do not reveal targets behind cover or track the source of an old hit. Visible optic brackets and the large hit arrow remain.';details.append(compassHelp);const routeGuide=document.createElement('p');routeGuide.textContent='The left HOLD ROUTE control follows the selected map path at normal walking speed. The movement stick takes over manual travel. Empty weapons reload automatically after the shot recovers, even when FIRE is released; manual RELOAD is in KIT. While the view follows automatic travel, a repeated PATH FRONT stays quiet; directions around bends, manual look and combat remain visible. The view looks up to 2.5 metres ahead along a capsule-clear part of the walking path, then faces the selected landmark after arrival. This can still briefly show close architecture at a blind bend. Reduced camera motion keeps the immediate walking direction and gentler turn speed. At the uplink it faces the courtyard for defense. It frames the landmark, not a guaranteed firing face. Touch the scene or drag held action button for free look until you release the action button. Patrols can still attack. Release the action button to stop. Hold FIRE or toggle AIM while ROUTE stays held to defend during travel and its receiver handoff. Firing/aiming suspends automatic camera turns; look drags retain manual ownership. AIM keeps normal slower walking speed. MOVE, DASH or JUMP cancels until you release and hold again. It stops at the receiver, Custodian approach or uplink deck; a new objective needs a new hold. The Custodian route stops at a standing broad-face approach. If firing or free look leaves you facing away, release ROUTE and FIRE/AIM, then hold FACE COILS to turn toward the static machine. This does not select a live coil or fire. Shutters, pillars, enemies and crouched cover can still block a shot. At the standing approach the deliberate FACE COILS turn is faster than the walking view; release to stop it. Scene taps briefly report AIM SET or AIM UNCHANGED by ammunition; neither fires or tracks. Dragging, firing, weapon switching and leaving play clear that message. Reloading takes priority. Rifle shot results then use the same line: COVER or INERT COVER means the shot struck a blocking surface; a numbered ARMOR result means reduced coil damage, HIT means exposed damage and OFF means disabled. RELOADING takes priority. This readout describes actual rifle shots only; the breacher keeps its existing effects. MAP → SUPPLIES selects a reachable existing drop; hold SUPPLY ROUTE to collect it, then release the action button after RESUPPLIED. Drops expire after 90 seconds. AUTO returns to the mission. Choose another receiver in MAP. A nearby receiver keeps its shorter APPROACH interaction.';details.append(routeGuide);const recoveryHelp=document.createElement('p');recoveryHelp.textContent='Near a receiver, HOLD APPROACH follows a short capsule-clear walking route when MOVE is released. MOVE, AIM and FIRE override walking; release the action button stops it. DASH or JUMP cancels approach until a new action-button hold. It avoids architecture, not enemy fire. Inside the original ring, the suit brakes for recovery until the action button is released.';details.append(recoveryHelp);const cadenceHelp=document.createElement('p');cadenceHelp.textContent='PHONE COMBAT: Standard and Story sequence new patrol attacks so amber warnings have time to read. Shots already in flight remain dangerous. Attacks starting outside the view warn longer; turning does not cancel them. Close discharges can be interrupted with DASH. A phone dash toward a body brakes before contact; sideways and retreating dashes keep their travel. Braking alone does not interrupt an attack or damage an enemy. Veteran keeps the faster original cadence.';details.append(cadenceHelp);
 document.querySelector('.menu-footer>span:last-child').textContent='TOUCH · WEBGL 2';
 document.querySelector('#close-map').textContent='CLOSE MAP';document.querySelector('#facility-map > p').textContent='MISSION PAUSED · Plan a route · CLOSE MAP resumes';document.querySelector('#controls-dialog .control-list').style.display='none';
 document.querySelector('#route-help').closest('label').nextElementSibling.textContent='Shows the next clear ground step while walking. Stops during aiming or firing. Tap MAP to choose a destination. Patrols still matter.';
 const setting=document.createElement('div');setting.className='touch-aim-setting';
 const brightnessLabel=document.createElement('label');brightnessLabel.htmlFor='touch-brightness';brightnessLabel.textContent='SCENE BRIGHTNESS ';
 const brightnessValue=document.createElement('output');brightnessLabel.append(brightnessValue);
 const brightness=document.createElement('input');brightness.id='touch-brightness';brightness.type='range';brightness.min='.8';brightness.max='1.6';brightness.step='.05';brightness.value=phoneBrightness(game.options.mobileBrightness);brightness.setAttribute('aria-label','Scene brightness');
 const updateBrightness=()=>{brightnessValue.textContent=Number(brightness.value).toFixed(2)+'×';brightness.setAttribute('aria-valuetext',brightnessValue.textContent)};updateBrightness();
 brightness.oninput=()=>{updateBrightness();const value=phoneBrightness(Number(brightness.value));if(onBrightness)onBrightness(value);else game.setSettings({mobileBrightness:value})};
 const brightnessNote=document.createElement('p');brightnessNote.className='setting-note';brightnessNote.textContent='Raise this for dark cover or lower it for a deeper storm mood. 1.00× restores the original scene lighting. HUD brightness stays fixed.';
 const label=document.createElement('label');label.htmlFor='touch-sensitivity';label.textContent='TOUCH LOOK SENSITIVITY ';
 const value=document.createElement('output');label.append(value);
 const input=document.createElement('input');input.id='touch-sensitivity';input.type='range';input.min='.25';input.max='2.5';input.step='.05';input.value=game.options.touchSensitivity||1;input.setAttribute('aria-label','Touch look sensitivity');
 const update=()=>{value.textContent=Number(input.value).toFixed(2)+'×';input.setAttribute('aria-valuetext',value.textContent)};update();
 input.oninput=()=>{update();game.options.touchSensitivity=Number(input.value);onSensitivity?.(Number(input.value));try{const s=JSON.parse(localStorage.getItem('soulfall-settings')||'{}');s.touchSensitivity=Number(input.value);localStorage.setItem('soulfall-settings',JSON.stringify(s))}catch{}};
 const fireLabel=document.createElement('label');fireLabel.htmlFor='touch-fire-speed';fireLabel.textContent='FIRE DRAG SPEED ';const fireValue=document.createElement('output');fireValue.id='touch-fire-speed-value';fireValue.htmlFor='touch-fire-speed';fireLabel.append(fireValue);
 const fireInput=document.createElement('input');fireInput.id='touch-fire-speed';fireInput.type='range';fireInput.min='.4';fireInput.max='1.6';fireInput.step='.1';fireInput.value=fireDragSpeed(game.options.touchFireSpeed);fireInput.setAttribute('aria-label','FIRE drag speed');
 const firePresets=document.createElement('div');firePresets.className='touch-fire-presets';firePresets.setAttribute('role','group');firePresets.setAttribute('aria-label','FIRE drag speed presets');
 const paintFireSpeed=()=>{const speed=fireDragSpeed(fireInput.value);fireValue.textContent=speed.toFixed(1)+'×';fireInput.setAttribute('aria-valuetext',fireValue.textContent);for(const button of firePresets.children)button.setAttribute('aria-pressed',String(Number(button.dataset.fireSpeed)===speed))};
 const applyFireSpeed=()=>{const speed=fireDragSpeed(fireInput.value);paintFireSpeed();if(onFireSpeed)onFireSpeed(speed);else{game.setSettings({touchFireSpeed:speed});try{const saved=JSON.parse(localStorage.getItem('soulfall-settings')||'{}');saved.touchFireSpeed=speed;localStorage.setItem('soulfall-settings',JSON.stringify(saved))}catch{}}};fireInput.oninput=applyFireSpeed;
 for(const [text,speed]of[['FINE',.6],['DEFAULT',1],['FAST',1.4]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.fireSpeed=String(speed);button.setAttribute('aria-controls','touch-fire-speed');button.onclick=()=>{fireInput.value=speed;applyFireSpeed()};firePresets.append(button)}paintFireSpeed();
 const fireNote=document.createElement('p');fireNote.className='setting-note';fireNote.textContent='Adjust only the right thumb while dragging FIRE. FINE makes smaller corrections; FAST makes broader turns. Your scene swipes keep their look speed. DEFAULT restores the original FIRE response. AIM still adds finer zoomed control.';
 const turnLabel=document.createElement('label');turnLabel.className='checkbox-label';
 const turn=document.createElement('input');turn.id='touch-fast-turns';turn.type='checkbox';turn.checked=game.options.fastSceneTurns!==false;
 turn.onchange=()=>{game.options.fastSceneTurns=turn.checked;onFastTurns?.(turn.checked)};
 turnLabel.append(turn,document.createTextNode(' Faster long scene turns'));
 const note=document.createElement('p');note.className='setting-note';note.textContent='FIRE uses finer small drags and ramps up for longer turns. Scene swipes scale with screen width for quick portrait turns; optional long swipes turn faster. AIM gives finer corrections with a magnified view. Use FIRE DRAG SPEED to tune firing corrections separately.';
 const assistLabel=document.createElement('label');assistLabel.className='checkbox-label';const assist=document.createElement('input');assist.id='touch-aim-assist';assist.type='checkbox';assist.checked=game.options.touchAimAssist!==false;assist.onchange=()=>{game.options.touchAimAssist=assist.checked;onAimAssist?.(assist.checked)};assistLabel.append(assist,document.createTextNode(' Rifle aim assistance'));const assistNote=document.createElement('p');assistNote.className='setting-note';assistNote.textContent='Rifle assistance helps follow the motion of a target you aim at while FIRE is held. Fine drags stay manual; drag away or lift to release. Cover, defeat or reload cancels follow. Lift and press on a target to acquire again. Includes near-miss shot correction. FOLLOW appears on FIRE; assisted shots use a separate personal best.';
 const vaultLabel=document.createElement('label');vaultLabel.className='checkbox-label';const vault=document.createElement('input');vault.id='touch-auto-vault';vault.type='checkbox';vault.checked=game.options.touchAutoVault!==false;vault.onchange=()=>{game.options.touchAutoVault=vault.checked;game.touchVaultContact=null;onAutoVault?.(vault.checked)};vaultLabel.append(vault,document.createTextNode(' Hold-forward auto vault'));const vaultNote=document.createElement('p');vaultNote.className='setting-note';vaultNote.textContent='Hold MOVE forward against low cover to vault. Release MOVE before it starts, or use AIM, to stay behind cover. Auto vault pauses during firing, reload, crouch and held action button. JUMP still vaults manually.';
 const tapLabel=document.createElement('label');tapLabel.className='checkbox-label';const tap=document.createElement('input');tap.id='touch-tap-aim';tap.type='checkbox';tap.checked=game.options.touchTapAim!==false;tap.onchange=()=>{game.options.touchTapAim=tap.checked;onTapAim?.(tap.checked)};tapLabel.append(tap,document.createTextNode(' Tap visible targets to aim'));const tapNote=document.createElement('p');tapNote.className='setting-note';tapNote.textContent='A short scene tap on or near a visible enemy or coil centers a real surface within 36 m. Small finger-position errors are forgiven; nearer cover, the weapon and HUD still block selection. AIM SET confirms an accepted tap; AIM UNCHANGED means no selection was made. Neither promises a hit. The message clears when you drag, fire, switch weapons or leave play. It does not fire or track. Cover blocks selection. Drags still turn normally. Both weapons; using this joins touch-assisted personal bests.';setting.append(brightnessLabel,brightness,brightnessNote,label,input,fireLabel,fireInput,firePresets,fireNote,turnLabel,note,tapLabel,tapNote,assistLabel,assistNote,vaultLabel,vaultNote);document.querySelector('#settings-dialog h2').after(setting);
}
