import './style.css';
import { Game } from './game.js';

const $ = (id) => document.getElementById(id);
const saved = (()=>{try{return JSON.parse(localStorage.getItem('soulfall-settings')||'{}')}catch{return {}}})();
let settings = {difficulty:'standard',sensitivity:1,volume:0.65,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,...saved};
let game, current = {}, loaded = false, previousPhase = '', activePanel = null;
const icon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2 28 9v14l-12 7L4 23V9Z" stroke="currentColor"/><path d="m16 7 6 9-6 9-6-9Z" fill="currentColor"/></svg>`;
document.querySelector('#app').innerHTML = `
<canvas id="game-canvas" aria-label="SOULFALL three dimensional game world"></canvas>
<div class="filmgrain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div>
<div id="damage-flash" aria-hidden="true"></div><div id="shift-flash" aria-hidden="true"></div>
<section id="menu" class="screen menu-screen">
 <header class="topbar"><a class="studio-mark" href="./">${icon}<span>VESPER<br><b>INTERACTIVE</b></span></a><div class="build-label"><i></i> PLAYABLE VERTICAL SLICE <span> / </span> BUILD 01</div><button class="text-button" id="open-settings" aria-label="Open settings">SETTINGS <span>⚙</span></button></header>
 <div class="menu-copy"><div class="eyebrow"><span class="short-line"></span> A SIGNAL WORTH DYING FOR.</div><h1>SOUL<span>FALL</span><i>THE LAST SIGNAL</i></h1><p>The station went silent. The dead didn't.<br>Enter the storm. Bring the signal home.</p>
 <button class="primary-button" id="deploy" disabled><span id="deploy-label">INITIALIZING STATION</span><span class="button-arrow">↗</span></button>
 <div class="menu-secondary"><button id="open-briefing">MISSION BRIEF <span>↗</span></button><button id="open-controls">HOW TO PLAY <span>↗</span></button></div><div id="load-status" class="load-status" role="status">Preparing environment & combat systems…</div></div>
 <aside class="mission-card"><div class="micro-label">OPERATION / 001</div><h2>THE DROWNED<br>RELAY</h2><div class="coordinates">58° 21′ N &nbsp; 06° 14′ E</div><div class="mission-divider"></div><p>Recover three soul cores.<br>Survive the station's guardians.<br>Extract before you become one.</p><div class="mission-badges"><span>SINGLE PLAYER</span><span>5–10 MIN</span></div></aside>
 <footer class="menu-footer"><span>HEADPHONES RECOMMENDED <span class="sound-lines">▂▅▃▇▃</span></span><a href="./docs/human.html" target="_blank" rel="noopener">THE VISION & DEVELOPMENT NOTES ↗</a><span>DESKTOP · WEBGL 2</span></footer>
</section>
<section id="hud" class="hidden" aria-label="Game information"><header class="hud-top"><div class="hud-mission"><span class="micro-label">OPERATION // DROWNED RELAY</span><strong id="objective">RECLAIM THE SIGNAL</strong><div id="core-slots"><span>01</span><span>02</span><span>03</span></div></div><div class="bearing">N <span>· · · · ·</span> <b id="heading">000</b> <span>· · · · ·</span> E</div><button id="pause-button" class="pause-button" aria-label="Pause game">Ⅱ <span>ESC</span></button></header>
 <div id="announcement" role="status"></div><div id="crosshair" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div><div id="hitmarker" aria-hidden="true">×</div><div id="interaction" class="hidden"><kbd>E</kbd><span>RECOVER SOUL CORE</span></div>
 <aside class="signal-scan"><div class="micro-label">SIGNAL SCAN // LIVE</div><canvas id="radar" width="280" height="280" aria-label="Tactical map of player, core sites, and extraction"></canvas><div id="signal-distance">LOCATING CORES</div></aside><div id="event-feed" aria-live="polite"></div><footer class="hud-bottom"><div class="vitals"><div class="health-value"><span class="cross-icon">+</span><b id="health">100</b><span>VITALS</span></div><div class="health-track"><i id="health-bar"></i></div><div class="shield-line"><span>AEGIS</span><div><i id="shield-bar"></i></div><b id="shield">50</b></div></div>
 <div class="ability"><div class="ability-icon">${icon}<b id="dash-key">⇧</b></div><div><b id="dash-status">SOUL SHIFT READY</b><span>SHIFT · PHASE THROUGH FIRE</span><div class="dash-track"><i id="dash-bar"></i></div></div></div>
 <div class="weapon-info"><div class="micro-label">VESPER // COIL RIFLE</div><div class="ammo"><b id="ammo">30</b><span>/ <i id="reserve">180</i></span></div><div id="reload-label"><kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM</div></div></footer><div class="hud-stats"><span id="kills">0 ELIMINATED</span><span id="timer">00:00</span></div></section>
<section id="pause" class="screen overlay hidden"><div class="panel pause-panel"><div class="eyebrow">SIGNAL HELD</div><h2>TAKE A BREATH.</h2><p>The station can wait.</p><button class="primary-button" id="resume">RESUME OPERATION <span>↗</span></button><button class="secondary-button" id="pause-settings">SETTINGS</button><button class="secondary-button" id="restart-pause">RESTART MISSION</button><button class="text-button" id="return-menu">RETURN TO TITLE</button><small id="pointer-help">Click to capture your mouse. Esc releases it.</small></div></section>
<section id="end" class="screen overlay hidden"><div class="panel end-panel"><div class="eyebrow" id="end-eyebrow">OPERATION COMPLETE</div><h2 id="end-title">THE SIGNAL<br>LIVES.</h2><p id="end-copy">Some things deserve a second life. You brought them home.</p><div class="end-stats"><div><span>ELIMINATIONS</span><b id="end-kills">0</b></div><div><span>MISSION TIME</span><b id="end-time">00:00</b></div><div><span>SCORE</span><b id="end-score">0</b></div></div><div id="personal-best"></div><button class="primary-button" id="play-again">DEPLOY AGAIN <span>↗</span></button><button class="secondary-button" id="end-menu">RETURN TO TITLE</button></div></section>
<dialog id="settings-dialog"><div class="dialog-header"><span class="eyebrow">FIELD CONFIGURATION</span><button class="close-button" data-close aria-label="Close settings">×</button></div><h2>MAKE IT YOURS.</h2><label for="difficulty">THREAT LEVEL</label><select id="difficulty"><option value="story">Recon — more forgiving</option><option value="standard">Operator — intended experience</option><option value="veteran">Veteran — high stakes</option></select><p class="setting-note">Threat level applies to your next deployment.</p><label for="sensitivity">MOUSE SENSITIVITY <output id="sensitivity-value"></output></label><input id="sensitivity" type="range" min="0.25" max="2.5" step="0.05"><label for="volume">MASTER VOLUME <output id="volume-value"></output></label><input id="volume" type="range" min="0" max="1" step="0.05"><label class="checkbox-label"><input id="motion" type="checkbox"> REDUCED CAMERA MOTION</label><p class="setting-note">Reduces view bob, recoil movement, and screen effects.</p><button class="primary-button" data-close>APPLY & CLOSE <span>↗</span></button></dialog>
<dialog id="controls-dialog"><div class="dialog-header"><span class="eyebrow">OPERATOR HANDBOOK</span><button class="close-button" data-close aria-label="Close controls">×</button></div><h2>MOVE WITH PURPOSE.</h2><div class="control-list"><span><kbd>W A S D</kbd> Move</span><span><kbd>MOUSE</kbd> Look</span><span><kbd>LMB</kbd> Fire coil rifle</span><span><kbd>RMB</kbd> Aim down sights</span><span><kbd>R</kbd> Reload</span><span><kbd>SHIFT</kbd> Soul Shift / dash</span><span><kbd>CTRL</kbd> Sprint</span><span><kbd>SPACE</kbd> Jump</span><span><kbd>E</kbd> Recover nearby core</span><span><kbd>ESC</kbd> Pause / release mouse</span></div><p class="dialog-tip">Soul Shift makes you briefly invulnerable. Dash between cover when a sentinel charges its shot. Your shield regenerates when you avoid damage.</p><button class="primary-button" data-close>UNDERSTOOD <span>↗</span></button></dialog>
<dialog id="briefing-dialog"><div class="dialog-header"><span class="eyebrow">EYES ONLY // VESPER</span><button class="close-button" data-close aria-label="Close mission briefing">×</button></div><h2>BRING THEM HOME.</h2><p class="briefing-intro">The Drowned Relay was built to preserve human memories. Last night, it began broadcasting them as a distress call.</p><ol class="briefing-list"><li><b>BREACH THE STATION</b><p>Use the central yard and its side lanes. Concrete cover breaks a sentinel's line of sight.</p></li><li><b>RECOVER THREE CORES</b><p>Follow the cyan signal pylons. Approach and press E. Every recovery escalates the defense response.</p></li><li><b>RETURN TO EXTRACTION</b><p>Bring all three cores to the extraction beacon where you entered. Surviving is part of the mission.</p></li></ol><p class="dialog-tip">Red means danger. Cyan means life. Soul Shift is your way through.</p><button class="primary-button" data-close>ACCEPT BRIEFING <span>↗</span></button></dialog>
<div id="fatal" class="screen overlay hidden"><div class="panel"><h2>SIGNAL INTERRUPTED.</h2><p id="fatal-message"></p><button class="primary-button" onclick="location.reload()">RETRY CONNECTION ↗</button></div></div>
`;
const clock = t => `${Math.floor((t||0)/60).toString().padStart(2,'0')}:${Math.floor((t||0)%60).toString().padStart(2,'0')}`;
const hide = (id, value) => $(id).classList.toggle('hidden',value);
function saveSettings(){try{localStorage.setItem('soulfall-settings',JSON.stringify(settings))}catch{} game?.setSettings(settings)}
function openDialog(id){activePanel=id;$(id).showModal();}
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>el.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(el=>el.addEventListener('close',()=>{activePanel=null;saveSettings()}));
$('open-settings').onclick=()=>openDialog('settings-dialog');$('pause-settings').onclick=()=>openDialog('settings-dialog');
$('open-controls').onclick=()=>openDialog('controls-dialog');$('open-briefing').onclick=()=>openDialog('briefing-dialog');
for (const name of ['difficulty','sensitivity','volume']) { $(name).value=settings[name];$(name).oninput=()=>{settings[name]=name==='difficulty'?$(name).value:Number($(name).value);updateSettings();saveSettings()}; }
$('motion').checked=settings.reducedMotion;$('motion').onchange=()=>{settings.reducedMotion=$('motion').checked;updateSettings();saveSettings()};
function updateSettings(){ $('volume-value').textContent=`${Math.round(settings.volume*100)}%`;$('sensitivity-value').textContent=`${Number(settings.sensitivity).toFixed(2)}×`;document.body.classList.toggle('reduced-motion',settings.reducedMotion); }
updateSettings();
function deploy(){if(!loaded)return;hide('menu',true);hide('end',true);hide('pause',true);game.start(settings);}
$('deploy').onclick=deploy;$('resume').onclick=()=>game.resume();$('pause-button').onclick=()=>game.pause();
function restart(){hide('end',true);hide('pause',true);game.restart(settings)}
$('restart-pause').onclick=restart;$('play-again').onclick=restart;
function title(){game.pause();hide('pause',true);hide('end',true);hide('hud',true);hide('menu',false);document.exitPointerLock?.();}
$('return-menu').onclick=title;$('end-menu').onclick=title;
let messageTimer,hitTimer,flashTimer,shiftTimer;
function notify(text){$('announcement').textContent=text;$('announcement').classList.add('visible');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('announcement').classList.remove('visible'),2800)}
function onEvent(e){
 if(e.type==='damage'){ $('damage-flash').classList.add('active');clearTimeout(flashTimer);flashTimer=setTimeout(()=>$('damage-flash').classList.remove('active'),240) }
 if(['hit','kill','headshot'].includes(e.type)){ $('hitmarker').classList.add('visible');$('hitmarker').classList.toggle('kill',e.type==='kill');clearTimeout(hitTimer);hitTimer=setTimeout(()=>$('hitmarker').classList.remove('visible'),e.type==='kill'?230:100) }
 if(e.type==='dash'){ $('shift-flash').classList.add('active');clearTimeout(shiftTimer);shiftTimer=setTimeout(()=>$('shift-flash').classList.remove('active'),250) }
 if(e.message && !['shot','hit','damage','footstep'].includes(e.type)){notify(e.message);const line=document.createElement('div');line.textContent=e.message;$('event-feed').prepend(line);while($('event-feed').children.length>3)$('event-feed').lastChild.remove();setTimeout(()=>line.remove(),5500)}
}
function renderState(s){
 current=s;drawRadar(s);const phase=s.phase;
 if(phase!==previousPhase){
  const playing=phase==='playing';hide('hud',!playing);hide('pause',phase!=='paused'||!$('menu').classList.contains('hidden'));hide('end',!['won','lost'].includes(phase));
  document.body.classList.toggle('in-game',playing); if(playing)hide('menu',true);
  if(['won','lost'].includes(phase))showEnd(s);
  previousPhase=phase;
 }
 $('health').textContent=Math.ceil(Math.max(0,s.health||0));$('health-bar').style.width=`${Math.max(0,s.health/(s.maxHealth||100)*100)}%`;
 $('shield').textContent=Math.ceil(Math.max(0,s.shield||0));$('shield-bar').style.width=`${Math.max(0,(s.shield||0)/(s.maxShield||60)*100)}%`;
 $('ammo').textContent=String(s.ammo??30).padStart(2,'0');$('reserve').textContent=s.reserve??180;
 $('ammo').classList.toggle('low',s.ammo<7);$('reload-label').innerHTML=s.reloading?'RELOADING…':'<kbd>R</kbd> RELOAD <span>•</span> <kbd>RMB</kbd> AIM';
 $('objective').textContent=s.objective||'RECOVER THE THREE SOUL CORES';$('kills').textContent=`${s.kills||0} ELIMINATED`;$('timer').textContent=clock(s.time);
 const count=typeof s.cores==='number'?s.cores:0;[...$('core-slots').children].forEach((el,i)=>el.classList.toggle('recovered',i<count));
 const cooldown=s.dashCooldown||0;$('dash-status').textContent=cooldown>0?`RECHARGING ${cooldown.toFixed(1)}s`:'SOUL SHIFT READY';$('dash-bar').style.width=`${100-Math.min(100,cooldown/4.5*100)}%`;
 if(s.heading!==undefined)$('heading').textContent=String(Math.round(s.heading)).padStart(3,'0');
 hide('interaction',!s.interaction);if(s.interaction)$('interaction').querySelector('span').textContent=typeof s.interaction==='string'?s.interaction.replace(/^E · /,''):'RECOVER SOUL CORE';
 document.body.classList.toggle('critical-health',s.health<30&&phase==='playing');
}

function drawRadar(s){
 const canvas=$('radar'),ctx=canvas.getContext('2d'),p=s.player;if(!p||!s.coreMarkers)return;
 const size=280,c=140,scale=1.5;ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.clip();ctx.fillStyle='rgba(5,20,25,.64)';ctx.fillRect(0,0,size,size);
 const map=(x,z)=>[c+(x-p.x)*scale,c+(z-p.z)*scale];
 ctx.strokeStyle='rgba(139,202,192,.13)';ctx.lineWidth=1;
 for(let i=-100;i<=100;i+=10){const a=map(i,-100),b=map(i,100),d=map(-100,i),e=map(100,i);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.moveTo(...d);ctx.lineTo(...e);ctx.stroke()}
 if(s.bounds){const b=s.bounds,a=map(b.minX,b.minZ);ctx.strokeStyle='rgba(139,202,192,.5)';ctx.strokeRect(a[0],a[1],(b.maxX-b.minX)*scale,(b.maxZ-b.minZ)*scale)}
 const extraction=s.cores===s.totalCores;
 if(s.exit){const a=map(s.exit.x,s.exit.z);ctx.strokeStyle=extraction?'#87ffc1':'#c7a27c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(...a,6,0,Math.PI*2);ctx.stroke();}
 for(const core of s.coreMarkers){if(core.collected)continue;const a=map(core.x,core.z);ctx.fillStyle='#8ee8e0';ctx.beginPath();ctx.moveTo(a[0],a[1]-5);ctx.lineTo(a[0]+5,a[1]);ctx.lineTo(a[0],a[1]+5);ctx.lineTo(a[0]-5,a[1]);ctx.closePath();ctx.fill();ctx.font='12px monospace';ctx.fillText(String(core.id+1),a[0]+9,a[1]+4)}
 ctx.translate(c,c);ctx.rotate(-p.yaw);ctx.fillStyle='#f0fff7';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,6);ctx.lineTo(0,3);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
 ctx.beginPath();ctx.arc(c,c,129,0,Math.PI*2);ctx.strokeStyle='rgba(139,202,192,.32)';ctx.lineWidth=1;ctx.stroke();
 const distance=extraction?s.exitDistance:s.nearestCoreDistance;$('signal-distance').textContent=distance==null?'SIGNAL SECURED':`${extraction?'EXTRACTION':'NEAREST CORE'} · ${Math.round(distance)} M`;
}

function showEnd(s){const won=s.phase==='won';$('end-eyebrow').textContent=won?'OPERATION COMPLETE':'OPERATOR LOST';$('end-title').innerHTML=won?'THE SIGNAL<br>LIVES.':'THE STATION<br>REMEMBERS.';$('end-copy').textContent=won?'Some things deserve a second life. You brought them home.':'The relay is still calling. Take a breath. Find another way through.';$('end-kills').textContent=s.kills||0;$('end-time').textContent=clock(s.time);$('end-score').textContent=Math.round(s.score||0).toLocaleString();try{const k=`soulfall-best-${settings.difficulty}`;let best=Number(localStorage.getItem(k)||0);if(won&&(s.score||0)>best){best=s.score;localStorage.setItem(k,best);$('personal-best').textContent='NEW PERSONAL BEST'}else $('personal-best').textContent=best?`PERSONAL BEST · ${best.toLocaleString()}`:''}catch{}}
async function boot(){try{game=new Game({canvas:$('game-canvas'),onState:renderState,onEvent});await game.init();game.setSettings(settings);loaded=true;$('deploy').disabled=false;$('deploy-label').textContent='ENTER THE STORM';$('load-status').textContent='SYSTEMS ONLINE · READY TO DEPLOY';$('load-status').classList.add('ready');if(new URLSearchParams(location.search).has('test'))window.__SOULFALL__={game,get state(){return current},deploy,settings};}catch(e){console.error(e);hide('fatal',false);$('fatal-message').textContent=`The 3D engine could not initialize. Use a desktop browser with WebGL 2 and hardware acceleration. ${e.message}`;}}
boot();
