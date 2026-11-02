import * as THREE from 'three';
export const CONTACT_WINDUP=.55;
// Shared template, cloned once per spawn. No precision/collision surfaces are added.
export function fallbackContact(){
 const g=new THREE.Group();
 const steel=new THREE.MeshStandardMaterial({color:0x394b51,metalness:.75,roughness:.4});
 const amber=new THREE.MeshStandardMaterial({color:0xe6a14d,emissive:0xffa328,emissiveIntensity:.25});amber.name='DischargeAmber';
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.025,6,24),steel);ring.rotation.x=Math.PI/2;ring.position.y=1.28;g.add(ring);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3+Math.PI/6;
  for(const [name,r,y,w,h,d,m]of [['Support',.25,.98,.07,.045,.25,steel],['Guide',.405,1.16,.025,.34,.025,steel],['Electrode',.408,1.035,.07,.11,.045,amber],['Shutter',.43,1.035,.115,.14,.035,steel]]){
   const n=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);n.name=name+i;n.position.set(Math.sin(a)*r,y+.3,Math.cos(a)*r);n.rotation.y=a;g.add(n);
  }
 }
 return g;
}
export function attachContact(template,group,type,fallbackWarden=false){
 const model=template.clone(true),emitters=[];
 model.traverse(n=>{if(!n.isMesh)return;n.userData.sharedGeometry=true;n.material=n.material.clone();if(n.material.name==='DischargeAmber')emitters.push(n.material);});
 if(type==='warden')model.scale.set(1.5,1,1.5);
 // Sentinel cartridge bolts to the pelvic load rails, below the stabilized emitter cradle.
 if(type==='sentinel')model.position.y=-.30;
 // The legacy backup has solid shoulder blocks: mount on their upper frame.
 if(fallbackWarden)model.position.y=.45;
 model.name='ContactDischargeAssembly';group.add(model);
 return {model,emitters,shutters:Array.from({length:6},(_,i)=>{const node=model.getObjectByName('Shutter'+i);return {node,y:node.position.y};})};
}
export function contactReach(game,enemy){
 const p=enemy.group.position,eye=p.clone().add(new THREE.Vector3(0,1.3,0)),torso=game.player.clone().add(new THREE.Vector3(0,-.5,0));
 return Math.hypot(p.x-game.player.x,p.z-game.player.z)<1.4 && eye.distanceTo(torso)<1.6 && game.hasLineOfSight(eye,torso,0);
}
export function animateContact(enemy,dt){
 const rig=enemy.contactRig;if(!rig)return;
 enemy.contactFlash=Math.max(0,(enemy.contactFlash||0)-dt);
 if(!enemy.contactFlash && !(enemy.contactWindup>0))enemy.contactCanceled=false;
 const charge=enemy.contactWindup>0?1-enemy.contactWindup/CONTACT_WINDUP:0;
 const flash=enemy.contactFlash/.22;
 const lift=enemy.contactWindup>0?.04+.12*charge:.16*flash;
 for(const s of rig.shutters)s.node.position.y=s.y+lift;
 for(const m of rig.emitters){m.emissive.setHex(enemy.contactCanceled?0x43cddd:0xffa328);m.emissiveIntensity=enemy.contactWindup>0?.65+charge*1.8:.25+flash*2.5;}
}
export function cancelContact(enemy){enemy.contactWindup=0;enemy.meleeCooldown=Math.max(enemy.meleeCooldown||0,1);enemy.contactFlash=.22;enemy.contactCanceled=true;animateContact(enemy,0);}
