const test=require('node:test'),assert=require('node:assert/strict'),S=require('../summon.js');

const rooms=[{code:'01',x:6,z:-12,spots:[]},{code:'02',x:6,z:-36,spots:[]}];
const run=(s,seconds,minDist=Infinity,step=1/60)=>{for(let t=0;t<seconds;t+=step)S.gain(s,step,minDist);};
const charged=()=>{const s=S.create();run(s,60);return s;};

test('gauge starts partly charged, fills faster under pressure, and stops while active',()=>{
  const calm=S.create(),panic=S.create();
  assert.equal(calm.charge,S.START);
  run(calm,5);run(panic,5,1.5);
  assert.ok(panic.charge>calm.charge,'a nearby boss must charge the ultimate faster');
  assert.ok(calm.charge<1 && panic.charge<1,'five seconds is never enough for a full bar');
  const full=charged();
  assert.equal(full.charge,1,'the gauge tops out at one');
  assert.ok(S.ready(full));
  S.start(full,rooms[0]);
  assert.equal(full.charge,0,'using it empties the gauge');
  run(full,10,1);
  assert.equal(full.charge,0,'the gauge does not refill during the summon');
});

test('the ultimate cannot fire until the gauge is full',()=>{
  const s=S.create();
  assert.equal(S.start(s,rooms[0]),false);
  assert.equal(s.phase,'idle');
  run(s,60);
  assert.equal(S.start(s,rooms[0]),true);
  assert.equal(S.start(s,rooms[1]),false,'no second call while one is running');
  assert.equal(s.room,rooms[0]);
  assert.equal(s.uses,1);
});

test('the room you are facing is the room they are called to',()=>{
  const origin={x:0,z:-24};
  assert.equal(S.aimRoom(rooms,origin,{x:0,z:1}).code,'01','looking back up the aisle picks the near room');
  assert.equal(S.aimRoom(rooms,origin,{x:0,z:-1}).code,'02','looking down the aisle picks the far room');
  assert.equal(S.aimRoom(rooms,{x:0,z:-13},{x:1,z:0}).code,'01','facing sideways falls back to the closer room');
  assert.equal(S.aimRoom([],origin,{x:0,z:-1}),null);
});

test('the summon walks arrive, gather and meeting, then hands control back',()=>{
  const s=charged();S.start(s,rooms[0]);
  assert.equal(s.phase,'arrive');
  assert.equal(S.advance(s,.4,false),null,'a phase does not end early on its own');
  assert.equal(S.advance(s,.5,false),'gather');
  assert.equal(S.advance(s,.9,true),'meeting','everyone in place ends the walk early');
  assert.equal(S.advance(s,S.TIMING.meeting,false),'idle');
  assert.equal(s.room,null,'the room is released when the meeting breaks up');
  assert.equal(S.advance(s,1,false),null,'idle stays idle');
});

test('gather cannot end early before its minimum, and ends on time if they are slow',()=>{
  const early=charged();S.start(early,rooms[0]);S.advance(early,S.TIMING.arrive,false);
  assert.equal(S.advance(early,.5,true),null,'settled too soon still waits out the minimum');
  const slow=charged();S.start(slow,rooms[0]);S.advance(slow,S.TIMING.arrive,false);
  assert.equal(S.advance(slow,S.TIMING.gather,false),'meeting','stragglers do not stall the ultimate');
});

test('one lone pursuer runs the identical sequence, with no mode branch',()=>{
  const solo=charged(),crowd=charged();
  S.start(solo,rooms[1]);S.start(crowd,rooms[1]);
  const walk=s=>{const seen=[];let step;
    for(let t=0;t<12;t+=.1)if((step=S.advance(s,.1,false)))seen.push(step);
    return seen;};
  const soloSteps=walk(solo),crowdSteps=walk(crowd);
  assert.deepEqual(soloSteps,['gather','meeting','idle']);
  assert.deepEqual(soloSteps,crowdSteps,'every map and mode shares one timeline');
});

test('every pursuer gets its own standing spot, nearest first',()=>{
  const spots=[{x:0,z:0},{x:0,z:2},{x:0,z:4}];
  const picked=S.assign(spots,[{x:0,z:3.9},{x:0,z:.1},{x:0,z:1.9}]);
  assert.deepEqual(picked,[spots[2],spots[0],spots[1]]);
  assert.equal(new Set(picked).size,3,'no two bosses share a spot');
  const crowded=S.assign(spots,[{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0}]);
  assert.equal(crowded.length,4,'more bosses than spots still returns a spot each');
});
