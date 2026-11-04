// Observation cadence belongs to the test driver, never to the game.
// Wall-clock transport/render latency can overshoot a boundary; no game time,
// resources, target information or damage is read or changed here.
export class MobileObservation {
 constructor(clock=()=>performance.now()){
  this.clock=clock;this.live={total:0,start:null,limit:3000};this.fire={total:0,start:null,limit:1200};this.contacts=new Set();
 }
 elapsed(channel){return channel.total+(channel.start===null?0:this.clock()-channel.start);}
 set(channel,active){if(active&&channel.start===null)channel.start=this.clock();else if(!active&&channel.start!==null){channel.total+=this.clock()-channel.start;channel.start=null;}}
 playing(active){this.set(this.live,active);if(!active){this.contacts.clear();this.set(this.fire,false);}}
 down(id){this.contacts.add(id);this.set(this.fire,true);}
 up(id){this.contacts.delete(id);if(!this.contacts.size)this.set(this.fire,false);}
 release(){this.contacts.clear();this.set(this.fire,false);this.set(this.live,false);}
 allowance(playing){
  if(!playing)return{milliseconds:Infinity,reason:null};
  const live=this.live.limit-this.elapsed(this.live),fire=this.fire.limit-this.elapsed(this.fire);
  return this.contacts.size||fire<=0?(fire<live?{milliseconds:Math.max(0,fire),reason:'fire'}:{milliseconds:Math.max(0,live),reason:'live'}):{milliseconds:Math.max(0,live),reason:'live'};
 }
 summary(){return{liveMilliseconds:this.elapsed(this.live),fireMilliseconds:this.elapsed(this.fire),liveLimitMs:this.live.limit,fireLimitMs:this.fire.limit};}
}
