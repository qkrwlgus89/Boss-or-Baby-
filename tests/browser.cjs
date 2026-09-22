/* Optional integration QA. npm install --prefix /tmp/boss-baby-qa playwright
   NODE_PATH=/tmp/boss-baby-qa/node_modules node tests/browser.cjs [visual|full]
   Run a static server on :8080 first. No test hooks are shipped to the game. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=process.env.QA_OUTPUT || '/private/tmp/boss-baby-qa';
fs.mkdirSync(output,{recursive:true});
const mode=process.argv[2]||'visual';
const full=mode.startsWith('full')||mode==='revision',gallery=mode.includes('gallery')||mode==='revision';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:process.env.QA_SOFTWARE?['--use-gl=angle','--use-angle=swiftshader']:[]});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],badResponses=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push([r.status(),r.url()]);});
 // In-memory instrumentation only: exercises production functions without adding a debug API.
 await page.route('**/game3d.js',async route=>{
  const response=await route.fetch();let body=await response.text();
  body=body.replace(/\}\)\(\);\s*$/,`window.__qa={snapshot:()=>({player:{...playerRig},yaw,pitch,elapsedGame,mouseLocked,gameActive,keys:{...keys},coffeeCooldown,coffeeAnim,grounded:isGrounded,stamina:motion.stamina,summon:{charge:summon.charge,phase:summon.phase,mode:summon.mode,uses:summon.uses,room:summon.room?summon.room.code:null,doors:summonDoors.length,chief:chief?{x:chief.mesh.position.x,z:chief.mesh.position.z}:null},bosses:bosses.map(b=>({x:b.mesh.position.x,z:b.mesh.position.z,stun:b.stun,rageMult:b.rageMult,spot:b.spot})),render:renderer?.info.render,memory:renderer?.info.memory}),scene:()=>scene,camera:()=>camera,preview:()=>custMesh,avatars:()=>state.fiveAvatars,nav:()=>navigation,rooms:()=>WORLD.meetingRooms,place:(x,z,y=PLAYER_HEIGHT)=>{playerRig.x=x;playerRig.z=z;playerRig.y=y;verticalVelocity=0;isGrounded=true;motion=FPSMovement.create();},aim:(y,p=0)=>{yaw=y;pitch=p;camera.rotation.set(p,y,0,"YXZ");camera.updateMatrixWorld();},boss:(i,x,z)=>bosses[i].mesh.position.set(x,0,z),step:(dt)=>{updatePlayerMovement(dt);updateSummon(dt,Infinity,0);updateCoffee(dt);return updateBosses(dt,0);},ready:()=>{coffeeCooldown=0;coffeeQueued=false;summon.charge=1;bosses.forEach(b=>{b.stun=0;b.rageMult=1;});},charge:(v)=>{summon.charge=v;},say:(i,t)=>spawnSpeechBubble(bosses[i],t),hush:()=>clearChatter(),calm:()=>{bosses.forEach(b=>{b.stun=0;b.rageMult=1;});},time:(ms)=>{elapsedGame=ms;}};})();`);
  await route.fulfill({response,body});
 });
 async function lock(){await page.locator('#pointer-hint').click();await page.waitForFunction(()=>__qa.snapshot().mouseLocked && __qa.snapshot().elapsedGame>0);}
 await page.goto('http://127.0.0.1:8080');await page.locator('#btn-go-select').click();await page.locator('#card-five').click();
 async function option(cat,val){await page.locator(`[data-cat="${cat}"]`).click();await page.locator(`[data-val="${val}"]`).click();}
 await option('hair','comb');await option('outfit','suit');await option('face','smug');await option('skin','fair');await option('prop','paper');
 await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'adult-final.png')});
 if(full || gallery){
  let selections=0;
  for(const baby of [false,true]){
   if(baby){await page.locator('#btn-cust-back').click();await page.locator('#card-baby').click();}
   for(const cat of (baby?['identity','hair','face','prop','skin']:['identity','hair','outfit','face','prop','skin'])){
    await page.locator(`[data-cat="${cat}"]`).click();
    const values=await page.locator('[data-val]').evaluateAll(nodes=>nodes.map(n=>n.dataset.val));
    for(const val of values){await page.locator(`[data-val="${val}"]`).click();assert.equal(await page.evaluate(()=>{let valid=true;__qa.preview().traverse(o=>{if(o.geometry)for(const v of o.geometry.attributes.position.array)if(!Number.isFinite(v))valid=false;});return valid;}),true);selections++;if(gallery)await page.locator('#cust-preview-zone').screenshot({path:path.join(output,`variant-${baby?'child':'adult'}-${cat}-${val}.png`)});}
   }
  }
  console.log('customization UI selections',selections);
 }else{await page.locator('#btn-cust-back').click();await page.locator('#card-baby').click();}
 await option('hair','perm');await option('face','angry');await option('skin','fair');await option('prop','none');
 await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'baby-final.png')});
 await page.locator('#btn-cust-back').click();await page.locator('#card-five').click();
 assert.equal(await page.evaluate(()=>new Set(__qa.avatars().map(a=>a.identity)).size),5,'five bosses have five distinct profiles');
 await page.locator('#btn-cust-go').click();await page.waitForTimeout(700);
 await page.locator('#pointer-hint').evaluate(el=>el.style.visibility='hidden');
 await page.screenshot({path:path.join(output,'office-final.png')});
 // Views from actual camera locations, paused; QA only hides the pause overlay for captures.
 for(const [name,x,z,yaw] of [['meeting',8.8,-11,1.4],['lounge',8.6,-20,-.6],['workstations',-2,-15,1.1]]){
  await page.evaluate(([x,z,yaw])=>{const c=__qa.camera();c.position.set(x,1.65,z);c.rotation.set(0,yaw,0,'YXZ');updateWorldLighting(x,z);},[x,z,yaw]);
  await page.waitForTimeout(150);await page.screenshot({path:path.join(output,name+'-final.png')});
 }
 assert.equal(await page.evaluate(()=>document.querySelector('#game-canvas-wrap').getBoundingClientRect().left),0,'game canvas stays aligned after customization');
 console.log('GPU',await page.evaluate(()=>{const c=document.querySelector('#game-canvas-wrap canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown';}));
 console.log('world/render',await page.evaluate(()=>({world:WORLD.stats,render:__qa.snapshot().render,nav:__qa.nav().stats})));
 console.log('actual-office paths',await page.evaluate(()=>{
  const nav=__qa.nav(),routes=[[[0,-12],[3.4,-12]],[[0,-36],[8.8,-36]],[[-6,-15],[-6,-23]],[[0,2],[10,-24]],[[0,-50],[-10,-46]]];
  return routes.map(([a,b])=>{let p={x:a[0],z:a[1]},target={x:b[0],z:b[1]};nav.update(target);
   for(let i=0;i<3000;i++){const q=nav.waypoint(p,target),len=Math.hypot(q.x-p.x,q.z-p.z),step=Math.min(.08,len),n={x:p.x+(q.x-p.x)/(len||1)*step,z:p.z+(q.z-p.z)/(len||1)*step};if(!nav.clear(p,n))throw Error('route collision');p=n;if(Math.hypot(p.x-target.x,p.z-target.z)<.7)return {a,b,steps:i};}
   throw Error('stalled '+JSON.stringify({a,b,p}));
  });
 }));
 if(mode==='perf'){
  await page.evaluate(()=>{const c=__qa.camera();c.position.set(0,1.65,2.5);c.rotation.set(0,0,0,'YXZ');updateWorldLighting(0,2.5);});
  console.log('paused five-boss render benchmark',await page.evaluate(()=>new Promise(resolve=>{
    const samples=[];let last=performance.now();function sample(now){samples.push(now-last);last=now;if(samples.length<121)requestAnimationFrame(sample);else{samples.shift();samples.sort((a,b)=>a-b);resolve({fps:1000/(samples.reduce((a,b)=>a+b)/samples.length),p95FrameMs:samples[Math.floor(samples.length*.95)],calls:__qa.snapshot().render.calls});}}requestAnimationFrame(sample);
  })));
 }
 if(full || mode==='game'){
  // Camera yaw/pitch and pure movement implementation are compared to actual THREE bases.
  console.log('camera comparisons',await page.evaluate(()=>{let count=0;for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.73])for(const pitch of [-1.48,0,1.48]){const c=new THREE.PerspectiveCamera();c.rotation.set(pitch,yaw,0,'YXZ');c.updateMatrixWorld();const f=c.getWorldDirection(new THREE.Vector3());f.y=0;f.normalize();const r=new THREE.Vector3().setFromMatrixColumn(c.matrixWorld,0);for(const [input,v] of [[{forward:1},f],[{right:1},r],[{forward:1,right:1},f.clone().add(r).normalize()]]){const d=FPSMovement.step(FPSMovement.create(),input,yaw,1/60);if(new THREE.Vector3(d.x,0,d.z).normalize().dot(v)<.99999)throw Error('camera mismatch');count++;}}return count;}));
  await page.locator('#pointer-hint').evaluate(el=>el.style.visibility='');
  await lock();await page.waitForFunction(()=>__qa.snapshot().mouseLocked && __qa.snapshot().elapsedGame>0);console.log('pointer lock and game clock started');
  if(mode==='revision'){
    const park=()=>page.evaluate(()=>{for(let i=0;i<5;i++)__qa.boss(i,i*.8-1.6,-50);__qa.ready();});
    await park();await page.evaluate(()=>{__qa.place(-6.9,-6.05);__qa.aim(0);});
    await page.keyboard.press('Space');await page.keyboard.down('a');
    await page.waitForFunction(()=>__qa.snapshot().player.x<-8.05);await page.keyboard.up('a');
    await page.waitForFunction(()=>__qa.snapshot().grounded && __qa.snapshot().player.y>2.4);
    assert.ok(Math.abs((await page.evaluate(()=>__qa.snapshot())).player.y-2.4475)<.025,'landed on actual desktop');
    await page.keyboard.press('Escape');await page.waitForTimeout(100);await page.locator('#pointer-hint').evaluate(e=>e.style.visibility='hidden');await page.screenshot({path:path.join(output,'desk-vault.png')});await page.locator('#pointer-hint').evaluate(e=>e.style.visibility='');await page.waitForTimeout(1100);await lock();
    await page.keyboard.down('a');await page.waitForFunction(()=>__qa.snapshot().player.x<-10.65);await page.keyboard.up('a');await page.waitForFunction(()=>__qa.snapshot().grounded && __qa.snapshot().player.y<1.7);
    await page.keyboard.down('w');await page.waitForFunction(()=>__qa.snapshot().player.z<-22);await page.keyboard.up('w');
    console.log('PASS real keyboard: jump onto desk, land, jump-side escape and 16m side corridor');
    await park();await page.evaluate(()=>{__qa.place(0,2.5);__qa.aim(0);__qa.boss(0,0,-.5);__qa.boss(1,.8,-1);__qa.boss(2,0,5.3);__qa.boss(3,0,-8);__qa.boss(4,4,2.5);});
    await page.keyboard.press('f');await page.waitForFunction(()=>__qa.snapshot().coffeeCooldown>5);
    const hit=await page.evaluate(()=>__qa.snapshot());assert.ok(hit.bosses[0].stun>2.5&&hit.bosses[1].stun>2.5);assert.equal(hit.bosses[2].stun,0);assert.equal(hit.bosses[3].stun,0);assert.equal(hit.bosses[4].stun,0);
    await page.keyboard.press('Escape');await page.waitForTimeout(100);const pausedCoffee=await page.evaluate(()=>__qa.snapshot().coffeeCooldown);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__qa.snapshot().coffeeCooldown),pausedCoffee);
    await page.locator('#pointer-hint').evaluate(e=>e.style.visibility='hidden');await page.screenshot({path:path.join(output,'coffee-hit.png')});await page.locator('#pointer-hint').evaluate(e=>e.style.visibility='');
    await page.evaluate(()=>{for(let i=0;i<61;i++)__qa.step(.05);});assert.equal(await page.evaluate(()=>__qa.snapshot().bosses[0].stun),0,'stun ends');
    await page.evaluate(()=>{for(let i=0;i<60;i++)__qa.step(.05);});assert.equal(await page.evaluate(()=>__qa.snapshot().coffeeCooldown),0,'automatic refill');
    await park();await page.evaluate(()=>{__qa.place(2,-12);__qa.aim(-Math.PI/2);__qa.boss(0,3.5,-12);});await page.waitForTimeout(1100);await lock();await page.keyboard.press('f');await page.waitForFunction(()=>__qa.snapshot().coffeeCooldown>0);assert.equal(await page.evaluate(()=>__qa.snapshot().bosses[0].stun),0,'glass blocks splash');
    await park();await page.evaluate(()=>{__qa.place(0,2.5);__qa.aim(0);__qa.boss(0,0,-1);});await page.mouse.down();await page.mouse.up();await page.waitForFunction(()=>__qa.snapshot().bosses[0].stun>2.5);
    const cooling=await page.evaluate(()=>__qa.snapshot().coffeeCooldown);await page.keyboard.press('f');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>__qa.snapshot().coffeeCooldown)<=cooling,'cooldown cannot be bypassed');
    console.log('PASS coffee: F/click, cone, range, multiple hits, walls, 3s expiry, 5.5s refill, ESC freeze');
    await park();await page.evaluate(()=>{__qa.place(0,2.5);__qa.aim(0);});
  }

  await page.keyboard.down('w');await page.waitForFunction(()=>__qa.snapshot().player.z<2.4,{},{timeout:10000});await page.keyboard.up('w');
  assert.ok((await page.evaluate(()=>__qa.snapshot())).player.z<2.4,'W moved forward');
  await page.mouse.move(300,450);await page.waitForTimeout(80);assert.ok(Math.abs((await page.evaluate(()=>__qa.snapshot())).yaw)>.05,'mouse turns view');await page.keyboard.press('r');
  await page.keyboard.press('Space');await page.waitForFunction(()=>!__qa.snapshot().grounded);assert.equal((await page.evaluate(()=>__qa.snapshot())).grounded,false);
  await page.waitForFunction(()=>__qa.snapshot().grounded);
  await page.keyboard.down('Shift');await page.keyboard.down('d');await page.waitForFunction(()=>__qa.snapshot().stamina<.99);await page.keyboard.up('d');await page.keyboard.up('Shift');
  // Chatter routing: the lines are the joke, so a line from behind must still be readable.
  // Paused, so the pursuers' own timed chatter cannot race the assertions.
  await page.keyboard.press('Escape');await page.waitForTimeout(120);
  await page.evaluate(()=>{__qa.place(0,-24);__qa.aim(0);__qa.step(.001);__qa.boss(0,0,-20);__qa.hush();__qa.say(0,'뒤에서 하는 말');});
  assert.equal(await page.locator('#chatter-rail .chatter').count(),1,'an unseen speaker becomes a subtitle');
  assert.match(await page.locator('#chatter-rail .chatter').textContent(),/뒤/,'the subtitle says which way to look');
  assert.equal(await page.locator('#screen-game > .speech-bubble-3d').count(),0,'nothing is pinned to an unseen head');
  await page.evaluate(()=>{__qa.boss(0,0,-28);__qa.say(0,'앞에서 하는 말');});
  assert.equal(await page.locator('#screen-game > .speech-bubble-3d').count(),1,'a visible speaker keeps its head bubble');
  assert.equal(await page.locator('#chatter-rail .chatter').count(),1,'and does not also fill the rail');
  // The rail must stay short enough to read while sprinting.
  await page.evaluate(()=>{__qa.boss(0,0,-20);__qa.hush();for(let i=0;i<6;i++)__qa.say(0,'웅성 '+i);});
  assert.equal(await page.locator('#chatter-rail .chatter').count(),3,'the rail keeps only the newest few lines');
  assert.match(await page.locator('#chatter-rail').textContent(),/웅성 5/,'and keeps the newest, not the oldest');
  await page.evaluate(()=>{__qa.hush();});
  assert.equal(await page.locator('#chatter-rail .chatter').count(),0,'chatter clears between rounds');
  console.log('PASS chatter: off-screen lines become subtitles with a bearing, visible ones stay pinned, rail capped');
  await page.waitForTimeout(1100);await lock();

  // 사장님 호출: an empty gauge does nothing, a full one empties the floor into the room you face.
  await page.evaluate(()=>{__qa.place(0,-24);__qa.aim(Math.PI);for(let i=0;i<5;i++)__qa.boss(i,i*.7-1.4,-20);__qa.charge(.6);});
  await page.keyboard.press('q');await page.waitForTimeout(150);
  assert.equal((await page.evaluate(()=>__qa.snapshot())).summon.phase,'idle','a half-charged gauge cannot fire');
  await page.evaluate(()=>{__qa.ready();});
  await page.keyboard.press('q');await page.waitForFunction(()=>__qa.snapshot().summon.phase!=='idle');
  await page.waitForTimeout(260);await page.screenshot({path:path.join(output,'summon-call.png')});
  let call=await page.evaluate(()=>__qa.snapshot());
  assert.equal(call.summon.room,'01 / MEETING','facing back up the aisle calls the near room');
  assert.equal(call.summon.charge,0,'firing spends the whole gauge');
  // Nobody can be caught while the floor is in a meeting, even standing on the player.
  assert.ok(!(await page.evaluate(()=>{__qa.boss(0,__qa.snapshot().player.x,__qa.snapshot().player.z-.1);return __qa.step(.001);})<.95),'no capture during the summon');
  // The real risk: the standing spots must be walkable and reachable, not just coordinates.
  await page.waitForFunction(()=>__qa.snapshot().bosses.every(b=>b.x>2.6 && Math.abs(b.z+12)<5),{},{timeout:9000});
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='meeting',{},{timeout:9000});
  assert.ok((await page.evaluate(()=>__qa.snapshot())).summon.doors>0,'the doorways are sealed during the meeting');
  await page.evaluate(()=>{const c=__qa.camera();c.position.set(0,1.65,-8);c.rotation.set(0,-Math.PI/2,0,'YXZ');});
  await page.waitForTimeout(120);await page.screenshot({path:path.join(output,'summon-meeting.png')});
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='idle',{},{timeout:9000});
  const after=await page.evaluate(()=>__qa.snapshot());
  assert.ok(after.bosses.every(b=>b.rageMult>1),'they come back out of the meeting permanently faster');
  assert.equal(after.summon.doors,0,'the doors open again');
  assert.equal(after.summon.chief,null,'the 사장님 leaves with the meeting');
  assert.equal(after.summon.uses,1);
  // Rage must not tick away, and a second call must compound on top of the first.
  await page.waitForTimeout(1200);
  const held=(await page.evaluate(()=>__qa.snapshot())).bosses[0].rageMult;
  assert.equal(held,after.bosses[0].rageMult,'the speed-up does not expire over time');
  await page.evaluate(()=>{__qa.charge(1);});
  await page.keyboard.press('q');await page.waitForFunction(()=>__qa.snapshot().summon.phase!=='idle');
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='idle',{},{timeout:12000});
  const twice=(await page.evaluate(()=>__qa.snapshot())).bosses[0].rageMult;
  assert.ok(twice>held,'a second call stacks another permanent speed-up');
  console.log('PASS 사장님 호출: gauge gate, aimed room, five arrivals, no capture, 사장님 at the door, compounding permanent rage');
  await page.keyboard.press('Escape');await page.waitForTimeout(100);const paused=await page.evaluate(()=>__qa.snapshot());await page.waitForTimeout(450);assert.equal((await page.evaluate(()=>__qa.snapshot())).elapsedGame,paused.elapsedGame);
  await page.waitForTimeout(1000);await lock();
  // Wall-side ability and capture regression: solid glass blocks both.
  await page.keyboard.press('Escape');await page.waitForTimeout(100);
  const blocked=await page.evaluate(()=>{__qa.place(2,-12);__qa.aim(0);__qa.boss(0,2.95,-12);__qa.ready();return __qa.step(.001);});assert.ok(blocked>.95,'glass blocks capture');
  await page.waitForTimeout(1100);await lock();
  await page.keyboard.down('d');await page.waitForFunction(()=>__qa.snapshot().player.x>2.15);await page.waitForTimeout(250);await page.keyboard.up('d');
  assert.ok((await page.evaluate(()=>__qa.snapshot())).player.x<2.161,'player cannot walk through meeting-room glass');
  // The ultimate is a company-wide broadcast, so unlike coffee it is never blocked by glass.
  await page.evaluate(()=>{__qa.ready();});
  await page.keyboard.press('q');await page.waitForFunction(()=>__qa.snapshot().summon.phase!=='idle','the announcement carries through walls');
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='idle',{},{timeout:12000});
  await page.evaluate(()=>{__qa.place(0,0);__qa.calm();__qa.boss(0,0,-.3);});
  await page.locator('#screen-result.active').waitFor({timeout:30000});assert.match(await page.locator('#result-title').textContent(),/5중/);
  await page.locator('#btn-result-retry').click();assert.ok(await page.locator('#pointer-hint').isVisible());
  assert.equal((await page.evaluate(()=>__qa.snapshot())).summon.uses,0,'retrying resets the ultimate');
  await lock();await page.evaluate(()=>__qa.time(49990));await page.locator('#screen-result.active').waitFor();assert.match(await page.locator('#result-title').textContent(),/탈출/);
  await page.locator('#btn-result-mode').click();await page.locator('#card-baby').click();await page.locator('#btn-cust-go').click();await lock();
  assert.equal((await page.evaluate(()=>__qa.snapshot())).bosses.length,1);
  // Toddler mode runs its own ultimate: no meeting room, the 사장님 gets chased instead.
  await page.evaluate(()=>{__qa.place(0,-24);__qa.aim(0);__qa.boss(0,0,-28);__qa.ready();});
  await page.keyboard.press('q');await page.waitForFunction(()=>__qa.snapshot().summon.phase!=='idle');
  const kid=await page.evaluate(()=>__qa.snapshot());
  assert.equal(kid.summon.mode,'baby','baby mode never runs the meeting sequence');
  assert.equal(kid.summon.room,null,'no room is reserved for a five-year-old');
  assert.ok(kid.summon.chief,'the 사장님 walks out between the toddler and the player');
  const spawnZ=kid.summon.chief.z;
  await page.waitForTimeout(400);await page.screenshot({path:path.join(output,'summon-baby.png')});
  // The toddler must switch targets, and the player must be safe while it happens.
  assert.ok(!(await page.evaluate(()=>{__qa.boss(0,__qa.snapshot().player.x,__qa.snapshot().player.z-.1);return __qa.step(.001);})<.95),'no capture while the 사장님 is the target');
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='tantrum',{},{timeout:6000});
  const gap=s=>Math.hypot(s.bosses[0].x-s.player.x,s.bosses[0].z-s.player.z);
  const t0=await page.evaluate(()=>__qa.snapshot());
  await page.waitForTimeout(1500);
  const t1=await page.evaluate(()=>__qa.snapshot());
  assert.ok(Math.abs(t1.summon.chief.z-spawnZ)>2,'the 사장님 actually runs for an exit');
  assert.ok(gap(t1)>gap(t0)+1,'the toddler abandons the player and follows the 사장님 away');
  await page.waitForFunction(()=>__qa.snapshot().summon.phase==='idle',{},{timeout:9000});
  const done=await page.evaluate(()=>__qa.snapshot());
  assert.ok(done.bosses[0].rageMult>1,'the toddler comes back permanently faster too');
  assert.equal(done.summon.chief,null,'the 사장님 is gone once it is over');
  console.log('PASS 5살 모드 전용 궁극기: no room, 사장님 spawns and flees, toddler switches target, permanent rage');
  await page.evaluate(()=>{__qa.calm();});
  await page.keyboard.press('Escape');await page.waitForTimeout(100);const t=await page.locator('#timer-label').textContent();await page.waitForTimeout(250);assert.equal(await page.locator('#timer-label').textContent(),t);
  await page.waitForTimeout(1100);await lock();await page.evaluate(()=>__qa.boss(0,0,2.2));await page.locator('#screen-result.active').waitFor({timeout:30000});assert.match(await page.locator('#result-title').textContent(),/붙잡힘/);
  await page.locator('#btn-result-retry').click();await lock();await page.evaluate(()=>__qa.time(41990));await page.locator('#screen-result.active').waitFor();assert.match(await page.locator('#result-title').textContent(),/칼퇴/);
  console.log('PASS both modes: pointer lock, movement, mouse, jump, Q, ESC, defeat, retry, victory');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);console.log('PASS no JS exceptions or HTTP errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
