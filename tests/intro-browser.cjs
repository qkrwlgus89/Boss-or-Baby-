/* First-person story integration QA. Playwright setup matches browser.cjs. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.QA_OUTPUT||'/private/tmp/boss-baby-qa';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 // Read-only QA instrumentation, never part of the delivered game.
 await page.route('**/intro.js',async route=>{const response=await route.fetch();const body=(await response.text()).replace('root.OfficeIntro={start};',`root.OfficeIntro={start};root.__introQA=()=>({index,busy,ready,yaw,pitch,lineIndex,chapterTime,menuMode,name:root.OfficePlayer?.name,fov:camera?.fov,render:renderer?.info.render,position:camera?.position.toArray(),actors:actors.filter(a=>a.chapter===index).map(a=>a.mesh.position.toArray())});`);await route.fulfill({response,body});});
 await page.route('**/game3d.js',async route=>{const response=await route.fetch();const body=(await response.text()).replace(/\}\)\(\);\s*$/,`window.__gameQA=()=>({x:playerRig.x,z:playerRig.z,time:elapsedGame,locked:mouseLocked});})();`);await route.fulfill({response,body});});
 await page.goto('http://127.0.0.1:8080');await page.locator('#screen-title.active canvas').waitFor();await page.waitForTimeout(650);assert.equal(await page.locator('#intro-begin').isDisabled(),true,'name is required');await page.screenshot({path:`${output}/title-final.png`});assert.equal(await page.locator('#intro-objective').isVisible(),false);await page.keyboard.press('e');await page.keyboard.press('w');assert.equal(await page.evaluate(()=>__introQA().chapterTime),0,'menu freezes story');await page.setViewportSize({width:390,height:667});assert.ok(await page.locator('#intro-begin').isVisible());await page.locator('#intro-player-name').fill('  박지현  ');assert.equal(await page.locator('#intro-begin').isEnabled(),true);await page.screenshot({path:`${output}/title-mobile.png`});await page.setViewportSize({width:1440,height:900});await page.locator('#intro-player-name').press('Enter');assert.equal(await page.evaluate(()=>__introQA().name),'박지현','trimmed name persists');
 async function chapter(n){await page.waitForFunction(n=>__introQA().index===n&&!__introQA().busy,n);}
 async function progress(){await page.waitForFunction(()=>__introQA().ready);for(let i=0;i<4;i++){await page.keyboard.press('e');await page.waitForTimeout(80);}}
 await chapter(0);fs.mkdirSync(output,{recursive:true});await page.waitForTimeout(500);
 assert.equal(await page.locator('#intro-next-label').textContent(),'메일함 새로고침');await page.screenshot({path:`${output}/mail-list.png`});await page.keyboard.press('e');await page.waitForFunction(()=>__introQA().lineIndex===1);assert.equal(await page.locator('#intro-next-label').textContent(),'합격 메일 열기');await page.screenshot({path:`${output}/offer-arrived.png`});await page.keyboard.press('e');await page.waitForFunction(()=>__introQA().lineIndex===2);await page.screenshot({path:`${output}/fps-story-1.png`});await page.keyboard.press('r');await page.waitForFunction(()=>__introQA().fov<39);await page.screenshot({path:`${output}/offer-detail.png`});await page.keyboard.press('r');await page.waitForFunction(()=>__introQA().fov>64);
 await page.mouse.click(700,350);await page.waitForFunction(()=>!!document.pointerLockElement);
 const initial=await page.evaluate(()=>__introQA());await page.mouse.move(790,380);await page.waitForTimeout(100);const turned=await page.evaluate(()=>__introQA());assert.notEqual(initial.yaw,turned.yaw);await page.mouse.move(700,350);await page.waitForTimeout(100);
 await progress();await chapter(1);
 assert.equal(await page.evaluate(()=>__introQA().ready),false,'too far from badge');
 await page.keyboard.press('e');assert.equal(await page.evaluate(()=>__introQA().index),1,'cannot use distant object');
 await page.keyboard.down('w');await page.waitForFunction(()=>__introQA().position[2]<2.5);await page.keyboard.up('w');await page.waitForTimeout(200);
 await page.screenshot({path:`${output}/fps-story-2.png`});await page.keyboard.press('r');await page.waitForFunction(()=>__introQA().fov<39);await page.screenshot({path:`${output}/badge-detail.png`});await page.keyboard.press('r');await page.waitForFunction(()=>__introQA().fov>64);await progress();await chapter(2);
 await page.keyboard.down('w');await page.waitForFunction(()=>__introQA().position[2]<1.7);await page.keyboard.up('w');await page.waitForTimeout(200);
 await page.screenshot({path:`${output}/fps-story-3.png`});await progress();await chapter(3);
 await page.screenshot({path:`${output}/fps-story-4.png`});console.log('night render',await page.evaluate(()=>__introQA().render));await progress();await chapter(4);
 await page.screenshot({path:`${output}/fps-story-5.png`});await progress();await chapter(5);
 const before=await page.evaluate(()=>__introQA().actors[2][2]);await page.waitForTimeout(1000);assert.ok((await page.evaluate(()=>__introQA().actors[2][2]))>before,'managers approach');
 await page.screenshot({path:`${output}/fps-story-6.png`});await progress();await chapter(6);
 await page.screenshot({path:`${output}/fps-story-7.png`});await progress();await page.locator('#screen-select.active').waitFor();
 assert.equal(await page.locator('#intro-canvas canvas').count(),0);assert.equal(await page.evaluate(()=>document.pointerLockElement),null);
 await page.locator('#intro-replay').click();await chapter(0);assert.deepEqual(await page.evaluate(()=>__introQA().position),[0,1.38,1.25]);assert.equal(await page.evaluate(()=>__introQA().name),'박지현','name persists on replay');
 await page.locator('#intro-sound').click();assert.equal(await page.locator('#intro-sound').getAttribute('aria-pressed'),'true');await page.locator('#intro-sound').click();
 await page.locator('#intro-skip').click();await page.locator('#screen-select.active').waitFor();
 for(const mode of ['baby','five','endless']){await page.locator(`#card-${mode}`).click();await page.locator('#screen-customize.active').waitFor();await page.locator('#btn-cust-back').click();}
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#intro-replay').click();await chapter(0);await progress();await chapter(1);await page.locator('#intro-skip').click();
 await page.locator('#card-five').click();await page.locator('#btn-cust-go').click();await page.locator('#screen-game.active').waitFor();assert.equal(await page.locator('#runner-name').textContent(),'박지현');await page.locator('#pointer-hint').click();await page.waitForFunction(()=>__gameQA().locked);
 const startGame=await page.evaluate(()=>__gameQA());await page.keyboard.down('w');await page.waitForFunction(z=>__gameQA().z<z-.3,startGame.z);await page.keyboard.up('w');await page.keyboard.press('Escape');await page.waitForTimeout(150);const paused=await page.evaluate(()=>__gameQA().time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__gameQA().time),paused,'game ESC pauses after story');
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS inbox list -> highlighted new offer -> opened offer sequence, required/trimmed player name, personalized story/replay/game HUD, 7 first-person scenes, mouse look, WASD approach, E range gate, dialogue, pursuing actors, skip, sound, reduced motion, context/pointer-lock cleanup, 3 mode entry, actual game lock/movement/ESC after story; no JS/HTTP errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
