import {requestThreatTurn} from './touch-threat-turn.js';
import {clearTouchRoute} from './touch-route-follow.js';
import {clearTouchApproach} from './touch-approach.js';
// Use the long axis for stable pixel gain across rotation; vertical correction
// is deliberately finer. Neither gesture speed nor event batching changes gain.
export function touchLookGain(width,height,sensitivity=1,aim=false){
 const axis=Math.max(1,Number(width)||1,Number(height)||1);
 const setting=Math.max(.25,Math.min(2.5,Number(sensitivity)||1));
 const factor=setting*(aim?.5:1);
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
export function installTouch(game,{map,onSensitivity,onFastTurns,onAimAssist,onAutoVault,onTapAim}){
 if(!game.touchMode)return;
 document.body.classList.add('touch-mode');
 const weaponName=document.getElementById('weapon-name');for(const node of [...weaponName.parentNode.childNodes])if(node!==weaponName)node.remove();
 const root=document.createElement('div');root.id='touch-controls';root.className='hidden';
 root.innerHTML=`<div id="touch-look" aria-label="Drag to look"></div><div id="touch-stick" aria-label="Movement joystick"><i></i><span>MOVE</span></div><button id="touch-use" data-action="use">HOLD ROUTE</button><div id="touch-actions">${[['ads','AIM'],['dash','DASH'],['jump','JUMP']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}<button id="touch-fire" data-action="fire">FIRE<br><small>drag aim</small></button><button id="touch-more" data-action="tools" aria-label="Open tools: manual reload, weapon swap, crouch and run" aria-expanded="false" aria-controls="touch-extra">TOOLS</button><div id="touch-extra" class="hidden" role="group" aria-label="Additional controls">${[['reload','RELOAD'],['swap','SWAP'],['crouch','CROUCH'],['sprint','RUN']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}</div></div><button id="touch-map">MAP</button>`;
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
 const more=root.querySelector('#touch-more'),extra=root.querySelector('#touch-extra');
 const setTools=open=>{document.body.classList.toggle('touch-tools-open',open);extra.classList.toggle('hidden',!open);more.setAttribute('aria-expanded',String(open));};
 const clear=()=>{game.touchThreatTurn=null;game.touchThreatCue=null;clearTouchRoute(game);clearTouchApproach(game);game.touchVaultContact=null;game.touchRecoveryBraked=false;for(const [id,p]of owners){try{p.el.releasePointerCapture(id)}catch{}}owners.clear();setTools(false);knob.style.transform='';game.touchMove.x=game.touchMove.z=0;game.mouseDown=false;game.touchUse=false;root.querySelectorAll('[aria-pressed]').forEach(e=>e.setAttribute('aria-pressed','false'));};
 game.touchInput={clear,root};
 const threat=document.querySelector('#touch-threat-cue');root.append(threat);
 threat.addEventListener('pointerdown',e=>{
  const cue=game.touchThreatCue;
  if(game.phase!=='playing'||e.pointerType==='mouse'||!cue||threat.classList.contains('hidden')||[...owners.values()].some(p=>p.role==='threat'))return;
  e.preventDefault();threat.setPointerCapture(e.pointerId);setTools(false);game.audio.wake();
  owners.set(e.pointerId,{el:threat,role:'threat',startX:e.clientX,startY:e.clientY,travel:0,started:performance.now(),heading:cue.heading,sampledAt:cue.time});
 });
 threat.onclick=e=>{if(e.detail===0&&game.touchThreatCue&&!threat.classList.contains('hidden'))requestThreatTurn(game,game.touchThreatCue.heading,game.touchThreatCue.time)};

 root.addEventListener('pointerdown',e=>{
  if(game.phase!=='playing'||e.pointerType==='mouse')return;
  const el=e.target.closest('button,#touch-stick,#touch-look');if(!el||el.id==='touch-threat-cue')return;if(el.id==='touch-map'){phasePress(e,map);return;}
  const role=el.dataset.action||(el===stick?'move':'look');if([...owners.values()].some(p=>p.role===role))return;
  if(['look','dash','jump'].includes(role))game.touchThreatTurn=null;
  if(['move','dash','jump'].includes(role)&&game.touchRoute)clearTouchRoute(game,true);
  if(role==='look'&&game.touchUse)game.touchRouteManualLook=true;
  e.preventDefault();el.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();owners.set(e.pointerId,{el,role,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now(),travel:0,sceneDragging:false,appliedX:0,appliedY:0,looking:role==='look'||role==='fire',cx:r.x+r.width/2,cy:r.y+r.height/2});
  if(['fire','ads','dash','jump','use'].includes(role))setTools(false);
  if(!['move','look'].includes(role))game.touchVaultContact=null;
  game.audio.wake();if(role==='tools')setTools(more.getAttribute('aria-expanded')!=='true');else if(role==='fire')game.mouseDown=true;else if(role==='use'){clearTouchRoute(game);clearTouchApproach(game);game.touchRouteManualLook=[...owners.values()].some(p=>p.role==='look');game.touchUseGoal=game.routeGoal?.startsWith('supply-')?game.routeGoal:null;game.touchUse=true;game.interact()}else if(!['move','look'].includes(role)){game.action(role);el.setAttribute('aria-pressed',String(role==='ads'?game.aim:role==='sprint'?game.touchSprint:role==='crouch'?game.crouchRequested:false))}
  if(role==='move')move(e);
 });
 function move(e){
  const p=owners.get(e.pointerId);if(!p||game.phase!=='playing')return;e.preventDefault();if(p.role==='tools')return;
  if(p.role==='threat'){p.travel=Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY));return;}
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
   if(dx||dy)game.touchThreatTurn=null;
   game.yaw-=dx*gain.x;
   game.pitch=Math.max(-1.44,Math.min(1.44,game.pitch-dy*gain.y));
  }
  p.x=e.clientX;p.y=e.clientY;
 }
 root.addEventListener('pointermove',move);
 function unblockedTap(x,y){
  for(const el of document.querySelectorAll('.hud-mission,.bearing,.vitals,.weapon-info,#extraction-panel,#announcement,#memory-card,#interaction,#service-hint,#field-controls,#event-feed,#timer,#touch-route-cue,#touch-threat-cue')){
   const css=getComputedStyle(el);if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)continue;
   const r=el.getBoundingClientRect();if(r.width&&r.height&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return false;
  }
  return true;
 }
 function up(e){const p=owners.get(e.pointerId);if(!p)return;owners.delete(e.pointerId);
  if(p.role==='threat'&&e.type==='pointerup'&&Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY))<=6&&performance.now()-p.started<=350&&game.touchThreatCue&&!threat.classList.contains('hidden'))requestThreatTurn(game,p.heading,p.sampledAt);
  if(e.type==='pointerup'&&p.role==='look'&&!p.sceneDragging&&Math.max(p.travel,Math.hypot(e.clientX-p.startX,e.clientY-p.startY))<=6&&performance.now()-p.started<=350&&game.phase==='playing'&&unblockedTap(e.clientX,e.clientY))game.tapAimAt(e.clientX,e.clientY);
  if(p.role==='move'){game.touchVaultContact=null;game.touchMove.x=game.touchMove.z=0;knob.style.transform=''}if(p.role==='fire')game.mouseDown=false;if(p.role==='use'){game.touchUse=false;game.touchRecoveryBraked=false;clearTouchRoute(game);clearTouchApproach(game);}if(['reload','swap','crouch','sprint'].includes(p.role))setTools(false);if((p.looking||p.role==='use')&&game.phase==='playing')game.emit();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,up);
 // Touch-down also works while the movement thumb is held. Keyboard activation
 // remains available; suppress a second action from the later touch click.
 root.querySelector('#touch-map').onclick=e=>{if(e.detail===0&&game.phase==='playing')map()};
 document.querySelector('#pause-button').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&game.phase==='playing')phasePress(e,()=>game.pause())});
 document.querySelector('#memory-card .micro-label').textContent='SAVED · RELEASE USE';
 const notices=document.createElement('div');notices.id='touch-notices';notices.append(document.querySelector('#memory-card'),document.querySelector('#announcement'));document.querySelector('#hud').append(notices);
 document.querySelector('#pointer-help').textContent='Left stick moves · swipe RIGHT to turn right, LEFT to turn left · steady scene turning · faster turns optional in Settings. Left ROUTE travels while the right thumb defends. TOOLS holds manual RELOAD, SWAP, CROUCH and RUN. Landscape recommended.';
 const help=document.createElement('p');help.textContent='TOUCH: Left stick moves proportionally. Drag the scene outside the movement stick to look. Hold FIRE and drag the same thumb to aim while moving. AIM toggles. TOOLS opens manual RELOAD, SWAP, CROUCH and RUN; actions close the tray and play continues. RUN toggles sprint. DASH follows the stick direction, or goes forward when the stick is centered. Hold MOVE forward against low cover to vault automatically; JUMP also vaults. Auto vault pauses while aiming, firing or holding USE. Hold USE while entering a receiver ring or suit service. MAP pauses and selects a route. Held action buttons can also drag the view.';document.querySelector('#controls-dialog h2').after(help);
 // Keep the full tactical handbook while translating its keyboard instructions.
 for(const panel of document.querySelectorAll('#controls-dialog,#briefing-dialog')){
  const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())node.textContent=node.textContent.replace(/Press 1 for the precision rifle or 2 for the pump breacher\./g,'Tap SWAP to switch between precision rifle and pump breacher.').replace(/R inserts/g,'RELOAD inserts').replace(/Shift close/g,'DASH close').replace(/C toggles/g,'CROUCH toggles').replace(/Ctrl requests standing/g,'Tap CROUCH again to request standing').replace(/C changes/g,'Stance changes').replace(/Press Space/g,'Tap JUMP').replace(/Hold Tab while moving for a short ground approach to the selected objective; M selects on the paused map\./g,'Tap MAP to pause and select an objective.').replace(/Press M for paused facility planning\./g,'Tap MAP for paused facility planning.').replace(/M or Close resumes; Escape opens the pause menu\./g,'CLOSE MAP resumes; Pause opens the pause menu.').replace(/held Tab trace/g,'selected route').replace(/hold E/gi,'hold USE').replace(/WASD/g,'the left stick').replace(/mouse/gi,'right drag').replace(/\bShift\b/gi,'DASH').replace(/Soul DASH/gi,'Soul Shift').replace(/Patrol perimeter shutters lift amber for 0\.55 seconds before a radial proximity discharge\./g,'Patrol perimeter shutters lift amber before a radial proximity discharge. Standard and Story phone warnings last at least 0.9 seconds, or 1.4 seconds when starting outside the view. Veteran keeps 0.55 seconds.');
 }
 // Keep the full handbook available without making it the first phone lesson.
 const handbook=document.querySelector('#controls-dialog'),details=document.createElement('details');
 details.id='touch-handbook';const summary=document.createElement('summary');summary.textContent='FULL TACTICAL HANDBOOK';details.append(summary);
 for(const child of [...(handbook.querySelector('.handbook-content')||handbook).children])if(child!==help&&child.matches('p,.control-list'))details.append(child);
 const lesson=document.createElement('ol');lesson.id='touch-quickstart';
 for(const text of ['MOVE with the left thumb. Swipe the scene to turn quickly. Tap a visible enemy or coil to center your aim, then hold FIRE. FIRE drags make fine corrections; AIM slows them further. Tap TURN on a warning to face offscreen danger.', 'Hold the left ROUTE control to travel; keep it held while firing or using AIM to defend. Scene touch gives free look. MOVE, DASH or JUMP takes over. Near a receiver, keep holding to recover; release after SAVED. MAP pauses for planning.', 'After three memories, destroy the numbered copper coils. Amber means cover; cyan means an exposed firing window. Move to a clear face.', 'When the jammer falls, return to the marked uplink deck and survive the upload. DASH helps reposition; JUMP becomes VAULT near low cover.']){const item=document.createElement('li');item.textContent=text;lesson.append(item)}
 help.replaceWith(lesson);lesson.after(details);const scrollHint=document.createElement('span');scrollHint.id='handbook-scroll-hint';scrollHint.textContent='SWIPE INSTRUCTIONS ↑';scrollHint.setAttribute('aria-hidden','true');handbook.querySelector('.dialog-header').append(scrollHint);const compassHelp=document.createElement('p');compassHelp.textContent='COMPASS CUES: PATH names the existing clear ground step relative to your view. Turn toward FRONT before walking forward. Tap TURN on CHARGE, HIT FROM or FIRE to face that broad direction; then tap a visible enemy and FIRE. A turn keeps pitch, never fires, and preserves a held walking route with free look until USE is released. Swipe to take over. These cues name one prioritized alerted direction; DAMAGED recalls a target you recently hit. +N counts other offscreen alerted directions. Charging takes priority over a recent hit, then recent fire. They do not reveal targets behind cover or track the source of an old hit. Visible optic brackets and the large hit arrow remain.';details.append(compassHelp);const routeGuide=document.createElement('p');routeGuide.textContent='The left HOLD ROUTE control follows the selected map path at normal walking speed. The movement stick takes over manual travel. Empty weapons reload automatically when FIRE is held; manual RELOAD is in TOOLS. The view turns gently along the path, then toward the selected landmark near arrival. At the uplink it faces the courtyard for defense. It frames the landmark, not a guaranteed firing face. Touch the scene or drag held USE for free look until you release USE. Patrols can still attack. Release USE to stop. Hold FIRE or toggle AIM while ROUTE stays held to defend during travel and its receiver handoff. Firing/aiming suspends automatic camera turns; look drags retain manual ownership. AIM keeps normal slower walking speed. MOVE, DASH or JUMP cancels until you release and hold again. It stops at the receiver, Custodian approach or uplink deck; a new objective needs a new hold. The Custodian route stops at a standing broad-face approach. If firing or free look leaves you facing away, release ROUTE and FIRE/AIM, then hold FACE COILS to turn toward the static machine. This does not select a live coil or fire. Shutters, pillars, enemies and crouched cover can still block a shot. At the standing approach the deliberate FACE COILS turn is faster than the walking view; release to stop it. Rifle shot results appear briefly by ammunition: COVER or INERT COVER means the shot struck a blocking surface; a numbered ARMOR result means reduced coil damage, HIT means exposed damage and OFF means disabled. RELOADING takes priority. This readout describes actual rifle shots only; the breacher keeps its existing effects. MAP → SUPPLIES selects a reachable existing drop; hold SUPPLY ROUTE to collect it, then release USE after RESUPPLIED. Drops expire after 90 seconds. AUTO returns to the mission. Choose another receiver in MAP. A nearby receiver keeps its shorter APPROACH interaction.';details.append(routeGuide);const recoveryHelp=document.createElement('p');recoveryHelp.textContent='Near a receiver, HOLD APPROACH follows a short capsule-clear walking route when MOVE is released. MOVE, AIM and FIRE override walking; release USE stops it. DASH or JUMP cancels approach until a new USE hold. It avoids architecture, not enemy fire. Inside the original ring, the suit brakes for recovery until USE is released.';details.append(recoveryHelp);const cadenceHelp=document.createElement('p');cadenceHelp.textContent='PHONE COMBAT: Standard and Story sequence new patrol attacks so amber warnings have time to read. Shots already in flight remain dangerous. Attacks starting outside the view warn longer; turning does not cancel them. Close discharges can be interrupted with DASH. Veteran keeps the faster original cadence.';details.append(cadenceHelp);
 document.querySelector('.menu-footer>span:last-child').textContent='TOUCH · WEBGL 2';
 document.querySelector('#close-map').textContent='CLOSE MAP';document.querySelector('#facility-map > p').textContent='MISSION PAUSED · Plan a route · CLOSE MAP resumes';document.querySelector('#controls-dialog .control-list').style.display='none';
 document.querySelector('#route-help').closest('label').nextElementSibling.textContent='Shows the next clear ground step while walking. Stops during aiming or firing. Tap MAP to choose a destination. Patrols still matter.';
 const setting=document.createElement('div');setting.className='touch-aim-setting';
 const label=document.createElement('label');label.htmlFor='touch-sensitivity';label.textContent='TOUCH LOOK SENSITIVITY ';
 const value=document.createElement('output');label.append(value);
 const input=document.createElement('input');input.id='touch-sensitivity';input.type='range';input.min='.25';input.max='2.5';input.step='.05';input.value=game.options.touchSensitivity||1;input.setAttribute('aria-label','Touch look sensitivity');
 const update=()=>{value.textContent=Number(input.value).toFixed(2)+'×';input.setAttribute('aria-valuetext',value.textContent)};update();
 input.oninput=()=>{update();game.options.touchSensitivity=Number(input.value);onSensitivity?.(Number(input.value));try{const s=JSON.parse(localStorage.getItem('soulfall-settings')||'{}');s.touchSensitivity=Number(input.value);localStorage.setItem('soulfall-settings',JSON.stringify(s))}catch{}};
 const turnLabel=document.createElement('label');turnLabel.className='checkbox-label';
 const turn=document.createElement('input');turn.id='touch-fast-turns';turn.type='checkbox';turn.checked=game.options.fastSceneTurns!==false;
 turn.onchange=()=>{game.options.fastSceneTurns=turn.checked;onFastTurns?.(turn.checked)};
 turnLabel.append(turn,document.createTextNode(' Faster long scene turns'));
 const note=document.createElement('p');note.className='setting-note';note.textContent='FIRE uses finer small drags and ramps up for longer turns. Scene swipes scale with screen width for quick portrait turns; optional long swipes turn faster. AIM halves speed. Lower sensitivity for finer aim.';
 const assistLabel=document.createElement('label');assistLabel.className='checkbox-label';const assist=document.createElement('input');assist.id='touch-aim-assist';assist.type='checkbox';assist.checked=game.options.touchAimAssist!==false;assist.onchange=()=>{game.options.touchAimAssist=assist.checked;onAimAssist?.(assist.checked)};assistLabel.append(assist,document.createTextNode(' Rifle aim assistance'));const assistNote=document.createElement('p');assistNote.className='setting-note';assistNote.textContent='Helps near misses reach visible targets. Cover still blocks shots. Rifle only; a cyan reticle ring acknowledges assisted aim or a shot. Assisted scores have a separate personal best.';
 const vaultLabel=document.createElement('label');vaultLabel.className='checkbox-label';const vault=document.createElement('input');vault.id='touch-auto-vault';vault.type='checkbox';vault.checked=game.options.touchAutoVault!==false;vault.onchange=()=>{game.options.touchAutoVault=vault.checked;game.touchVaultContact=null;onAutoVault?.(vault.checked)};vaultLabel.append(vault,document.createTextNode(' Hold-forward auto vault'));const vaultNote=document.createElement('p');vaultNote.className='setting-note';vaultNote.textContent='Hold MOVE forward against low cover to vault. Release MOVE before it starts, or use AIM, to stay behind cover. Auto vault pauses during firing, reload, crouch and held USE. JUMP still vaults manually.';
 const tapLabel=document.createElement('label');tapLabel.className='checkbox-label';const tap=document.createElement('input');tap.id='touch-tap-aim';tap.type='checkbox';tap.checked=game.options.touchTapAim!==false;tap.onchange=()=>{game.options.touchTapAim=tap.checked;onTapAim?.(tap.checked)};tapLabel.append(tap,document.createTextNode(' Tap visible targets to aim'));const tapNote=document.createElement('p');tapNote.className='setting-note';tapNote.textContent='A short scene tap centers the actual visible enemy or coil surface within 36 m. It does not fire or track. Cover blocks selection. Drags still turn normally. Both weapons; using this joins touch-assisted personal bests.';setting.append(label,input,turnLabel,note,tapLabel,tapNote,assistLabel,assistNote,vaultLabel,vaultNote);document.querySelector('#settings-dialog h2').after(setting);
}
