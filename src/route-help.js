// Simulation time only. Progress is measured after collision resolution.
export class RouteHelp {
  constructor(){this.reset();}
  reset(){this.clearInput();this.remaining=0;this.cooldown=0;this.goal=null;}
  clearInput(){this.stalled=0;this.sampleTime=0;this.sampleIntended=0;this.sampleProgress=0;}
  tick(dt,{eligible,intended,progress,goal}){
    this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);
    if(!eligible||intended<=0){this.clearInput();return;}
    // Collision can admit tiny advances in a frame's short final substep.
    // Assess actual progress over a short simulation window, not each substep.
    this.sampleTime+=dt;this.sampleIntended+=intended;this.sampleProgress+=progress;
    if(this.sampleTime<.1-1e-9)return;
    this.stalled=this.sampleProgress+1e-9>=this.sampleIntended*.2?0:this.stalled+this.sampleTime;
    this.sampleTime=0;this.sampleIntended=0;this.sampleProgress=0;
    if(this.stalled>=.6-1e-9&&this.cooldown<=0&&this.remaining<=0){this.remaining=4;this.cooldown=6;this.goal=goal;this.stalled=0;}
  }
}
