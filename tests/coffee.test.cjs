const test=require('node:test'),assert=require('node:assert/strict'),C=require('../coffee.js');
const origin={x:0,y:1.47,z:0},forward={x:0,y:0,z:-1};
test('splash hits forward adult/child, misses behind, side and out of range',()=>{
 const bosses=[{id:'adult',x:0,y:1.1,z:-3},{id:'child',x:.3,y:.65,z:-3},{id:'behind',x:0,y:1,z:2},{id:'side',x:3,y:1,z:0},{id:'far',x:0,y:1,z:-7}];assert.deepEqual(C.targets(origin,forward,bosses,[]).map(b=>b.id),['adult','child']);
});
test('thin glass blocks coffee but desk below its arc does not',()=>{
 const boss={x:0,y:1.1,z:-3},glass={minX:-2,maxX:2,minZ:-1.02,maxZ:-.98,topY:3.2};
 assert.equal(C.targets(origin,forward,[boss],[glass]).length,0);assert.equal(C.targets(origin,forward,[boss],[{...glass,topY:.8}]).length,1);
});
