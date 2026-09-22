/* ========================================================================
   game3d.js
   화면 전환 + 커스터마이징(미리보기는 회전하는 3D 캐릭터) + 1인칭 컨트롤 + 추격 AI
   ========================================================================*/

(function(){
  'use strict';

  const state = {
    mode: null, // 'baby' | 'five'
    babyAvatar: null,
    fiveAvatars: [],
    activeBossTab: 0,
    activeCustCategory: 'hair',
  };

  const CATS3D = [
    { key:'identity', label:'인상' },
    { key:'hair',   label:'헤어' },
    { key:'outfit', label:'옷' },
    { key:'face',   label:'표정' },
    { key:'prop',   label:'소품' },
    { key:'skin',   label:'피부' },
  ];

  function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  /* ---------------- loading ---------------- */
  window.addEventListener('load', ()=>{
    // give three.js a tick to attach to window
    setTimeout(()=>{
      document.getElementById('loading-screen').classList.add('hidden');
      showScreen('screen-title');
    }, 250);
  });

  document.getElementById('btn-go-select').addEventListener('click', ()=>{
    showScreen('screen-select');
  });

  document.querySelectorAll('.mode-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      const mode = card.dataset.mode;
      state.mode = mode;
      if (mode === 'baby'){
        state.babyAvatar = randomAvatarOpts3D(true);
      } else {
        state.fiveAvatars = Array.from({length:5}, (_,i)=> randomAvatarOpts3D(false,i));
        state.activeBossTab = 0;
      }
      state.activeCustCategory = 'hair';
      enterCustomize();
      showScreen('screen-customize');
    });
  });

  document.getElementById('btn-cust-back').addEventListener('click', ()=>{
    stopCustomizePreview();
    showScreen('screen-select');
  });
  document.getElementById('btn-cust-go').addEventListener('click', ()=>{
    stopCustomizePreview();
    startGame3D();
  });

  /* ================= CUSTOMIZE: 3D rotating preview ================= */
  let custRenderer=null, custScene=null, custCamera=null, custMesh=null, custRafId=null;

  function initCustomizePreview(){
    const zone = document.getElementById('cust-preview-zone');
    zone.innerHTML = '';

    custScene = new THREE.Scene();
    custScene.background = new THREE.Color(0x172b40);

    custCamera = new THREE.PerspectiveCamera(40, zone.clientWidth/zone.clientHeight, 0.1, 10);
    custCamera.position.set(0, 1.0, 3.2);
    custCamera.lookAt(0, 0.85, 0);

    custRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    custRenderer.setSize(zone.clientWidth, zone.clientHeight);
    custRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    custRenderer.outputColorSpace = THREE.SRGBColorSpace;
    custRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    custRenderer.shadowMap.enabled = true;
    custRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    zone.appendChild(custRenderer.domElement);

    const key = new THREE.DirectionalLight(0xfff6ec, 2.3);
    key.position.set(2,3,2);
    key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-2;key.shadow.camera.right=2;key.shadow.camera.top=3;key.shadow.camera.bottom=-2;key.shadow.normalBias=.01;
    custScene.add(key);
    const fill = new THREE.HemisphereLight(0xcbddec,0x87919c,1.3);
    custScene.add(fill);
    const front=new THREE.DirectionalLight(0xd9eaff,1.0);front.position.set(-2,2,4);custScene.add(front);
    const rim = new THREE.DirectionalLight(0xffb88c, 0.6);
    rim.position.set(-2,1,-2);
    custScene.add(rim);

    // simple ground disc
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.6,24), new THREE.MeshStandardMaterial({color:0x304d65}));
    ground.rotation.x = -Math.PI/2;ground.receiveShadow=true;
    custScene.add(ground);

    rebuildCustMesh();

    function loop(){
      custRafId = requestAnimationFrame(loop);
      if (custMesh){ custMesh.rotation.y = Math.sin(performance.now()*0.0004)*0.45; animateBossMesh(custMesh,performance.now()/1000,0,false); }
      custRenderer.render(custScene, custCamera);
    }
    loop();

    window.addEventListener('resize', onCustResize);
  }

  function onCustResize(){
    const zone = document.getElementById('cust-preview-zone');
    if (!custRenderer || !zone.clientWidth) return;
    custRenderer.setSize(zone.clientWidth, zone.clientHeight);
    custCamera.aspect = zone.clientWidth/zone.clientHeight;
    custCamera.updateProjectionMatrix();
    if (custMesh) frameCameraToMesh(custMesh);
  }

  function disposeMesh(mesh){
    const geometries = new Set(), materials = new Set();
    mesh.traverse(o=>{if(o.geometry) geometries.add(o.geometry); if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose()); materials.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});
  }

  function rebuildCustMesh(){
    if (custMesh){ custScene.remove(custMesh); disposeMesh(custMesh); }
    custMesh = buildBossMesh(currentAvatarOpts(), THREE);
    custMesh.position.y = 0;
    custScene.add(custMesh);
    frameCameraToMesh(custMesh);
  }

  /**
   * 캐릭터 전체(머리부터 발끝까지)가 화면에 항상 다 보이도록
   * 메시의 실제 바운딩박스를 계산해서 카메라 거리/높이를 맞춘다.
   * 5살 모드처럼 키가 작은 캐릭터도, 5명 모드의 성인 캐릭터도 동일하게 안전하게 잡힌다.
   */
  function frameCameraToMesh(mesh){
    if (!custCamera) return;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const totalHeight = size.y;
    const fovRad = (custCamera.fov * Math.PI) / 180;
    // 세로 기준으로 캐릭터 전체 높이가 화면의 약 78%를 채우도록 거리 계산
    const distForHeight = (totalHeight / 2 / Math.tan(fovRad/2)) / 0.78;
    // 가로(어깨너비 등)도 한 번 더 체크해서 더 큰 거리를 사용 (잘림 방지)
    const aspect = custCamera.aspect || 1;
    const horizFov = 2 * Math.atan(Math.tan(fovRad/2) * aspect);
    const distForWidth = (size.x / 2 / Math.tan(horizFov/2)) / 0.78;
    const dist = Math.max(distForHeight, distForWidth, 1.8);
    const clampedDist = Math.min(dist, 6.5); // 혹시 모를 비정상 메시 크기에도 카메라가 과도하게 멀어지지 않게 상한선

    custCamera.position.set(center.x, center.y, clampedDist);
    custCamera.lookAt(center.x, center.y, center.z);
  }

  function stopCustomizePreview(){
    if (custRafId) cancelAnimationFrame(custRafId);
    window.removeEventListener('resize', onCustResize);
    if (custScene){ disposeMesh(custScene); custMesh=null; custScene=null; }
    if (custRenderer){
      custRenderer.dispose();
      custRenderer = null;
    }
  }

  function enterCustomize(){
    const eyebrow = document.getElementById('cust-eyebrow');
    const title = document.getElementById('cust-title');
    const multiTabs = document.getElementById('multi-tabs');

    if (state.mode === 'baby'){
      eyebrow.textContent = '5살 팀장님 빚어내기';
      title.textContent = '떼쓰는 팀장님 완성';
      multiTabs.style.display = 'none';
    } else {
      eyebrow.textContent = '5명의 팀장님 빚어내기';
      title.textContent = `${state.activeBossTab+1}번째 팀장님 편집중`;
      multiTabs.style.display = 'flex';
      multiTabs.innerHTML = state.fiveAvatars.map((_,i)=>
        `<button class="boss-num-btn ${i===state.activeBossTab?'active':''}" data-idx="${i}">${i+1}</button>`
      ).join('');
      multiTabs.querySelectorAll('.boss-num-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          state.activeBossTab = parseInt(btn.dataset.idx,10);
          title.textContent = `${state.activeBossTab+1}번째 팀장님 편집중`;
          multiTabs.querySelectorAll('.boss-num-btn').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          rebuildCustMesh();
          renderOptionRow();
        });
      });
    }

    initCustomizePreview();
    renderTabRow();
    renderOptionRow();
    requestAnimationFrame(onCustResize);
  }

  function currentAvatarOpts(){
    if (state.mode === 'baby') return state.babyAvatar;
    return state.fiveAvatars[state.activeBossTab];
  }

  function renderTabRow(){
    const tabRow = document.getElementById('tab-row');
    const cats = state.mode === 'baby' ? CATS3D.filter(c=>c.key!=='outfit') : CATS3D;
    tabRow.innerHTML = cats.map(c=>
      `<button class="tab-btn ${state.activeCustCategory===c.key?'active':''}" data-cat="${c.key}">${c.label}</button>`
    ).join('');
    tabRow.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        state.activeCustCategory = btn.dataset.cat;
        renderTabRow();
        renderOptionRow();
      });
    });
  }

  function renderOptionRow(){
    const optionRow = document.getElementById('option-row');
    const cat = state.activeCustCategory;
    const options = PALETTE3D[cat];
    const opts = currentAvatarOpts();

    optionRow.innerHTML = options.map(o=>{
      const visual = (typeof o.hex === 'number')
        ? `<span class="swatch" style="background:#${o.hex.toString(16).padStart(6,'0')};"></span>`
        : `<span class="swatch" style="background:#3a2a1a;display:flex;align-items:center;justify-content:center;font-size:10px;">${o.label[0]}</span>`;
      const active = opts[cat] === o.id ? 'active' : '';
      return `<button class="opt-chip ${active}" data-val="${o.id}">${visual}${o.label}</button>`;
    }).join('');

    optionRow.querySelectorAll('.opt-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        opts[cat] = chip.dataset.val;
        renderOptionRow();
        rebuildCustMesh();
      });
    });
  }

  /* ================= 3D GAME ================= */
  let scene, camera, renderer;
  let playerRig; // group holding camera, used for position
  let bosses = []; // { mesh, speed, baseSpeed, catchDist, lastBubbleAt }
  let keys = {};
  let yaw = 0, pitch = 0;
  let gameActive = false;
  let gameDuration = 0;
  let lastFrameTime = 0;
  let mouseLocked = false;
  let gameRafId = null;
  let speechBubbles = []; // {el, mesh}

  const PLAYER_RADIUS = 0.32;
  const PLAYER_HEIGHT = 1.65;
  const JUMP_VELOCITY = OfficeTraversal.JUMP;
  const GRAVITY = OfficeTraversal.GRAVITY;
  let motion = FPSMovement.create();
  let jumpQueued = false, abilityQueued = false;
  let summon = OfficeSummon.create();
  let summonDoors = [];   // temporary glass panels that seal the meeting room doorways
  let chief = null;       // the 사장님: { mesh, target, flee, lastBubbleAt }
  let lastMinDist = Infinity;

  // Built from the existing palette rather than a new character type: bald, suited,
  // round-faced (which is what puts glasses on him) and holding the report you owe.
  const CHIEF_LOOK = { identity:'round', skin:'tan', hair:'bald', outfit:'suit', face:'smug', prop:'paper', isBaby:false };
  const CHIEF_SCALE = 1.12, CHIEF_GOLD = 0xd8ae4a;
  const FLOOR_EXITS = [{x:0,z:4.6},{x:0,z:-53}];
  let elapsedGame = 0, runPhase = 0;
  let verticalVelocity = 0;
  let isGrounded = true;
  let coffeeQueued=false,coffeeCooldown=0,coffeeAnim=0;
  const splashes=[];

  let navigation=null, navigationClock=0, chaseTarget=null;
  function initThree(){
    const wrap = document.getElementById('game-canvas-wrap');
    wrap.innerHTML = '';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc7d7df);
    scene.fog = new THREE.Fog(0xc7d7df, 35, 100);

    camera = new THREE.PerspectiveCamera(78, wrap.clientWidth/wrap.clientHeight, 0.05, 80);

    renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    wrap.appendChild(renderer.domElement);

    buildWorld(scene, THREE, renderer);
    navigation=OfficeNavigation.create(WORLD.bounds,WORLD.colliders);
    scene.add(camera);
    buildFirstPersonHands();

    window.addEventListener('resize', onGameResize);
  }

  function onGameResize(){
    const wrap = document.getElementById('game-canvas-wrap');
    if (!renderer || !wrap.clientWidth) return;
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    camera.aspect = wrap.clientWidth/wrap.clientHeight;
    camera.updateProjectionMatrix();
  }

  /* ---- pointer lock controls ---- */
  const canvasWrapEl = ()=> document.getElementById('game-canvas-wrap');

  function requestLock(){
    const el = canvasWrapEl();
    if (el.requestPointerLock){
      const result = el.requestPointerLock();
      if (result && result.catch) result.catch(()=>{});
    }
  }

  document.addEventListener('pointerlockchange', ()=>{
    mouseLocked = document.pointerLockElement === canvasWrapEl();
    keys = {}; motion.right = motion.forward = 0;
    jumpQueued = abilityQueued = coffeeQueued = false;
    document.getElementById('pointer-hint').classList.toggle('hidden', mouseLocked);
  });

  document.getElementById('pointer-hint').addEventListener('click', ()=>{
    if (gameActive) requestLock();
  });

  // 힌트 오버레이를 닫은 뒤에도, 화면 어디를 클릭하든 마우스 시점 잠금을 걸 수 있게 한다.
  canvasWrapEl().addEventListener('click', ()=>{
    if (gameActive && !mouseLocked) requestLock();
  });

  document.addEventListener('mousemove', (e)=>{
    if (!mouseLocked || !gameActive) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.48, Math.min(1.48, pitch));
    yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  });

  document.addEventListener('mousedown',e=>{if(e.button===0 && gameActive && mouseLocked)coffeeQueued=true;});

  const MOVE_KEYS = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space']);
  window.addEventListener('keydown', (e)=>{
    if (gameActive && mouseLocked && !e.repeat){
      if (e.code === 'Space') jumpQueued = true;
      if (e.code === 'KeyQ') abilityQueued = true;
      if (e.code === 'KeyF') coffeeQueued = true;
    }
    if (e.code === 'Escape' && gameActive && document.pointerLockElement) document.exitPointerLock();
    keys[e.code] = true;
    if (gameActive && MOVE_KEYS.has(e.code)){
      e.preventDefault();
    }
    // R: 시점이 헷갈리게 돌아갔을 때 정면(처음 바라보던 방향)으로 즉시 되돌린다.
    if (gameActive && e.code === 'KeyR'){
      yaw = 0; pitch = 0;
    }
  }, { passive:false });
  window.addEventListener('keyup', (e)=>{
    keys[e.code] = false;
    if (gameActive && MOVE_KEYS.has(e.code)) e.preventDefault();
  }, { passive:false });

  // 창/탭이 포커스를 잃으면(다른 창 클릭, alt-tab 등) keyup을 못 받는 경우가 있다.
  // 이때 키가 "눌린 상태"로 영구히 남으면 의도치 않게 계속 이동하거나 다른 키와
  // 충돌해 방향이 이상하게 느껴질 수 있으므로, 포커스를 잃는 즉시 전부 해제한다.
  window.addEventListener('blur', ()=>{
    keys = {}; motion.right = motion.forward = 0;
    if (gameActive && document.pointerLockElement) document.exitPointerLock();
  });
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden){
      keys = {}; jumpQueued = abilityQueued = coffeeQueued = false;
      motion.right = motion.forward = 0;
      if (gameActive && document.pointerLockElement) document.exitPointerLock();
    }
  });

  /* ---- player & boss setup ---- */
  function spawnPlayer(){
    yaw = 0; pitch = 0;
    keys = {}; motion = FPSMovement.create();
    jumpQueued = abilityQueued = coffeeQueued = false; elapsedGame = runPhase = coffeeCooldown = coffeeAnim = 0;
    summon = OfficeSummon.create(); clearDoors(); despawnChief();
    splashes.forEach(p=>{scene.remove(p.mesh);disposeMesh(p.mesh);});splashes.length=0;
    camera.fov = 78; camera.updateProjectionMatrix();
    verticalVelocity = 0;
    isGrounded = true;
    playerRig = { x:0, z: 2.5, y: PLAYER_HEIGHT };
    camera.position.set(playerRig.x, playerRig.y, playerRig.z);
    camera.rotation.set(0,0,0,'YXZ');
    camera.updateMatrixWorld();
    updateWorldLighting(playerRig.x,playerRig.z);
  }

  function spawnBosses(){
    bosses.forEach(b=> {scene.remove(b.mesh);disposeMesh(b.mesh);});
    bosses = [];

    if (state.mode === 'baby'){
      const mesh = buildBossMesh(state.babyAvatar, THREE);
      mesh.position.set(0, 0, -14);
      scene.add(mesh);
      bosses.push({
        mesh, baseSpeed: 3.8, speed:3.8, catchDist: 0.85,
        lastBubbleAt: 0, dialogue: DIALOGUE3D.baby, stun: 0, rageMult: 1, spot: null, label: '5살 팀장님',
      });
    } else {
      // 십자 교차로(z≈-24)는 폭이 다른 구간이라 피하고, 메인 복도 + 오픈 큐비클존 입구 쪽에 분산
      const startZ = [-10, -18, -28, -38, -50];
      const startX = [-.8, .8, -.7, .7, 0];
      state.fiveAvatars.forEach((opts,i)=>{
        const mesh = buildBossMesh(opts, THREE);
        mesh.position.set(startX[i], 0, startZ[i]);
        scene.add(mesh);
        bosses.push({
          mesh, baseSpeed: 2.6 + Math.random()*0.4, speed:2.6, catchDist: 0.85,
          lastBubbleAt: 0, dialogue: DIALOGUE3D.five, stun: 0, rageMult: 1, spot: null, label: `팀장님 ${i+1}`,
        });
      });
    }
  }

  const DIALOGUE3D = {
    baby: [
      "팀장님 사탕 안 주면 휴가 안 줘!!",
      "으아앙 보고서 내가 먹을 거야!!",
      "왜 안 놀아줘 진짜!!!",
      "퇴근하지마! 나랑 놀아!!",
    ],
    five: [
      "보고서는요?",
      "오늘 안에 됩니다?",
      "이거 누가 했어요",
      "메일 왜 안 봐요",
      "회의 5분 전인데",
      "퇴근하시게요?",
    ],
  };

  /* ---- chatter ----
     The lines are half the game, and you spend the game running away, so a bubble pinned
     over a head behind you is a line nobody ever reads. A speaker you can actually see
     keeps the floating bubble; anyone off screen drops into a subtitle rail with the
     direction they are shouting from. */
  const RAIL_MAX = 3, PINNED_MS = 1900, RAIL_MS = 2900;

  function headPoint(mesh){
    const p = mesh.position.clone();
    p.y += (mesh.userData.headY || 1.4) + 0.3;
    return p;
  }

  /* Where is this voice relative to where you are looking? */
  function bearingTag(pos){
    const f = camera.getWorldDirection(new THREE.Vector3());
    const dx = pos.x - camera.position.x, dz = pos.z - camera.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const ahead = (f.x*dx + f.z*dz)/len;
    // right = forward × up = (-f.z, 0, f.x)
    const side = (-f.z*dx + f.x*dz)/len;
    if (ahead > .5) return '앞';
    if (ahead < -.5) return '뒤';
    return side > 0 ? '오른쪽' : '왼쪽';
  }

  function spawnSpeechBubble(speaker, override){
    let text = override;
    if (!text){
      // Five people shouting the identical line at once reads as a bug, not a gag.
      const live = new Set(speechBubbles.map(b=> b.text));
      const fresh = speaker.dialogue.filter(t=> !live.has(t));
      const pool = fresh.length ? fresh : speaker.dialogue;
      text = pool[Math.floor(Math.random()*pool.length)];
    }
    const head = headPoint(speaker.mesh);
    const ndc = head.clone().project(camera);
    // A little inside the edges, so a speaker half off screen reads as off screen.
    const onScreen = ndc.z <= 1 && Math.abs(ndc.x) < .92 && Math.abs(ndc.y) < .88;

    const el = document.createElement('div');
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = onScreen ? (speaker.label || '팀장님')
      : `${speaker.label || '팀장님'} · ${bearingTag(speaker.mesh.position)}`;
    el.appendChild(who);
    el.appendChild(document.createTextNode(text));

    if (onScreen){
      el.className = 'speech-bubble-3d';
      document.getElementById('screen-game').appendChild(el);
    } else {
      el.className = 'chatter';
      const rail = document.getElementById('chatter-rail');
      rail.appendChild(el);
      // Keep the rail short enough to read at a glance while sprinting.
      while (rail.children.length > RAIL_MAX){
        const oldest = rail.firstChild;
        speechBubbles = speechBubbles.filter(b=> b.el !== oldest);
        oldest.remove();
      }
    }
    speechBubbles.push({ el, speaker, text, pinned: onScreen,
      expireAt: performance.now() + (onScreen ? PINNED_MS : RAIL_MS) });
  }

  function updateSpeechBubbles(){
    const wrap = document.getElementById('game-canvas-wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const now = performance.now();
    speechBubbles = speechBubbles.filter(b=>{
      if (now > b.expireAt){ b.el.remove(); return false; }
      if (!b.pinned) return true;               // the rail lays itself out
      const p = headPoint(b.speaker.mesh).project(camera);
      if (p.z > 1){ b.el.style.display='none'; return true; }
      b.el.style.display='block';
      b.el.style.left = ((p.x*0.5+0.5)*w)+'px';
      b.el.style.top = ((-p.y*0.5+0.5)*h)+'px';
      return true;
    });
  }

  function clearChatter(){
    speechBubbles.forEach(b=> b.el.remove());
    speechBubbles = [];
    document.getElementById('chatter-rail').innerHTML = '';
  }

  /* ---- jump ---- */
  // Space를 누르면 땅에 있을 때만 위로 솟구치고, 중력으로 자연스럽게 내려온다.
  // 좌우/전후 이동과는 독립적으로 y축에만 영향을 줘서, 점프 중에도 WASD 이동이 그대로 먹힌다.
  /* Yaw defines both view and movement; pitch cannot skew strafing. */
  function updatePlayerMovement(dt){
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    const input = {
      right: Number(!!(keys.KeyD || keys.ArrowRight))-Number(!!(keys.KeyA || keys.ArrowLeft)),
      forward: Number(!!(keys.KeyW || keys.ArrowUp))-Number(!!(keys.KeyS || keys.ArrowDown)),
      sprint: keys.ShiftLeft || keys.ShiftRight,
    };
    const delta = FPSMovement.step(motion, input, yaw, dt);
    const body={...playerRig,velocity:verticalVelocity,grounded:isGrounded};
    OfficeTraversal.step(body,delta,jumpQueued,dt,WORLD.colliders,resolveCollision);
    playerRig.x=body.x;playerRig.y=body.y;playerRig.z=body.z;
    verticalVelocity=body.velocity;isGrounded=body.grounded;jumpQueued=false;
    // Keep the horizon level; only a subtle vertical footfall and sprint lens change.
    const speed = Math.hypot(motion.right,motion.forward);
    runPhase += speed*dt*1.8;
    const bob = isGrounded ? Math.sin(runPhase*2)*0.012*Math.min(1,speed/5.6) : 0;
    camera.position.set(playerRig.x, playerRig.y+bob, playerRig.z);
    const targetFov = motion.sprinting ? 83 : 78;
    camera.fov += (targetFov-camera.fov)*(1-Math.exp(-9*dt));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const hands = camera.getObjectByName('runnerHands');
    hands.position.y = bob*1.5 + (motion.sprinting ? -0.045 : 0);
    hands.rotation.z = Math.sin(runPhase)*0.012*Math.min(1,speed/5.6);
    const throwPhase=coffeeAnim>0?Math.sin((1-coffeeAnim/.55)*Math.PI):0;
    hands.rotation.x=-throwPhase*.85;hands.position.z=-throwPhase*.09;
    const surface=hands.getObjectByName('coffeeSurface');if(surface)surface.visible=coffeeCooldown===0;
  }

  function buildFirstPersonHands(){
    const hands=new THREE.Group();hands.name='runnerHands';camera.add(hands);
    const skin=styleMaterial(THREE,0xf2bf94),sleeve=styleMaterial(THREE,0x477980),cuff=styleMaterial(THREE,0xffeedb);
    // The cup, mitten grip and sleeve form a single authored pose and animate together.
    const grip=new THREE.Group();grip.position.set(.31,-.29,-.63);grip.rotation.z=-.10;hands.add(grip);
    const cup=buildCoffeeCup(THREE);cup.position.set(-.026,.04,-.015);grip.add(cup);
    const palm=styleMesh(THREE,grip,roundedShape(THREE,.103,.083,.033,.040),skin,.018,-.019,.066);
    styleMesh(THREE,grip,roundedShape(THREE,.043,.067,.020,.025),skin,-.058,.004,.059).rotation.z=-.35;
    const line=styleMaterial(THREE,0xd59477);
    for(const y of [-.012,-.029])styleCurve(THREE,grip,[[-.015,y,.092],[.018,y-.003,.094],[.045,y,.086]],line,.0015);
    const arm=new THREE.Group();arm.position.set(.37,-.32,-.55);arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(.20,-.30,.40).normalize());hands.add(arm);
    styleMesh(THREE,arm,tailorGeometry([[0,.035,.033],[.04,.043,.040]],THREE),cuff);
    styleMesh(THREE,arm,tailorGeometry([[.03,.045,.041],[.14,.059,.052],[.36,.078,.065],[.55,.085,.070]],THREE),sleeve);
  }
  function updateCoffee(dt){
    coffeeCooldown=Math.max(0,coffeeCooldown-dt);coffeeAnim=Math.max(0,coffeeAnim-dt);
    if(coffeeQueued && coffeeCooldown===0){
      coffeeCooldown=CoffeeAbility.COOLDOWN;coffeeAnim=.55;
      const forward=camera.getWorldDirection(new THREE.Vector3());
      const origin={x:playerRig.x,y:playerRig.y-.18,z:playerRig.z};
      const candidates=bosses.map(b=>({x:b.mesh.position.x,y:b.mesh.userData.headY*.65,z:b.mesh.position.z,boss:b}));
      const hits=CoffeeAbility.targets(origin,forward,candidates,WORLD.colliders);
      hits.forEach(({boss:b})=>{b.stun=Math.max(b.stun||0,CoffeeAbility.STUN);spawnSpeechBubble(b,'앗 차가워! 보고서보다 커피가 먼저야?!');});
      const toast=document.getElementById('ability-toast');toast.textContent=hits.length?`커피 명중! ${hits.length}명 3초 정지 — 지금 옆으로 빠져요!`:'커피가 빗나갔어요 — 가까운 팀장님을 향해 쏟으세요';toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');
      const g=new THREE.InstancedMesh(new THREE.SphereGeometry(.034,8,6),styleMaterial(THREE,0x9f673d),28),particles=[];
      const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
      for(let i=0;i<28;i++){const spread=(i%7-3)*.38,v=forward.clone().multiplyScalar(6+i%4).addScaledVector(right,spread);v.y+=1.1+(i%3)*.3;particles.push({p:new THREE.Vector3(origin.x,origin.y,origin.z).addScaledVector(forward,.35),v});}
      scene.add(g);splashes.push({mesh:g,particles,life:.55});
    }
    coffeeQueued=false;
    for(let i=splashes.length-1;i>=0;i--){const s=splashes[i];s.life-=dt;
      if(s.life<=0){scene.remove(s.mesh);disposeMesh(s.mesh);splashes.splice(i,1);continue;}
      const matrix=new THREE.Matrix4();s.particles.forEach((p,j)=>{const next=p.p.clone().addScaledVector(p.v,dt);if(CoffeeAbility.blocked(p.p,next,WORLD.colliders)){p.v.set(0,0,0);}else p.p.copy(next);p.v.y-=9*dt;matrix.makeTranslation(p.p.x,p.p.y,p.p.z);s.mesh.setMatrixAt(j,matrix);});s.mesh.instanceMatrix.needsUpdate=true;s.mesh.computeBoundingSphere();
    }
    document.getElementById('coffee-status').textContent=coffeeCooldown>0?coffeeCooldown.toFixed(1)+'s 후 리필':'쏟기 준비';
    document.getElementById('coffee-fill').style.width=(100*(1-coffeeCooldown/CoffeeAbility.COOLDOWN))+'%';
  }

  /* ---- 사장님 호출 (Q) ----
     팀장님 위에는 사장님이 있다. 이 게임의 유일한 필살기는 권력을 쓰는 게 아니라
     더 큰 권력을 빌리는 것이다. 사장님이 화면에 나오지는 않는다. 사내 방송만 나가고,
     그 한 줄에 모든 팀장님이 추격을 버리고 회의실로 뛴다. 모드와 맵이 달라도 동일하다. */
  const SUMMON_LINES = {
    obey: ['아 사장님이 부르신다', '저 지금 회의 들어갑니다', '이거 제가 하려던 거였어요',
           '네 바로 가겠습니다', '아 그건 제가 챙기고 있었습니다', '잠깐만요, 이따 봬요'],
    // A five-year-old has no idea who that is, which is the entire point of baby mode.
    baby: ['사장님이 뭔데!!', '누구야 저 아저씨!!', '안경 내놔!!', '저거 내 거야!!'],
    seated: ['이게 왜 제 탓이죠', '그건 제 R&R이 아닌데요', '지금 화면 공유 되나요',
             '다음 안건으로 넘어가시죠', '아 네 네 네'],
    rage: ['회의 두 시간 했다', '누가 사장님 불렀어', '야근 확정이야',
           '이제 진짜 안 놔줘', '내 저녁 돌려놔'],
    babyRage: ['아저씨 도망갔어!!', '재밌다!! 또 해줘!!', '이제 안 놔줄 거야!!'],
    chiefFive: ['다들 잠깐 회의실로 오시죠', '주간 보고, 지금 바로 하죠', '김 팀장, 그 건은요?'],
    chiefBaby: ['어어 왜 이래 이거', '누구 앤가 이거!', '나 사장인데?! 나 사장이라고!!'],
  };

  const isBabyMode = ()=> state.mode === 'baby';
  function pickLine(pool){ const l = SUMMON_LINES[pool]; return l[Math.floor(Math.random()*l.length)]; }
  function summonLine(boss, pool){
    if (pool === 'obey' && boss.mesh.userData.isBaby) return pickLine('baby');
    if (pool === 'rage' && boss.mesh.userData.isBaby) return pickLine('babyRage');
    return pickLine(pool);
  }

  function showCutIn(kicker, headline, detail){
    const el = document.getElementById('summon-cutin');
    el.querySelector('span').textContent = kicker;
    el.querySelector('strong').textContent = headline;
    el.querySelector('em').textContent = detail;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  /* ---- the 사장님 himself ---- */
  function spawnChief(x, z, faceX, faceZ, flee){
    despawnChief();
    const mesh = buildBossMesh(CHIEF_LOOK, THREE);
    mesh.scale.multiplyScalar(CHIEF_SCALE);
    // Recolour this instance's accent material only. Every build makes its own materials,
    // so the gold tie never leaks onto the 팀장님 standing next to him.
    mesh.userData.tie.traverse(o=>{ if (o.material) o.material.color.setHex(CHIEF_GOLD); });
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.atan2(faceX - x, faceZ - z);
    scene.add(mesh);
    chief = { mesh, dialogue: [], label: '사장님', target: null, flee: !!flee,
      lastBubbleAt: 0, turn: 1, stuck: 0 };
    return chief;
  }
  function despawnChief(){
    if (!chief) return;
    scene.remove(chief.mesh); disposeMesh(chief.mesh); chief = null;
  }

  /* He is not a pathfinder, he is a panicking man. Rather than plan a route he probes
     ahead and swings to the first heading that is open, keeping the same turning
     direction so he wall-follows out of a bay instead of jittering in the corner. */
  // The probe clearance must stay under the .4 radius he actually moves with. Probing
  // wider than he is means a spot he can legally stand in reads as blocked from every
  // heading, and he just grinds into the furniture instead of turning away from it.
  const CHIEF_PROBE = 1.7, CHIEF_CLEARANCE = .34;
  function chiefHeading(from, toward){
    const base = Math.atan2(toward.x, toward.z);
    const turn = chief.turn || 1;
    const offsets = [0];
    for (const step of [.45,.9,1.35,1.9,2.45]) offsets.push(turn*step, -turn*step);
    offsets.push(Math.PI);
    // Full stride first; if everything is tight, accept a shorter opening.
    for (const reach of [CHIEF_PROBE, CHIEF_PROBE*.5]){
      for (const off of offsets){
        const a = base + off;
        const probe = { x: from.x + Math.sin(a)*reach, z: from.z + Math.cos(a)*reach };
        if (navigation.clear(from, probe, CHIEF_CLEARANCE)){
          if (off !== 0) chief.turn = off > 0 ? 1 : -1;
          return { x: Math.sin(a), z: Math.cos(a) };
        }
      }
    }
    // Wedged inside geometry: let collision resolution point the way back out.
    const out = resolveCollision(from.x, from.z, .62);
    const ox = out.x - from.x, oz = out.z - from.z, olen = Math.hypot(ox, oz);
    if (olen > 1e-4) return { x: ox/olen, z: oz/olen };
    return { x: Math.sin(base), z: Math.cos(base) };
  }

  function updateChief(dt, elapsedSec){
    if (!chief) return;
    let moved = 0;
    if (chief.flee && chief.target && summon.phase === 'tantrum'){
      const from = { x: chief.mesh.position.x, z: chief.mesh.position.z };
      let dx = chief.target.x - from.x, dz = chief.target.z - from.z;
      let len = Math.hypot(dx, dz);
      // Made it to one end of the floor? Turn round and run for the other one.
      if (len < 1.5){
        chief.target = OfficeSummon.fleeTarget(from, FLOOR_EXITS);
        dx = chief.target.x - from.x; dz = chief.target.z - from.z; len = Math.hypot(dx, dz) || 1;
      }
      const dir = chiefHeading(from, { x: dx/len, z: dz/len });
      const step = OfficeSummon.CHIEF_SPEED * dt;
      const resolved = resolveCollision(from.x + dir.x*step, from.z + dir.z*step, .4);
      chief.mesh.position.x = resolved.x; chief.mesh.position.z = resolved.z;
      moved = Math.hypot(resolved.x - from.x, resolved.z - from.z) / Math.max(dt, .001);

      // Still grinding after a moment: he picked the wrong way round, so try the other.
      if (moved < OfficeSummon.CHIEF_SPEED * .3){
        chief.stuck += dt;
        if (chief.stuck > .35){ chief.turn = -(chief.turn || 1); chief.stuck = 0; }
      } else chief.stuck = 0;

      const angle = Math.atan2(dir.x, dir.z) - chief.mesh.rotation.y;
      chief.mesh.rotation.y += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1-Math.exp(-10*dt));
    }
    animateBossMesh(chief.mesh, elapsedSec, moved, false);
    chief.mesh.position.y = 0;

    const now = performance.now();
    if (now - chief.lastBubbleAt > 2400 + Math.random()*1200){
      chief.lastBubbleAt = now;
      spawnSpeechBubble(chief, pickLine(isBabyMode() ? 'chiefBaby' : 'chiefFive'));
    }
  }

  function sealDoors(room){
    clearDoors();
    if (!room) return;
    const material = WORLD.glassMaterial;
    if (!material) return;
    room.doors.forEach(d=>{
      const panel = new THREE.Mesh(new THREE.BoxGeometry(.07, 3.1, 2), material);
      panel.position.set(d.x, 1.6, d.z);
      scene.add(panel);
      summonDoors.push(panel);
    });
  }
  function clearDoors(){
    summonDoors.forEach(p=>{ scene.remove(p); p.geometry.dispose(); });
    summonDoors = [];
  }

  function startSummon(){
    const baby = isBabyMode();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    const room = baby ? null : OfficeSummon.aimRoom(WORLD.meetingRooms, playerRig, {x:forward.x, z:forward.z});
    if (!OfficeSummon.start(summon, baby ? 'baby' : 'five', room)) return;

    bosses.forEach(b=>{ b.stun = 0; b.lastBubbleAt = 0; });

    if (baby){
      // He walks out between the toddler and you, which is exactly the wrong place to stand.
      const kid = bosses[0];
      const kx = kid ? kid.mesh.position.x : playerRig.x, kz = kid ? kid.mesh.position.z : playerRig.z;
      const dx = playerRig.x - kx, dz = playerRig.z - kz, len = Math.hypot(dx,dz) || 1;
      // Between the two of you, but never so close that he fills the screen. If the
      // toddler is already on top of you he simply appears beside it.
      const out = Math.min(2.8, Math.max(0, len - 3));
      const spot = resolveCollision(kx + dx/len*out, kz + dz/len*out, .4);
      spawnChief(spot.x, spot.z, kx, kz, true);
      // He runs for whichever end of the floor is furthest from YOU, not from him, so the
      // chase he drags along goes away from the player instead of straight back over them.
      chief.target = OfficeSummon.fleeTarget(playerRig, FLOOR_EXITS);
      bosses.forEach(b=>{ b.spot = null; spawnSpeechBubble(b, summonLine(b,'obey')); });
      showCutIn('사내 전체 방송', '사장님 등장', '…5살 팀장님은 사장님이 누군지 모릅니다');
      return;
    }

    // Nearest free standing spot each, so five people do not pile onto one chair.
    const usable = room ? room.spots.filter(s=> navigation.clear(s,s)) : [];
    const spots = usable.length ? usable : (room ? [room.muster] : []);
    const picked = OfficeSummon.assign(spots, bosses.map(b=>({x:b.mesh.position.x, z:b.mesh.position.z})));
    // Half speak now and half once seated, so five bubbles never stack on one frame.
    bosses.forEach((b,i)=>{
      b.spot = picked[i] || (room ? room.muster : null);
      if (i % 2 === 0) spawnSpeechBubble(b, summonLine(b, 'obey'));
    });
    if (room) spawnChief(room.host.x, room.host.z, room.x, room.z, false);

    showCutIn('사내 전체 방송', '사장님 긴급 소집',
      room ? `전원 ${room.name}로 — 지금 바로` : '전원 회의실로 — 지금 바로');
  }

  function enterSummonPhase(phase, room){
    if (phase === 'tantrum'){
      showCutIn('예상 밖', '사장님 도주', '둘이 붙어 있는 동안 최대한 멀리 가세요');
    }
    if (phase === 'meeting'){
      sealDoors(room);
      bosses.forEach((b,i)=>{ if (i % 2 === 1 || bosses.length === 1) spawnSpeechBubble(b, summonLine(b,'seated')); });
      showCutIn('진행 중', '문이 닫혔습니다', '회의가 끝나기 전에 최대한 멀리 가세요');
    }
    if (phase === 'idle'){
      clearDoors();
      despawnChief();
      // The interest on borrowed authority: permanently faster, compounding per call.
      bosses.forEach(b=>{
        b.rageMult = OfficeSummon.rage(b.rageMult);
        b.spot = null;
        spawnSpeechBubble(b, summonLine(b,'rage'));
      });
      const pct = Math.round((bosses[0] ? bosses[0].rageMult : 1) * 100);
      showCutIn(isBabyMode() ? '상황 종료' : '회의 종료', '팀장님 복귀',
        `이제부터 끝까지 ${pct}% 속도입니다`);
      navigationClock = 0;  // point the shared field back at the player on the next frame
    }
  }

  function updateSummon(dt, minDist, elapsedSec){
    OfficeSummon.gain(summon, dt, minDist);
    if (abilityQueued && OfficeSummon.ready(summon)) startSummon();
    abilityQueued = false;

    if (OfficeSummon.active(summon)){
      const room = summon.room;
      updateChief(dt, elapsedSec);
      const settled = bosses.every(b=> !b.spot ||
        Math.hypot(b.mesh.position.x-b.spot.x, b.mesh.position.z-b.spot.z) < OfficeSummon.ARRIVE_RADIUS);
      const entered = OfficeSummon.advance(summon, dt, settled);
      if (entered) enterSummonPhase(entered, room);
    }

    const card = document.getElementById('ability-card');
    const ready = OfficeSummon.ready(summon);
    card.classList.toggle('ready', ready);
    card.classList.toggle('firing', OfficeSummon.active(summon));
    document.getElementById('ult-fill').style.width = (summon.charge*100)+'%';
    document.getElementById('ability-status').textContent = OfficeSummon.active(summon)
      ? '소집 중' : ready ? '호출 가능' : Math.floor(summon.charge*100)+'%';
  }

  /* ---- shared navigation field, smooth turning and collision-safe pursuit ---- */
  function updateBosses(dt, elapsedSec){
    let minDist = Infinity;
    const summoning = OfficeSummon.active(summon), room = summon.room, phase = summon.phase;

    navigationClock-=dt;
    if(navigationClock<=0){
      if(summoning && summon.mode==='baby' && chief){
        // The toddler has a new favourite target and it is not you.
        chaseTarget={x:chief.mesh.position.x,z:chief.mesh.position.z};
      } else if(summoning && room){
        // While the floor is being summoned, the shared field points at the meeting
        // room instead of the player. One search still serves every pursuer.
        chaseTarget=room.muster;
      } else {
        chaseTarget=playerRig;
        // A player on a desk has no walkable grid cell. Pursuers approach its edge.
        const feet=playerRig.y-PLAYER_HEIGHT;
        if(OfficeTraversal.support(playerRig.x,playerRig.z,WORLD.colliders,feet+.03)>.3){
          let best=Infinity;
          for(let r=.65;r<3;r+=.25)for(let i=0;i<20;i++){
            const a=i*Math.PI/10,p={x:playerRig.x+Math.sin(a)*r,z:playerRig.z+Math.cos(a)*r};
            if(!navigation.clear(p,p))continue;
            const score=r+Math.min(...bosses.map(b=>Math.hypot(b.mesh.position.x-p.x,b.mesh.position.z-p.z)))*.08;
            if(score<best){best=score;chaseTarget=p;}
          }
        }
      }
      navigation.update(chaseTarget);navigationClock=.20;
    }

    bosses.forEach(boss=>{
      const dx = playerRig.x - boss.mesh.position.x;
      const dz = playerRig.z - boss.mesh.position.z;
      const dist = Math.hypot(dx,dz);
      boss.stun = Math.max(0, (boss.stun || 0)-dt);

      let goal = chaseTarget || playerRig, curSpeed = 0, frozen = false, faceTarget = null;

      if (summoning){
        // Nobody gets caught while the ultimate is running. That is the point of it.
        // Standing still here means standing, not the dazed coffee pose: curSpeed stays 0
        // and `frozen` stays false, so they keep a neutral idle instead of splayed arms.
        if (summon.mode === 'baby'){
          // Chase the 사장님 instead of the player, at the toddler's own speed.
          goal = chaseTarget || goal;
          if (phase !== 'arrive') curSpeed = boss.baseSpeed * (boss.rageMult || 1);
          else if (chief) faceTarget = {x:chief.mesh.position.x, z:chief.mesh.position.z};
        } else {
          const spot = boss.spot || (room ? room.muster : null);
          goal = spot || goal;
          const left = spot ? Math.hypot(boss.mesh.position.x-spot.x, boss.mesh.position.z-spot.z) : Infinity;
          if (phase === 'arrive'){
            // stopped mid-stride by the announcement
          } else if (left < OfficeSummon.ARRIVE_RADIUS){
            if (room) faceTarget = room.host;     // in the room, turned to the closed door
          } else {
            // Latecomers keep hurrying even after the meeting starts, so nobody is left
            // frozen in the open corridor looking like the game stalled.
            curSpeed = OfficeSummon.GATHER_SPEED;
          }
        }
      } else {
        // speed ramps up slightly over time (pressure increases), but slowly so the
        // early game gives the player room to learn the map without being rushed
        const rampMult = 1 + Math.min(0.3, elapsedSec/60);
        const feet=playerRig.y-PLAYER_HEIGHT,onFurniture=OfficeTraversal.support(playerRig.x,playerRig.z,WORLD.colliders,feet+.03)>.3;
        const reachClear=onFurniture?!CoffeeAbility.blocked({x:boss.mesh.position.x,y:boss.mesh.userData.headY,z:boss.mesh.position.z},playerRig,WORLD.colliders):navigation.clear(boss.mesh.position,playerRig,0);
        if(!(boss.stun>0) && feet<1.45 && reachClear)minDist=Math.min(minDist,dist-(onFurniture?.55:0));
        frozen = boss.stun > 0;
        curSpeed = frozen ? 0 : boss.baseSpeed * rampMult * (boss.rageMult || 1);
      }

      const oldX=boss.mesh.position.x,oldZ=boss.mesh.position.z;
      // Straight in once the spot is in sight; otherwise ride the shared field to the room.
      const steer = (summoning && boss.spot && navigation.clear(boss.mesh.position, boss.spot))
        ? boss.spot : navigation.waypoint(boss.mesh.position, goal);
      const aim = faceTarget || steer;
      const tx=steer.x-boss.mesh.position.x,tz=steer.z-boss.mesh.position.z,len=Math.hypot(tx,tz);
      const nx=len>1e-6?tx/len:0,nz=len>1e-6?tz/len:0;

      if (curSpeed > 0 && len > 1e-6){
        const mx = nx*Math.min(len,curSpeed*dt);
        const mz = nz*Math.min(len,curSpeed*dt);
        const bossRadius = 0.4;
        const steps = Math.max(1, Math.ceil(Math.hypot(mx,mz) / (bossRadius*0.5)));
        for (let i=0; i<steps; i++){
          const resolved = resolveCollision(boss.mesh.position.x+mx/steps, boss.mesh.position.z+mz/steps, bossRadius);
          boss.mesh.position.x = resolved.x;
          boss.mesh.position.z = resolved.z;
        }
      }

      // face where they are headed, or the closed door while the meeting runs
      const fx=aim.x-boss.mesh.position.x,fz=aim.z-boss.mesh.position.z;
      if (Math.hypot(fx,fz) > .01){
        const desired=Math.atan2(fx,fz),angle=desired-boss.mesh.rotation.y;
        boss.mesh.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*(1-Math.exp(-12*dt));
      }

      // Animate from actual displacement so blocked pursuers do not run in place.
      animateBossMesh(boss.mesh, elapsedSec, Math.hypot(boss.mesh.position.x-oldX,boss.mesh.position.z-oldZ)/Math.max(dt,.001), frozen);
      boss.mesh.position.y = 0;

      const now = performance.now();
      if (!summoning && dist < 12 && boss.stun === 0 && now - boss.lastBubbleAt > 2200 + Math.random()*1800){
        boss.lastBubbleAt = now;
        spawnSpeechBubble(boss, (boss.rageMult > 1 && Math.random() < .45) ? summonLine(boss,'rage') : undefined);
      }
    });

    return minDist;
  }

  /* ---- HUD ---- */
  function updateHUD(minDist, remainingSec){
    const maxRelevantDist = 9;
    const pct = Math.max(0, Math.min(100, (1 - (minDist/maxRelevantDist)) * 100));
    document.getElementById('gauge-fill').style.width = pct + '%';
    document.getElementById('stamina-fill').style.width = (motion.stamina*100)+'%';
    document.getElementById('stamina-label').textContent = motion.exhausted ? '숨 고르는 중' : '퇴근 체력';
    const mult = bosses.reduce((m,b)=> Math.max(m, b.rageMult || 1), 1);
    document.getElementById('danger-label').textContent =
      OfficeSummon.active(summon)
        ? (summon.mode === 'baby' ? '사장님이 대신 쫓기는 중 — 지금 도망치세요' : '전원 회의 중 — 지금 도망치세요')
      : mult > 1 ? `팀장님 속도 ${Math.round(mult*100)}% — 끝까지 이대로입니다`
      : minDist < 3 ? (OfficeSummon.ready(summon) ? '가까워요! Q로 사장님을 부르세요' : '가까워요! 좌클릭으로 커피를 쏟으세요')
      : minDist < 7 ? '팀장님 접근 중'
      : '오늘의 목표: 끝까지 버티기';
    document.getElementById('timer-label').textContent = Math.max(0,remainingSec).toFixed(1) + 's';
    return pct;
  }

  /* ---- main game flow ---- */
  function startGame3D(){
    showScreen('screen-game');
    document.getElementById('flash-red').classList.remove('go');
    document.getElementById('pointer-hint').classList.remove('hidden');
    document.getElementById('hud-label').textContent = state.mode==='baby' ? '추격 거리' : '포위 거리';
    document.getElementById('tap-instruction').textContent = 'WASD / 방향키 이동 · 마우스 시점 · Shift 질주 · Space 책상 넘기 · 좌클릭/F 커피 · Q 사장님 호출 · ESC 일시정지';

    if (!scene) initThree();
    spawnPlayer();
    spawnBosses();
    lastMinDist = Infinity;
    navigation.update(playerRig);navigationClock=0;
    updateHUD(Infinity, state.mode === 'baby' ? 42 : 50);
    const card = document.getElementById('ability-card');
    card.classList.remove('ready','firing');
    document.getElementById('ability-sub').textContent = state.mode === 'baby'
      ? '5살 팀장님은 사장님을 모릅니다' : '바라보는 회의실로 전원 소집';
    document.getElementById('ability-status').textContent = Math.floor(summon.charge*100)+'%';
    document.getElementById('ult-fill').style.width = (summon.charge*100)+'%';
    document.getElementById('summon-cutin').classList.remove('show');
    document.getElementById('coffee-status').textContent='쏟기 준비';document.getElementById('coffee-fill').style.width='100%';
    document.getElementById('ability-toast').classList.remove('show');
    clearChatter();

    gameActive = true;
    gameDuration = state.mode === 'baby' ? 42000 : 50000;
    lastFrameTime = performance.now();

    if (gameRafId) cancelAnimationFrame(gameRafId);
    runGameLoop3D();
  }

  function runGameLoop3D(){
    function frame(now){
      if (!gameActive) return;
      const dt = Math.min(0.05, (now - lastFrameTime)/1000);
      lastFrameTime = now;
      if (!mouseLocked || document.hidden){
        renderer.render(scene,camera);
        gameRafId = requestAnimationFrame(frame);
        return;
      }
      elapsedGame += dt*1000;
      const elapsed = elapsedGame;
      const elapsedSec = elapsed/1000;
      const remainingSec = (gameDuration - elapsed)/1000;

      // View, movement, ability and pursuit advance together only during active play.
      updatePlayerMovement(dt);
      updateWorldLighting(playerRig.x,playerRig.z);
      updateSummon(dt, lastMinDist, elapsedSec);
      updateCoffee(dt);

      const minDist = updateBosses(dt, elapsedSec);
      lastMinDist = minDist;
      updateSpeechBubbles();
      const pct = updateHUD(minDist, remainingSec);

      const stage = document.getElementById('screen-game');
      if (pct > 55) stage.style.filter = 'saturate(1.15)'; else stage.style.filter = '';

      renderer.render(scene, camera);

      if (minDist < 0.95){
        endGame3D(false, elapsed);
        return;
      }
      if (elapsed >= gameDuration){
        endGame3D(true, elapsed);
        return;
      }

      gameRafId = requestAnimationFrame(frame);
    }
    gameRafId = requestAnimationFrame(frame);
  }

  function endGame3D(survived, elapsedMs){
    gameActive = false;
    clearChatter();
    clearDoors();
    document.getElementById('summon-cutin').classList.remove('show');
    cancelAnimationFrame(gameRafId);
    if (document.pointerLockElement) document.exitPointerLock();
    if (!survived){
      const f = document.getElementById('flash-red');
      f.classList.remove('go');
      requestAnimationFrame(()=> f.classList.add('go'));
    }
    setTimeout(()=> showResult3D(survived, elapsedMs), survived ? 200 : 500);
  }

  function showResult3D(survived, elapsedMs){
    const tag = document.getElementById('result-tag');
    const title = document.getElementById('result-title');
    const desc = document.getElementById('result-desc');
    const stats = document.getElementById('result-stats');
    const seconds = (elapsedMs/1000).toFixed(1);

    tag.style.color = survived ? '#ffd23f' : '#ff3b30';

    const calls = summon.uses;
    const finalMult = bosses.reduce((m,b)=> Math.max(m, b.rageMult || 1), 1);
    if (state.mode === 'baby'){
      if (survived){
        tag.textContent = '생존 성공';
        title.textContent = '칼퇴 달성 🎉';
        desc.textContent = calls
          ? '5살 팀장님은 사장님이 누군지 몰랐고, 사장님은 그걸 알기 전에 도망쳤습니다. 그 틈에 당신은 나왔습니다.'
          : '사장님 한 번 안 부르고 혼자 힘으로 다섯 살을 따돌렸습니다. 이런 날도 있어야죠.';
      } else {
        tag.textContent = '포획됨';
        title.textContent = '다리 붙잡힘 👶';
        desc.textContent = calls
          ? '사장님을 쫓다 신이 난 5살 팀장님이 더 빨라져서 돌아왔습니다. 빌린 권력에는 이자가 붙습니다.'
          : '책상 모서리에서 살짝 막힌 틈에 따라잡혔습니다. Q를 아껴서 뭐 하려고요.';
      }
    } else {
      if (survived){
        tag.textContent = '생존 성공';
        title.textContent = '포위망 탈출 🎉';
        desc.textContent = calls
          ? '다섯 명이 회의실 유리 안에 갇혀 있는 동안 당신은 문밖에 있었습니다. 사다리는 위로 갈수록 유용합니다.'
          : '사장님을 한 번도 안 부르고 다섯 명을 따돌렸습니다. 이건 그냥 실력입니다.';
      } else {
        tag.textContent = '포위됨';
        title.textContent = '5중 합류 직격 🧑‍💼×5';
        desc.textContent = calls
          ? '회의가 끝났고, 다섯 명 전부 당신을 찾고 있었습니다. 소집할 회의실 방향을 잘 보세요.'
          : '한 명을 피하려다 다른 한 명과 정면으로 마주쳤습니다.';
      }
    }

    stats.innerHTML = `
      <div class="stat-pill"><div class="num">${seconds}s</div><div class="lab">버틴 시간</div></div>
      <div class="stat-pill"><div class="num">${state.mode==='baby'?'1':'5'}</div><div class="lab">상대 인원</div></div>
      <div class="stat-pill"><div class="num">${calls}</div><div class="lab">사장님 호출</div></div>
      <div class="stat-pill"><div class="num">${Math.round(finalMult*100)}%</div><div class="lab">최종 추격 속도</div></div>
    `;

    showScreen('screen-result');
  }

  document.getElementById('btn-result-retry').addEventListener('click', ()=>{
    showScreen('screen-game');
    startGame3D();
  });
  document.getElementById('btn-result-mode').addEventListener('click', ()=>{
    showScreen('screen-select');
  });

})();
