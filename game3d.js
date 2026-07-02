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
        state.fiveAvatars = Array.from({length:5}, ()=> randomAvatarOpts3D(false));
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
    custScene.background = new THREE.Color(0x3a2c1e);

    custCamera = new THREE.PerspectiveCamera(40, zone.clientWidth/zone.clientHeight, 0.1, 10);
    custCamera.position.set(0, 1.0, 3.2);
    custCamera.lookAt(0, 0.85, 0);

    custRenderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    custRenderer.setSize(zone.clientWidth, zone.clientHeight);
    custRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    zone.appendChild(custRenderer.domElement);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2,3,2);
    custScene.add(key);
    const fill = new THREE.AmbientLight(0xffffff, 1.0);
    custScene.add(fill);
    const rim = new THREE.DirectionalLight(0xffb88c, 0.6);
    rim.position.set(-2,1,-2);
    custScene.add(rim);

    // simple ground disc
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.6,24), new THREE.MeshStandardMaterial({color:0x5a4836}));
    ground.rotation.x = -Math.PI/2;
    custScene.add(ground);

    rebuildCustMesh();

    function loop(){
      custRafId = requestAnimationFrame(loop);
      if (custMesh) custMesh.rotation.y += 0.012;
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

  function rebuildCustMesh(){
    if (custMesh){ custScene.remove(custMesh); }
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
  let gameStartTime = 0;
  let gameDuration = 0;
  let lastFrameTime = 0;
  let mouseLocked = false;
  let sprintAvailable = 1.0; // 0..1 stamina-ish, simple cooldown
  let gameRafId = null;
  let speechBubbles = []; // {el, mesh}

  const PLAYER_RADIUS = 0.32;
  const PLAYER_HEIGHT = 1.65;
  const PLAYER_BASE_SPEED = 4.6;
  const PLAYER_SPRINT_MULT = 1.55;
  const JUMP_VELOCITY = 4.0;
  const GRAVITY = 11.0;
  let verticalVelocity = 0;
  let isGrounded = true;

  function initThree(){
    const wrap = document.getElementById('game-canvas-wrap');
    wrap.innerHTML = '';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xc8b89a);
    scene.fog = new THREE.Fog(0xc8b89a, 14, 42);

    camera = new THREE.PerspectiveCamera(70, wrap.clientWidth/wrap.clientHeight, 0.05, 80);

    renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    wrap.appendChild(renderer.domElement);

    buildWorld(scene, THREE);

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
    if (el.requestPointerLock) el.requestPointerLock();
  }

  document.addEventListener('pointerlockchange', ()=>{
    mouseLocked = document.pointerLockElement === canvasWrapEl();
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
    pitch = Math.max(-1.0, Math.min(1.0, pitch));
  });

  const MOVE_KEYS = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space']);
  window.addEventListener('keydown', (e)=>{
    keys[e.code] = true;
    if (gameActive && MOVE_KEYS.has(e.code)){
      e.preventDefault();
      // 키보드로 바로 움직이기 시작하면 클릭 안내 오버레이는 더 이상 필요 없으니 치워준다.
      document.getElementById('pointer-hint').classList.add('hidden');
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
    keys = {};
  });
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) keys = {};
  });

  /* ---- player & boss setup ---- */
  function spawnPlayer(){
    yaw = 0; pitch = 0;
    verticalVelocity = 0;
    isGrounded = true;
    playerRig = { x:0, z: 2.5, y: PLAYER_HEIGHT };
    camera.position.set(playerRig.x, playerRig.y, playerRig.z);
  }

  function spawnBosses(){
    bosses.forEach(b=> scene.remove(b.mesh));
    bosses = [];

    if (state.mode === 'baby'){
      const mesh = buildBossMesh(state.babyAvatar, THREE);
      mesh.position.set(0, 0, -14);
      scene.add(mesh);
      bosses.push({
        mesh, baseSpeed: 3.8, speed:3.8, catchDist: 0.85,
        lastBubbleAt: 0, dialogue: DIALOGUE3D.baby,
      });
    } else {
      // 십자 교차로(z≈-24)는 폭이 다른 구간이라 피하고, 메인 복도 + 오픈 큐비클존 입구 쪽에 분산
      const startZ = [-10, -16, -38, -44, -64];
      const startX = [-2.0, 2.0, -1.5, 1.8, 0];
      state.fiveAvatars.forEach((opts,i)=>{
        const mesh = buildBossMesh(opts, THREE);
        mesh.position.set(startX[i], 0, startZ[i]);
        scene.add(mesh);
        bosses.push({
          mesh, baseSpeed: 2.6 + Math.random()*0.4, speed:2.6, catchDist: 0.85,
          lastBubbleAt: 0, dialogue: DIALOGUE3D.five,
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

  /* ---- speech bubble (HTML overlay projected from 3D head position) ---- */
  function spawnSpeechBubble(boss){
    const text = boss.dialogue[Math.floor(Math.random()*boss.dialogue.length)];
    const el = document.createElement('div');
    el.className = 'speech-bubble-3d';
    el.textContent = text;
    el.style.position = 'absolute';
    el.style.background = '#fff3df';
    el.style.color = '#1a1106';
    el.style.fontWeight = '800';
    el.style.fontSize = '12px';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '10px';
    el.style.maxWidth = '140px';
    el.style.textAlign = 'center';
    el.style.lineHeight = '1.3';
    el.style.zIndex = '350';
    el.style.transform = 'translate(-50%,-100%)';
    el.style.pointerEvents = 'none';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,.4)';
    document.getElementById('screen-game').appendChild(el);
    speechBubbles.push({ el, boss, expireAt: performance.now()+1500 });
  }

  function updateSpeechBubbles(){
    const wrap = document.getElementById('game-canvas-wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const now = performance.now();
    speechBubbles = speechBubbles.filter(b=>{
      if (now > b.expireAt){ b.el.remove(); return false; }
      const headPos = b.boss.mesh.position.clone();
      headPos.y += (b.boss.mesh.userData.headY || 1.4) + 0.3;
      headPos.project(camera);
      if (headPos.z > 1){ b.el.style.display='none'; return true; }
      b.el.style.display='block';
      const sx = (headPos.x*0.5+0.5)*w;
      const sy = (-headPos.y*0.5+0.5)*h;
      b.el.style.left = sx+'px';
      b.el.style.top = sy+'px';
      return true;
    });
  }

  /* ---- jump ---- */
  // Space를 누르면 땅에 있을 때만 위로 솟구치고, 중력으로 자연스럽게 내려온다.
  // 좌우/전후 이동과는 독립적으로 y축에만 영향을 줘서, 점프 중에도 WASD 이동이 그대로 먹힌다.
  function updateJump(dt){
    if (keys['Space'] && isGrounded){
      verticalVelocity = JUMP_VELOCITY;
      isGrounded = false;
    }

    if (!isGrounded || verticalVelocity !== 0){
      verticalVelocity -= GRAVITY * dt;
      playerRig.y += verticalVelocity * dt;
      if (playerRig.y <= PLAYER_HEIGHT){
        playerRig.y = PLAYER_HEIGHT;
        verticalVelocity = 0;
        isGrounded = true;
      }
    }
  }

  /* ---- movement & collision ---- */
  // 표준 FPS 방식 (Unity/Unreal/Source 엔진과 동일한 접근): W는 항상 카메라가
  // 보는 방향, S는 반대, A/D는 그 기준 좌우다.
  //
  // forward/right를 직접 삼각함수나 cross product로 "계산"하지 않고,
  // 카메라의 실제 변환 행렬(matrixWorld)에서 곧바로 "추출"한다.
  // 4x4 변환행렬의 구조상 첫 번째 컬럼이 그 객체의 로컬 X축(=right),
  // 세 번째 컬럼이 로컬 Z축인데 카메라는 기본적으로 -Z를 바라보므로
  // forward = -해당 컬럼이다. 이건 임의로 만든 공식이 아니라 3D 변환행렬의
  // 정의 그 자체이므로 부호가 틀릴 수 없다.
  function updatePlayerMovement(dt){
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.updateMatrixWorld();

    const e = camera.matrixWorld.elements;
    // matrixWorld는 column-major이므로 elements[0..2]가 로컬 X축(right), elements[8..10]이 로컬 Z축.
    const rightX = e[0], rightZ = e[2];
    let fwdX = -e[8], fwdZ = -e[10]; // 카메라는 -Z를 바라보므로 부호 반전

    // forward의 수평(XZ) 성분 길이는 pitch(위/아래 시점)에 따라 cos(pitch)만큼 줄어드는 반면
    // right는 pitch와 무관하게 항상 길이 1이다. 정규화하지 않은 채로 더하면 위/아래를 볼수록
    // 대각선 입력(W+D 등)이 strafe 쪽으로 쏠리는 방향 버그가 생기므로, 합치기 전에 단위벡터로 맞춘다.
    const fwdLen = Math.hypot(fwdX, fwdZ) || 1;
    fwdX /= fwdLen; fwdZ /= fwdLen;

    let moveX=0, moveZ=0;
    if (keys['KeyW']||keys['ArrowUp']){ moveX+=fwdX; moveZ+=fwdZ; }
    if (keys['KeyS']||keys['ArrowDown']){ moveX-=fwdX; moveZ-=fwdZ; }
    if (keys['KeyA']||keys['ArrowLeft']){ moveX-=rightX; moveZ-=rightZ; }
    if (keys['KeyD']||keys['ArrowRight']){ moveX+=rightX; moveZ+=rightZ; }

    const len = Math.hypot(moveX, moveZ);
    let speed = PLAYER_BASE_SPEED;
    const wantsSprint = (keys['ShiftLeft']||keys['ShiftRight']) && sprintAvailable > 0.15;
    if (wantsSprint){
      speed *= PLAYER_SPRINT_MULT;
      sprintAvailable = Math.max(0, sprintAvailable - dt*0.35);
    } else {
      sprintAvailable = Math.min(1, sprintAvailable + dt*0.18);
    }

    if (len > 0.001){
      moveX = (moveX/len) * speed * dt;
      moveZ = (moveZ/len) * speed * dt;

      // 한 번에 큰 거리를 이동하면(특히 스프린트 중 dt가 살짝 튈 때) 목표 지점만
      // 충돌 검사하는 방식으로는 벽보다 더 먼 거리를 한 프레임에 건너뛰어 벽을
      // 그냥 통과해버릴 수 있다(터널링). 이동을 플레이어 반경보다 작은 여러 스텝으로
      // 쪼개서 매 스텝마다 충돌을 검사하면 이 문제가 사라진다.
      const moveDist = Math.hypot(moveX, moveZ);
      const maxStep = PLAYER_RADIUS * 0.5;
      const steps = Math.max(1, Math.ceil(moveDist / maxStep));
      const stepX = moveX / steps;
      const stepZ = moveZ / steps;
      for (let i=0; i<steps; i++){
        const resolved = resolveCollision(playerRig.x + stepX, playerRig.z + stepZ, PLAYER_RADIUS);
        playerRig.x = resolved.x;
        playerRig.z = resolved.z;
      }
    }

    updateJump(dt);

    camera.position.set(playerRig.x, playerRig.y, playerRig.z);
  }

  /* ---- boss AI: chase player, basic obstacle avoidance via collision push-out ---- */
  function updateBosses(dt, elapsedSec){
    let minDist = Infinity;

    bosses.forEach(boss=>{
      const dx = playerRig.x - boss.mesh.position.x;
      const dz = playerRig.z - boss.mesh.position.z;
      const dist = Math.hypot(dx,dz);
      minDist = Math.min(minDist, dist);

      // speed ramps up slightly over time (pressure increases), but slowly so the
      // early game gives the player room to learn the map without being rushed
      const rampMult = 1 + Math.min(0.3, elapsedSec/60);
      const curSpeed = boss.baseSpeed * rampMult;

      if (dist > 0.05){
        const nx = dx/dist, nz = dz/dist;
        const mx = nx*curSpeed*dt;
        const mz = nz*curSpeed*dt;

        const moveDist = Math.hypot(mx, mz);
        const bossRadius = 0.4;
        const maxStep = bossRadius * 0.5;
        const steps = Math.max(1, Math.ceil(moveDist / maxStep));
        const stepX = mx / steps;
        const stepZ = mz / steps;
        for (let i=0; i<steps; i++){
          const resolved = resolveCollision(boss.mesh.position.x+stepX, boss.mesh.position.z+stepZ, bossRadius);
          boss.mesh.position.x = resolved.x;
          boss.mesh.position.z = resolved.z;
        }

        // face the player (yaw only)
        boss.mesh.rotation.y = Math.atan2(nx, nz);
      }

      // simple bob animation while moving
      boss.mesh.position.y = Math.abs(Math.sin(performance.now()*0.008 + boss.mesh.position.x))*0.05;

      const now = performance.now();
      if (now - boss.lastBubbleAt > 2200 + Math.random()*1800){
        boss.lastBubbleAt = now;
        spawnSpeechBubble(boss);
      }
    });

    return minDist;
  }

  /* ---- HUD ---- */
  function updateHUD(minDist, remainingSec){
    const maxRelevantDist = 9;
    const pct = Math.max(0, Math.min(100, (1 - (minDist/maxRelevantDist)) * 100));
    document.getElementById('gauge-fill').style.width = pct + '%';
    document.getElementById('timer-label').textContent = Math.max(0,remainingSec).toFixed(1) + 's';
    return pct;
  }

  // 방향키/시점 문제를 직접 눈으로 확인할 수 있도록 yaw/pitch/눌린 키/마우스락 상태를
  // 화면에 실시간으로 표시한다. 어떤 상황에서 이상해지는지 재현할 때 참고할 수 있다.
  function updateDebugPanel(){
    const yawDeg = ((yaw * 180 / Math.PI) % 360).toFixed(1);
    const pitchDeg = (pitch * 180 / Math.PI).toFixed(1);
    const pressed = Object.keys(keys).filter(k=>keys[k]);
    document.getElementById('debug-yaw').textContent = yawDeg;
    document.getElementById('debug-pitch').textContent = pitchDeg;
    document.getElementById('debug-keys').textContent = pressed.length ? pressed.join(', ') : '(없음)';
    document.getElementById('debug-locked').textContent = mouseLocked;
  }

  /* ---- main game flow ---- */
  function startGame3D(){
    showScreen('screen-game');
    document.getElementById('flash-red').classList.remove('go');
    document.getElementById('pointer-hint').classList.remove('hidden');
    document.getElementById('hud-label').textContent = state.mode==='baby' ? '추격 거리' : '포위 거리';
    document.getElementById('tap-instruction').textContent = 'WASD 이동 · 마우스 시점 · Shift 스프린트';

    if (!scene) initThree();
    spawnPlayer();
    spawnBosses();
    speechBubbles.forEach(b=>b.el.remove());
    speechBubbles = [];

    gameActive = true;
    gameStartTime = performance.now();
    gameDuration = state.mode === 'baby' ? 42000 : 50000;
    lastFrameTime = performance.now();
    sprintAvailable = 1.0;

    if (gameRafId) cancelAnimationFrame(gameRafId);
    runGameLoop3D();
  }

  function runGameLoop3D(){
    function frame(now){
      if (!gameActive) return;
      const dt = Math.min(0.05, (now - lastFrameTime)/1000);
      lastFrameTime = now;
      const elapsed = now - gameStartTime;
      const elapsedSec = elapsed/1000;
      const remainingSec = (gameDuration - elapsed)/1000;

      // 이동은 항상 가능 (마우스 잠금은 시점 회전에만 영향).
      // 클릭으로 포인터락을 걸지 않은 상태에서도 키보드만으로 플레이할 수 있게 한다.
      updatePlayerMovement(dt);
      updateDebugPanel();

      const minDist = updateBosses(dt, elapsedSec);
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

    if (state.mode === 'baby'){
      if (survived){
        tag.textContent = '생존 성공';
        title.textContent = '칼퇴 달성 🎉';
        desc.textContent = '복도와 휴게실, 큐비클존까지 누비며 5살 팀장님을 따돌렸습니다. 오늘 하루는 살았다.';
      } else {
        tag.textContent = '포획됨';
        title.textContent = '다리 붙잡힘 👶';
        desc.textContent = '책상 모서리에서 살짝 막힌 틈에 따라잡혔습니다.';
      }
    } else {
      if (survived){
        tag.textContent = '생존 성공';
        title.textContent = '포위망 탈출 🎉';
        desc.textContent = '다섯 팀장님이 회의실 사이에서 길을 잃은 동안 끝까지 버텼습니다.';
      } else {
        tag.textContent = '포위됨';
        title.textContent = '5중 합류 직격 🧑‍💼×5';
        desc.textContent = '한 명을 피하려다 다른 한 명과 정면으로 마주쳤습니다.';
      }
    }

    stats.innerHTML = `
      <div class="stat-pill"><div class="num">${seconds}s</div><div class="lab">버틴 시간</div></div>
      <div class="stat-pill"><div class="num">${state.mode==='baby'?'1':'5'}</div><div class="lab">상대 인원</div></div>
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
