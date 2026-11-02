// Browser-side timed DOM controls. No game object, simulation clock, state or aiming reads.
export function validateSteps(steps) {
 if(!Array.isArray(steps))throw Error('Steps must be an array.');
 for(const a of steps){
  if(!a||typeof a!=='object')throw Error('Unsupported input step.');
  if(['down','up','press'].includes(a.type)){
   if(!/^(Key[WASDREM]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Escape|Tab)$/.test(a.key))throw Error('Unsupported game key.');
  }else if(['mouseDown','mouseUp'].includes(a.type)){
   if(!['left','right'].includes(a.button||'left'))throw Error('Unsupported mouse button.');
  }else if(a.type==='look'){
   const x=a.x??0,y=a.y??0;if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>2400||Math.abs(y)>2400)throw Error('Invalid relative mouse delta.');
  }else if(a.type==='wait'){
   if(!Number.isFinite(a.ms)||a.ms<0||a.ms>12000)throw Error('Wait must be between0 and12000ms.');
  }else throw Error('Unsupported input step.');
 }
}
// Serialized once into the page by Playwright. The returned handle keeps all
// driver bookkeeping private; only ordinary DOM input events reach the game.
export function createBrowserInput(){
 const canvas=document.querySelector('#game-canvas');if(!canvas)throw Error('Game canvas missing.');
 const keys=new Set(),buttons=new Set();let generation=0,busy=false,wake=null;
 const mods=()=>({ctrlKey:keys.has('ControlLeft')||keys.has('ControlRight'),shiftKey:keys.has('ShiftLeft')||keys.has('ShiftRight')});
 const keyValue=code=>code.startsWith('Key')?(mods().shiftKey?code.slice(3):code.slice(3).toLowerCase()):code==='Space'?' ':code.startsWith('Shift')?'Shift':code.startsWith('Control')?'Control':code;
 const key=(code,down)=>{
  const repeat=down&&keys.has(code);if(down)keys.add(code);else keys.delete(code);
  canvas.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:keyValue(code),location:/^(Shift|Control)/.test(code)?code.endsWith('Right')?2:1:0,repeat,...mods(),bubbles:true,cancelable:true}));
 };
 const mouse=(button,down)=>{
  if(down)buttons.add(button);else buttons.delete(button);
  canvas.dispatchEvent(new MouseEvent(down?'mousedown':'mouseup',{button:button==='right'?2:0,buttons:(buttons.has('left')?1:0)|(buttons.has('right')?2:0),...mods(),bubbles:true,cancelable:true}));
 };
 const release=()=>{for(const code of [...keys])key(code,false);for(const button of [...buttons])mouse(button,false);};
 const held=()=>({keys:[...keys],buttons:[...buttons]});
 // Map/pause keys initiate asynchronous pointer-lock/focus changes. Let the
 // browser paint and settle them before another toggle; no game state is read.
 const settleUI=()=>new Promise(resolve=>{
  let finished=false,task;const timeout=setTimeout(done,100);
  const frame=requestAnimationFrame(()=>{task=setTimeout(done,0);});
  function done(){if(finished)return;finished=true;clearTimeout(timeout);clearTimeout(task);cancelAnimationFrame(frame);wake=null;resolve();}
  wake=done;
 });
 return {
  held,release,
  cancel(){generation++;release();wake?.();},
  async run({steps,retainHeld=false}){
   if(busy)throw Error('Input batch already running.');busy=true;const token=++generation,start=performance.now(),timings=[];let success=false;
   try{
    for(const action of steps){
     if(token!==generation)throw Error('Input batch canceled.');
     const before=performance.now();
     if(action.type==='wait')await new Promise(resolve=>{const timer=setTimeout(done,action.ms);function done(){clearTimeout(timer);wake=null;resolve();}wake=done;});
     else if(action.type==='down')key(action.key,true);
     else if(action.type==='up')key(action.key,false);
     else if(action.type==='press'){key(action.key,true);key(action.key,false);if(action.key==='KeyM'||action.key==='Escape')await settleUI();}
     else if(action.type==='mouseDown')mouse(action.button||'left',true);
     else if(action.type==='mouseUp')mouse(action.button||'left',false);
     else if(action.type==='look')document.dispatchEvent(new MouseEvent('mousemove',{movementX:action.x||0,movementY:action.y||0,bubbles:true}));
     else throw Error('Unsupported input step.');
     timings.push({action,startedMs:before-start,browserMs:performance.now()-before});
    }
    if(token!==generation)throw Error('Input batch canceled.');success=true;
    return {timings,browserMs:performance.now()-start};
   }finally{
    if(!success||!retainHeld)release();busy=false;wake=null;
   }
  }
 };
}
