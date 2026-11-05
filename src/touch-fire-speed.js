// Independent multiplier for manual FIRE drag only; existing default stays1.
export function fireDragSpeed(value=1){
 const n=Number(value);return Number.isFinite(n)?Math.max(.4,Math.min(1.6,n)):1;
}
