import { mapTransform, paintArchitecture, paintSites, paintPlayer } from './facility-map.js';
import { uploadStatus } from './upload.js';
import { threatVisor } from './threat-visor.js';
import { placeMarker } from './marker-layout.js';
import './style.css';
import { Game } from './game.js';
import { CORE_SITES, serviceRouteAt } from './mission.js';

const $ = (id) => document.getElementById(id);
const saved = (()=>{try{return JSON.parse(localStorage.getItem('soulfall-settings')||'{}')}catch{return {}}})();
let settings = {quality:'balanced',difficulty:'standard',sensitivity:1,volume:0.65,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,...saved};
let game, current = {}, loaded = false, previousPhase = '', activePanel = null;
const icon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2 28 9v14l-12 7L4 23V9Z" stroke="currentColor"/><path d="m16 7 6 9-6 9-6-9Z" fill="currentColor"/></svg>`;
document.querySelector('#app').innerHTML = `
<canvas id="game-canvas" aria-label="SOULFALL three dimensional game world"></canvas>
<div class="filmgrain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
<div id="waypoints" aria-hidden="true"></div><div id="damage-direction" aria-hidden="true"><i></i></div>
<div id="damage-flash" aria-hidden="true"></div><div id="shift-flash" aria-hidden="true"></div>
<section id="menu" class="screen menu-screen">
 <header class="topbar"><a class="studio-mark" href="./">${icon}<span>VESPER<br><b>INTERACTIVE</b></span></a><div class="build-label"><i></i> PLAYABLE VERTICAL SLICE <span> / </span> BUILD 47</div><button class="text-button" id="open-settings" aria-label="Open settings">SETTINGS <span>⚙</span></button></header>
 <div class="menu-copy"><div class="eyebrow"><span class="short-line"></span> A SIGNAL WORTH DYING FOR.</div><h1>SOUL<span>FALL</span><i>THE LAST SIGNAL</i></h1><p>The station went silent. The dead didn't.<br>Enter the storm. Bring the signal home.</p>
 <button class="primary-button" id="deploy" disabled><span id="deploy-label">INITIALIZING STATION</span><span class="button-arrow">↗</span></button>
 <div class="menu-secondary"><button id="open-briefing">MISSION BRIEF <span>↗</span></button><button id="open-controls">HOW TO PLAY <span>↗</span></button></div><div id="load-status" class="load-status" role="status">Preparing environment & combat systems…</div></div>
 <aside class="mission-card"><div class="micro-label">OPERATION / 001</div><h2>THE DROWNED<br>RELAY</h2><div class="coordinates">58° 21′ N &nbsp; 06° 14′ E</div><div class="mission-divider"></div><p>Recover three soul cores.<br>Disable the Custodian jammer.<br>Upload inside the marked uplink deck.<br>Outside pauses briefly; reenter before decay.</p><div class="mission-badges"><span>SINGLE PLAYER</span><span>ONE MISSION</span></div></aside>
 <footer class="menu-footer"><span>HEADPHONES RECOMMENDED <span class="sound-lines">▂▅▃▇▃</span></span><a href="./docs/human.html" target="_blank" rel="noopener">THE VISION & DEVELOPMENT NOTES ↗</a><span>DESKTOP · WEBGL 2</span></footer>
</section>
<section id="hud" class="hidden" aria-label="Game information"><header class="hud-top"><div class="hud-mission"><span class="micro-label">OPERATION // DROWNED RELAY</span><strong id="objective">RECLAIM THE SIGNAL</strong><div id="core-slots"><span>01</span><span>02</span><span>03</span></div></div><div class="bearing">N <span>· · · · ·</span> <b id="heading">000</b> <span>· · · · ·</span> E</div><button id="pause-button" class="pause-button" aria-label="Pause game">Ⅱ <span>ESC</span></button></header>
 <div id="announcement" role="status"></div><div id="crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div><div id="hitmarker" aria-hidden="true">×</div><div id="interaction" class="hidden"><kbd>E</kbd><span>RECOVER SOUL CORE</span><div class="recovery-meter"><i id="recovery-progress"></i></div><small>HOLD TO RECOVER</small></div>
 <div id="extraction-panel" class="hidden"><b id="uplink-title">EXTRACTION UPLINK</b><div id="custodian-cells" class="hidden"></div><small id="uplink-cover">UPLINK DECK UPLOAD · BRIEF PAUSE OUTSIDE · REENTER BEFORE DECAY</small><span id="extraction-status">REACH THE GREEN BEACON</span><div><i id="extraction-progress"></i></div></div><aside id="memory-card" class="hidden"><div class="micro-label">MEMORY RECOVERED</div><h3 id="memory-person"></h3><span id="memory-role"></span><p id="memory-text"></p></aside><div id="service-hint" class="hidden" role="status"><kbd>SPACE</kbd><b>JUMP FROM THE PAINTED EDGE</b><span>Keep moving toward the low service grate.</span></div><div id="field-controls" class="hidden"><kbd>WASD</kbd> MOVE <kbd>MOUSE</kbd> LOOK <kbd>CTRL</kbd> SPRINT <kbd>R</kbd> RELOAD <kbd>SPACE</kbd> JUMP <kbd>SHIFT</kbd> PHASE DASH <kbd>HOLD E</kbd> RECOVER</div><aside class="signal-scan"><div class="micro-label">SIGNAL SCAN · N ↑</div><canvas id="radar" width="280" height="280" aria-label="Tactical map of player, core sites, and extraction"></canvas><div class="map-hint">M · FACILITY MAP</div><div id="signal-distance">LOCATING CORES</div></aside><div id="event-feed" aria-live="polite"></div><footer class="hud-bottom"><div class="vitals"><div class="health-value"><span class="cross-icon">+</span><b id="health">100</b><span>VITALS</span></div><div class="health-track"><i id="health-bar"></i></div><div class="shield-line"><span>AEGIS</span><div><i id="shield-bar"></i></div><b id="shield">50</b></div></div>
 <div class="ability"><div class="ability-icon">${icon}<b id="dash-key">⇧</b></div><div><b id="dash-status">SOUL SHIFT READY</b><span>SHIFT · BREAK NEARBY CHARGES</span><div class="dash-track"><i id="dash-bar"></i></div></div></div>
 <div class="weapon-info"><div class="micro-label">VESPER // COIL RIFLE</div><div class="ammo"><b id="ammo">30</b><span>/ <i id="reserve">180</i></span></div><div id="reload-label"><kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM</div></div></footer><div class="hud-stats"><span id="kills">0 ELIMINATED</span><span id="timer">00:00</span></div></section>
<aside id="facility-map" class="hidden" aria-label="Facility map"><header><div><b>THE DROWNED RELAY</b><span>N ↑ · KNOWN FACILITY</span></div><button id="close-map" type="button">CLOSE · M</button></header><canvas id="facility-canvas" width="640" height="640" aria-label="North-up facility walls, cover, receivers and extraction"></canvas><footer><span><i class="map-wall"></i> WALL</span><span><i class="map-cover"></i> LOW COVER · BLOCKS MOVEMENT</span><span>■ RECEIVER / REACH</span><span>▲ YOU</span></footer><p>MISSION PAUSED · PLAN YOUR ROUTE · M / Close resumes · Esc opens pause menu</p></aside><section id="pause" class="screen overlay hidden"><div class="panel pause-panel"><div class="eyebrow">SIGNAL HELD</div><h2>TAKE A BREATH.</h2><p>The station can wait.</p><button class="primary-button" id="resume">RESUME OPERATION <span>↗</span></button><button class="secondary-button" id="open-archive">MEMORY ARCHIVE · 0/3</button><button class="secondary-button" id="pause-settings">SETTINGS</button><button class="secondary-button" id="restart-pause">RESTART MISSION</button><button class="text-button" id="return-menu">RETURN TO TITLE</button><small id="pointer-help">Click to capture your mouse. Esc releases it.</small></div></section>
<section id="end" class="screen overlay hidden"><div class="panel end-panel"><div class="eyebrow" id="end-eyebrow">OPERATION COMPLETE</div><h2 id="end-title">THE SIGNAL<br>LIVES.</h2><p id="end-copy">Some things deserve a second life. You brought them home.</p><div id="end-manifest"></div><div class="end-stats"><div><span>ELIMINATIONS</span><b id="end-kills">0</b></div><div><span>MISSION TIME</span><b id="end-time">00:00</b></div><div><span>SCORE</span><b id="end-score">0</b></div></div><div id="end-details"></div><div id="personal-best"></div><button class="primary-button" id="play-again">DEPLOY AGAIN <span>↗</span></button><button class="secondary-button" id="end-archive">READ RECOVERED MEMORIES</button><button class="secondary-button" id="end-menu">RETURN TO TITLE</button></div></section>
<dialog id="archive-dialog"><div class="dialog-header"><span class="eyebrow">RESTORED RECORDS</span><button class="close-button" data-close aria-label="Close archive">×</button></div><h2>THE VOICES WE CARRY.</h2><div id="archive-list"><p>No records recovered yet.</p></div><button class="primary-button" data-close>RETURN <span>↗</span></button></dialog>
<dialog id="settings-dialog"><div class="dialog-header"><span class="eyebrow">FIELD CONFIGURATION</span><button class="close-button" data-close aria-label="Close settings">×</button></div><h2>MAKE IT YOURS.</h2><label for="difficulty">THREAT LEVEL</label><select id="difficulty"><option value="story">Recon — more forgiving</option><option value="standard">Operator — intended experience</option><option value="veteran">Veteran — high stakes</option></select><p class="setting-note">Threat level applies to your next deployment.</p><label for="quality">GRAPHICS QUALITY</label><select id="quality"><option value="low">Performance — lower resolution, no shadows</option><option value="balanced">Balanced — recommended</option><option value="high">High — sharper, more demanding</option></select><label for="sensitivity">MOUSE SENSITIVITY <output id="sensitivity-value"></output></label><input id="sensitivity" type="range" min="0.25" max="2.5" step="0.05"><label for="volume">MASTER VOLUME <output id="volume-value"></output></label><input id="volume" type="range" min="0" max="1" step="0.05"><label class="checkbox-label"><input id="motion" type="checkbox"> REDUCED CAMERA MOTION</label><p class="setting-note">Reduces view bob, recoil movement, and screen effects.</p><button class="primary-button" data-close>APPLY & CLOSE <span>↗</span></button></dialog>
<dialog id="controls-dialog"><div class="dialog-header"><span class="eyebrow">OPERATOR HANDBOOK</span><button class="close-button" data-close aria-label="Close controls">×</button></div><h2>MOVE WITH PURPOSE.</h2><p>The Custodian arms after the third memory. Match the physical I / II / III plates to the coil cells. Dark coils are inert cover; move to a clear face for the remaining targets. Destroy its three copper coils: armored shutters take chip damage; after each volley they lift for critical hits. Amber lanes lock before firing: move behind cover. Shift close to a charging coil cancels the volley and opens shutters for 3 seconds.</p><p>Extraction uploads only while standing inside the marked uplink deck. Outside pauses briefly; reenter before decay.</p><p>Engineering has two single-use amber capacitor banks. Shoot the cabinet or isolator: a 1.1-second warning precedes a 6 m discharge. Move clear, use solid cover or phase protection. The spent cabinet remains cover. Enemy fire cannot trigger it.</p><div class="control-list"><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>LMB</kbd> Fire coil rifle</span><span><kbd>RMB</kbd> Aim down sights</span><span><kbd>R</kbd> Reload</span><span><kbd>SHIFT</kbd> Soul Shift / dash</span><span><kbd>CTRL</kbd> Sprint</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>HOLD E</kbd> Recover nearby memory</span><span><kbd>M</kbd> Facility map · mission paused</span><span><kbd>ESC</kbd> Pause / release mouse</span></div><p>Patrol perimeter shutters lift amber for 0.55 seconds before a radial proximity discharge. Back beyond reach, break solid-cover sight, jump to unreachable height, or Shift to interrupt. A miss still cools for one second; existing projectiles remain dangerous.</p><p class="dialog-tip">Soul Shift protects briefly. Dash within 4.5 m of a charging enemy to cancel its shot or proximity discharge and stagger it for 0.8 s. A blue emitter flash confirms the break. Dashing toward a charge stops early on a successful break so you can follow up. Sideways dodges retain full travel. It deals no damage; the 4.5 s cooldown still applies. Your shield regenerates when you avoid damage.</p><button class="primary-button" data-close>UNDERSTOOD <span>↗</span></button></dialog>
<dialog id="briefing-dialog"><div class="dialog-header"><span class="eyebrow">EYES ONLY // VESPER</span><button class="close-button" data-close aria-label="Close mission briefing">×</button></div><h2>BRING THEM HOME.</h2><p class="briefing-intro">The Drowned Relay was built to preserve human memories. Last night, it began broadcasting them as a distress call.</p><ol class="briefing-list"><li><b>BREACH THE STATION</b><p>Use the central yard and its side lanes. Press M for paused facility planning. M or Close resumes; Escape opens the pause menu. Concrete cover breaks a sentinel's line of sight.</p></li><li><b>RECOVER THREE CORES</b><p>Follow each cyan beacon to its attached waist-high memory console. Step inside the floor ring and hold E for 0.9 seconds. Stay nearby while the memory is recovered. Each recovery escalates the defense response.</p></li><li><b>BREAK THE COUNTERMEASURE</b><p>The station arms its Custodian to keep recovered memories from transmitting. Disable all three coils, then return to extraction. Bring all three memories back along either lit return aisle. Upload advances only while standing inside the marked uplink deck at the green beacon. Outside pauses briefly; reenter before decay. Face the yard, use the split baffles and watch open flanks.</p></li></ol><p class="dialog-tip">Red means danger. Cyan means life. Soul Shift is your way through.</p><button class="primary-button" data-close>ACCEPT BRIEFING <span>↗</span></button></dialog>
<div id="fatal" class="screen overlay hidden"><div class="panel"><h2>SIGNAL INTERRUPTED.</h2><p id="fatal-message"></p><button class="primary-button" onclick="location.reload()">RETRY CONNECTION ↗</button></div></div>
`;
const clock = t => `${Math.floor((t||0)/60).toString().padStart(2,'0')}:${Math.floor((t||0)%60).toString().padStart(2,'0')}`;
const hide = (id, value) => $(id).classList.toggle('hidden',value);
function saveSettings(){try{localStorage.setItem('soulfall-settings',JSON.stringify(settings))}catch{} game?.setSettings(settings)}
function openDialog(id){activePanel=id;$(id).showModal();$(id).querySelector('.handbook-content')?.scrollTo(0,0);}
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(el=>el.addEventListener('close',()=>{activePanel=null;saveSettings()}));
$('open-archive').onclick=()=>openDialog('archive-dialog');$('end-archive').onclick=()=>openDialog('archive-dialog');
$('open-settings').onclick=()=>openDialog('settings-dialog');$('pause-settings').onclick=()=>openDialog('settings-dialog');
$('open-controls').onclick=()=>openDialog('controls-dialog');$('open-briefing').onclick=()=>openDialog('briefing-dialog');
for (const name of ['difficulty','quality','sensitivity','volume']) { $(name).value=settings[name];$(name).oninput=()=>{settings[name]=['difficulty','quality'].includes(name)?$(name).value:Number($(name).value);updateSettings();saveSettings()}; }
$('motion').checked=settings.reducedMotion;$('motion').onchange=()=>{settings.reducedMotion=$('motion').checked;updateSettings();saveSettings()};
function updateSettings(){ $('volume-value').textContent=`${Math.round(settings.volume*100)}%`;$('sensitivity-value').textContent=`${Number(settings.sensitivity).toFixed(2)}×`;document.body.classList.toggle('reduced-motion',settings.reducedMotion); }
updateSettings();
function deploy(){if(!loaded)return;hide('menu',true);hide('end',true);hide('pause',true);game.start(settings);}
$('deploy').onclick=deploy;$('resume').onclick=()=>game.resume();$('pause-button').onclick=()=>game.pause();
function restart(){hide('end',true);hide('pause',true);game.restart(settings)}
$('restart-pause').onclick=restart;$('play-again').onclick=restart;
function title(){game.pause();hide('pause',true);hide('end',true);hide('hud',true);hide('menu',false);document.exitPointerLock?.();}
$('return-menu').onclick=title;$('end-menu').onclick=title;
let mapOpen=false;
function closeMap(){game?.closePlanning();}
$('close-map').onclick=closeMap;
document.addEventListener('keydown',e=>{if(e.code!=='KeyM'||e.repeat||!['playing','planning'].includes(current.phase)||activePanel||!$('menu').classList.contains('hidden')||e.target.closest('input,select,textarea,dialog,[contenteditable]'))return;e.preventDefault();if(current.phase==='planning')closeMap();else game.openPlanning();});

let messageTimer,hitTimer,flashTimer,shiftTimer,memoryTimer,directionTimer;
function notify(text){$('announcement').textContent=text;$('announcement').classList.add('visible');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('announcement').classList.remove('visible'),2800)}
function onEvent(e){
 // The live optic/bearing state owns charge warnings; a timed tutorial notice
 // would keep claiming CHARGING after the shot or a successful interrupt.
 if(e.type==='notice'&&e.message?.startsWith('WARDEN CHARGING'))return;
 if(e.type==='phase'){clearTimeout(memoryTimer);hide('memory-card',true);$('event-feed').replaceChildren();$('damage-direction').classList.remove('visible');}
 if(e.type==='memory'){$('memory-person').textContent=e.person;$('memory-role').textContent=e.role;$('memory-text').textContent=`“${e.memory}”`;hide('memory-card',false);clearTimeout(memoryTimer);memoryTimer=setTimeout(()=>hide('memory-card',true),7500)}


 if(e.type==='damage'){ $('damage-flash').classList.add('active');clearTimeout(flashTimer);flashTimer=setTimeout(()=>$('damage-flash').classList.remove('active'),240) }
 if(['hit','kill','headshot'].includes(e.type)){ $('hitmarker').classList.add('visible');$('hitmarker').classList.toggle('kill',e.type==='kill');clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hitmarker').classList.remove('visible'),e.type==='kill'?230:100) }
 if(e.type==='dash'){ $('shift-flash').classList.add('active');clearTimeout(shiftTimer);shiftTimer=setTimeout(()=>$('shift-flash').classList.remove('active'),250) }
 if(e.message && !['shot','hit','damage','footstep'].includes(e.type)){if(['phase','core','notice','win','lose','phaseDodge','phaseInterrupt'].includes(e.type))notify(e.message);if(['notice','phase'].includes(e.type))return;const line=document.createElement('div');line.textContent=e.message;$('event-feed').prepend(line);while($('event-feed').children.length>3)$('event-feed').lastChild.remove();setTimeout(()=>line.remove(),5500)}
}
function renderState(s){
 $('damage-direction').classList.toggle('visible',s.damageDirection!=null);if(s.damageDirection!=null)$('damage-direction').style.transform=`rotate(${s.damageDirection}rad)`;
 current=s;hide('custodian-cells',!s.custodian?.active||s.custodian.dead);$('uplink-title').textContent=s.custodian?.active&&!s.custodian.dead?'CUSTODIAN / BROADCAST COILS':'EXTRACTION UPLINK';if(s.custodian?.active&&!s.custodian.dead)$('custodian-cells').innerHTML=s.custodian.coils.map((hp,i)=>`<span style="opacity:${hp>0?1:.35}">${i+1} ${hp>0?Math.ceil(hp*100)+'%':'OFF'}</span>`).join(' · ');mapOpen=s.phase==='planning';hide('facility-map',!mapOpen);drawRadar(s);if(mapOpen)drawFacility(s);renderArchive(s);const phase=s.phase;const service=phase==='playing'&&serviceRouteAt(s.player);hide('service-hint',!service);hide('field-controls',!(!service&&phase==='playing'&&s.time<18&&s.cores===0));hide('extraction-panel',!(phase==='playing'&&s.cores===s.totalCores));$('extraction-progress').style.width=`${(s.extractionProgress||0)*100}%`;const zoneEdge=s.insideExtraction&&s.extractionMargin<.65;$('extraction-panel').classList.toggle('zone-edge',zoneEdge);$('extraction-status').textContent=uploadStatus(s);$('recovery-progress').style.width=`${(s.coreProgress||0)*100}%`;
 if(phase!==previousPhase){
  const playing=['playing','planning'].includes(phase);hide('hud',!playing);hide('pause',phase!=='paused'||!$('menu').classList.contains('hidden'));hide('end',!['won','lost'].includes(phase));
  document.body.classList.toggle('in-game',playing); if(playing)hide('menu',true);
  if(['won','lost'].includes(phase))showEnd(s);
  previousPhase=phase;
 }
 $('health').textContent=Math.ceil(Math.max(0,s.health||0));$('health-bar').style.width=`${Math.max(0,s.health/(s.maxHealth||100)*100)}%`;
 $('shield').textContent=Math.ceil(Math.max(0,s.shield||0));$('shield-bar').style.width=`${Math.max(0,(s.shield||0)/(s.maxShield||60)*100)}%`;
 $('ammo').textContent=String(s.ammo??30).padStart(2,'0');$('reserve').textContent=s.reserve??180;
 $('ammo').classList.toggle('low',s.ammo<7);$('reload-label').innerHTML=s.reloading?'RELOADING…':'<kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM';
 $('objective').textContent=s.objective||'RECOVER THE THREE SOUL CORES';$('kills').textContent=`${s.kills||0} ELIMINATED`;$('timer').textContent=clock(s.time);
 const count=typeof s.cores==='number'?s.cores:0;[...$('core-slots').children].forEach((el,i)=>el.classList.toggle('recovered',s.coreMarkers?s.coreMarkers.some(c=>c.id===i&&c.collected):i<count));
 const cooldown=s.dashCooldown||0;$('dash-status').textContent=cooldown>0?`RECHARGING ${cooldown.toFixed(1)}s`:'SOUL SHIFT READY';$('dash-bar').style.width=`${100-Math.min(100,cooldown/4.5*100)}%`;
 if(s.heading!==undefined)$('heading').textContent=String(Math.round(s.heading)).padStart(3,'0');
 hide('interaction',!s.interaction);if(s.interaction){$('interaction').querySelector('kbd').textContent=s.recoveryReady?'E':'◇';$('interaction').querySelector('small').textContent=s.recoveryReady?'HOLD TO RECOVER':'STEP INSIDE THE FLOOR RING';$('interaction').querySelector('span').textContent=typeof s.interaction==='string'?s.interaction.replace(/^E · /,''):'RECOVER SOUL CORE';}
 document.body.classList.toggle('critical-health',s.health<30&&phase==='playing');
}

function drawRadar(s){
 const canvas=$('radar'),ctx=canvas.getContext('2d'),p=s.player;if(!p||!s.coreMarkers)return;
 const size=280,c=140,scale=1.5;ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.clip();ctx.fillStyle='rgba(5,20,25,.64)';ctx.fillRect(0,0,size,size);
 const map=(x,z)=>[c+(x-p.x)*scale,c+(z-p.z)*scale];
 ctx.strokeStyle='rgba(139,202,192,.13)';ctx.lineWidth=1;
 for(let i=-100;i<=100;i+=10){const a=map(i,-100),b=map(i,100),d=map(-100,i),e=map(100,i);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.moveTo(...d);ctx.lineTo(...e);ctx.stroke()}
 if(s.bounds){const b=s.bounds,a=map(b.minX,b.minZ);ctx.strokeStyle='rgba(139,202,192,.5)';ctx.strokeRect(a[0],a[1],(b.maxX-b.minX)*scale,(b.maxZ-b.minZ)*scale)}
 const t={scale,point:map};paintArchitecture(ctx,s.facilityLayout,t);paintSites(ctx,s,t);paintPlayer(ctx,p,t);ctx.restore();
 const extraction=s.cores===s.totalCores;
 ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.strokeStyle='rgba(139,202,192,.32)';ctx.lineWidth=1;ctx.stroke();
 const jammed=extraction&&s.custodian&&!s.custodian.dead;const distance=jammed?Math.hypot(s.player.x-s.custodian.x,s.player.z-s.custodian.z):extraction?s.exitDistance:s.nearestCoreDistance;$('signal-distance').textContent=distance==null?'SIGNAL SECURED':!extraction&&s.recoveryReady?'CORE IN REACH · HOLD E':`${jammed?'CUSTODIAN':extraction?'EXTRACTION':'NEAREST CORE'} · ${distance<6?distance.toFixed(1):Math.round(distance)} M`;
}

function drawFacility(s){
 const canvas=$('facility-canvas'),ctx=canvas.getContext('2d');if(!s.bounds||!s.player)return;
 const t=mapTransform(s.bounds,640,640,40);ctx.fillStyle='#0a1c26';ctx.fillRect(0,0,640,640);
 ctx.strokeStyle='#203946';ctx.lineWidth=1;for(let x=-40;x<=40;x+=10){ctx.beginPath();ctx.moveTo(...t.point(x,-42));ctx.lineTo(...t.point(x,42));ctx.stroke();}for(let z=-40;z<=40;z+=10){ctx.beginPath();ctx.moveTo(...t.point(-37,z));ctx.lineTo(...t.point(37,z));ctx.stroke();}
 const b=s.bounds,[x,y]=t.point(b.minX,b.minZ);ctx.strokeStyle='#819ba6';ctx.strokeRect(x,y,(b.maxX-b.minX)*t.scale,(b.maxZ-b.minZ)*t.scale);
 paintArchitecture(ctx,s.facilityLayout,t);ctx.font='12px sans-serif';ctx.fillStyle='#94adb7';for(const [label,x,z] of [['MEDICAL BAY',-24,-24],['CENTRAL YARD',0,1],['EAST WORKS',24,4],['SOUTH INTAKE',-24,-3]])ctx.fillText(label,...t.point(x-6,z));
 paintSites(ctx,s,t,true);paintPlayer(ctx,s.player,t);
}

const markerPool=new Map();
let visorFocus;
function drawMarkers(markers){
 const active=new Set(), placed=[];
 const nearest=markers.filter(m=>m.kind==='core'||m.kind==='exit').sort((a,b)=>a.distance-b.distance)[0];
 const blocked=nearest?.occluded?nearest:null;
 let note=$('blocked-signal');if(!note){note=document.createElement('div');note.id='blocked-signal';$('waypoints').append(note)}
 note.textContent=blocked?`${blocked.label} · SIGNAL BEHIND COVER · ${blocked.approachHint||(blocked.id==='core-0'?'USE SOUTH INTAKE / EAST SERVICE':'FIND AN OPEN APPROACH')}`:'';
 note.classList.toggle('hidden',!blocked);
 markers=markers.filter(m=>!m.occluded);
 const visor=threatVisor(markers,visorFocus);
 visorFocus=visor.focused?.id;
 document.body.classList.toggle('combat-priority',visor.cues.some(m=>m.charging||m.recent));
 let focus=$('threat-focus');if(!focus){focus=document.createElement('div');focus.id='threat-focus';$('waypoints').append(focus)}
 focus.textContent=visor.focused?`${visor.focused.label} · ${visor.focused.charging?'CHARGING':visor.focused.recent?'RECENT FIRE':visor.focused.health<.35?'DAMAGED':'TRACKING'}`:'';
 focus.dataset.target=visor.focused?.id||'';
 focus.classList.toggle('charging',!!visor.focused?.charging);
 markers=[...markers.filter(m=>m.kind!=='enemy'),...visor.cues];
 const memory=$('memory-card');if(!memory.classList.contains('hidden'))placed.push(memory.getBoundingClientRect());
 placed.push({left:innerWidth-205,right:innerWidth,top:90,bottom:315});
 markers.sort((a,b)=>(b.charging?4:b.recent?3:b.inRange?2:0)-(a.charging?4:a.recent?3:a.inRange?2:0));
 for(const m of markers){
  active.add(m.id);let el=markerPool.get(m.id);
  if(!el){el=document.createElement('div');el.className=`world-marker ${m.kind}`;el.dataset.markerId=m.id;el.innerHTML='<span class="marker-symbol">◇</span><b></b><small></small><div class="enemy-track"><i></i></div>';$('waypoints').append(el);markerPool.set(m.id,el)}
  if(m.kind==='enemy'){
   el.className=`world-marker enemy visor ${m.onscreen?'optic':'edge'} ${m.charging?'charging':m.recent?'recent':'hit'} ${m.type}`;
   el.dataset.members=m.members.join(',');el.dataset.count=m.count;
   const symbol=el.querySelector('.marker-symbol');symbol.textContent='';
   symbol.style.transform=m.onscreen?'none':`rotate(${m.bearing+Math.PI/4}rad)`;
   el.querySelector('b').textContent=!m.onscreen&&m.charging?'!':'';
   el.querySelector('small').textContent=!m.onscreen&&m.count>1?String(m.count):'';
   el.querySelector('small').style.transform='none';
   el.dataset.charges=m.charges;el.dataset.fires=m.fires;el.dataset.hits=m.hits;
   // Optics retain their exact projection. Fixed 30-degree group slots prevent
   // adjacent sectors from overlapping; the chevron points at the actual mean.
   const sectorBearing=m.sector*Math.PI/6;
   el.dataset.sector=m.onscreen?'':String(m.sector);
   el.style.left=`${m.onscreen?(m.x+1)*innerWidth/2+24:innerWidth*(.5+Math.sin(sectorBearing)*.32)}px`;
   el.style.top=`${m.onscreen?(1-m.y)*innerHeight/2:innerHeight*(.5-Math.cos(sectorBearing)*.23)}px`;
   if(!m.onscreen)placed.push(el.getBoundingClientRect());
   continue;
  }
  const onscreen=m.front&&Math.abs(m.x)<.86&&Math.abs(m.y)<.68;
  const x=onscreen?(m.x+1)*50:50+Math.sin(m.bearing)*43,rawY=onscreen?(1-m.y)*50:50-Math.cos(m.bearing)*32;let y=rawY;if(x>82&&y<45)y=51;if(x<24&&y<23)y=28;
  // Keep cue text out of the aperture. Threats retain bearing and priority;
  // competing text stacks below its projected anchor with bounded separation.
  if(onscreen&&m.kind==='enemy')y+=7;
  el.style.opacity=m.suppressed?'0':'';
  el.classList.toggle('edge',!onscreen);el.classList.toggle('charging',!!m.charging);
  el.querySelector('.marker-symbol').textContent=onscreen?'◇':'▲';el.querySelector('.marker-symbol').style.transform=onscreen?'none':`rotate(${m.bearing}rad)`;
  el.querySelector('b').textContent=!onscreen&&m.kind==='enemy'?m.label.split(' / ')[0]:m.label;
  el.querySelector('small').textContent=m.kind==='enemy'?(m.charging?'CHARGING':m.recent?'RECENT FIRE':''):m.doorway?'CLEAR APPROACH':m.inZone?'IN ZONE':m.inRange?'HOLD E':`${m.distance<6?m.distance.toFixed(1):Math.round(m.distance)} M`;
  const key=[el.querySelector('b').textContent,el.querySelector('small').textContent.length,onscreen,m.charging,innerWidth].join('|');
  if(el._sizeKey!==key){el._sizeKey=key;el._size={width:el.offsetWidth,height:el.offsetHeight};}
  const spot=placeMarker(x*innerWidth/100,Math.max(16,Math.min(80,y))*innerHeight/100,el._size.width,el._size.height,{width:innerWidth,height:innerHeight},placed);
  if(!m.suppressed&&spot.rect)placed.push(spot.rect);
  el.style.left=`${spot.x}px`;el.style.top=`${spot.y}px`;
  if(m.kind==='enemy')el.querySelector('i').style.width=`${Math.max(0,m.health*100)}%`;
 }
 for(const [id,el]of markerPool)if(!active.has(id)){el.remove();markerPool.delete(id)}
}
let archiveKey='';
function renderArchive(s){
 const ids=(s.coreMarkers||[]).filter(c=>c.collected).map(c=>c.id),key=ids.join(',');$('open-archive').textContent=`MEMORY ARCHIVE · ${ids.length}/3`;
 if(key===archiveKey)return;archiveKey=key;$('archive-list').replaceChildren();
 if(!ids.length){const p=document.createElement('p');p.textContent='No records recovered yet.';$('archive-list').append(p);return;}
 for(const id of ids){const m=CORE_SITES[id],a=document.createElement('article');a.innerHTML='<h3></h3><span></span><p></p>';a.querySelector('h3').textContent=m.person;a.querySelector('span').textContent=m.role;a.querySelector('p').textContent=`“${m.memory}”`;$('archive-list').append(a);}
}
function showEnd(s){const won=s.phase==='won';$('end-manifest').replaceChildren();const recovered=(s.coreMarkers||[]).filter(c=>c.collected);$('end-archive').disabled=recovered.length===0;for(const c of recovered){const row=document.createElement('div');row.innerHTML='<b></b><span></span>';row.querySelector('b').textContent=CORE_SITES[c.id].person;row.querySelector('span').textContent=CORE_SITES[c.id].role;$('end-manifest').append(row)}$('end-details').textContent=`${s.accuracy||0}% ACCURACY · ${s.headshots||0} CRITICAL ELIMINATIONS · ${s.phaseDodges||0} PHASE EVADES`;$('end-eyebrow').textContent=won?'OPERATION COMPLETE':'OPERATOR LOST';$('end-title').innerHTML=won?'THE SIGNAL<br>LIVES.':'THE STATION<br>REMEMBERS.';$('end-copy').textContent=won?'Some things deserve a second life. You brought them home.':'The relay is still calling. Take a breath. Find another way through.';$('end-kills').textContent=s.kills||0;$('end-time').textContent=clock(s.time);$('end-score').textContent=Math.round(s.score||0).toLocaleString();try{const k=`soulfall-best-${s.difficulty||settings.difficulty}`;let best=Number(localStorage.getItem(k)||0);if(won&&(s.score||0)>best){best=s.score;localStorage.setItem(k,best);$('personal-best').textContent='NEW PERSONAL BEST'}else $('personal-best').textContent=best?`PERSONAL BEST · ${best.toLocaleString()}`:''}catch{}}
async function boot(){try{game=new Game({canvas:$('game-canvas'),onState:renderState,onEvent,onMarkers:drawMarkers});await game.init();game.setSettings(settings);loaded=true;$('deploy').disabled=false;$('deploy-label').textContent='ENTER THE STORM';$('load-status').textContent='SYSTEMS ONLINE · READY TO DEPLOY';$('load-status').classList.add('ready');if(new URLSearchParams(location.search).has('test'))window.__SOULFALL__={game,get state(){return current},deploy,settings};}catch(e){console.error(e);hide('fatal',false);$('fatal-message').textContent=`The 3D engine could not initialize. Use a desktop browser with WebGL 2 and hardware acceleration. ${e.message}`;}}
boot();

const visorHelp=document.createElement('p');visorHelp.textContent='THREAT VISOR · Orange ! means a charging threat. Muted chevrons show recent fire or hits. A number counts nearby sources in that direction; one source has no number. Offscreen cues use broad direction sectors, not exact positions. Optic brackets stay beside visible emitters. The lower readout follows one target near aim. Cues require clear optic sight and expire.';document.querySelector('#controls-dialog .primary-button')?.before(visorHelp);
const handbook=document.querySelector('#controls-dialog'), handbookContent=document.createElement('div');
handbookContent.className='handbook-content';handbookContent.tabIndex=0;handbookContent.setAttribute('aria-label','Handbook details; scroll for all controls and visor guidance');
for(const child of [...handbook.children])if(!child.matches('.dialog-header,.primary-button'))handbookContent.append(child);
handbook.querySelector('.dialog-header').after(handbookContent);
