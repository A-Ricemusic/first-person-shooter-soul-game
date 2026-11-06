import {phoneBrightness} from './mobile-visibility.js';
import {mobileBossWindow,BOSS_WINDOW_SCALE} from './mobile-boss-window.js';
import {installTouch} from './touch-input.js';
import {compassReadout} from './compass.js';
import {recoveryApproachText} from './recovery-feedback.js';
import { mapTransform, planningTransform, paintPlanningRoute, paintPlanningSites, paintPlanningSupplies, paintArchitecture, paintSites, paintPlayer } from './facility-map.js';
import { uploadStatus } from './upload.js';
import { threatVisor } from './threat-visor.js';
import {mobileCompassCues} from './mobile-cues.js';
import { placeMarker } from './marker-layout.js';
import { mobileMarkerCaption, mobileMarkerAnchorVisible, mobileOpticLayout } from './mobile-marker-layout.js';
import {touchTapBlocks} from './touch-tap-regions.js';
import './style.css';
import { Game } from './game.js';
import { CORE_SITES, serviceRouteAt } from './mission.js';

const $ = (id) => document.getElementById(id);
const saved = (()=>{try{return JSON.parse(localStorage.getItem('soulfall-settings')||'{}')}catch{return {}}})();
let settings = {touchFireSpeed:1,contextualRouteHelp:true,fastSceneTurns:false,touchAimAssist:true,touchTapAim:true,touchAutoVault:true,quality:'balanced',difficulty:'standard',sensitivity:1,volume:0.65,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,...saved};
settings.mobileBrightness=phoneBrightness(settings.mobileBrightness);
let game, current = {}, loaded = false, previousPhase = '', activePanel = null;
const icon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2 28 9v14l-12 7L4 23V9Z" stroke="currentColor"/><path d="m16 7 6 9-6 9-6-9Z" fill="currentColor"/></svg>`;
document.querySelector('#app').innerHTML = `
<canvas id="game-canvas" aria-label="SOULFALL three dimensional game world"></canvas>
<div class="filmgrain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
<div id="waypoints" aria-hidden="true"></div><div id="damage-direction" aria-hidden="true"><i></i></div>
<div id="damage-flash" aria-hidden="true"></div><div id="shift-flash" aria-hidden="true"></div>
<section id="menu" class="screen menu-screen">
 <header class="topbar"><a class="studio-mark" href="./">${icon}<span>VESPER<br><b>INTERACTIVE</b></span></a><div class="build-label"><i></i> <span class="build-description">PLAYABLE VERTICAL SLICE / </span>BUILD 126</div><button class="text-button" id="open-settings" aria-label="Open settings">SETTINGS <span>⚙</span></button></header>
 <div class="menu-copy"><div class="eyebrow"><span class="short-line"></span> A SIGNAL WORTH DYING FOR.</div><h1>SOUL<span>FALL</span><i>THE LAST SIGNAL</i></h1><p>The station went silent. The dead didn't.<br>Enter the storm. Bring the signal home.</p>
 <button class="primary-button" id="deploy" disabled><span id="deploy-label">INITIALIZING STATION</span><span class="button-arrow">↗</span></button>
 <div class="menu-secondary"><button id="open-briefing">MISSION BRIEF <span>↗</span></button><button id="open-controls">HOW TO PLAY <span>↗</span></button></div><div id="load-status" class="load-status" role="status">Preparing environment & combat systems…</div></div>
 <aside class="mission-card"><div class="micro-label">OPERATION / 001</div><h2>THE DROWNED<br>RELAY</h2><div class="coordinates">58° 21′ N &nbsp; 06° 14′ E</div><div class="mission-divider"></div><p>Recover three soul cores.<br>Disable the Custodian jammer.<br>Upload inside the marked uplink deck.<br>Outside pauses briefly; reenter before decay.</p><div class="mission-badges"><span>SINGLE PLAYER</span><span>ONE MISSION</span></div></aside>
 <footer class="menu-footer"><span>HEADPHONES RECOMMENDED <span class="sound-lines">▂▅▃▇▃</span></span><a href="./docs/human.html" target="_blank" rel="noopener">THE VISION & DEVELOPMENT NOTES ↗</a><span>DESKTOP · WEBGL 2</span></footer>
</section>
<section id="hud" class="hidden" aria-label="Game information"><header class="hud-top"><div class="hud-mission"><span class="micro-label">OPERATION // DROWNED RELAY</span><strong id="objective">RECLAIM THE SIGNAL</strong><div id="core-slots"><span>01</span><span>02</span><span>03</span></div></div><div class="bearing" aria-label="Heading north, 000 degrees"><b id="compass-direction">N</b><span>·</span><b id="heading">000</b><span class="bearing-unit">°</span></div><button id="pause-button" class="pause-button" aria-label="Pause game">Ⅱ <span>ESC</span></button></header>
 <div id="announcement" role="status"></div><div id="crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div><div id="hitmarker" aria-hidden="true">×</div><div id="interaction" class="hidden"><kbd>E</kbd><span>RECOVER SOUL CORE</span><div class="recovery-meter"><i id="recovery-progress"></i></div><small>HOLD TO RECOVER</small></div>
 <div id="extraction-panel" class="hidden"><b id="uplink-title">EXTRACTION UPLINK</b><div id="custodian-cells" class="hidden"></div><small id="uplink-cover">UPLINK DECK UPLOAD · BRIEF PAUSE OUTSIDE · REENTER BEFORE DECAY</small><span id="extraction-status">REACH THE GREEN BEACON</span><div><i id="extraction-progress"></i></div></div><aside id="memory-card" class="hidden"><div class="micro-label">MEMORY RECOVERED</div><h3 id="memory-person"></h3><span id="memory-role"></span><p id="memory-text"></p></aside><div id="service-hint" class="hidden" role="status"><kbd>SPACE</kbd><b>JUMP FROM THE PAINTED EDGE</b><span>Keep moving toward the low service grate.</span></div><div id="field-controls" class="hidden"><kbd>WASD</kbd> MOVE <kbd>MOUSE</kbd> LOOK <kbd>C</kbd> CROUCH <kbd>CTRL</kbd> SPRINT <kbd>R</kbd> RELOAD <kbd>SPACE</kbd> VAULT / JUMP <kbd>SHIFT</kbd> PHASE DASH <kbd>HOLD E</kbd> RECOVER</div><aside class="signal-scan"><div class="micro-label">SIGNAL SCAN · N ↑</div><canvas id="radar" width="280" height="280" aria-label="Tactical map of player, core sites, and extraction"></canvas><div class="map-hint">M · FACILITY MAP</div><div id="signal-distance">LOCATING CORES</div></aside><div id="event-feed" aria-live="polite"></div><footer class="hud-bottom"><div class="vitals"><div class="health-value"><span class="cross-icon">+</span><b id="health">100</b><span>VITALS</span></div><div class="health-track"><i id="health-bar"></i></div><div class="shield-line"><span>AEGIS</span><div><i id="shield-bar"></i></div><b id="shield">50</b></div></div>
 <div class="ability"><div class="ability-icon">${icon}<b id="dash-key">⇧</b></div><div><b id="dash-status">SOUL SHIFT READY</b><span>SHIFT · BREAK NEARBY CHARGES</span><div class="dash-track"><i id="dash-bar"></i></div></div></div>
 <div class="weapon-info"><div class="micro-label"><kbd>1</kbd> / <kbd>2</kbd> · <span id="weapon-name">COIL RIFLE</span></div><div class="ammo"><b id="ammo">30</b><span>/ <i id="reserve">180</i></span></div><div id="reload-label"><kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM</div></div></footer><div class="hud-stats"><span id="kills">0 ELIMINATED</span><span id="timer">00:00</span></div></section>
<aside id="facility-map" class="hidden" aria-label="Facility map"><header><div><b>THE DROWNED RELAY</b><span>N ↑ · KNOWN FACILITY</span></div><button id="close-map" type="button">CLOSE · M</button></header><div id="map-tools" role="group" aria-label="Map view and route"><button id="map-overview" aria-pressed="true">OVERVIEW</button><button id="map-local" aria-pressed="false">LOCAL 2×</button><button id="map-supplies" aria-pressed="false" disabled>SUPPLIES (0)</button></div><div id="route-selection" aria-label="Navigation objective"></div><canvas id="facility-canvas" width="640" height="640" aria-label="North-up facility walls, cover, receivers and extraction"></canvas><footer><span><i class="map-wall"></i> WALL</span><span><i class="map-cover"></i> LOW COVER · BLOCKS MOVEMENT</span><span>■ RECEIVER / REACH</span><span>▲ YOU</span></footer><p>MISSION PAUSED · Select an approach · Hold Tab in play for trace · M resumes · Esc pauses</p></aside><section id="pause" class="screen overlay hidden"><div class="panel pause-panel"><div class="eyebrow">SIGNAL HELD</div><h2>TAKE A BREATH.</h2><p>The station can wait.</p><button class="primary-button" id="resume">RESUME OPERATION <span>↗</span></button><button class="secondary-button" id="open-archive">MEMORY ARCHIVE · 0/3</button><button class="secondary-button" id="pause-settings">SETTINGS</button><button class="secondary-button" id="restart-pause">RESTART MISSION</button><button class="text-button" id="return-menu">RETURN TO TITLE</button><small id="pointer-help">Click to capture your mouse. Esc releases it.</small></div></section>
<section id="end" class="screen overlay hidden"><div class="panel end-panel"><div class="eyebrow" id="end-eyebrow">OPERATION COMPLETE</div><h2 id="end-title">THE SIGNAL<br>LIVES.</h2><p id="end-copy">Some things deserve a second life. You brought them home.</p><div id="end-manifest"></div><div class="end-stats"><div><span>ELIMINATIONS</span><b id="end-kills">0</b></div><div><span id="end-time-label">MISSION TIME</span><b id="end-time">00:00</b></div><div><span>SCORE</span><b id="end-score">0</b></div></div><div id="end-details"></div><div id="personal-best"></div><div class="end-actions"><button class="primary-button hidden" id="retry-anchor">RETRY FROM UPLINK <span>↗</span></button><button class="secondary-button" id="play-again">START FRESH <span>↗</span></button><button class="secondary-button" id="end-archive">READ RECOVERED MEMORIES</button><button class="secondary-button" id="end-menu">RETURN TO TITLE</button></div></div></section>
<dialog id="archive-dialog"><div class="dialog-header"><span class="eyebrow">RESTORED RECORDS</span><button class="close-button" data-close aria-label="Close archive">×</button></div><h2>THE VOICES WE CARRY.</h2><div id="archive-list"><p>No records recovered yet.</p></div><button class="primary-button" data-close>RETURN <span>↗</span></button></dialog>
<dialog id="settings-dialog"><div class="dialog-header"><span class="eyebrow">FIELD CONFIGURATION</span><button class="close-button" data-close aria-label="Close settings">×</button></div><h2>MAKE IT YOURS.</h2><label for="difficulty">THREAT LEVEL</label><select id="difficulty"><option value="story">Recon — more forgiving</option><option value="standard">Operator — intended experience</option><option value="veteran">Veteran — high stakes</option></select><p class="setting-note">Threat level applies to your next deployment.</p><label for="quality">GRAPHICS QUALITY</label><select id="quality"><option value="low">Performance — lower resolution, no shadows</option><option value="balanced">Balanced — recommended</option><option value="high">High — sharper, more demanding</option></select><label for="sensitivity">MOUSE SENSITIVITY <output id="sensitivity-value"></output></label><input id="sensitivity" type="range" min="0.25" max="2.5" step="0.05"><label for="volume">MASTER VOLUME <output id="volume-value"></output></label><input id="volume" type="range" min="0" max="1" step="0.05"><label class="checkbox-label"><input id="route-help" type="checkbox"> Contextual route help</label><p class="setting-note">After blocked walking, marks walkable ground toward your destination. Patrols still matter. Hold Tab for a ground trace anytime.</p><label class="checkbox-label"><input id="motion" type="checkbox"> REDUCED CAMERA MOTION</label><p class="setting-note">Reduces view bob, recoil movement, and screen effects.</p><button class="primary-button" data-close>APPLY & CLOSE <span>↗</span></button></dialog>
<dialog id="controls-dialog"><div class="dialog-header"><span class="eyebrow">OPERATOR HANDBOOK</span><button class="close-button" data-close aria-label="Close controls">×</button></div><h2>MOVE WITH PURPOSE.</h2><p>The Custodian arms after the third memory. Match the physical I / II / III plates to the coil cells. A small numbered bracket marks one clear component: amber is armored, cyan is exposed. It marks a visible surface, not a safe position. Dark coils are inert cover; move to a clear face for the remaining targets. Destroy its three copper coils: armored shutters take chip damage; after each volley they lift for critical hits. Use that exposed-coil window to return fire: patrols keep moving, and incoming shots and close discharges remain dangerous. Amber lanes lock before firing: move behind cover. Shift close to a charging coil cancels the volley and opens shutters for 3 seconds.</p><p>Press 1 for the precision rifle or 2 for the pump breacher. The breacher fires eight physical pellets: strongest within 6 m, fading to zero at 24 m. ADS narrows spread modestly. R inserts one shell every 0.55 seconds; fire interrupts after a shell seats. Switching cancels an unfinished insertion. Fallen supplies add 4 shells; memories add 8, capped at 36 reserve. Memory recovery partially restores health and shield.</p><p>C toggles a lower physical posture and slower movement. Stand only with clear headroom; Ctrl requests standing. C changes are accepted only while grounded and outside phase/vault. Crouched jumps retain the low body; stand before vaulting. Low cover blocks only suitable angles, so watch high ground and flanks.</p><p>Press Space near thin waist-high cover to vault when the landing is clear; otherwise jump. Vaulting commits briefly: firing and phase wait until landing. Tall walls still require a route around. Hold Tab while moving for a short ground approach to the selected objective; M selects on the paused map. Watch patrols: the trace knows architecture, not danger.</p><p>One-use EMERGENCY SUIT SERVICE is behind the west extraction blast plate. It powers after three memories and the defeated Custodian. Hold E for 2 uninterrupted seconds on the floor: +40 health (cap 100) and armor refilled to 60. Applied damage interrupts; flanks remain exposed. Extraction uploads only while grounded inside the marked uplink deck. Outside pauses briefly; reenter before decay.</p><p>Engineering has two single-use amber capacitor banks. Shoot the cabinet or isolator: a 1.1-second warning precedes a 6 m discharge. Move clear, use solid cover or phase protection. The spent cabinet remains cover. Enemy fire cannot trigger it.</p><div class="control-list"><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>LMB</kbd> Fire selected weapon</span><span><kbd>RMB</kbd> Aim down sights</span><span><kbd>R</kbd> Reload</span><span><kbd>1 / 2</kbd> Rifle / pump breacher</span><span><kbd>SHIFT</kbd> Soul Shift / dash</span><span><kbd>C</kbd> Toggle crouch</span><span><kbd>CTRL</kbd> Sprint / stand if clear</span><span><kbd>SPACE</kbd> Vault low cover / jump</span><span><kbd>HOLD E</kbd> Recover nearby memory</span><span><kbd>M</kbd> Facility map · mission paused</span><span><kbd>ESC</kbd> Pause / release mouse</span></div><p>Patrol perimeter shutters lift amber for 0.55 seconds before a radial proximity discharge. Back beyond reach, break solid-cover sight, jump to unreachable height, or Shift to interrupt. A miss still cools for one second; existing projectiles remain dangerous.</p><p class="dialog-tip">Soul Shift protects briefly. Dash within 4.5 m of a charging enemy to cancel its shot or proximity discharge and stagger it for 0.8 s. A blue emitter flash confirms the break. Dashing toward a charge stops early on a successful break so you can follow up. Sideways dodges retain full travel. It deals no damage; the 4.5 s cooldown still applies. Your shield regenerates when you avoid damage.</p><button class="primary-button" data-close>UNDERSTOOD <span>↗</span></button></dialog>
<dialog id="briefing-dialog"><div class="dialog-header"><span class="eyebrow">EYES ONLY // VESPER</span><button class="close-button" data-close aria-label="Close mission briefing">×</button></div><h2>BRING THEM HOME.</h2><p class="briefing-intro">The Drowned Relay was built to preserve human memories. Last night, it began broadcasting them as a distress call.</p><ol class="briefing-list"><li><b>BREACH THE STATION</b><p>Use the central yard and its side lanes. Press M for paused facility planning. M or Close resumes; Escape opens the pause menu. Break sight and relocate quietly: hunters search your last contact, then return. Gunfire carries 24 m, even through cover.</p></li><li><b>RECOVER THREE CORES</b><p>Follow each cyan beacon to its attached waist-high memory console. Step inside the floor ring and hold E for 0.9 seconds. Stay nearby while the memory is recovered. Nearby receiver feedback follows the local console; your map selection and held Tab trace keep their chosen destination. Each recovery escalates the defense response.</p></li><li><b>BREAK THE COUNTERMEASURE</b><p>The station arms its Custodian to keep recovered memories from transmitting. Disable all three coils, then return to extraction. Bring all three memories back along either lit return aisle. Upload advances only while grounded inside the marked uplink deck at the green beacon. Outside pauses briefly; reenter before decay. Face the yard, use the split baffles and watch open flanks. After the Custodian falls, optional one-use suit service behind the west plate grants +40 health and armor to 60: hold E for 2 seconds on the floor, without taking damage.</p></li></ol><p class="dialog-tip">Red means danger. Cyan means life. Soul Shift is your way through.</p><button class="primary-button" data-close>ACCEPT BRIEFING <span>↗</span></button></dialog>
<div id="fatal" class="screen overlay hidden"><div class="panel"><h2>SIGNAL INTERRUPTED.</h2><p id="fatal-message"></p><button class="primary-button" onclick="location.reload()">RETRY CONNECTION ↗</button></div></div>
`;
const fieldControlsMarkup=$('field-controls').innerHTML;
const clock = t => `${Math.floor((t||0)/60).toString().padStart(2,'0')}:${Math.floor((t||0)%60).toString().padStart(2,'0')}`;
const hide = (id, value) => $(id).classList.toggle('hidden',value);
function saveSettings(){try{localStorage.setItem('soulfall-settings',JSON.stringify(settings))}catch{} game?.setSettings(settings);if(game?.loaded&&current.phase==='lost')showEnd(game.captureState())}
function openDialog(id){game?.clearInput();activePanel=id;$(id).showModal();$(id).querySelector('.handbook-content')?.scrollTo(0,0);}
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(el=>el.addEventListener('close',()=>{activePanel=null;saveSettings()}));
$('open-archive').onclick=()=>openDialog('archive-dialog');$('end-archive').onclick=()=>openDialog('archive-dialog');
$('open-settings').onclick=()=>openDialog('settings-dialog');$('pause-settings').onclick=()=>openDialog('settings-dialog');
$('open-controls').onclick=()=>openDialog('controls-dialog');$('open-briefing').onclick=()=>openDialog('briefing-dialog');
for (const name of ['difficulty','quality','sensitivity','volume']) { $(name).value=settings[name];$(name).oninput=()=>{settings[name]=['difficulty','quality'].includes(name)?$(name).value:Number($(name).value);updateSettings();saveSettings()}; }
$('route-help').checked=settings.contextualRouteHelp;$('route-help').onchange=()=>{settings.contextualRouteHelp=$('route-help').checked;saveSettings()};
$('motion').checked=settings.reducedMotion;$('motion').onchange=()=>{settings.reducedMotion=$('motion').checked;updateSettings();saveSettings()};
function updateSettings(){ $('volume-value').textContent=`${Math.round(settings.volume*100)}%`;$('sensitivity-value').textContent=`${Number(settings.sensitivity).toFixed(2)}×`;document.body.classList.toggle('reduced-motion',settings.reducedMotion); }
updateSettings();
function deploy(){if(!loaded)return;hide('menu',true);hide('end',true);hide('pause',true);game.start(settings);}
$('deploy').onclick=deploy;$('resume').onclick=()=>game.resume();$('pause-button').onclick=()=>game.pause();
function restart(){hide('end',true);hide('pause',true);game.restart(settings)}
$('restart-pause').onclick=restart;$('play-again').onclick=restart;
$('retry-anchor').onclick=()=>{if(game.retryAnchor()){hide('end',true);hide('pause',true)}};
function title(){game.invalidateAnchor();game.pause();hide('pause',true);hide('end',true);hide('hud',true);hide('menu',false);document.exitPointerLock?.();}
$('return-menu').onclick=title;$('end-menu').onclick=title;
let mapOpen=false;
function closeMap(){game?.closePlanning();}
$('close-map').onclick=closeMap;
document.addEventListener('keydown',e=>{if(e.code!=='KeyM'||e.repeat||!['playing','planning'].includes(current.phase)||activePanel||!$('menu').classList.contains('hidden')||e.target.closest('input,select,textarea,dialog,[contenteditable]'))return;e.preventDefault();if(current.phase==='planning')closeMap();else game.openPlanning();});

let messageTimer,hitTimer,flashTimer,shiftTimer,memoryTimer,directionTimer,touchSavedPerson=null,mobileUplinkBlocked=false;
function notify(text,channel='priority'){if(game?.touchMode&&channel!=='priority'&&channel!=='recovery')game.touchFieldNotes?.record(text,game.runTime);if(game?.touchMode&&channel==='recovery'&&text.startsWith('UPLINK CACHE EARNED'))game.touchFieldNotes?.record(text,game.runTime);$('announcement').dataset.mobileChannel=channel;if(game?.touchMode)text=text.replace(/\bShift\b/gi,'DASH').replace(/Soul DASH/gi,'Soul Shift').replace(/hold E/gi,'hold the left action button');$('announcement').dataset.mobileDuplicate=String(channel==='recovery'||/^(CUSTODIAN LOCKING LANES|BROADCAST COIL DISABLED)\b/.test(text));$('announcement').textContent=text;$('announcement').classList.add('visible');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('announcement').classList.remove('visible'),2800)}
function onEvent(e){
 // The live optic/bearing state owns charge warnings; a timed tutorial notice
 // would keep claiming CHARGING after the shot or a successful interrupt.
 if(e.type==='notice'&&e.message?.startsWith('WARDEN CHARGING'))return;
 if(e.type==='phase'){game?.touchFieldNotes?.reset();touchSavedPerson=null;mobileUplinkBlocked=false;for(const t of [flashTimer,hitTimer,shiftTimer])clearTimeout(t);$('damage-flash').classList.remove('active');$('hitmarker').classList.remove('visible','kill');$('shift-flash').classList.remove('active');clearTimeout(memoryTimer);hide('memory-card',true);$('event-feed').replaceChildren();$('damage-direction').classList.remove('visible');}
 if(game?.touchMode&&['phaseDodge','phaseInterrupt','win','lose'].includes(e.type)){hide('memory-card',true);$('touch-notices')?.classList.remove('has-memory')}
 if(e.type==='memory'){if(game?.touchMode)game.touchFieldNotes?.record(`MEMORY SAVED · ${e.person}`,game.runTime);if(game?.touchMode&&game.touchUse&&game.touchRecoveryBraked)touchSavedPerson=e.person;$('memory-person').textContent=e.person;$('memory-role').textContent=e.role;$('memory-text').textContent=`“${e.memory}”`;hide('memory-card',false);clearTimeout(memoryTimer);memoryTimer=setTimeout(()=>{hide('memory-card',true);$('touch-notices')?.classList.remove('has-memory')},game?.touchMode?2800:7500)}


 if(e.type==='damage'){ $('damage-flash').classList.add('active');clearTimeout(flashTimer);flashTimer=setTimeout(()=>$('damage-flash').classList.remove('active'),240) }
 if(['hit','kill','headshot'].includes(e.type)){ $('hitmarker').classList.add('visible');$('hitmarker').classList.toggle('kill',e.type==='kill');clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hitmarker').classList.remove('visible'),e.type==='kill'?230:100) }
 if(e.type==='dash'){ $('shift-flash').classList.add('active');clearTimeout(shiftTimer);shiftTimer=setTimeout(()=>$('shift-flash').classList.remove('active'),250) }
 if(e.message && !['shot','hit','damage','footstep'].includes(e.type)){if(['phase','core','notice','win','lose','phaseDodge','phaseInterrupt'].includes(e.type))notify(e.message,game?.touchMode&&(e.type==='core'||/^(Memory secured\.|UPLINK CACHE EARNED)/.test(e.message))?'recovery':e.fieldNote?'advisory':e.type==='phase'?'intro':'priority');if(['notice','phase'].includes(e.type))return;const line=document.createElement('div');line.textContent=e.message;$('event-feed').prepend(line);while($('event-feed').children.length>3)$('event-feed').lastChild.remove();setTimeout(()=>line.remove(),5500)}
}
function drawFieldControls(s,service){
 const hint=s.phase==='playing'&&!service&&s.crouchHint,el=$('field-controls');
 const route=s.phase==='playing'&&!service&&!s.localRecovery&&!s.suitService?.near&&s.routeHelp;
 const mode=route?`route-${route}`:hint?'crouch':'controls';
 if(el.dataset.mode!==mode){
  el.innerHTML=route?`GROUND ROUTE / ${route} <span>Walkable ground · patrols still matter</span>`:hint?'<kbd>C</kbd> CROUCH BY LOW COVER <span>Lower profile · watch high ground and flanks</span>':fieldControlsMarkup;
  el.dataset.mode=mode;
 }
 el.classList.toggle('contextual',!!(hint||route));
 hide('field-controls',!(route||hint||(!service&&s.phase==='playing'&&s.time<18&&s.cores===0)));
}
function renderState(s){
 $('damage-direction').classList.toggle('visible',s.damageDirection!=null);if(s.damageDirection!=null)$('damage-direction').style.transform=`rotate(${s.damageDirection}rad)`;
 current=s;if(game?.touchMode){document.body.classList.toggle('touch-combat-focus',game.touchFieldNotes?.focused(s.phase,s.time,game.mouseDown||game.aim)||false);for(const [name,value] of [['ads',game.aim],['sprint',game.touchSprint],['crouch',game.crouchRequested]])document.querySelector('#touch-'+name)?.setAttribute('aria-pressed',String(!!value));const dash=document.querySelector('#touch-dash');if(dash)dash.textContent=s.dashCooldown>0?`DASH ${s.dashCooldown.toFixed(1)}`:'DASH';}hide('custodian-cells',!s.custodian?.active||s.custodian.dead);$('uplink-title').textContent=s.custodian?.active&&!s.custodian.dead?'CUSTODIAN / BROADCAST COILS':'EXTRACTION UPLINK';if(s.custodian?.active&&!s.custodian.dead)renderCoilStates(s);mapOpen=s.phase==='planning';if(mapOpen)renderRouteSelection(s);hide('facility-map',!mapOpen);drawRadar(s);if(mapOpen)drawFacility(s);renderArchive(s);const phase=s.phase;const service=phase==='playing'&&serviceRouteAt(s.player,{eyeHeight:s.player.eyeHeight});hide('service-hint',!service);drawFieldControls(s,service);hide('extraction-panel',!(phase==='playing'&&s.cores===s.totalCores));if(!game?.touchMode)$('extraction-progress').style.width=`${(s.extractionProgress||0)*100}%`;const zoneEdge=s.insideExtraction&&s.extractionMargin<.65;$('extraction-panel').classList.toggle('zone-edge',zoneEdge);if(!game?.touchMode)$('extraction-status').textContent=uploadStatus(s);$('recovery-progress').style.width=`${(s.suitService?.valid&&s.suitService?.near?s.suitService.progress:s.coreProgress||0)*100}%`;
 if(phase!==previousPhase){
  game?.touchInput?.root.classList.toggle('hidden',phase!=='playing');
  const playing=['playing','planning'].includes(phase);hide('hud',!playing);hide('pause',phase!=='paused'||!$('menu').classList.contains('hidden'));hide('end',!['won','lost'].includes(phase));
  document.body.classList.toggle('in-game',playing); if(playing)hide('menu',true);
  if(['won','lost'].includes(phase))showEnd(s);
  previousPhase=phase;
 }
 $('health').textContent=Math.ceil(Math.max(0,s.health||0));$('health-bar').style.width=`${Math.max(0,s.health/(s.maxHealth||100)*100)}%`;
 $('shield').textContent=Math.ceil(Math.max(0,s.shield||0));$('shield-bar').style.width=`${Math.max(0,(s.shield||0)/(s.maxShield||60)*100)}%`;
 $('weapon-name').textContent=s.weapon==='breacher'?'PUMP BREACHER':'COIL RIFLE';$('ammo').textContent=String(s.ammo??30).padStart(2,'0');$('reserve').textContent=s.reserve??180;
 const weaponStatus=s.touchAimReadout||s.rifleReadout;
 const coverAge=s.time-(s.rifleReadout?.time??-Infinity);
 const blockedCover=!!(game?.touchMode&&s.phase==='playing'&&s.rifleReadout?.kind==='cover'&&s.rifleReadout.label!=='CAPACITOR'&&coverAge>=0&&coverAge<.35);
 $('crosshair').dataset.blocked=String(blockedCover);$('hitmarker').classList.toggle('cover-priority',blockedCover);
 const confirmation=s.rifleConfirmation;
 const trigger=$('touch-fire');
 if(trigger){const label=s.touchFireLatch||'',following=!!s.touchFollowing,key=label+'|'+following;if(trigger.dataset.presentationKey!==key){trigger.dataset.presentationKey=key;trigger.dataset.latch=label;trigger.dataset.latched=String(!!label);trigger.innerHTML=label?'LIFT<br><small>then FIRE</small>':following?'FIRE<br><small>FOLLOW</small>':'FIRE<br><small>drag aim</small>';trigger.setAttribute('aria-label',label?`${label}. Lift FIRE, then press again.`:following?'FIRE with target motion assistance. Drag away or lift to release.':'Hold FIRE and drag to aim. Rifle eliminations and solid-cover shots end assisted bursts; lift and press again.');}}

 $('hitmarker').classList.toggle('confirmed',!!confirmation);$('hitmarker').dataset.confirmation=confirmation?.label||'';
 $('ammo').classList.toggle('low',s.ammo<7);$('reload-label').dataset.reloading=String(!!s.reloading);$('reload-label').dataset.impact=weaponStatus?.kind||'';$('reload-label').innerHTML=s.reloading?'RELOADING…':weaponStatus?weaponStatus.label:game?.touchMode?'':'<kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM';
 $('objective').textContent=s.routeGoal?.startsWith('supply-')?'RECOVER SUPPLIES':s.touchRouteActive&&s.touchRouteGoal?.startsWith('core-')?`RECOVER ${CORE_SITES[Number(s.touchRouteGoal.split('-')[1])]?.person||'THE SIGNAL'}`:s.localRecovery?`${s.recoveryReady?(game?.touchMode?'RECOVER':'HOLD E'):'NEARBY'} / ${CORE_SITES[s.localRecovery.id].person}`:s.cores<3&&s.routeGoal?`RECOVER ${CORE_SITES[Number(s.routeGoal.split('-')[1])]?.person||'THE SIGNAL'}`:(game?.touchMode?s.objective?.replace('HOLD E','HOLD BUTTON').replace('DISABLE UPLINK CUSTODIAN','DISABLE CUSTODIAN').replace('HOLD THE EXTRACTION ZONE','HOLD UPLINK DECK').replace('RETURN TO EXTRACTION','RETURN TO DECK'):s.objective)||'RECOVER THE THREE SOUL CORES';$('kills').textContent=`${s.kills||0} ELIMINATED`;$('timer').textContent=clock(s.time);
 const count=typeof s.cores==='number'?s.cores:0,slots=$('core-slots');const collected=[...slots.children].map((el,i)=>{const saved=s.coreMarkers?s.coreMarkers.some(c=>c.id===i&&c.collected):i<count;el.classList.toggle('recovered',saved);if(game?.touchMode){const person=CORE_SITES[i].person,text=saved?`${person.split(' ')[0].toUpperCase()} ✓`:String(i+1).padStart(2,'0');if(el.textContent!==text)el.textContent=text;el.setAttribute('aria-label',`${person}: ${saved?'recovered':'not recovered'}`)}return saved});
 if(game?.touchMode){const signature=collected.join('|');if(slots.dataset.memorySignature!==signature){slots.dataset.memorySignature=signature;slots.setAttribute('role','status');slots.setAttribute('aria-live','polite');slots.setAttribute('aria-atomic','true');slots.setAttribute('aria-label',`Memories recovered: ${collected.map((v,i)=>v?CORE_SITES[i].person:null).filter(Boolean).join(', ')||'none'}`)}}
 const cooldown=s.dashCooldown||0;$('dash-status').textContent=cooldown>0?`RECHARGING ${cooldown.toFixed(1)}s`:'SOUL SHIFT READY';$('dash-bar').style.width=`${100-Math.min(100,cooldown/4.5*100)}%`;
 if(s.heading!==undefined){const bearing=compassReadout(s.heading);$('heading').textContent=bearing.heading;$('compass-direction').textContent=bearing.direction;document.querySelector('.bearing').setAttribute('aria-label',bearing.spoken);}
 $('interaction').classList.toggle('recovery-local',!!s.localRecovery&&!!s.interaction&&!s.interaction.startsWith('CROUCHED')&&s.interaction!=='Space · Vault');hide('interaction',!s.interaction);if(s.interaction){const suit=s.interaction.startsWith('SUIT SERVICE'),ss=s.suitService;const vault=s.interaction==='Space · Vault',approach=s.interaction.startsWith('APPROACH'),stance=s.interaction.startsWith('CROUCHED');$('interaction').querySelector('kbd').textContent=suit?'E':stance?'C':vault?'SPACE':s.recoveryReady?'E':'◇';$('interaction').querySelector('small').textContent=suit?(ss.spent?'CARTRIDGE SPENT':!ss.powered?'NEEDS 3 MEMORIES + CUSTODIAN DEFEATED':ss.full?'SUIT FULL · CARTRIDGE SAVED':`HOLD ${game?.touchMode?'BUTTON':'E'} · 2 SECONDS · +40 HEALTH / AEGIS 60${ss.progress>0?' · '+Math.floor(ss.progress*100)+'%':''}`):approach?(s.touchApproachStatus||'RELEASE MOVE · HOLD APPROACH'):stance?(s.player.standBlocked?'MOVE TO CLEAR HEADROOM':'LOW PROFILE · SLOWER MOVEMENT'):vault?'CLEAR LANDING':s.recoveryReady?'HOLD TO RECOVER':recoveryApproachText(s);$('interaction').querySelector('span').textContent=typeof s.interaction==='string'?(game?.touchMode?s.interaction.replace(/^E · /,'HOLD · ').replace('Space · Vault','JUMP · Vault').replace('CROUCHED','CROUCH').replace('C TO STAND','TAP CROUCH TO STAND'):s.interaction.replace(/^E · /,'')):'RECOVER SOUL CORE';}
 renderMobileHUD(s,service);
 document.body.classList.toggle('critical-health',s.health<30&&phase==='playing');
}

function renderCoilStates(s){
 const cells=$('custodian-cells'),touch=!!game?.touchMode,values=s.custodian.coils.map(hp=>hp>0?Math.ceil(hp*100):0);
 const signature=(touch?'touch':'desktop')+'|'+values.join(',');if(cells.dataset.signature===signature)return;cells.dataset.signature=signature;
 cells.innerHTML=touch?values.map((hp,i)=>`<span class="coil-cell" data-live="${hp>0}" role="img" aria-label="Coil ${['I','II','III'][i]}, ${hp>0?hp+' percent remaining':'disabled'}" style="--coil-health:${hp}%"><b>${['I','II','III'][i]}</b><strong>${hp>0?hp+'%':'OFF'}</strong><i aria-hidden="true"></i></span>`).join(''):values.map((hp,i)=>`<span style="opacity:${hp>0?1:.35}">${i+1} ${hp>0?hp+'%':'OFF'}</span>`).join(' · ');
}

function mobileBossStatus(s,blocked=false){return mobileBossWindow(s,blocked).text;}

function mobileUplinkStatus(s,blocked=mobileUplinkBlocked){return s.custodian?.active&&!s.custodian.dead?mobileBossStatus(s,blocked):blocked&&!s.insideExtraction&&!(s.extractionProgress>0)?'MAP · ROUTE TO DECK':uploadStatus(s,{compact:true});}

function renderMobileUplink(s,blocked=mobileUplinkBlocked){
 const boss=s.phase==='playing'&&s.cores===s.totalCores&&s.custodian?.active&&!s.custodian.dead;
 const opening=boss?mobileBossWindow(s,blocked):null,value=boss?Math.min(BOSS_WINDOW_SCALE,opening.seconds):Math.max(0,Math.min(100,(s.extractionProgress||0)*100));
 const text=opening?opening.text:mobileUplinkStatus(s,blocked),mode=opening?.mode||'upload',panel=$('extraction-panel'),track=$('extraction-progress').parentElement;
 const signature=[!!boss,mode,text,value].join('|');if(panel.dataset.clockSignature===signature)return;panel.dataset.clockSignature=signature;
 panel.dataset.mode=mode;panel.dataset.meter=boss?'exposure':'upload';
 $('extraction-status').textContent=text;$('extraction-progress').style.width=`${boss?opening.ratio*100:value}%`;
 track.setAttribute('role',boss?'meter':'progressbar');track.setAttribute('aria-label',boss?'Current coil opening time remaining':'Uplink upload progress');
 track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(boss?BOSS_WINDOW_SCALE:100));track.setAttribute('aria-valuenow',String(value));
 track.setAttribute('aria-valuetext',boss?text:`${Math.round(value)} percent uploaded`);
}

function renderMobileHUD(s,service){
 if(!game?.touchMode)return;
 if(!s.touchRecoveryBraked||!game.touchUse)touchSavedPerson=null;
 $('crosshair').classList.toggle('touch-assisted',!!s.touchAssistActive);
 document.body.classList.toggle('touch-reloading',s.phase==='playing'&&!!s.reloading);
 document.body.classList.toggle('touch-impact-readout',s.phase==='playing'&&!!(s.touchAimReadout||s.rifleReadout));
 if(s.phase==='paused')document.querySelector('.pause-panel>p').textContent=`PLAY TIME · ${clock(s.time)}`;
 const playing=s.phase==='playing',uplink=playing&&s.cores===s.totalCores;
 const boss=uplink&&s.custodian?.active&&!s.custodian.dead;
 document.body.classList.toggle('touch-interacting',playing&&!!s.interaction);
 document.body.classList.toggle('touch-service-route',playing&&!!service);
 document.body.classList.toggle('touch-uplink-stage',uplink);
 document.body.classList.toggle('touch-boss-stage',!!boss);
 $('uplink-title').textContent=boss?'CUSTODIAN':'UPLINK';
 renderMobileUplink(s);
 $('touch-notices')?.classList.remove('has-memory');
 $('memory-card').querySelector('.micro-label').textContent=s.touchRecoveryBraked&&game.touchUse?'SAVED · RELEASE BUTTON':'MEMORY SAVED';
 const reload=$('touch-reload');if(reload){reload.textContent=s.reloading?'LOADING':'RELOAD';reload.setAttribute('aria-busy',String(!!s.reloading))}
 const more=$('touch-more');if(more){more.textContent=game.crouchRequested?'TOOLS · LOW':game.touchSprint?'TOOLS · RUN':'TOOLS';more.classList.toggle('active-tools',!!(game.crouchRequested||game.touchSprint));more.setAttribute('aria-label',`Tools: manual reload, weapon swap, crouch and run${game.crouchRequested?'; crouched':''}${game.touchSprint?'; running':''}`)}
 const use=$('touch-use');if(use){
  const supplySelected=s.routeGoal?.startsWith('supply-'),resupplied=s.touchSupplyCollected&&game.touchUse;
  const ss=s.suitService,repair=!supplySelected&&ss?.valid&&ss.near&&ss.powered&&!ss.spent&&!ss.full;
  use.dataset.ready=String(!!(!supplySelected&&s.recoveryReady||repair));use.dataset.resupplied=String(!!resupplied);
  const face=boss&&!supplySelected&&s.touchBossApproach&&s.routeGoal==='custodian';
  const faceLabel=face?(!game.touchUse?'HOLD FACE COILS':s.touchRouteArrived?(s.touchRouteFraming?'COILS · RELEASE':'RELEASE · FACE COILS'):null):null;
  const gap=s.localRecovery?Math.max(.1,Math.ceil(s.localRecovery.remaining*10)/10):null;
  const release=s.touchRecoveryBraked&&!s.recoveryReady,saved=release&&!!touchSavedPerson;
  use.dataset.saved=String(saved);
  use.textContent=resupplied?'RESUPPLIED · RELEASE':s.touchRouteStatus?.startsWith('SUPPLY GONE')?'SUPPLY GONE · RELEASE':supplySelected&&(!s.touchRouteStatus||s.touchRouteActive)?(s.touchRouteActive?'FOLLOWING SUPPLY':'HOLD SUPPLY ROUTE'):saved?'SAVED · RELEASE':release?'RELEASE TO MOVE':s.recoveryReady?'HOLD TO RECOVER':repair?'HOLD TO REPAIR':s.touchRouteActive?'FOLLOWING':s.touchRouteStatus&&!s.touchApproachActive?(s.touchRouteStatus.includes('BLOCKED')?'ROUTE BLOCKED':'RELEASE'):s.touchApproachActive?'APPROACHING':s.touchApproachStatus?'ROUTE BLOCKED':gap!=null&&s.localRecovery.remaining>0?(s.touchApproachAvailable?'HOLD APPROACH':'RETURN TO FLOOR'):s.touchApproachAvailable?'HOLD ROUTE':'RETURN TO FLOOR';
  if(faceLabel)use.textContent=faceLabel;
  use.dataset.near=String(!!s.localRecovery);
  const progress=Math.max(0,Math.min(1,resupplied||saved?1:repair?ss.progress:s.coreProgress||0));
  use.style.setProperty('--hold-progress',`${progress*100}%`);
  use.setAttribute('aria-label',resupplied?'Supply collected; release the action button before the next route':supplySelected?'Hold to walk to the selected existing supply; release to stop':saved?`${touchSavedPerson} saved; release the action button before the next route`:release?'Release the action button to move':s.recoveryReady?`Hold to recover ${CORE_SITES[s.localRecovery.id].person}`:repair?'Hold to service suit':s.touchRouteActive?'Following selected route; release the action button to stop':s.touchRouteStatus?s.touchRouteStatus.replaceAll('RELEASE USE','RELEASE BUTTON'):s.localRecovery?'Hold to approach nearby receiver; release move first':'Hold to walk the selected map route; release to stop; manual movement, DASH or JUMP cancels');
  if(faceLabel)use.setAttribute('aria-label',game.touchUse?'Release route; release FIRE or AIM, then hold FACE COILS to face the static machine':'Hold to face the Custodian landmark from this standing approach; release FIRE and AIM first; does not fire or select a live coil');
 }
}

function drawRadar(s){
 if(game?.touchMode)return;
 const canvas=$('radar'),ctx=canvas.getContext('2d'),p=s.player;if(!p||!s.coreMarkers)return;
 const size=280,c=140,scale=1.5;ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.clip();ctx.fillStyle='rgba(5,20,25,.64)';ctx.fillRect(0,0,size,size);
 const map=(x,z)=>[c+(x-p.x)*scale,c+(z-p.z)*scale];
 ctx.strokeStyle='rgba(139,202,192,.13)';ctx.lineWidth=1;
 for(let i=-100;i<=100;i+=10){const a=map(i,-100),b=map(i,100),d=map(-100,i),e=map(100,i);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.moveTo(...d);ctx.lineTo(...e);ctx.stroke()}
 if(s.bounds){const b=s.bounds,a=map(b.minX,b.minZ);ctx.strokeStyle='rgba(139,202,192,.5)';ctx.strokeRect(a[0],a[1],(b.maxX-b.minX)*scale,(b.maxZ-b.minZ)*scale)}
 const t={scale,point:map};paintArchitecture(ctx,s.facilityLayout,t);paintSites(ctx,s,t);paintPlayer(ctx,p,t);ctx.restore();
 const extraction=s.cores===s.totalCores;
 ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.strokeStyle='rgba(139,202,192,.32)';ctx.lineWidth=1;ctx.stroke();
 const selected=s.coreMarkers?.find(c=>s.localRecovery?c.id===s.localRecovery.id:`core-${c.id}`===s.routeGoal);
 const jammed=extraction&&s.custodian&&!s.custodian.dead;const distance=jammed?Math.hypot(s.player.x-s.custodian.x,s.player.z-s.custodian.z):extraction?s.exitDistance:selected?.distance??s.nearestCoreDistance;$('signal-distance').textContent=s.routeStatus|| (distance==null?'SIGNAL SECURED':!extraction&&s.recoveryReady?`CORE IN REACH · HOLD ${game?.touchMode?'BUTTON':'E'}`:`${jammed?'CUSTODIAN':extraction?'EXTRACTION':selected?`${s.localRecovery?'NEARBY / ':''}${CORE_SITES[selected.id].name}`:'NEAREST CORE'} · ${distance<6?distance.toFixed(1):Math.round(distance)} M`);
}

function renderRouteSelection(s){
 const el=$('route-selection'),signature=JSON.stringify([s.routeGoal,s.routeManual,s.coreMarkers?.map(c=>c.collected),s.custodian.dead,s.supplies?.map(p=>[p.id,p.life]),s.supplyRouteStatus]);const supply=s.supplies?.find(p=>`supply-${p.id}`===s.routeGoal),supplyButton=$('map-supplies');supplyButton.disabled=!s.supplies?.length;supplyButton.textContent=supply?'SUPPLY SELECTED':`SUPPLIES (${s.supplies?.length||0})`;supplyButton.setAttribute('aria-pressed',String(!!supply));supplyButton.setAttribute('aria-label',s.supplies?.length?'Select the nearest reachable supply before it expires':'No supplies on the ground');if(el.dataset.signature===signature)return;el.dataset.signature=signature;el.replaceChildren();
 for(const [key,label,collected] of [['auto','Auto · nearest reachable',false],...(s.coreMarkers||[]).map(c=>[`core-${c.id}`,`${CORE_SITES[c.id].person.split(' ')[0]} · ${CORE_SITES[c.id].name}${c.collected?' · recovered':''}`,c.collected])]){
 const b=document.createElement('button');b.type='button';b.textContent=game?.touchMode?(key==='auto'?'AUTO · MISSION':`${CORE_SITES[Number(key.split('-')[1])].person.split(' ')[0]}${collected?' ✓':''}`):label;b.setAttribute('aria-label',label);b.disabled=collected;b.setAttribute('aria-pressed',String(key==='auto'?!s.routeManual:s.routeGoal===key));b.onclick=()=>game.selectRoute(key);el.append(b);}
 const note=document.createElement('span');note.textContent=s.supplyRouteStatus|| (supply?`Selected: SUPPLY · 24 rounds / 4 shells · ${supply.life}s left`:s.cores===3?(s.custodian.dead?'Selected: Extraction':'Selected: Custodian approach'):`Selected: ${CORE_SITES[Number(s.routeGoal?.split('-')[1])]?.person||'Auto'}`);el.append(note);
}
let mapZoom=1,mapPathKey='',mapPath=[];
$('map-supplies').onclick=()=>{mapPathKey='';game.selectSupplyRoute()};
for(const [id,zoom] of [['map-overview',1],['map-local',2]])$(id).onclick=()=>{mapZoom=zoom;for(const [button,value] of [['map-overview',1],['map-local',2]])$(button).setAttribute('aria-pressed',String(zoom===value));if(current.phase==='planning')drawFacility(current)};
function drawFacility(s){
 const canvas=$('facility-canvas'),ctx=canvas.getContext('2d');if(!s.bounds||!s.player)return;
 if(game?.touchMode){
  const key=[s.routeGoal,s.player.x,s.player.y,s.player.z,s.player.eyeHeight,s.player.grounded].join('|');
  if(mapPathKey!==key){mapPathKey=key;mapPath=game.planningPath()}
  const t=planningTransform(s.bounds,640,640,s.player,mapZoom),display=Math.max(1,Math.min(canvas.clientWidth,canvas.clientHeight));
  const font=Math.ceil(12*640/display),symbol=Math.ceil(9*640/display);
  ctx.fillStyle='#0a1c26';ctx.fillRect(0,0,640,640);ctx.save();ctx.beginPath();ctx.rect(24,24,592,592);ctx.clip();
  paintArchitecture(ctx,s.facilityLayout,t);paintPlanningRoute(ctx,mapPath,t);paintPlanningSites(ctx,s,t,font);paintPlanningSupplies(ctx,s,t,font);paintPlayer(ctx,s.player,t,symbol);ctx.restore();
  ctx.strokeStyle='#819ba6';ctx.lineWidth=2;ctx.strokeRect(24,24,592,592);
  canvas.dataset.zoom=String(mapZoom);canvas.dataset.routePoints=String(mapPath.length);canvas.dataset.goal=s.routeGoal||'';canvas.dataset.supplies=String(s.supplies?.length||0);
  canvas.setAttribute('aria-label',`${mapZoom===1?'Facility overview':'Local view at double scale'}, selected walking route and player heading`);
  const distance=mapPath.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-mapPath[i].x,p.z-mapPath[i].z),0);
  document.querySelector('#facility-map>p').textContent=mapPath.length?`${mapZoom===1?'OVERVIEW':'LOCAL 2×'} · ${Math.ceil(distance)}m ${s.routeGoal?.startsWith('supply-')?'supply':'walking'} route · Patrols still matter`:'No standing floor route here · Return to ground to plan';
  return;
 }
 const t=mapTransform(s.bounds,640,640,40);ctx.fillStyle='#0a1c26';ctx.fillRect(0,0,640,640);
 ctx.strokeStyle='#203946';ctx.lineWidth=1;for(let x=-40;x<=40;x+=10){ctx.beginPath();ctx.moveTo(...t.point(x,-42));ctx.lineTo(...t.point(x,42));ctx.stroke();}for(let z=-40;z<=40;z+=10){ctx.beginPath();ctx.moveTo(...t.point(-37,z));ctx.lineTo(...t.point(37,z));ctx.stroke();}
 const b=s.bounds,[x,y]=t.point(b.minX,b.minZ);ctx.strokeStyle='#819ba6';ctx.strokeRect(x,y,(b.maxX-b.minX)*t.scale,(b.maxZ-b.minZ)*t.scale);
 paintArchitecture(ctx,s.facilityLayout,t);ctx.font='12px sans-serif';ctx.fillStyle='#94adb7';for(const [label,x,z] of [['MEDICAL BAY',-24,-24],['CENTRAL YARD',0,1],['EAST WORKS',24,4],['SOUTH INTAKE',-24,-3]])ctx.fillText(label,...t.point(x-6,z));
 paintSites(ctx,s,t,true);paintPlayer(ctx,s.player,t);
}

const markerPool=new Map();
function mobileMarker(el,m,placed){
 const anchor={x:(m.x+1)*innerWidth/2,y:(1-m.y)*innerHeight/2},viewport={width:innerWidth,height:innerHeight};
 el.classList.add('anchored-label');el.style.left=`${anchor.x}px`;el.style.top=`${anchor.y}px`;
 const visible=!m.suppressed&&m.front&&mobileMarkerAnchorVisible(anchor,viewport,placed.filter(p=>p.markerId!==m.id));
 el.style.opacity=visible?'1':'0';el.dataset.anchorVisible=String(visible);
 const copy=el.querySelector('.marker-copy'),leader=el.querySelector('.marker-leader path');
 const button=copy.tagName==='BUTTON';const conceal=()=>{copy.style.visibility='hidden';if(button){copy.disabled=true;copy.style.pointerEvents='none';}};
 leader.setAttribute('d','');
 // The compass already owns offscreen route words. Keep the exact step symbol
 // without a second PATH caption, and leave the central aiming aperture clear.
 const aperture={left:innerWidth/2-18,right:innerWidth/2+18,top:innerHeight/2-24,bottom:innerHeight/2+24};
 if(!visible){conceal();return;}
 const rect={left:anchor.x-11,right:anchor.x+11,top:anchor.y-11,bottom:anchor.y+11};
 if(document.body.classList.contains('touch-combat-focus')&&['core','exit','supply'].includes(m.kind)){conceal();placed.push(rect);return}
 const sizeKey=[copy.textContent,el.className,innerWidth,innerHeight].join('|');
 if(el._captionKey!==sizeKey){el._captionKey=sizeKey;el._captionSize={width:copy.offsetWidth,height:copy.offsetHeight}}
 const spot=m.id==='ground-step'||m.approach?null:mobileMarkerCaption(anchor,el._captionSize,viewport,[...placed,aperture]);
 if(spot){if(button){copy.disabled=game.options.touchTapAim===false;copy.style.pointerEvents=copy.disabled?'none':'auto';}copy.style.left=`${spot.dx+11}px`;copy.style.top=`${spot.dy+11}px`;copy.style.visibility='visible';const ex=Math.max(spot.rect.left,Math.min(spot.rect.right,anchor.x))-anchor.x,ey=Math.max(spot.rect.top,Math.min(spot.rect.bottom,anchor.y))-anchor.y,length=Math.hypot(ex,ey);leader.setAttribute('d',`M ${11+ex/length*12} ${11+ey/length*12} L ${11+ex} ${11+ey}`);placed.push(spot.rect)}else conceal();
 placed.push(rect);
}
let visorFocus;
function drawMarkers(markers){
 const active=new Set(), placed=[];
 if(game?.touchMode)for(const el of document.querySelectorAll('#touch-stick,#touch-controls button:not(.component-aim),.hud-top,.hud-bottom .vitals,.hud-bottom .weapon-info,#touch-notices,#extraction-panel,#service-hint,.bearing,#timer,#touch-route-cue,#touch-threat-cue')){if(el.getClientRects().length){const r=el.getBoundingClientRect();if(r.width&&r.height)placed.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom})}}
 const nearest=markers.filter(m=>m.kind==='core'||m.kind==='exit').sort((a,b)=>a.distance-b.distance)[0];
 const blocked=nearest?.occluded?nearest:null;
 if(game?.touchMode)mobileUplinkBlocked=current.phase==='playing'&&current.cores===current.totalCores&&!!blocked;
 let note=$('blocked-signal');if(!note){note=document.createElement('div');note.id='blocked-signal';$('waypoints').append(note)}
 note.textContent=blocked?`${blocked.label} · SIGNAL BEHIND COVER · ${blocked.approachHint||(blocked.id==='core-0'?'USE SOUTH INTAKE / EAST SERVICE':'FIND AN OPEN APPROACH')}`:'';
 note.classList.toggle('hidden',!blocked);
 markers=markers.filter(m=>!m.occluded);
 const visor=threatVisor(markers,visorFocus);
 visorFocus=visor.focused?.id;
 if(game?.touchMode){
  const hitOrigin=game.phase==='playing'&&game.runTime-game.lastDamage<1.1?game.damageCuePosition():null;
  const hitBearing=hitOrigin?Math.atan2(hitOrigin.x-game.player.x,-(hitOrigin.z-game.player.z))+game.yaw:null;
  const cues=mobileCompassCues(markers,visor,hitBearing);
  game.touchThreatCue=cues.threat?{heading:game.yaw-cues.threat.sector*Math.PI/4,time:game.runTime}:null;
  document.body.classList.toggle('touch-threat-alert',!!cues.threat&&game.phase==='playing');
  // FOLLOWING and the ground trace already describe automatic travel. Keep
  // PATH for bends, manual/free-look or combat ownership, where direction is useful.
  const autoView=(game.touchRouteActive||game.touchApproachActive)&&!game.touchRouteManualLook&&!game.aim&&!game.mouseDown&&!game.touchThreatTurn;
  for(const [id,cue,prefix] of [['touch-route-cue',autoView&&cues.route?.sector===0?null:cues.route,'PATH'],['touch-threat-cue',cues.threat,cues.threat?.kind]]){
   const el=$(id);if(!el)continue;el.classList.toggle('hidden',!cue);
   if(cue){const signature=[prefix,cue.direction,cue.sector,cue.otherDirections||0].join('|');if(el.dataset.signature!==signature){el.dataset.signature=signature;el.querySelector('small').textContent=(id==='touch-threat-cue'?'TURN · ':'')+prefix+(cue.otherDirections?' +'+cue.otherDirections:'');el.querySelector('b').textContent=cue.direction;el.dataset.kind=cue.kind||'PATH';el.dataset.sector=String(cue.sector);el.setAttribute('aria-label',`${id==='touch-threat-cue'?'Turn toward ':''}${prefix}: ${cue.direction.toLowerCase()}, relative to your view${cue.otherDirections?'; '+cue.otherDirections+' other alerted directions':''}`);}}
  }
 }

 document.body.classList.toggle('combat-priority',visor.cues.some(m=>m.charging||m.recent));
 let focus=$('threat-focus');if(!focus){focus=document.createElement('div');focus.id='threat-focus';$('waypoints').append(focus)}
 focus.textContent=visor.focused?(visor.focused.aimed?visor.focused.label:`${visor.focused.label} · ${visor.focused.charging?'CHARGING':visor.focused.recent?'RECENT FIRE':visor.focused.health<.35?'DAMAGED':'TRACKING'}`):'';
 if(game?.touchMode)focus.textContent=focus.textContent.replace(/\bSHIFT\b/g,'DASH');
 focus.dataset.target=visor.focused?.id||'';
 focus.classList.toggle('charging',!!visor.focused?.charging);
 focus.classList.toggle('component-duplicate',!!(game?.touchMode&&visor.focused?.type==='custodian'));
 markers=[...markers.filter(m=>m.kind!=='enemy'),...(game?.touchMode?visor.cues.filter(m=>m.onscreen):visor.cues)];
 const memory=$('memory-card');if(!memory.classList.contains('hidden')){const r=memory.getBoundingClientRect();if(r.width&&r.height)placed.push(r);}
 for(const panel of [focus,note,$('interaction')])if(!panel.classList.contains('hidden'))placed.push(panel.getBoundingClientRect());
 if(!game?.touchMode)placed.push({left:innerWidth-205,right:innerWidth,top:90,bottom:315});
 const phoneOptics=new Map();
 if(game?.touchMode){
  const opaque=touchTapBlocks();
  for(const m of markers.filter(m=>m.kind==='component')){const x=(m.x+1)*innerWidth/2,y=(1-m.y)*innerHeight/2;opaque.push({left:x-12,right:x+12,top:y-12,bottom:y+12});}
  // One actual component badge owns the machine; nearby patrol brackets
  // share a deterministic priority and may hide, never shift their anchors.
  const optics=mobileOpticLayout(markers.filter(m=>m.kind==='enemy'&&m.onscreen),{width:innerWidth,height:innerHeight},opaque);
  for(const [id,cue] of optics){phoneOptics.set(id,cue);if(cue.visible)placed.push({...cue.rect,markerId:id});}
  for(const m of markers.filter(m=>m.kind==='component')){const x=(m.x+1)*innerWidth/2,y=(1-m.y)*innerHeight/2;placed.push({left:x-12,right:x+12,top:y-12,bottom:y+12,markerId:m.id});}
 }
 markers.sort((a,b)=>(b.charging?4:b.recent?3:b.inRange?2:0)-(a.charging?4:a.recent?3:a.inRange?2:0));
 for(const m of markers){
  active.add(m.id);let el=markerPool.get(m.id);
  if(!el){el=document.createElement('div');el.className=`world-marker ${m.kind}`;el.dataset.markerId=m.id;el.innerHTML='<span class="marker-symbol">◇</span>'+((m.kind==='component'&&game?.touchMode)?'<button type="button" class="marker-copy component-aim" disabled><b></b><small></small></button>':'<span class="marker-copy"><b></b><small></small></span>')+'<svg class="marker-leader" viewBox="0 0 22 22" aria-hidden="true"><path/></svg><div class="enemy-track"><i></i></div>';(m.kind==='component'&&game?.touchMode?$('touch-controls'):$('waypoints')).append(el);markerPool.set(m.id,el)}
  if(m.kind==='component'){
   el.className=`world-marker component ${m.exposed?'exposed':'armored'}`;
   el.style.left=`${(m.x+1)*innerWidth/2}px`;el.style.top=`${(1-m.y)*innerHeight/2}px`;
   el.querySelector('.marker-symbol').textContent='';el.querySelector('b').textContent=m.label;
   el.querySelector('small').textContent=game?.touchMode?(game.options.touchTapAim===false?'COIL':'AIM'):'';
   if(game?.touchMode){const badge=el.querySelector('.component-aim');badge.dataset.coil=String(m.componentIndex??['I','II','III'].indexOf(m.label));badge.setAttribute('aria-label',`Center view on visible coil ${m.label}; FIRE is separate`);mobileMarker(el,m,placed);}
   el.setAttribute('aria-label',`Coil ${m.label}: ${m.exposed?'exposed component':'armored component'}`);
   continue;
  }
  if(m.kind==='enemy'){
   el.className=`world-marker enemy visor ${m.onscreen?'optic':'edge'} ${m.charging?'charging':m.recent?'recent':'hit'} ${m.type}`;
   el.dataset.members=m.members.join(',');el.dataset.count=m.count;
   const symbol=el.querySelector('.marker-symbol');symbol.textContent='';
   symbol.style.transform=m.onscreen?'none':`rotate(${m.bearing+Math.PI/4}rad)`;
   el.querySelector('b').textContent=!m.onscreen&&m.charging?'!':'';
   el.querySelector('small').textContent=!m.onscreen&&m.count>1?String(m.count):'';
   el.querySelector('small').style.transform='none';
   el.dataset.charges=m.charges;el.dataset.fires=m.fires;el.dataset.hits=m.hits;
   // Phone corners stay centered on the eligible optic. Desktop offset brackets
   // and fixed 30-degree offscreen slots retain their existing presentation.
   const sectorBearing=m.sector*Math.PI/6;
   el.dataset.sector=m.onscreen?'':String(m.sector);
   const cue=phoneOptics.get(m.id);
   el.style.visibility=cue&&!cue.visible?'hidden':'';
   el.style.left=`${cue?cue.x:m.onscreen?(m.x+1)*innerWidth/2+24:innerWidth*(.5+Math.sin(sectorBearing)*.32)}px`;
   el.style.top=`${cue?cue.y:m.onscreen?(1-m.y)*innerHeight/2:innerHeight*(.5-Math.cos(sectorBearing)*.23)}px`;
   if(!m.onscreen)placed.push(el.getBoundingClientRect());
   continue;
  }
  const onscreen=m.front&&Math.abs(m.x)<.86&&Math.abs(m.y)<.68;
  el.classList.toggle('approach',!!m.approach);el.classList.toggle('ground-guide',m.id==='ground-step'&&!!game?.touchMode);
  const x=onscreen?(m.x+1)*50:50+Math.sin(m.bearing)*43,rawY=onscreen?(1-m.y)*50:50-Math.cos(m.bearing)*32;let y=rawY;if(x>82&&y<45)y=51;if(x<24&&y<23)y=28;
  // Keep cue text out of the aperture. Threats retain bearing and priority;
  // competing text stacks below its projected anchor with bounded separation.
  if(onscreen&&m.kind==='enemy')y+=7;
  el.style.opacity=m.suppressed?'0':'';
  el.classList.toggle('edge',!onscreen);el.classList.toggle('charging',!!m.charging);
  el.querySelector('.marker-symbol').textContent=onscreen?'◇':'▲';el.querySelector('.marker-symbol').style.transform=onscreen?'none':`rotate(${m.bearing}rad)`;
  el.querySelector('b').textContent=m.id==='ground-step'&&game?.touchMode?'PATH':!onscreen&&m.kind==='enemy'?m.label.split(' / ')[0]:m.label;
  el.querySelector('small').textContent=m.kind==='enemy'?(m.charging?'CHARGING':m.recent?'RECENT FIRE':''):m.id==='ground-step'?(game?.touchMode?'':'NEXT STEP · CHECK PATROLS'):m.doorway?'CLEAR APPROACH':m.inZone?'IN ZONE':m.inRange?(game?.touchMode?'HOLD TO RECOVER':'HOLD E'):`${m.distance<6?m.distance.toFixed(1):Math.round(m.distance)} M`;
  if(game?.touchMode){mobileMarker(el,m,placed);continue;}
  const key=[el.querySelector('b').textContent,el.querySelector('small').textContent.length,onscreen,m.charging,!!m.approach,innerWidth].join('|');
  if(el._sizeKey!==key){el._sizeKey=key;el._size={width:el.offsetWidth,height:el.offsetHeight};}
  const anchor={x:x*innerWidth/100,y:rawY*innerHeight/100};
  const spot=m.id==='ground-step'&&onscreen?{...anchor,rect:{left:anchor.x-el._size.width/2,right:anchor.x+el._size.width/2,top:anchor.y-el._size.height,bottom:anchor.y}}:placeMarker(x*innerWidth/100,Math.max(16,Math.min(80,y))*innerHeight/100,el._size.width,el._size.height,{width:innerWidth,height:innerHeight},placed);
  if(m.id==='ground-step'&&onscreen&&placed.some(p=>spot.rect.left<p.right+8&&spot.rect.right>p.left-8&&spot.rect.top<p.bottom+8&&spot.rect.bottom>p.top-8))el.style.opacity='0';
  if(!m.suppressed&&spot.rect)placed.push(spot.rect);
  el.style.left=`${spot.x}px`;el.style.top=`${spot.y}px`;
  if(m.kind==='enemy')el.querySelector('i').style.width=`${Math.max(0,m.health*100)}%`;
 }
 if(game?.touchMode){
  if(current.phase==='playing'&&current.cores===current.totalCores){
   // One mission strip owns uplink guidance. Keep alerts out of its route hint.
   renderMobileUplink(current,!!blocked);
   note.classList.add('hidden');
  }
  const jump=$('touch-jump');if(jump)jump.textContent=current.interaction==='Space · Vault'?'VAULT':'JUMP';
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
function renderEndDetails(text){const el=$('end-details');if(!game?.touchMode){el.textContent=text;return}el.replaceChildren(...text.split(' · ').map(value=>{const row=document.createElement('span');row.textContent=value;return row}));}
function showEnd(s){const won=s.phase==='won';hide('retry-anchor',!s.anchorEligible);$('end-manifest').replaceChildren();const recovered=(s.coreMarkers||[]).filter(c=>c.collected);$('end-archive').disabled=recovered.length===0;for(const c of recovered){const row=document.createElement('div');row.innerHTML='<b></b><span></span>';row.querySelector('b').textContent=CORE_SITES[c.id].person;row.querySelector('span').textContent=CORE_SITES[c.id].role;$('end-manifest').append(row)}renderEndDetails(`${s.accuracy||0}% ACCURACY · ${s.headshots||0} CRITICAL ELIMINATION${s.headshots===1?'':'S'} · ${s.phaseDodges||0} PHASE EVADES · ${s.anchorRetries||0} UPLINK RETRIES${s.assistedShots>0?' · '+s.assistedShots+(s.assistedShots===1?' ASSISTED SHOT':' ASSISTED SHOTS'):''}${s.tapAims>0?' · '+s.tapAims+(s.tapAims===1?' TAP AIM':' TAP AIMS'):''}${s.routeAssists>0?' · '+s.routeAssists+(s.routeAssists===1?' ROUTE ASSIST':' ROUTE ASSISTS'):''}${s.approachAssists>0?' · '+s.approachAssists+(s.approachAssists===1?' APPROACH ASSIST':' APPROACH ASSISTS'):''}${s.autoVaults>0?' · '+s.autoVaults+(s.autoVaults===1?' AUTO VAULT':' AUTO VAULTS'):''}${s.checkpointAssisted?' · STATS RESTORED TO CACHE ON RETRY':''}`);$('end-eyebrow').textContent=won?'OPERATION COMPLETE':'OPERATOR LOST';$('end-title').innerHTML=game?.touchMode?(won?'SIGNAL RESTORED':'SIGNAL LOST'):(won?'THE SIGNAL<br>LIVES.':'THE STATION<br>REMEMBERS.');document.querySelector('.end-actions').classList.toggle('anchor-available',!!s.anchorEligible);$('end-copy').textContent=won?'Some things deserve a second life. You brought them home.':'The relay is still calling. Take a breath. Find another way through.';if(s.anchorEligible)$('end-copy').textContent='Memories cached. Retry at the uplink with a fresh suit and a full Custodian, or start fresh.';if(won&&s.checkpointAssisted)$('end-eyebrow').textContent='CHECKPOINT-ASSISTED COMPLETION';$('end-kills').textContent=s.kills||0;$('end-time-label').textContent=s.anchorRetries>0?'TOTAL PLAY TIME':'MISSION TIME';$('end-time').textContent=clock(s.time);$('end-score').textContent=Math.round(s.score||0).toLocaleString();try{const assisted=s.assistedShots>0||s.tapAims>0||s.approachAssists>0||s.routeAssists>0;const k=`soulfall-best-${s.difficulty||settings.difficulty}${assisted?'-touch-assisted':''}`;let best=Number(localStorage.getItem(k)||0);if(s.checkpointAssisted){$('personal-best').textContent='CHECKPOINT ASSISTED · EXCLUDED FROM FRESH PERSONAL BESTS'}else if(won&&(s.score||0)>best){best=s.score;localStorage.setItem(k,best);$('personal-best').textContent=assisted?'NEW TOUCH ASSIST PERSONAL BEST':'NEW PERSONAL BEST'}else $('personal-best').textContent=best?`${assisted?'TOUCH ASSIST ':''}PERSONAL BEST · ${best.toLocaleString()}`:''}catch{}}
async function boot(){try{game=new Game({canvas:$('game-canvas'),onState:renderState,onEvent,onMarkers:drawMarkers});await game.init();game.setSettings(settings);installTouch(game,{map:()=>game.openPlanning(),onBrightness:value=>{settings.mobileBrightness=value;saveSettings()},onSensitivity:value=>{settings.touchSensitivity=value;saveSettings()},onFireSpeed:value=>{settings.touchFireSpeed=value;saveSettings()},onFastTurns:value=>{settings.fastSceneTurns=value;saveSettings()},onAimAssist:value=>{settings.touchAimAssist=value;saveSettings()},onAutoVault:value=>{settings.touchAutoVault=value;saveSettings()},onTapAim:value=>{settings.touchTapAim=value;saveSettings()}});loaded=true;$('deploy').disabled=false;$('deploy-label').textContent='ENTER THE STORM';$('load-status').textContent='SYSTEMS ONLINE · READY TO DEPLOY';$('load-status').classList.add('ready');if(new URLSearchParams(location.search).has('test'))window.__SOULFALL__={game,get state(){return current},deploy,settings};}catch(e){console.error(e);hide('fatal',false);$('fatal-message').textContent=`The 3D engine could not initialize. Use a browser with WebGL 2 and hardware acceleration. ${e.message}`;}}
boot();

const visorHelp=document.createElement('p');visorHelp.textContent='THREAT VISOR · Orange ! means a charging threat. Muted chevrons show recent fire or hits. A number counts nearby sources in that direction; one source has no number. Offscreen cues use broad direction sectors, not exact positions. Phone corner marks center on visible emitters; desktop brackets stay beside them. The lower readout follows one target near aim. Cues require clear optic sight and expire.';document.querySelector('#controls-dialog .primary-button')?.before(visorHelp);
const handbook=document.querySelector('#controls-dialog'), handbookContent=document.createElement('div');
handbookContent.className='handbook-content';handbookContent.tabIndex=0;handbookContent.setAttribute('aria-label','Handbook details; scroll for all controls and visor guidance');
for(const child of [...handbook.children])if(!child.matches('.dialog-header,.primary-button'))handbookContent.append(child);
handbook.querySelector('.dialog-header').after(handbookContent);
