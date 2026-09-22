const test=require('node:test'),assert=require('node:assert/strict'),S=require('../summon.js');

const rooms=[{code:'01',x:6,z:-12,spots:[]},{code:'02',x:6,z:-36,spots:[]}];
const run=(s,seconds,minDist=Infinity,step=1/60)=>{for(let t=0;t<seconds;t+=step)S.gain(s,step,minDist);};
const charged=()=>{const s=S.create();run(s,60);return s;};
const walk=(s,seconds=14,step=.1)=>{const seen=[];let entered;
  for(let t=0;t<seconds;t+=step)if((entered=S.advance(s,step,false)))seen.push(entered);
  return seen;};

test('gauge starts partly charged, fills faster under pressure, and stops while active',()=>{
  const calm=S.create(),panic=S.create();
  assert.equal(calm.charge,S.START);
  run(calm,5);run(panic,5,1.5);
  assert.ok(panic.charge>calm.charge,'a nearby boss must charge the ultimate faster');
  assert.ok(calm.charge<1 && panic.charge<1,'five seconds is never enough for a full bar');
  const full=charged();
  assert.equal(full.charge,1,'the gauge tops out at one');
  assert.ok(S.ready(full));
  S.start(full,'five',rooms[0]);
  assert.equal(full.charge,0,'firing spends the whole gauge');
  run(full,10,1);
  assert.equal(full.charge,0,'the gauge does not refill during the summon');
});

test('the ultimate cannot fire until the gauge is full',()=>{
  const s=S.create();
  assert.equal(S.start(s,'five',rooms[0]),false);
  assert.equal(s.phase,'idle');
  run(s,60);
  assert.equal(S.start(s,'five',rooms[0]),true);
  assert.equal(S.start(s,'five',rooms[1]),false,'no second call while one is running');
  assert.equal(s.room,rooms[0]);
  assert.equal(s.uses,1);
});

test('rage compounds with every call, never expires, and is capped',()=>{
  const once=S.rage(1);
  assert.equal(once,S.RAGE_SPEED);
  assert.ok(S.rage(once)>once,'a second call must make them faster again');
  let m=1;for(let i=0;i<20;i++)m=S.rage(m);
  assert.equal(m,S.RAGE_CAP,'the multiplier stops at the cap instead of running away');
  assert.equal(S.rage(undefined),S.RAGE_SPEED,'an unraged boss starts from 1');
});

test('the room you are facing is the room they are called to',()=>{
  const origin={x:0,z:-24};
  assert.equal(S.aimRoom(rooms,origin,{x:0,z:1}).code,'01','looking back up the aisle picks the near room');
  assert.equal(S.aimRoom(rooms,origin,{x:0,z:-1}).code,'02','looking down the aisle picks the far room');
  assert.equal(S.aimRoom(rooms,{x:0,z:-13},{x:1,z:0}).code,'01','facing sideways falls back to the closer room');
  assert.equal(S.aimRoom([],origin,{x:0,z:-1}),null);
});

test('the 사장님 flees toward the end of the floor the toddler is furthest from',()=>{
  const exits=[{x:0,z:4.6},{x:0,z:-53}];
  assert.equal(S.fleeTarget({x:0,z:-48},exits).z,4.6,'cornered at the far end, he runs for the lobby');
  assert.equal(S.fleeTarget({x:0,z:2},exits).z,-53,'caught by the entrance, he runs for the exit');
});

test('five mode walks arrive, gather and meeting, then hands control back',()=>{
  const s=charged();S.start(s,'five',rooms[0]);
  assert.equal(s.phase,'arrive');
  assert.equal(S.advance(s,.4,false),null,'a phase does not end early on its own');
  assert.equal(S.advance(s,.5,false),'gather');
  assert.equal(S.advance(s,.9,true),'meeting','everyone in place ends the walk early');
  assert.equal(S.advance(s,S.TIMING.five.meeting,false),'idle');
  assert.equal(s.room,null,'the room is released when the meeting breaks up');
  assert.equal(S.advance(s,1,false),null,'idle stays idle');
});

test('gather cannot end early before its minimum, and ends on time if they are slow',()=>{
  const early=charged();S.start(early,'five',rooms[0]);S.advance(early,S.TIMING.five.arrive,false);
  assert.equal(S.advance(early,.5,true),null,'settled too soon still waits out the minimum');
  const slow=charged();S.start(slow,'five',rooms[0]);S.advance(slow,S.TIMING.five.arrive,false);
  assert.equal(S.advance(slow,S.TIMING.five.gather,false),'meeting','stragglers do not stall the ultimate');
});

test('baby mode runs its own two-beat sequence, not the meeting one',()=>{
  const baby=charged();S.start(baby,'baby',null);
  assert.equal(baby.phase,'arrive');
  assert.deepEqual(walk(baby),['tantrum','idle']);
  const five=charged();S.start(five,'five',rooms[0]);
  assert.deepEqual(walk(five),['gather','meeting','idle']);
  const settling=charged();S.start(settling,'baby',null);S.advance(settling,S.TIMING.baby.arrive,false);
  assert.equal(S.advance(settling,.9,true),null,'settling means nothing to a five-year-old');
});

test('an unknown mode falls back to the meeting sequence rather than stalling',()=>{
  const s=charged();
  assert.equal(S.start(s,'nonsense',rooms[0]),true);
  assert.equal(s.mode,'five');
  assert.deepEqual(walk(s),['gather','meeting','idle']);
});

test('every pursuer gets its own standing spot, nearest first',()=>{
  const spots=[{x:0,z:0},{x:0,z:2},{x:0,z:4}];
  const picked=S.assign(spots,[{x:0,z:3.9},{x:0,z:.1},{x:0,z:1.9}]);
  assert.deepEqual(picked,[spots[2],spots[0],spots[1]]);
  assert.equal(new Set(picked).size,3,'no two bosses share a spot');
  const crowded=S.assign(spots,[{x:0,z:0},{x:0,z:0},{x:0,z:0},{x:0,z:0}]);
  assert.equal(crowded.length,4,'more bosses than spots still returns a spot each');
});
