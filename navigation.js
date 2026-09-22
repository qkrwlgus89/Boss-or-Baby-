/* Shared reverse navigation field: one search for every pursuer, built from the
   same office colliders as the player. No diagonal corner cutting. */
(function(root){
  'use strict';
  function clearSegment(a,b,colliders,r=0){
    for(const c of colliders){
      let lo=0,hi=1;
      for(const [start,delta,min,max] of [[a.x,b.x-a.x,c.minX-r,c.maxX+r],[a.z,b.z-a.z,c.minZ-r,c.maxZ+r]]){
        if(Math.abs(delta)<1e-10){if(start<min || start>max){lo=2;break;}}
        else {let t0=(min-start)/delta,t1=(max-start)/delta;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);}
      }
      if(lo<=hi)return false;
    }
    return true;
  }
  function create(bounds,colliders,radius=.42,cell=.45){
    const minX=bounds.minX+radius,minZ=bounds.minZ+radius;
    const width=Math.floor((bounds.maxX-radius-minX)/cell)+1,height=Math.floor((bounds.maxZ-radius-minZ)/cell)+1,count=width*height;
    const points=Array.from({length:count},(_,i)=>({x:minX+(i%width)*cell,z:minZ+Math.floor(i/width)*cell}));
    const free=points.map(p=>clearSegment(p,p,colliders,radius)),edges=Array.from({length:count},()=>[]);
    for(let i=0;i<count;i++)if(free[i])for(const j of [i%width<width-1?i+1:-1,i+width<count?i+width:-1]){
      if(j>=0 && free[j] && clearSegment(points[i],points[j],colliders,radius)){edges[i].push(j);edges[j].push(i);}
    }
    const next=new Int32Array(count),distance=new Int32Array(count),queue=new Int32Array(count);
    let goal=-1;
    function nearest(p,clearance=radius){
      const gx=Math.round((p.x-minX)/cell),gz=Math.round((p.z-minZ)/cell);let best=-1,bestD=Infinity;
      for(let z=Math.max(0,gz-4);z<=Math.min(height-1,gz+4);z++)for(let x=Math.max(0,gx-4);x<=Math.min(width-1,gx+4);x++){
        const i=z*width+x,d=(points[i].x-p.x)**2+(points[i].z-p.z)**2;
        if(free[i] && d<bestD && clearSegment(p,points[i],colliders,clearance)){best=i;bestD=d;}
      }
      return best;
    }
    function update(target){
      const dest=nearest(target,Math.min(radius,.30));if(dest===goal)return;goal=dest;next.fill(-1);distance.fill(-1);if(dest<0)return;
      let head=0,tail=0;queue[tail++]=dest;distance[dest]=0;
      while(head<tail){const i=queue[head++];for(const j of edges[i])if(distance[j]<0){distance[j]=distance[i]+1;next[j]=i;queue[tail++]=j;}}
    }
    function waypoint(position,target){
      if(clearSegment(position,target,colliders,radius))return target;
      let i=nearest(position);if(i<0 || distance[i]<0)return position;
      let result=points[i];
      // Look ahead along the field to take smooth, collision-free shortcuts.
      for(let k=0;k<18 && next[i]>=0;k++){
        i=next[i];if(!clearSegment(position,points[i],colliders,radius))break;result=points[i];
      }
      return result;
    }
    return {update,waypoint,clear:(a,b,r=radius)=>clearSegment(a,b,colliders,r),stats:{cells:count,walkable:free.filter(Boolean).length}};
  }
  const api={create,clearSegment};root.OfficeNavigation=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
