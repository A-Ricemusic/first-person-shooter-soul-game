// Use the long axis for stable pixel gain across rotation; vertical correction
// is deliberately finer. Neither gesture speed nor event batching changes gain.
export function touchLookGain(width,height,sensitivity=1,aim=false){
 const axis=Math.max(1,Number(width)||1,Number(height)||1);
 const setting=Math.max(.25,Math.min(2.5,Number(sensitivity)||1));
 const factor=setting*(aim?.5:1);
 return {x:3.2/axis*factor,y:1.8/axis*factor};
}

// Integrate a bounded gain ramp over displacement. The same swipe has the
// same result with one coalesced event or many, and reversing returns to zero.
// Small corrections and all FIRE/AIM gestures retain the linear gain above.
export function sceneTurnDisplacement(pixels,width,height){
 const axis=Math.max(1,Number(width)||1,Number(height)||1),fine=.08*axis,ramp=.3*axis;
 const distance=Math.abs(pixels),excess=Math.max(0,distance-fine),r=Math.min(excess,ramp);
 return Math.sign(pixels)*(distance+.5*r*r/ramp+Math.max(0,excess-ramp));
}

// Each pointer owns one role until release; phase changes invalidate all ownership.
export function installTouch(game,{map,onSensitivity,onFastTurns}){
 if(!game.touchMode)return;
 document.body.classList.add('touch-mode');
 const root=document.createElement('div');root.id='touch-controls';root.className='hidden';
 root.innerHTML=`<div id="touch-look" aria-label="Drag to look"></div><div id="touch-stick" aria-label="Movement joystick"><i></i><span>MOVE</span></div><div id="touch-actions">${[['ads','AIM'],['reload','RELOAD'],['dash','DASH'],['jump','JUMP'],['use','HOLD USE']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}<button id="touch-fire" data-action="fire">FIRE<br><small>drag aim</small></button><button id="touch-more" data-action="tools" aria-label="Open tools: weapon swap, crouch and run" aria-expanded="false" aria-controls="touch-extra">TOOLS</button><div id="touch-extra" class="hidden" role="group" aria-label="Additional controls">${[['swap','SWAP'],['crouch','CROUCH'],['sprint','RUN']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}</div></div><button id="touch-map">MAP</button>`;
 document.body.append(root);const owners=new Map(),stick=root.querySelector('#touch-stick'),knob=stick.querySelector('i');
 // A phase-opening touch can release over a newly revealed button. Consume
 // only its compatibility click; a new gesture or keyboard activation is free.
 let phaseTouch=null;
 document.addEventListener('pointerdown',()=>{phaseTouch=null},true);
 document.addEventListener('pointercancel',e=>{if(e.pointerId===phaseTouch)phaseTouch=null},true);
 document.addEventListener('click',e=>{if(e.pointerId===phaseTouch){phaseTouch=null;e.preventDefault();e.stopImmediatePropagation()}},true);
 const phasePress=(e,open)=>{e.preventDefault();phaseTouch=e.pointerId;open()};
 const more=root.querySelector('#touch-more'),extra=root.querySelector('#touch-extra');
 const setTools=open=>{extra.classList.toggle('hidden',!open);more.setAttribute('aria-expanded',String(open));};
 const clear=()=>{for(const [id,p]of owners){try{p.el.releasePointerCapture(id)}catch{}}owners.clear();setTools(false);knob.style.transform='';game.touchMove.x=game.touchMove.z=0;game.mouseDown=false;game.touchUse=false;root.querySelectorAll('[aria-pressed]').forEach(e=>e.setAttribute('aria-pressed','false'));};
 game.touchInput={clear,root};
 root.addEventListener('pointerdown',e=>{
  if(game.phase!=='playing'||e.pointerType==='mouse')return;
  const el=e.target.closest('button,#touch-stick,#touch-look');if(!el)return;if(el.id==='touch-map'){phasePress(e,map);return;}
  const role=el.dataset.action||(el===stick?'move':'look');if([...owners.values()].some(p=>p.role===role))return;
  e.preventDefault();el.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();owners.set(e.pointerId,{el,role,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,looking:role==='look'||role==='fire',cx:r.x+r.width/2,cy:r.y+r.height/2});
  if(['fire','ads','reload','dash','jump','use'].includes(role))setTools(false);
  game.audio.wake();if(role==='tools')setTools(more.getAttribute('aria-expanded')!=='true');else if(role==='fire')game.mouseDown=true;else if(role==='use'){game.touchUse=true;game.interact()}else if(!['move','look'].includes(role)){game.action(role);el.setAttribute('aria-pressed',String(role==='ads'?game.aim:role==='sprint'?game.touchSprint:role==='crouch'?game.crouchRequested:false))}
  if(role==='move')move(e);
 });
 function move(e){
  const p=owners.get(e.pointerId);if(!p||game.phase!=='playing')return;e.preventDefault();if(p.role==='tools')return;
  if(p.role==='move'){
   const dx=(e.clientX-p.cx)/46,dy=(e.clientY-p.cy)/46,len=Math.hypot(dx,dy),mag=Math.min(1,Math.max(0,(len-.14)/.86))**1.5;
   game.touchMove.x=len?dx/len*mag:0;game.touchMove.z=len?dy/len*mag:0;
   knob.style.transform=`translate(${game.touchMove.x*36}px,${game.touchMove.z*36}px)`;
  }else{
   let dx=e.clientX-p.x,dy=e.clientY-p.y;
   if(!p.looking){
    dx=e.clientX-p.startX;dy=e.clientY-p.startY;const distance=Math.hypot(dx,dy);
    // Apply only travel beyond the tap dead zone, even if native move events
    // coalesce. A utility tap acts once and small tap jitter never turns view.
    if(distance>=6){p.looking=true;dx*=1-6/distance;dy*=1-6/distance}else dx=dy=0;
   }
   const gain=touchLookGain(innerWidth,innerHeight,game.options.touchSensitivity,game.aim);
   if(p.role==='look'&&!game.aim&&game.options.fastSceneTurns!==false){
    dx=sceneTurnDisplacement(e.clientX-p.startX,innerWidth,innerHeight)-sceneTurnDisplacement(p.x-p.startX,innerWidth,innerHeight);
   }
   game.yaw-=dx*gain.x;
   game.pitch=Math.max(-1.44,Math.min(1.44,game.pitch-dy*gain.y));
  }
  p.x=e.clientX;p.y=e.clientY;
 }
 root.addEventListener('pointermove',move);
 function up(e){const p=owners.get(e.pointerId);if(!p)return;owners.delete(e.pointerId);if(p.role==='move'){game.touchMove.x=game.touchMove.z=0;knob.style.transform=''}if(p.role==='fire')game.mouseDown=false;if(p.role==='use')game.touchUse=false;if(['swap','crouch','sprint'].includes(p.role))setTools(false);if(p.looking&&game.phase==='playing')game.emit();}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,up);
 // Touch-down also works while the movement thumb is held. Keyboard activation
 // remains available; suppress a second action from the later touch click.
 root.querySelector('#touch-map').onclick=e=>{if(e.detail===0&&game.phase==='playing')map()};
 document.querySelector('#pause-button').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&game.phase==='playing')phasePress(e,()=>game.pause())});
 const notices=document.createElement('div');notices.id='touch-notices';notices.append(document.querySelector('#memory-card'),document.querySelector('#announcement'));document.querySelector('#hud').append(notices);
 document.querySelector('#pointer-help').textContent='Left stick moves · swipe RIGHT to turn right, LEFT to turn left · steady scene turning · faster turns optional in Settings. TOOLS holds SWAP, CROUCH and RUN. Landscape recommended.';
 const help=document.createElement('p');help.textContent='TOUCH: Left stick moves proportionally. Drag the scene outside the movement stick to look. Hold FIRE and drag the same thumb to aim while moving. AIM toggles. TOOLS opens SWAP, CROUCH and RUN; actions close the tray and play continues. RUN toggles sprint. DASH follows the stick direction, or goes forward when the stick is centered; JUMP vaults low cover. Hold USE while entering a receiver ring or suit service. MAP pauses and selects a route. Held action buttons can also drag the view.';document.querySelector('#controls-dialog h2').after(help);
 // Keep the full tactical handbook while translating its keyboard instructions.
 for(const panel of document.querySelectorAll('#controls-dialog,#briefing-dialog')){
  const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())node.textContent=node.textContent.replace(/Press 1 for the precision rifle or 2 for the pump breacher\./g,'Tap SWAP to switch between precision rifle and pump breacher.').replace(/R inserts/g,'RELOAD inserts').replace(/Shift close/g,'DASH close').replace(/C toggles/g,'CROUCH toggles').replace(/Ctrl requests standing/g,'Tap CROUCH again to request standing').replace(/C changes/g,'Stance changes').replace(/Press Space/g,'Tap JUMP').replace(/Hold Tab while moving for a short ground approach to the selected objective; M selects on the paused map\./g,'Tap MAP to pause and select an objective.').replace(/Press M for paused facility planning\./g,'Tap MAP for paused facility planning.').replace(/M or Close resumes; Escape opens the pause menu\./g,'CLOSE MAP resumes; Pause opens the pause menu.').replace(/held Tab trace/g,'selected route').replace(/hold E/gi,'hold USE').replace(/WASD/g,'the left stick').replace(/mouse/gi,'right drag').replace(/\bShift\b/gi,'DASH').replace(/Soul DASH/gi,'Soul Shift');
 }
 // Keep the full handbook available without making it the first phone lesson.
 const handbook=document.querySelector('#controls-dialog'),details=document.createElement('details');
 details.id='touch-handbook';const summary=document.createElement('summary');summary.textContent='FULL TACTICAL HANDBOOK';details.append(summary);
 for(const child of [...(handbook.querySelector('.handbook-content')||handbook).children])if(child!==help&&child.matches('p,.control-list'))details.append(child);
 const lesson=document.createElement('ol');lesson.id='touch-quickstart';
 for(const text of ['MOVE gently for small steps. Swipe RIGHT to turn right, LEFT to turn left. Scene turns are linear by default. Faster long turns are optional in SETTINGS. TOOLS opens SWAP, CROUCH and RUN.', 'MAP pauses to plan. Near a receiver, hold USE for careful steps. Stop inside its ring to recover; release USE to move freely.', 'After three memories, destroy the numbered copper coils. Amber means cover; cyan means an exposed firing window. Move to a clear face.', 'When the jammer falls, return to the marked uplink deck and survive the upload. DASH helps reposition; JUMP becomes VAULT near low cover.']){const item=document.createElement('li');item.textContent=text;lesson.append(item)}
 help.replaceWith(lesson);lesson.after(details);const scrollHint=document.createElement('span');scrollHint.id='handbook-scroll-hint';scrollHint.textContent='SWIPE INSTRUCTIONS ↑';scrollHint.setAttribute('aria-hidden','true');handbook.querySelector('.dialog-header').append(scrollHint);const recoveryHelp=document.createElement('p');recoveryHelp.textContent='Hold USE near a receiver for careful steps; release it to move at normal speed. You still need to enter the ring.';details.append(recoveryHelp);
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
 const note=document.createElement('p');note.className='setting-note';note.textContent='Small corrections stay precise. Long scene swipes turn faster when enabled. FIRE-drag stays linear; AIM halves speed. Lower sensitivity for finer aim.';
 setting.append(label,input,turnLabel,note);document.querySelector('#settings-dialog h2').after(setting);
}
