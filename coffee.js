/* Directional splash targeting, independent of rendering and frame rate. */
(function(root){
  const RANGE=4.8,STUN=3,COOLDOWN=5.5;
  function blocked(a,b,colliders){
    for(const c of colliders){let lo=0,hi=1;
      for(const [s,d,min,max] of [[a.x,b.x-a.x,c.minX,c.maxX],[a.y,b.y-a.y,c.minY??0,c.topY??Infinity],[a.z,b.z-a.z,c.minZ,c.maxZ]]){
        if(Math.abs(d)<1e-9){if(s<min||s>max){lo=2;break;}}
        else{let a=(min-s)/d,b=(max-s)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}
      }if(lo<=hi)return true;
    }return false;
  }
  function targets(origin,direction,bosses,colliders){
    return bosses.filter(b=>{const dx=b.x-origin.x,dy=b.y-origin.y,dz=b.z-origin.z,d=Math.hypot(dx,dy,dz);return d<RANGE && d>.001 && (dx*direction.x+dy*direction.y+dz*direction.z)/d>.76 && !blocked(origin,b,colliders);});
  }
  root.CoffeeAbility={targets,blocked,RANGE,STUN,COOLDOWN};if(typeof module!=='undefined')module.exports=root.CoffeeAbility;
})(typeof globalThis!=='undefined'?globalThis:this);
