import{touchScenePoint}from'./touch-tap-regions.js';
import{recordTouchAim}from'./touch-aim-readout.js';

// A visible badge requests a new physical selection, never a stored target.
export function requestComponentAim(g,index){
 if(!g.touchMode||g.phase!=='playing')return false;
 const reject=()=>{recordTouchAim(g,false);g.emit();return false};
 if(!Number.isInteger(index)||index<0||index>2||g.options.touchTapAim===false||g.vault)return reject();
 const marker=g.captureMarkers().find(m=>m.kind==='component'&&m.componentIndex===index);
 if(!marker?.front||!Number.isFinite(marker.x)||!Number.isFinite(marker.y)||Math.abs(marker.x)>1||Math.abs(marker.y)>1)return reject();
 const r=g.canvas.getBoundingClientRect(),x=r.left+(marker.x+1)*r.width/2,y=r.top+(1-marker.y)*r.height/2;
 if(!touchScenePoint(x,y))return reject();
 return g.tapAimAt(x,y,`coil-${index}`);
}
