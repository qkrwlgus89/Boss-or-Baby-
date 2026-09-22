/* Height-aware character movement. Feet land on furniture tops; walls stay solid. */
(function(root){
  const EYE=1.65,RADIUS=.32,GRAVITY=15,JUMP=6.45;
  function support(x,z,colliders,below=Infinity){
    let top=0;
    for(const c of colliders)if(c.walkable && c.topY<=below+.001 && x>=c.minX-.10 && x<=c.maxX+.10 && z>=c.minZ-.10 && z<=c.maxZ+.10)top=Math.max(top,c.topY);
    return top;
  }
  function step(body,delta,jump,dt,colliders,resolve){
    let feet=body.y-EYE;
    const base=support(body.x,body.z,colliders,feet+.03);
    if(body.grounded && Math.abs(feet-base)>.04)body.grounded=false;
    if(jump && body.grounded){body.velocity=JUMP;body.grounded=false;}
    const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.10),Math.ceil(dt/.012));
    for(let i=0;i<steps;i++){
      const h=dt/steps,old=feet;
      if(!body.grounded){feet+=body.velocity*h-.5*GRAVITY*h*h;body.velocity-=GRAVITY*h;}
      // Ceiling clearance leaves room for the player's head above eye height.
      if(feet>1.55){feet=1.55;body.velocity=Math.min(0,body.velocity);}
      const p=resolve(body.x+delta.x/steps,body.z+delta.z/steps,RADIUS,Math.max(old,feet));body.x=p.x;body.z=p.z;
      const floor=support(body.x,body.z,colliders,Math.max(old,feet)+.025);
      if(body.velocity<=0 && feet<=floor+.002 && old>=floor-.03){feet=floor;body.velocity=0;body.grounded=true;}
      else if(body.grounded && feet>floor+.03){body.grounded=false;}
    }
    body.y=feet+EYE;return body;
  }
  root.OfficeTraversal={step,support,EYE,JUMP,GRAVITY};
  if(typeof module!=='undefined')module.exports=root.OfficeTraversal;
})(typeof globalThis!=='undefined'?globalThis:this);
