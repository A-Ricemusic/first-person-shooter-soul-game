// Simulation-owned admission only: never cancels actions or freezes actors/hazards.
// A reservation lasts at most 2s (longest ordinary windup is 1.6s).
// Lost eligibility or expiry gives patrols 2s before another priority request.
export class AttackCoordinator {
  constructor(){this.reset();}
  reset(){this.pending=false;this.lease=0;this.retry=0;this.recovery=0;}
  advance(dt,{alive,charging,ready}){
    if(!alive){this.reset();return false;}
    const recovering=this.recovery>0, retrying=this.retry>0;
    this.recovery=Math.max(0,this.recovery-dt);
    this.retry=Math.max(0,this.retry-dt);
    if(charging)return true;
    if(this.pending){
      this.lease-=dt;
      if(!ready||this.lease<=0){this.pending=false;this.lease=0;this.retry=2;return recovering;}
      return true;
    }
    // Boundary ticks retain the previous block/retry for their full interval.
    if(recovering)return true;
    if(ready&&!retrying){this.pending=true;this.lease=2;return true;}
    return false;
  }
  start(){this.pending=false;this.lease=0;}
  resolve(){this.start();this.recovery=.8;}
}
