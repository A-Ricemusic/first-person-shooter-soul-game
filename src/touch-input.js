// Each pointer owns one role until release; phase changes invalidate all ownership.
export function installTouch(game,{map,onSensitivity}){
 if(!game.touchMode)return;
 document.body.classList.add('touch-mode');
 const root=document.createElement('div');root.id='touch-controls';root.className='hidden';
 root.innerHTML=`<div id="touch-look" aria-label="Drag to look"></div><div id="touch-stick" aria-label="Movement joystick"><i></i><span>MOVE</span></div><div id="touch-actions">${[['ads','AIM'],['reload','RELOAD'],['swap','SWAP'],['dash','DASH'],['jump','JUMP'],['crouch','CROUCH'],['sprint','RUN'],['use','HOLD USE']].map(([id,t])=>`<button id="touch-${id}" data-action="${id}">${t}</button>`).join('')}<button id="touch-fire" data-action="fire">FIRE<br><small>drag aim</small></button></div><button id="touch-map">MAP</button>`;
 document.body.append(root);const owners=new Map(),stick=root.querySelector('#touch-stick'),knob=stick.querySelector('i');
 const clear=()=>{for(const [id,p]of owners){try{p.el.releasePointerCapture(id)}catch{}}owners.clear();knob.style.transform='';game.touchMove.x=game.touchMove.z=0;game.mouseDown=false;game.touchUse=false;root.querySelectorAll('[aria-pressed]').forEach(e=>e.setAttribute('aria-pressed','false'));};
 game.touchInput={clear,root};
 root.addEventListener('pointerdown',e=>{
  if(game.phase!=='playing'||e.pointerType==='mouse')return;
  const el=e.target.closest('button,#touch-stick,#touch-look');if(!el||el.id==='touch-map')return;
  const role=el.dataset.action||(el===stick?'move':'look');if([...owners.values()].some(p=>p.role===role))return;
  e.preventDefault();el.setPointerCapture(e.pointerId);const r=stick.getBoundingClientRect();owners.set(e.pointerId,{el,role,x:e.clientX,y:e.clientY,cx:r.x+r.width/2,cy:r.y+r.height/2});
  game.audio.wake();if(role==='fire')game.mouseDown=true;else if(role==='use'){game.touchUse=true;game.interact()}else if(!['move','look'].includes(role)){game.action(role);el.setAttribute('aria-pressed',String(role==='ads'?game.aim:role==='sprint'?game.touchSprint:role==='crouch'?game.crouchRequested:false))}
  if(role==='move')move(e);
 });
 function move(e){const p=owners.get(e.pointerId);if(!p||game.phase!=='playing')return;e.preventDefault();if(p.role==='move'){const dx=(e.clientX-p.cx)/46,dy=(e.clientY-p.cy)/46,len=Math.hypot(dx,dy),mag=Math.min(1,Math.max(0,(len-.14)/.86));game.touchMove.x=len?dx/len*mag:0;game.touchMove.z=len?dy/len*mag:0;knob.style.transform=`translate(${game.touchMove.x*36}px,${game.touchMove.z*36}px)`}else if(p.role==='look'||p.role==='fire'){const scale=3.2/Math.min(innerWidth,innerHeight)*(Number(game.options.touchSensitivity)||1)*(game.aim?.625:1);game.yaw-=(e.clientX-p.x)*scale;game.pitch=Math.max(-1.44,Math.min(1.44,game.pitch-(e.clientY-p.y)*scale));}p.x=e.clientX;p.y=e.clientY;}
 root.addEventListener('pointermove',move);
 function up(e){const p=owners.get(e.pointerId);if(!p)return;owners.delete(e.pointerId);if(p.role==='move'){game.touchMove.x=game.touchMove.z=0;knob.style.transform=''}if(p.role==='fire')game.mouseDown=false;if(p.role==='use')game.touchUse=false;}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,up);
 root.querySelector('#touch-map').onclick=map;
 document.querySelector('#pointer-help').textContent='Left stick moves · right side drags view · FIRE also drag aims. RUN toggles sprint. Landscape recommended.';
 const help=document.createElement('p');help.textContent='TOUCH: Left stick moves proportionally. Drag the right side to look. Hold FIRE and drag the same thumb to aim while moving. AIM and RUN toggle. DASH follows the stick direction, or goes forward when the stick is centered; JUMP vaults low cover. Hold USE while entering a receiver ring or suit service. MAP pauses and selects a route.';document.querySelector('#controls-dialog h2').after(help);
 // Keep the full tactical handbook while translating its keyboard instructions.
 for(const panel of document.querySelectorAll('#controls-dialog,#briefing-dialog')){
  const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode())node.textContent=node.textContent.replace(/Press 1 for the precision rifle or 2 for the pump breacher\./g,'Tap SWAP to switch between precision rifle and pump breacher.').replace(/R inserts/g,'RELOAD inserts').replace(/Shift close/g,'DASH close').replace(/C toggles/g,'CROUCH toggles').replace(/Ctrl requests standing/g,'Tap CROUCH again to request standing').replace(/C changes/g,'Stance changes').replace(/Press Space/g,'Tap JUMP').replace(/Hold Tab while moving for a short ground approach to the selected objective; M selects on the paused map\./g,'Tap MAP to pause and select an objective.').replace(/M or Close resumes; Escape opens the pause menu\./g,'CLOSE MAP resumes; Pause opens the pause menu.').replace(/held Tab trace/g,'selected route').replace(/hold E/gi,'hold USE').replace(/WASD/g,'the left stick').replace(/mouse/gi,'right drag').replace(/Shift/g,'DASH').replace(/Soul DASH/g,'Soul Shift');
 }
 document.querySelector('#close-map').textContent='CLOSE MAP';document.querySelector('#facility-map > p').textContent='MISSION PAUSED · Tap an approach · CLOSE MAP resumes';document.querySelector('#controls-dialog .control-list').style.display='none';
 document.querySelector('#route-help').closest('label').nextElementSibling.textContent='After blocked walking, marks walkable ground toward the selected destination. Tap MAP to plan. Patrols still matter.';
 const label=document.createElement('label');label.htmlFor='touch-sensitivity';label.textContent='TOUCH LOOK SENSITIVITY';const input=document.createElement('input');input.id='touch-sensitivity';input.type='range';input.min='.25';input.max='2.5';input.step='.05';input.value=game.options.touchSensitivity||1;input.setAttribute('aria-label','Touch look sensitivity');input.oninput=()=>{game.options.touchSensitivity=Number(input.value);onSensitivity?.(Number(input.value));try{const s=JSON.parse(localStorage.getItem('soulfall-settings')||'{}');s.touchSensitivity=Number(input.value);localStorage.setItem('soulfall-settings',JSON.stringify(s))}catch{}};document.querySelector('#settings-dialog .primary-button').before(label,input);
}
