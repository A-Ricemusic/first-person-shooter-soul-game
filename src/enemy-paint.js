import * as THREE from 'three';
import PAINT from './build104-enemy-paint.js';
// Only the existing primitive download-failure models use this helper.
// Loaded models carry these Blender-authored PBR values in their own GLBs.
export function fallbackPaint(kind){
 const role=kind==='warden'?'warden':kind==='interceptor'?'interceptor':'sentinel';
 const name={warden:'Warden_Armor',interceptor:'Ceramic graphite.001',sentinel:'Service ivory enamel'}[role];
 const value=PAINT[role][name];
 return{color:new THREE.Color().setRGB(...value.color),metalness:value.metallic,roughness:value.roughness};
}
