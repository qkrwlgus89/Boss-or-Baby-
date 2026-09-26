const test=require('node:test'),assert=require('node:assert/strict'),F=require('../floors.js');
test('two approvals board the cabin, then depart automatically after four seconds',()=>{
  const s=F.create(0),lift=F.ELEVATOR;
  assert.equal(F.interact(s,lift),null);
  for(const p of F.layout(0).stops)assert.equal(F.interact(s,p),'stamp');
  assert.equal(F.interact(s,lift),'called');
  assert.equal(F.interact(s,lift),null);
  F.tick(s,F.WAIT-.1);assert.equal(s.phase,'waiting');
  assert.equal(F.WAIT,4);assert.equal(F.tick(s,.1),'boarded');
  assert.equal(F.interact(s,{x:0,z:2}),null);
  assert.equal(F.interact(s,lift),null);
  assert.equal(F.tick(s,F.RIDE),'arrived');
});
test('cabin confinement blocks escape and jumping but allows looking and short movement',()=>{
  const s=F.create(0);assert.equal(F.confined(s),false);s.phase='waiting';assert.equal(F.confined(s),true);
  assert.deepEqual(F.confine({x:30,z:10,y:5}),{x:1,z:-53.8,y:1.65});
  assert.deepEqual(F.confine({x:-30,z:-70,y:-3}),{x:-1,z:-55,y:1.65});
  assert.deepEqual(F.confine({x:.5,z:-54.2,y:1.65}),{x:.5,z:-54.2,y:1.65});
});
test('camping adds pressure without Q and stops at four reinforcement waves',()=>{
  const s=F.create(0);assert.equal(F.tick(s,64),null);
  assert.equal(F.tick(s,1),'reinforce');
  for(let i=0;i<3;i++)assert.equal(F.tick(s,15),'reinforce');
  assert.equal(F.tick(s,120),null);assert.equal(s.reinforcements,4);
  assert.ok(3.9*F.pressure(s)>8.3,'eventually exceeds sprint speed without a Q call');
});
test('new floors reset objectives and local time, with distinct repeating routes',()=>{
  assert.equal(new Set(F.layouts.map(s=>JSON.stringify(s.blocks))).size,3);
  const s=F.create(4);assert.deepEqual(s.stamps,[false,false]);assert.equal(s.time,0);
  assert.equal(F.layout(4),F.layout(1));assert.ok(F.pressure(s)>F.pressure(F.create(0)));
});
test('remote or airborne interaction cannot collect approvals',()=>{
  const s=F.create(0),p=F.layout(0).stops[0];
  assert.equal(F.interact(s,{x:0,z:2.5}),null);
  assert.equal(F.interact(s,{...p,y:3}),null);
  assert.equal(F.interact(s,p),'stamp');assert.equal(F.interact(s,p),null);
});
