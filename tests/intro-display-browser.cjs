/* Optional Chrome regression: same Playwright setup as tests/browser.cjs.
   Run a local server on :8080. Test hooks exist only in the intercepted response. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.route('**/intro.js',async route=>{
      const response=await route.fetch();
      const body=(await response.text()).replace('root.OfficeIntro={start};',`root.OfficeIntro={start};
        root.__displayQA={
          view:x=>{menuMode=false;busy=false;index=2;updateChapter();
            el('screen-title').classList.remove('with-menu','with-howto');
            camera.position.x=x;camera.lookAt(0,1.5,-1.5);yaw=camera.rotation.y;pitch=camera.rotation.x;},
          surfaces:()=>documentSurfaces.filter(s=>s.mesh.name==='laptop-display').map(s=>{
            const m=s.mesh,h=m.parent.getObjectByName('laptop-screen-housing');h.geometry.computeBoundingBox();
            return {chapter:s.chapter,gap:m.position.z-h.geometry.boundingBox.max.z,
              depthTest:m.material.depthTest,receiveShadow:m.receiveShadow,
              oldGap:.015-h.geometry.boundingBox.max.z};
          })};`);
      await route.fulfill({response,body});
    });
    await page.goto('http://127.0.0.1:8080');
    await page.waitForFunction(()=>window.__displayQA?.surfaces().length>0);
    const surfaces=await page.evaluate(()=>__displayQA.surfaces());
    assert.equal(surfaces.filter(s=>s.chapter===2).length,2,'both background laptop screens covered');
    for(const s of surfaces){
      assert.ok(s.gap>=.00399,'display has 4mm clearance beyond the actual beveled housing');
      assert.ok(s.oldGap<.00005,'old offset was almost coplanar');
      assert.equal(s.depthTest,true,'screens remain occluded by people and walls');
      assert.equal(s.receiveShadow,false,'self-lit screen does not receive shadow artifacts');
    }
    const output=process.env.QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'office-display-'));
    fs.mkdirSync(output,{recursive:true});
    for(const [name,x] of [['center',0],['left',-.18],['right',.18]]){
      await page.evaluate(x=>__displayQA.view(x),x);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(output,`intro-laptops-${name}.png`)});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS laptop depth separation / occlusion / three camera views, no JS or console errors',JSON.stringify({surfaces,output}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
