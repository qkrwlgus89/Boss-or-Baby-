const test=require('node:test');
const assert=require('node:assert/strict');
const {create,clearSegment}=require('../navigation.js');
const bounds={minX:-6,maxX:6,minZ:-6,maxZ:6};
function chase(nav,start,target,limit=1600){
  nav.update(target);let p={...start};
  for(let i=0;i<limit;i++){
    const w=nav.waypoint(p,target),d=Math.hypot(w.x-p.x,w.z-p.z),s=Math.min(.06,d);
    const next={x:p.x+(w.x-p.x)/(d||1)*s,z:p.z+(w.z-p.z)/(d||1)*s};
    assert.ok(nav.clear(p,next),'every pursuit segment respects collision radius');p=next;
    if(Math.hypot(target.x-p.x,target.z-p.z)<.7)return p;
  }
  assert.fail('pursuer stalled');
}
test('finds an entrance around a U-shaped meeting room',()=>{
  const walls=[{minX:-2,maxX:-1.9,minZ:-2,maxZ:2},{minX:1.9,maxX:2,minZ:-2,maxZ:2},{minX:-2,maxX:2,minZ:-2,maxZ:-1.9}];
  chase(create(bounds,walls),{x:0,z:-4},{x:0,z:0});
});
test('does not cut diagonally through thin walls or furniture corners',()=>{
  assert.equal(clearSegment({x:-1,z:-1},{x:1,z:1},[{minX:0,maxX:.01,minZ:-2,maxZ:2}],.4),false);
  const desk=[{minX:-1,maxX:1,minZ:-1,maxZ:1}];chase(create(bounds,desk),{x:-3,z:0},{x:3,z:0});
});
test('rebuilds pursuit field when player changes rooms; unreachable goals remain safe',()=>{
  const wall=[{minX:-.1,maxX:.1,minZ:-6,maxZ:6}],nav=create(bounds,wall);
  nav.update({x:3,z:0});const from={x:-3,z:0};assert.deepEqual(nav.waypoint(from,{x:3,z:0}),from);
  chase(nav,from,{x:-2,z:3});
});
test('target leaning against furniture still has a reachable goal cell',()=>{
  const nav=create(bounds,[{minX:-1,maxX:1,minZ:-1,maxZ:1}]);nav.update({x:1.33,z:0});
  const p=nav.waypoint({x:-3,z:0},{x:1.33,z:0});assert.ok(Math.hypot(p.x+3,p.z)>.1);
});
test('line of sight catches 4cm glass between the former 20cm ability samples',()=>{
  const glass=[{minX:2.48,maxX:2.52,minZ:-16.5,maxZ:-9.5}];
  assert.equal(clearSegment({x:2.16,z:-12},{x:2.95,z:-12},glass,0),false);
  assert.equal(clearSegment({x:2.16,z:-8},{x:2.95,z:-8},glass,0),true);
});
