import {canPlayerOccupy,feetY,STANDING} from './movement.js';
import {recoveryDistance,isInsideExtraction} from './mission.js';
import CUSTODIAN from './custodian-layout.json';

// Separate from enemy navigation. Static reverse distance fields have no search
// truncation and never consult enemies or combat state. Segment/box distance
// checks sweep the actual .4 m cylinder, including rounded collision corners.
export class PlayerRoute {
  constructor(world,cores){
    this.world=world;this.step=.5;this.b=world.bounds;
    this.w=Math.floor((this.b.maxX-this.b.minX)/this.step)+1;
    this.h=Math.floor((this.b.maxZ-this.b.minZ)/this.step)+1;
    const n=this.w*this.h;this.open=new Uint8Array(n);this.edges=new Uint8Array(n);this.fields=new Map();this.queries=0;
    for(let i=0;i<n;i++){const p=this.point(i);this.open[i]=this.can(p)?1:0;}
    this.dirs=[1,-1,this.w,-this.w];
    for(let i=0;i<n;i++)if(this.open[i])for(const k of [0,2]){
      const j=i+this.dirs[k];if(j>=n||(k===0&&j%this.w===0)||!this.open[j])continue;
      if(this.clear(this.point(i),this.point(j))){this.edges[i]|=1<<k;this.edges[j]|=1<<(k+1);}
    }
    cores.forEach(c=>this.field(`core-${c.id}`,p=>recoveryDistance({...p,y:1.7},c.position)<=2.3));
    const [x,,z]=CUSTODIAN.origin;
    this.field('custodian',p=>Math.abs(p.x-x)<=2&&((p.z>=z+5&&p.z<=z+6)||(p.z<=z-4&&p.z>=z-5)));
    this.field('extraction',p=>isInsideExtraction({...p,y:1.7},world.playerSpawn)&&Math.abs(p.x)<5&&p.z>29&&p.z<36);
  }
  point(i){return {x:this.b.minX+(i%this.w)*this.step,z:this.b.minZ+Math.floor(i/this.w)*this.step};}
  can(p){return canPlayerOccupy(this.world,p.x,1.7,p.z,.4);}
  clear(a,b){
    if(!this.can(a)||!this.can(b))return false;
    const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
    const pointSegment=(x,z)=>{const t=length2?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/length2)):0;return (x-a.x-t*dx)**2+(z-a.z-t*dz)**2;};
    for(const box of this.world.colliders){
      if(box.max.y<=1e-6||box.min.y>=1.9-1e-6)continue;
      let lo=0,hi=1;
      for(const [v,d,min,max] of [[a.x,dx,box.min.x,box.max.x],[a.z,dz,box.min.z,box.max.z]]){
        if(Math.abs(d)<1e-12){if(v<min||v>max){lo=2;break;}}
        else{const t1=(min-v)/d,t2=(max-v)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
      }
      if(lo<=hi)return false;
      const endpoint=p=>(p.x-Math.max(box.min.x,Math.min(box.max.x,p.x)))**2+(p.z-Math.max(box.min.z,Math.min(box.max.z,p.z)))**2;
      const d=Math.min(endpoint(a),endpoint(b),pointSegment(box.min.x,box.min.z),pointSegment(box.min.x,box.max.z),pointSegment(box.max.x,box.min.z),pointSegment(box.max.x,box.max.z));
      if(d<.4*.4-1e-12)return false;
    }return true;
  }
  field(key,eligible){
    const distance=new Int32Array(this.open.length).fill(-1),next=new Int32Array(this.open.length).fill(-1),q=new Int32Array(this.open.length);let head=0,tail=0;
    for(let i=0;i<this.open.length;i++)if(this.open[i]&&eligible(this.point(i))){distance[i]=0;q[tail++]=i;}
    while(head<tail){const i=q[head++];for(let k=0;k<4;k++)if(this.edges[i]&(1<<k)){const j=i+this.dirs[k];if(distance[j]<0){distance[j]=distance[i]+1;next[j]=i;q[tail++]=j;}}}
    this.fields.set(key,{distance,next});
  }
  connection(p,field){
    if(!this.can(p))return -1;
    const x=Math.round((p.x-this.b.minX)/this.step),z=Math.round((p.z-this.b.minZ)/this.step);let best=-1,cost=Infinity;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const xx=x+dx,zz=z+dz;if(xx<0||xx>=this.w||zz<0||zz>=this.h)continue;
      const i=zz*this.w+xx;if(field.distance[i]<0)continue;const a=this.point(i),d=Math.hypot(a.x-p.x,a.z-p.z),c=d+field.distance[i]*this.step;
      if(d<=1&&c<cost&&this.clear(p,a)){best=i;cost=c;}
    }return best;
  }
  distance(p,key){const f=this.fields.get(key),i=f?this.connection(p,f):-1;return i<0?Infinity:f.distance[i]*this.step+Math.hypot(this.point(i).x-p.x,this.point(i).z-p.z);}
  path(p,key,grounded=true,profile=STANDING){
    this.queries++;if(!grounded||Math.abs(feetY(p,profile))>.025)return [];
    const f=this.fields.get(key);if(!f)return [];let i=this.connection(p,f);if(i<0)return [];
    const raw=[{x:p.x,z:p.z},this.point(i)];while(f.next[i]>=0){i=f.next[i];raw.push(this.point(i));}
    const out=[raw[0]];let at=0;
    while(at<raw.length-1){let end=at+1;for(let j=Math.min(at+24,raw.length-1);j>end;j--)if(this.clear(raw[at],raw[j])){end=j;break;}out.push(raw[end]);at=end;}
    return out;
  }
}
