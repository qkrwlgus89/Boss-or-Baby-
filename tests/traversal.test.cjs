const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const movement=require('../traversal.js');
function fixture(colliders){const c=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../world.js'),'utf8')+';globalThis.world=WORLD',c);c.world.colliders=colliders;c.world.bounds={minX:-8,maxX:8,minZ:-8,maxZ:8};return c.resolveCollision;}
const desk={minX:-1,maxX:1,minZ:-.4,maxZ:.4,topY:.8,walkable:true};
const initial=()=>({x:0,z:1,y:1.65,velocity:0,grounded:true});
test('walking is blocked by desk, jumping clears side and lands on its top',()=>{
 const resolve=fixture([desk]),b=initial();for(let i=0;i<40;i++)movement.step(b,{x:0,z:-.04},false,1/60,[desk],resolve);assert.ok(b.z>=.719);
 for(let i=0;i<90;i++)movement.step(b,{x:0,z:i>8&&i<25?-.045:0},i===0,1/60,[desk],resolve);
 assert.ok(Math.abs(b.y-2.45)<.01);assert.equal(b.grounded,true);assert.ok(Math.abs(b.z)<.4);
});
test('walking off a desktop falls to floor and allows another jump',()=>{
 const b={x:0,z:0,y:2.45,velocity:0,grounded:true},resolve=fixture([desk]);for(let i=0;i<100;i++)movement.step(b,{x:.035,z:0},false,1/60,[desk],resolve);
 assert.equal(b.y,1.65);assert.equal(b.grounded,true);movement.step(b,{x:0,z:0},true,1/60,[desk],resolve);assert.ok(b.y>1.65);
});
test('jump cannot pass glass or perform a second jump midair',()=>{
 const wall={minX:-1,maxX:1,minZ:-.04,maxZ:.04,topY:3.2,walkable:false},b=initial(),resolve=fixture([wall]);let max=0;
 for(let i=0;i<120;i++){movement.step(b,{x:0,z:-.04},true,1/60,[wall],resolve);max=Math.max(max,b.y);assert.ok(b.z>=.359);}
 assert.ok(max<3.05);
});
