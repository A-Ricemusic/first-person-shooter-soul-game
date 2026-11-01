// Cached static half-metre occupancy, with bounded A* queries. Grounded enemy
// radius matches combat collision; no searches run once per simulation substep.
export class StaticNavigation {
  constructor(canOccupy,bounds){
    this.step=.5;this.b=bounds;this.w=Math.round((bounds.maxX-bounds.minX)/this.step)+1;
    this.h=Math.round((bounds.maxZ-bounds.minZ)/this.step)+1;this.open=new Uint8Array(this.w*this.h);
    for(let z=0;z<this.h;z++)for(let x=0;x<this.w;x++)this.open[z*this.w+x]=canOccupy(bounds.minX+x*this.step,bounds.minZ+z*this.step,.55)?1:0;
    this.can=canOccupy;this.queries=0;this.maxExpanded=0;
  }
  point(i){return {x:this.b.minX+(i%this.w)*this.step,z:this.b.minZ+Math.floor(i/this.w)*this.step};}
  cell(p){return Math.round((p.z-this.b.minZ)/this.step)*this.w+Math.round((p.x-this.b.minX)/this.step);}
  clear(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);for(let i=0;i<=n;i++)if(!this.can(a.x+(b.x-a.x)*i/Math.max(1,n),a.z+(b.z-a.z)*i/Math.max(1,n),.55))return false;return true;}
  path(a,b){
    this.queries++;const start=this.cell(a),goal=this.cell(b),end=this.point(goal);
    if(!this.open[start]||!this.open[goal])return [];
    const costs=new Map([[start,0]]),prev=new Map(),heap=[];
    const score=i=>{const p=this.point(i);return Math.abs(p.x-end.x)+Math.abs(p.z-end.z);};
    const push=(i,f)=>{heap.push({i,f});let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p].f<=f)break;[heap[k],heap[p]]=[heap[p],heap[k]];k=p;}};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;while(true){let c=k*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[k].f<=heap[c].f)break;[heap[k],heap[c]]=[heap[c],heap[k]];k=c;}}return first.i;};
    push(start,score(start));const closed=new Set();let expanded=0;
    while(heap.length&&expanded<2400){const i=pop();if(closed.has(i))continue;closed.add(i);expanded++;
      if(i===goal){this.maxExpanded=Math.max(this.maxExpanded,expanded);const out=[];for(let c=i;c!==start;c=prev.get(c))out.push(this.point(c));return out.reverse();}
      const x=i%this.w,z=Math.floor(i/this.w);
      for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,j=nz*this.w+nx;if(nx<0||nx>=this.w||nz<0||nz>=this.h||!this.open[j]||closed.has(j))continue;const g=costs.get(i)+.5;if(g<(costs.get(j)??Infinity)){costs.set(j,g);prev.set(j,i);push(j,g+score(j));}}
    }this.maxExpanded=Math.max(this.maxExpanded,expanded);return [];
  }
  steer(enemy,goal,time){
    const p=enemy.group.position;
    // Visibility of the route is sampled at a bounded cadence, rather than
    // resweeping the whole arena segment on every 1/120 s combat substep.
    const refresh=time>=(enemy.navClearNext??0);
    if(refresh){enemy.navDirect=this.clear(p,goal);enemy.navClearNext=time+.15;}
    if(enemy.navDirect){enemy.navPath=null;return null;}
    if(time>=(enemy.navNext??0)){enemy.navPath=this.path(p,goal);enemy.navNext=time+.8;}
    const path=enemy.navPath||[];
    while(path.length&&Math.hypot(path[0].x-p.x,path[0].z-p.z)<.3)path.shift();
    // Only skip to a waypoint after swept footprint clearance, including corners.
    if(refresh)for(let i=Math.min(path.length-1,8);i>0;i--)if(this.clear(p,path[i])){path.splice(0,i);break;}
    return path[0]||null;
  }
}
