const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const { FPSMovement:M } = require('../movement.js');
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
test('forward, backward and strafing follow all four camera headings',()=>{
  const cases=[[0,0,-1,1,0],[Math.PI/2,-1,0,0,-1],[Math.PI,0,1,-1,0],[-Math.PI/2,1,0,0,1]];
  for(const [yaw,fx,fz,rx,rz] of cases){
    for(const [input,ex,ez] of [[{forward:1},fx,fz],[{forward:-1},-fx,-fz],[{right:1},rx,rz],[{right:-1},-rx,-rz]]){
      const d=M.step(M.create(),input,yaw,1/60), len=Math.hypot(d.x,d.z);
      near(d.x/len,ex);near(d.z/len,ez);
    }
  }
});
test('180 degree turn follows new view immediately, even at full speed',()=>{
  const s=M.create();for(let i=0;i<60;i++)M.step(s,{forward:1},0,1/60);
  const d=M.step(s,{forward:1},Math.PI,1/60);assert.ok(d.z>0);near(d.x,0);
});
test('diagonal travel equals straight travel; 30/60/144 Hz travel agrees',()=>{
  function simulate(fps,input){const s=M.create();let x=0,z=0;for(let i=0;i<fps;i++){const d=M.step(s,input,0,1/fps);x+=d.x;z+=d.z;}return Math.hypot(x,z);}
  near(simulate(60,{forward:1}),simulate(60,{forward:1,right:1}));
  near(simulate(30,{forward:1}),simulate(144,{forward:1}));
});
test('release brakes quickly, stationary sprint does not drain, exhaustion has hysteresis',()=>{
  const s=M.create();M.step(s,{sprint:true},0,1);near(s.stamina,1);
  for(let i=0;i<60;i++)M.step(s,{forward:1},0,1/60);
  M.step(s,{},0,0.15);assert.ok(s.forward<0.05);
  const exhausted=M.create();exhausted.stamina=0.001;
  M.step(exhausted,{forward:1,sprint:true},0,1/60);assert.equal(exhausted.exhausted,true);
  for(let i=0;i<60;i++){M.step(exhausted,{forward:1,sprint:true},0,1/60);assert.equal(exhausted.sprinting,false);}
});
const context=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../world.js'),'utf8')+';globalThis.world=WORLD',context);
test('collision pushes interior points out, slides on walls, honors radius at bounds',()=>{
  context.world.bounds={minX:-10,maxX:10,minZ:-10,maxZ:10};
  context.world.colliders=[{minX:0,maxX:1,minZ:-5,maxZ:5}];
  const inside=context.resolveCollision(0.5,0,0.32);assert.ok(inside.x<=-0.32 || inside.x>=1.32);
  let x=-0.4,z=0;for(let i=0;i<60;i++){({x,z}=context.resolveCollision(x+0.05,z-0.05,0.32));}
  assert.ok(x<=-0.319);near(z,-3);
  near(context.resolveCollision(20,20,0.7).x,9.3);
});
