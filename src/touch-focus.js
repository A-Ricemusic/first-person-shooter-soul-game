// A deliberate phone AIM lens; wide travel view and desktop ADS stay unchanged.
export const TOUCH_FOCUS_FOV=40;
export const DESKTOP_AIM_FOV=56;
// Preserve approximate on-screen fine-drag travel at the stronger magnification.
export const TOUCH_FOCUS_GAIN=.5*Math.tan(TOUCH_FOCUS_FOV*Math.PI/360)/Math.tan(DESKTOP_AIM_FOV*Math.PI/360);
export function desiredViewFov(g){
 return g.aim&&!g.reloading&&!g.vault?(g.touchMode?TOUCH_FOCUS_FOV:DESKTOP_AIM_FOV):g.dashTime>0?86:75;
}
