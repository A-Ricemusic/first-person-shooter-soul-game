// Only real opaque HUD/control rectangles exclude scene acquisition. Reticle
// effects stay transparent to input. Snapshot once per tolerance search.
export function touchTapBlocks(exclude=null){
 if(typeof document==='undefined')return[];
 const blocks=[];
 for(const el of document.querySelectorAll('.hud-mission,.bearing,.vitals,.weapon-info,#extraction-panel,#announcement,#memory-card,#interaction,#service-hint,#field-controls,#event-feed,#timer,#touch-route-cue,#touch-threat-cue,#touch-controls button,#touch-stick,#pause-button')){
  if(el===exclude)continue;
  const css=getComputedStyle(el);if(css.display==='none'||css.visibility==='hidden'||Number(css.opacity)===0)continue;
  const r=el.getBoundingClientRect();if(r.width&&r.height)blocks.push(r);
 }
 return blocks;
}
export function touchScenePoint(x,y,blocks=touchTapBlocks()){
 return !blocks.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);
}
