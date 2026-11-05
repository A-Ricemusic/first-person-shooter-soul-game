// Calibrate the existing scene tone-mapping uniform; no extra render pass.
export const BASE_SCENE_EXPOSURE=1.12;
export const DEFAULT_PHONE_BRIGHTNESS=1.3;
export function phoneBrightness(value){
 return typeof value==='number'&&Number.isFinite(value)?Math.max(.8,Math.min(1.6,value)):DEFAULT_PHONE_BRIGHTNESS;
}
export function sceneExposure(touchMode,value){
 return BASE_SCENE_EXPOSURE*(touchMode?phoneBrightness(value):1);
}
