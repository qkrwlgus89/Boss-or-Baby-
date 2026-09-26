/* Test-only hooks are injected into the HTTP response, never shipped. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game3d.js',async route=>{
  const response=await route.fetch();let body=await response.text();
  body=body.replace(/\}\)\(\);\s*$/,`window.__floorQA={
   start:(mode='endless')=>{state.mode=mode;if(!state.fiveAvatars.length)state.fiveAvatars=Array.from({length:5},(_,i)=>randomAvatarOpts3D(false,i));startGame3D();},
   snap:()=>({player:{...playerRig},level:rank.level,score:rank.score,floor:JSON.parse(JSON.stringify(floorProgress)),bosses:bosses.length,uses:summon.uses,colliders:WORLD.colliders.length,locked:mouseLocked,active:gameActive}),
   interactAt:p=>{playerRig={...p,y:PLAYER_HEIGHT};interactQueued=true;updateFloor(0);},
   tick:dt=>updateFloor(dt),
   call:()=>{summon.charge=1;startSummon();for(let i=0;i<5;i++)updateSummon(30,Infinity,0);},
   route:target=>{navigation.update(target);let p={x:0,z:2.5};for(let n=0;n<4000;n++){if(Math.hypot(p.x-target.x,p.z-target.z)<1.5)return true;const w=navigation.waypoint(p,target),dx=w.x-p.x,dz=w.z-p.z,d=Math.hypot(dx,dz);if(d<.001)return false;p=resolveCollision(p.x+dx/d*Math.min(.15,d),p.z+dz/d*Math.min(.15,d),.42);}return false;},
   view:()=>{updateHUD(Infinity,Infinity);document.getElementById('summon-cutin').classList.remove('show');camera.position.set(0,1.65,-4);camera.lookAt(0,1.5,-30);renderer.render(scene,camera);},
   viewLift:()=>{updateHUD(Infinity,Infinity);document.getElementById('summon-cutin').classList.remove('show');camera.position.set(0,1.65,-50);camera.lookAt(0,1.6,-55.2);renderer.render(scene,camera);},
   viewNpc:()=>{const s=OfficeFloors.layout(rank.level).stops[0];playerRig={x:s.x-Math.sign(s.x)*1.1,z:s.z+1,y:PLAYER_HEIGHT};updateHUD(Infinity,Infinity);document.getElementById('summon-cutin').classList.remove('show');camera.position.set(s.x-Math.sign(s.x)*3,1.65,s.z+2.5);camera.lookAt(s.x,1.65,s.z);renderer.render(scene,camera);},
   npcs:()=>WORLD.approvalNpcs.map(n=>({done:n.done,stamped:n.approvedSeal.visible,textureChanged:n.bubble.material.map===n.textures[1]})),
   stops:()=>OfficeFloors.layout(rank.level).stops,
   lift:()=>OfficeFloors.ELEVATOR,
   quiet:()=>bosses.forEach(b=>b.stun=100)
   ,cabin:()=>{bosses.forEach((b,i)=>{b.stun=0;b.mesh.position.set(i*.6,0,-53);});document.getElementById('summon-cutin').classList.remove('show');updateHUD(Infinity,Infinity);renderer.render(scene,camera);}
  };})();`);
  await route.fulfill({response,body});
 });
 await page.goto('http://127.0.0.1:8080');await page.waitForFunction(()=>!!window.__floorQA);
 await page.locator('#intro-canvas canvas').waitFor();
 await page.evaluate(()=>document.getElementById('intro-skip').click());
 await page.locator('#screen-select.active').waitFor();
 await page.evaluate(()=>__floorQA.start());
 const output=process.env.QA_OUTPUT||'/private/tmp/boss-baby-floor';fs.mkdirSync(output,{recursive:true});
 for(let level=0;level<4;level++){
  const s=await page.evaluate(()=>__floorQA.snap());assert.equal(s.level,level);assert.equal(s.bosses,2+level);
  const stops=await page.evaluate(()=>__floorQA.stops()),lift=await page.evaluate(()=>__floorQA.lift());
  assert.equal((await page.evaluate(()=>__floorQA.npcs())).length,2,'two friendly approval NPCs on each floor');
  for(const target of [...stops,lift])assert.equal(await page.evaluate(p=>__floorQA.route(p),target),true,`floor ${level+1} reachable ${JSON.stringify(target)}`);
  await page.evaluate(()=>{__floorQA.view();document.getElementById('pointer-hint').style.visibility='hidden';});await page.screenshot({path:`${output}/floor-${level+1}.png`});await page.evaluate(()=>document.getElementById('pointer-hint').style.visibility='');
  await page.evaluate(p=>__floorQA.interactAt(p),lift);assert.equal((await page.evaluate(()=>__floorQA.snap())).floor.phase,'work');
  if(level===0){await page.evaluate(()=>{__floorQA.viewNpc();document.getElementById('pointer-hint').style.visibility='hidden';});await page.screenshot({path:output+'/approval-npc.png'});await page.evaluate(()=>document.getElementById('pointer-hint').style.visibility='');}
  for(const target of stops)await page.evaluate(p=>__floorQA.interactAt(p),target);
  assert.ok((await page.evaluate(()=>__floorQA.npcs())).every(n=>n.done&&n.stamped&&n.textureChanged),'approval changes NPC speech and stamps paperwork');
  if(level===0){await page.evaluate(()=>{__floorQA.viewNpc();document.getElementById('pointer-hint').style.visibility='hidden';});await page.screenshot({path:output+'/approval-npc-done.png'});await page.evaluate(()=>document.getElementById('pointer-hint').style.visibility='');}
  await page.evaluate(p=>__floorQA.interactAt(p),lift);assert.equal((await page.evaluate(()=>__floorQA.snap())).floor.phase,'waiting');
  if(level===0){await page.evaluate(()=>{__floorQA.cabin();document.getElementById('pointer-hint').style.visibility='hidden';});await page.screenshot({path:output+'/elevator-transparent.png'});await page.evaluate(()=>document.getElementById('pointer-hint').style.visibility='');}
  await page.evaluate(()=>__floorQA.tick(3.9));assert.equal((await page.evaluate(()=>__floorQA.snap())).floor.phase,'waiting');
  await page.evaluate(()=>__floorQA.tick(.1));assert.equal((await page.evaluate(()=>__floorQA.snap())).floor.phase,'riding');
  await page.evaluate(()=>__floorQA.tick(.6));
 }
 await page.evaluate(()=>__floorQA.start());await page.evaluate(()=>__floorQA.call());assert.equal((await page.evaluate(()=>__floorQA.snap())).level,0,'Q alone cannot promote');assert.equal((await page.evaluate(()=>__floorQA.snap())).bosses,2);
 await page.evaluate(()=>__floorQA.tick(65));assert.equal((await page.evaluate(()=>__floorQA.snap())).bosses,3);
 await page.evaluate(()=>__floorQA.start('five'));assert.equal(await page.locator('#rank-chip').isVisible(),false);
 assert.equal((await page.evaluate(()=>__floorQA.npcs())).length,0,'NPCs cleaned up when leaving floor mode');
 assert.equal((await page.evaluate(()=>__floorQA.snap())).bosses,5);
 await page.evaluate(()=>__floorQA.start());assert.equal((await page.evaluate(()=>__floorQA.snap())).bosses,2);
 await page.evaluate(()=>{__floorQA.quiet();__floorQA.viewNpc();});await page.locator('#pointer-hint').click();await page.waitForFunction(()=>__floorQA.snap().floor.time>.1);
 assert.equal(await page.locator('#floor-interaction').isVisible(),true,'nearby submission prompt is visible');
 await page.keyboard.press('e');await page.waitForFunction(()=>__floorQA.snap().floor.stamps[0]);
 assert.equal((await page.evaluate(()=>__floorQA.npcs()))[0].done,true,'real E key approves paperwork');
 await page.evaluate(()=>{__floorQA.interactAt(__floorQA.stops()[1]);__floorQA.interactAt(__floorQA.lift());__floorQA.cabin();});
 await page.keyboard.down('w');await page.keyboard.press('Space');await page.waitForTimeout(550);await page.keyboard.up('w');
 const cabin=await page.evaluate(()=>__floorQA.snap());assert.equal(cabin.active,true,'nearby pursuers cannot catch a boarded player');assert.ok(cabin.player.z<=-53.8&&cabin.player.z>=-55);assert.equal(cabin.player.y,1.65,'cannot jump out of cabin');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!__floorQA.snap().locked);
 const paused=(await page.evaluate(()=>__floorQA.snap())).floor.time;await page.waitForTimeout(250);assert.equal((await page.evaluate(()=>__floorQA.snap())).floor.time,paused);
 await page.locator('#pointer-hint').click();await page.waitForFunction(()=>__floorQA.snap().level===1,{},{timeout:8000});
 assert.deepEqual(errors,[]);console.log('PASS: four floor transitions, all targets reachable, approval/call/boarding gates, one extra chaser per floor, overtime reinforcements, timed mode cleanup, replay reset, ESC pause; no JS errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
