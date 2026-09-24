const test=require('node:test'),assert=require('node:assert/strict'),R=require('../rank.js');
const S=require('../summon.js');

const hold=(state,seconds,step=1/60)=>{for(let t=0;t<seconds;t+=step)R.gain(state,step);};

test('a run starts at the bottom with nothing banked',()=>{
  const s=R.create();
  assert.equal(s.level,0);
  assert.equal(s.score,0);
  assert.equal(R.title(0),'사원');
  assert.equal(R.chasers(0),R.START_CHASERS);
});

test('titles climb and then stop renaming, but the level keeps counting',()=>{
  assert.deepEqual([0,1,2,3].map(R.title),['사원','대리','과장','차장']);
  assert.equal(R.title(R.TITLES.length-1),'회장');
  assert.equal(R.title(99),'회장','an absurd run keeps the last title rather than crashing');
  assert.equal(R.title(-3),'사원');
  assert.equal(R.chasers(99),R.START_CHASERS+99,'the floor keeps filling even past the last title');
});

test('climbing beats camping: a promotion pays for itself many times over',()=>{
  const camper=R.create(),climber=R.create();
  hold(camper,120);                                  // two minutes as 사원
  for(let i=0;i<3;i++){R.promote(climber,0);hold(climber,20);}   // one minute, three ranks
  assert.ok(climber.score>camper.score,
    'sixty seconds of climbing must outscore two minutes of hiding');
  assert.ok(climber.score>camper.score*3,'and not just barely');
});

test('each promotion raises the rate steeply, never linearly',()=>{
  const steps=[0,1,2,3,4].map(R.rate);
  for(let i=1;i<steps.length;i++){
    assert.ok(steps[i]>steps[i-1],'every rank pays better than the one below');
    if(i>1)assert.ok(steps[i]-steps[i-1]>steps[i-1]-steps[i-2],'and the gaps widen');
  }
  assert.equal(R.rate(0),R.BASE_RATE);
});

test('promotion records when it happened and adds a pursuer',()=>{
  const s=R.create();
  assert.equal(R.promote(s,12.5),1);
  assert.equal(R.chasers(s.level),R.START_CHASERS+1);
  assert.deepEqual(s.promotedAt,[0,12.5]);
});

test('the time ramp is uncapped, so a run that never promotes still ends',()=>{
  assert.equal(R.ramp(0),1);
  assert.ok(R.ramp(R.RAMP_SECONDS)===2);
  assert.ok(R.ramp(600)>R.ramp(300),'it never plateaus');
  assert.equal(R.ramp(-5),1,'a clock glitch cannot make them slower than base');
  // A pursuer at 3.0 base has to out-run a 5.6 walk eventually, with no promotions at all.
  const walk=5.6;
  let t=0; while(3.0*R.ramp(t)<walk && t<2000) t+=1;
  assert.ok(t<600,'a camper is caught inside ten minutes even at rank zero');
});

test('the leaderboard sorts by rank first and score second',()=>{
  const rows=[{level:1,score:9000},{level:3,score:100},{level:1,score:50}];
  rows.sort(R.compare);
  assert.deepEqual(rows.map(r=>r.level),[3,1,1]);
  assert.deepEqual(rows.map(r=>r.score),[100,9000,50],'rank outranks raw points');
});

test('endless promotions compound without the timed modes’ ceiling',()=>{
  let m=1;
  for(let i=0;i<8;i++)m=S.rage(m,R.PROMOTION_SPEED,Infinity);
  assert.ok(m>S.RAGE_CAP,'endless must be able to pass the timed-mode cap');
  // The timed modes keep their ceiling.
  let capped=1;
  for(let i=0;i<8;i++)capped=S.rage(capped);
  assert.equal(capped,S.RAGE_CAP);
});
