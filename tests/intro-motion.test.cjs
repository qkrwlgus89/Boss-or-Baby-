// Execute the production animation/timing functions without WebGL or real timers.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../intro.js'),'utf8');
function functionSource(name,next){
  const start=source.indexOf(`  function ${name}(`),end=source.indexOf(next,start);
  assert.ok(start>=0&&end>start,`production function ${name} exists`);
  return source.slice(start,end);
}
function harness(reduce){
  const timers=[],events=[],cards=[],animated=[],elements=new Map();
  const context={
    // Also catches regressions which reintroduce the old branch in these functions.
    reduced:{matches:reduce},matchMedia:()=>({matches:reduce}),
    document:{hidden:false},active:true,busy:false,menuMode:false,menuBase:null,
    screenFocus:false,lookupPhase:'form',partyTime:0,partyClock:0,last:0,time:0,
    chapterTime:0,index:5,lineIndex:0,inspect:false,restEye:null,keys:{},motion:{},
    yaw:0,pitch:0,raf:0,scene:{},documentSurfaces:[],floaters:[],interactionObjects:{},
    actors:[{chapter:5,seed:2,mesh:{position:{z:-3}}}],
    CHAPTERS:Array.from({length:7},()=>({seated:false,bounds:[-2,2,2,5]})),
    camera:{position:{x:0,z:3.7},rotation:{set(){}},fov:65,updateProjectionMatrix(){}},
    renderer:{render(){}},
    THREE:{MathUtils:{lerp:(a,b,t)=>a+(b-a)*t,clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}},
    FPSMovement:{step:()=>({x:0,z:0})},animateBossMesh:(...args)=>animated.push(args),
    requestAnimationFrame:()=>1,updateDialogue(){},updateInteraction(){},
    paintLookup(){context.paints++;},paints:0,
    el(id){if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){},contains:()=>false}});return elements.get(id);},
    sound:true,OfficeAudio:{event:(name)=>events.push(name),burst:(n)=>events.push(`burst:${n}`)},
    setTimeout:(fn,delay)=>{timers.push({fn,delay});return timers.length;},
    clearAlerts(){},dropAlert:(...args)=>cards.push(args),floodTimers:[],FLOOD_GAP:430,
    FLOOD:{night:Array.from({length:8},(_,i)=>['팀장',`메시지 ${i}`,0])},
    openingDone:false,typedName:()=> '테스트사원',personalize:()=>true,EXAM_NO:'2026-0417',
    closeLookup(){context.screenFocus=false;},transitionTimer:0,
  };
  vm.createContext(context);
  vm.runInContext(functionSource('frame','  function dispose(')+
    functionSource('flood','  function toggleSound(')+
    functionSource('submitLookup',"  el('intro-entry').addEventListener"),context);
  return {context,timers,events,cards,animated};
}
for(const reduce of [false,true]){
  test(`story actors approach and animate with OS reduced motion ${reduce}`,()=>{
    const {context:c,animated}=harness(reduce);
    for(let n=1;n<=25;n++)c.frame(n*40);
    assert.ok(c.actors[0].mesh.position.z>-2.77);
    assert.equal(animated.length,25);
    assert.ok(animated.every(args=>args[2]===1.5));
  });
  test(`confetti clock and repaints continue with OS reduced motion ${reduce}`,()=>{
    const {context:c}=harness(reduce);c.lookupPhase='congrats';c.busy=true;
    for(let n=1;n<=25;n++)c.frame(n*40);
    assert.ok(c.partyTime>.99);assert.ok(c.paints>=10);
    c.document.hidden=true;const before=c.partyTime;c.frame(1040);
    assert.equal(c.partyTime,before,'hidden tabs still pause decorative drawing');
  });
  test(`messages keep separate arrival times and sounds with OS reduced motion ${reduce}`,()=>{
    const {context:c,timers,events,cards}=harness(reduce);c.flood('night');
    assert.equal(timers.length,8);
    timers.forEach(({delay},i)=>assert.ok(delay>=i*430&&delay<i*430+90));
    timers[0].fn();assert.equal(cards.length,1);
    for(const timer of timers.slice(1))timer.fn();
    assert.equal(cards.length,8);assert.equal(events.filter(e=>e==='message').length,8);
  });
  test(`result holds its normal duration with OS reduced motion ${reduce}`,()=>{
    const {context:c,timers,events}=harness(reduce);c.screenFocus=true;c.busy=true;c.submitLookup();
    assert.equal(c.lookupPhase,'checking');assert.equal(timers[0].delay,1200);
    timers[0].fn();assert.equal(c.lookupPhase,'congrats');assert.equal(timers[1].delay,2600);
    assert.ok(events.includes('promotion'));assert.ok(events.includes('burst:5'));
    timers[1].fn();assert.equal(c.openingDone,true);assert.equal(c.busy,false);
  });
}
test('OS motion preference cannot disable story or elevator CSS animations',()=>{
  for(const file of ['intro.js','intro.css','index.html']){
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),/prefers-reduced-motion|reduced\.matches/,file);
  }
});
