/* ========================================================================
   character.js
   팀장님 캐릭터를 Three.js 기본 도형(구/원기둥/타원체)으로 조합해 만든다.
   디테일한 일러스트 대신, 색상·소품·헤어실루엣을 단순 메시 조합으로 표현해서
   "임팩트는 단순하게"라는 방향에 맞춘다.
   ========================================================================*/

const PALETTE3D = {
  skin: [
    { id:'fair',  label:'밝은', hex:0xffd9b3 },
    { id:'tan',   label:'보통', hex:0xe8b07e },
    { id:'deep',  label:'짙은', hex:0xb87a4c },
    { id:'flush', label:'홍조', hex:0xffc9a8 },
  ],
  hair: [
    { id:'bald',    label:'클린샷' },
    { id:'comb',    label:'바른가르마' },
    { id:'perm',    label:'아저씨펌' },
    { id:'spiky',   label:'삐친머리' },
    { id:'mullet',  label:'장발' },
  ],
  outfit: [
    { id:'suit',   label:'양복',   hex:0x2c3a52 },
    { id:'vest',   label:'조끼',   hex:0x9c8455 },
    { id:'shirt',  label:'와이셔츠', hex:0xe9ddc4 },
    { id:'golf',   label:'골프복', hex:0x3f6b4a },
    { id:'hanbok', label:'유치원복', hex:0xb6402e },
  ],
  face: [
    { id:'smug',      label:'썩소' },
    { id:'angry',     label:'분노' },
    { id:'screaming', label:'고함' },
    { id:'sparkle',   label:'광기' },
  ],
  prop: [
    { id:'none',      label:'없음' },
    { id:'coffee',    label:'커피' },
    { id:'paper',     label:'서류' },
    { id:'megaphone', label:'메가폰' },
    { id:'pacifier',  label:'쪽쪽이' },
  ],
};

const HAIR_COLOR = 0x2b1d12;

/**
 * 팀장님 3D 그룹 생성.
 * opts: { skin, hair, outfit, face, prop, isBaby }
 * returns THREE.Group, also stores refs on group.userData for animation (e.g. mouth, arms)
 */
function buildBossMesh(opts, THREERef){
  const T = THREERef || THREE;
  const group = new T.Group();
  const isBaby = !!opts.isBaby;
  const scaleAll = isBaby ? 0.5 : 0.82;

  const skinHex = (PALETTE3D.skin.find(s=>s.id===opts.skin) || PALETTE3D.skin[0]).hex;
  const outfitHex = (PALETTE3D.outfit.find(o=>o.id===opts.outfit) || PALETTE3D.outfit[0]).hex;

  const skinMat = new T.MeshStandardMaterial({ color: skinHex, roughness:0.7 });
  const outfitMat = new T.MeshStandardMaterial({ color: outfitHex, roughness:0.8 });
  const hairMat = new T.MeshStandardMaterial({ color: HAIR_COLOR, roughness:0.6 });
  const whiteMat = new T.MeshStandardMaterial({ color: 0xfff3df, roughness:0.6 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x1a1106, roughness:0.5 });
  const redMat = new T.MeshStandardMaterial({ color: 0xff3b30, roughness:0.5 });
  const yellowMat = new T.MeshStandardMaterial({ color: 0xffd23f, roughness:0.5 });

  // ---- body (capsule-ish via cylinder + sphere caps) ----
  const bodyH = isBaby ? 0.62 : 1.05;
  const bodyR = isBaby ? 0.34 : 0.36;
  const body = new T.Mesh(new T.CylinderGeometry(bodyR, bodyR*1.08, bodyH, 12), outfitMat);
  body.position.y = (isBaby ? 0.62 : 1.0);
  group.add(body);

  // shoulders cap
  const shoulderCap = new T.Mesh(new T.SphereGeometry(bodyR*1.05, 12, 10), outfitMat);
  shoulderCap.position.y = body.position.y + bodyH/2;
  shoulderCap.scale.set(1,0.6,1);
  group.add(shoulderCap);

  // tie / collar accent for suit & shirt
  if (opts.outfit === 'suit' || opts.outfit === 'shirt'){
    const collar = new T.Mesh(new T.ConeGeometry(0.1, 0.22, 6), opts.outfit==='suit'? redMat: whiteMat);
    collar.position.set(0, shoulderCap.position.y - 0.05, bodyR*0.9);
    collar.rotation.x = Math.PI;
    group.add(collar);
  }
  if (opts.outfit === 'hanbok'){
    const badge = new T.Mesh(new T.CircleGeometry(0.12,16), yellowMat);
    badge.position.set(0, body.position.y + 0.05, bodyR*1.0);
    group.add(badge);
  }

  // ---- head ----
  const headR = isBaby ? 0.40 : 0.32;
  const headY = body.position.y + bodyH/2 + headR*0.95;
  const head = new T.Mesh(new T.SphereGeometry(headR, 16, 14), skinMat);
  head.position.y = headY;
  group.add(head);

  // ears
  [-1,1].forEach(side=>{
    const ear = new T.Mesh(new T.SphereGeometry(headR*0.18,8,8), skinMat);
    ear.position.set(side*headR*0.92, headY, 0);
    group.add(ear);
  });

  // ---- hair ----
  group.add(buildHair3D(opts.hair, headR, headY, hairMat, T));

  // ---- face (eyes + mouth as small meshes/planes) ----
  const faceGroup = buildFace3D(opts.face, headR, headY, T);
  group.add(faceGroup);

  // ---- arms ----
  const armLen = isBaby ? 0.42 : 0.62;
  [-1,1].forEach(side=>{
    const arm = new T.Mesh(new T.CylinderGeometry(bodyR*0.22, bodyR*0.2, armLen, 8), outfitMat);
    arm.position.set(side*(bodyR*1.05), shoulderCap.position.y - armLen*0.45, 0);
    arm.rotation.z = side * 0.18;
    arm.name = side<0?'armL':'armR';
    group.add(arm);
    // hand
    const hand = new T.Mesh(new T.SphereGeometry(bodyR*0.22,8,8), skinMat);
    hand.position.set(side*(bodyR*1.05 + Math.sin(0.18)*armLen*0.1), arm.position.y - armLen*0.5, 0);
    group.add(hand);
  });

  // ---- legs ----
  const legLen = isBaby ? 0.34 : 0.5;
  [-1,1].forEach(side=>{
    const leg = new T.Mesh(new T.CylinderGeometry(bodyR*0.26, bodyR*0.24, legLen, 8), darkMat);
    leg.position.set(side*bodyR*0.45, body.position.y - bodyH/2 - legLen/2, 0);
    group.add(leg);
  });

  // ---- prop ----
  const prop = buildProp3D(opts.prop, T);
  if (prop){
    prop.position.set(bodyR*1.25, shoulderCap.position.y - armLen*0.7, bodyR*0.5);
    group.add(prop);
  }

  group.scale.setScalar(scaleAll);
  group.userData.isBaby = isBaby;
  group.userData.headY = headY * scaleAll;
  group.userData.bodyMesh = body;
  return group;
}

function buildHair3D(hairId, headR, headY, hairMat, T){
  const g = new T.Group();
  switch(hairId){
    case 'comb': {
      const cap = new T.Mesh(new T.SphereGeometry(headR*1.02, 14, 10, 0, Math.PI*2, 0, Math.PI*0.46), hairMat);
      cap.position.y = headY + headR*0.16;
      g.add(cap);
      break;
    }
    case 'perm': {
      // 퍽들을 머리 구체 표면(윗부분)을 따라 붙이듯 배치한다.
      // theta(수직각)를 머리 위쪽으로 한정해 정수리~옆머리 라인에만 붙고,
      // 반지름도 머리보다 작게 잡아 풍선처럼 떠 보이지 않게 한다.
      const puffR = headR*0.34;
      const ringTheta = Math.PI*0.32; // 0=정수리, 값이 클수록 옆으로 내려감
      for (let i=0;i<6;i++){
        const ang = (i/6)*Math.PI*2;
        const px = Math.sin(ringTheta)*Math.cos(ang)*headR*0.92;
        const pz = Math.sin(ringTheta)*Math.sin(ang)*headR*0.92;
        const py = headY + Math.cos(ringTheta)*headR*0.92;
        const puff = new T.Mesh(new T.SphereGeometry(puffR, 8, 8), hairMat);
        puff.position.set(px, py, pz);
        g.add(puff);
      }
      // 정수리 가운데도 하나 더 덮어서 빈틈 없이 보이게
      const topPuff = new T.Mesh(new T.SphereGeometry(puffR*0.9, 8, 8), hairMat);
      topPuff.position.set(0, headY + headR*0.98, 0);
      g.add(topPuff);
      break;
    }
    case 'spiky': {
      for (let i=0;i<6;i++){
        const ang = (i/6)*Math.PI*2;
        const spike = new T.Mesh(new T.ConeGeometry(headR*0.13, headR*0.5, 6), hairMat);
        spike.position.set(Math.cos(ang)*headR*0.5, headY + headR*0.78, Math.sin(ang)*headR*0.5);
        spike.rotation.z = Math.cos(ang)*0.4;
        spike.rotation.x = -Math.sin(ang)*0.4;
        g.add(spike);
      }
      break;
    }
    case 'mullet': {
      // 윗머리는 이마선 살짝 위까지만 덮는 캡
      const cap = new T.Mesh(new T.SphereGeometry(headR*1.02, 14, 10, 0, Math.PI*2, 0, Math.PI*0.42), hairMat);
      cap.position.y = headY + headR*0.18;
      g.add(cap);
      // 뒷머리는 머리 뒤쪽(−z)에만 작게 붙여서 옆/앞에서 얼굴을 가리지 않게 한다
      const back = new T.Mesh(new T.SphereGeometry(headR*0.62, 10, 8), hairMat);
      back.position.set(0, headY - headR*0.05, -headR*0.78);
      back.scale.set(1, 1.5, 0.9);
      g.add(back);
      break;
    }
    default: // bald — nothing, maybe a tiny shine
      break;
  }
  return g;
}

function buildFace3D(faceId, headR, headY, T){
  const g = new T.Group();
  const darkMat = new T.MeshStandardMaterial({ color:0x1a1106, roughness:0.4 });
  const mouthMat = new T.MeshStandardMaterial({ color:0x7a2418, roughness:0.5 });
  const z = headR*0.92;

  // eyes (always present, shape varies slightly)
  const eyeSize = faceId==='angry' ? headR*0.09 : headR*0.1;
  [-1,1].forEach(side=>{
    const eye = new T.Mesh(new T.SphereGeometry(eyeSize, 8, 8), darkMat);
    eye.position.set(side*headR*0.38, headY + headR*0.08, z*0.96);
    g.add(eye);
  });

  // mouth varies
  let mouthGeo;
  switch(faceId){
    case 'screaming':
      mouthGeo = new T.SphereGeometry(headR*0.22, 10, 8);
      break;
    case 'sparkle':
      mouthGeo = new T.TorusGeometry(headR*0.16, headR*0.045, 6, 10, Math.PI);
      break;
    case 'angry':
      mouthGeo = new T.BoxGeometry(headR*0.4, headR*0.07, headR*0.06);
      break;
    default:
      mouthGeo = new T.TorusGeometry(headR*0.18, headR*0.04, 6, 10, Math.PI);
  }
  const mouth = new T.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, headY - headR*0.32, z*0.9);
  if (faceId !== 'screaming') mouth.rotation.x = Math.PI;
  g.add(mouth);

  // angry eyebrows
  if (faceId === 'angry' || faceId === 'screaming'){
    [-1,1].forEach(side=>{
      const brow = new T.Mesh(new T.BoxGeometry(headR*0.32, headR*0.06, headR*0.06), darkMat);
      brow.position.set(side*headR*0.38, headY + headR*0.28, z*0.95);
      brow.rotation.z = side * 0.4;
      g.add(brow);
    });
  }

  return g;
}

function buildProp3D(propId, T){
  const whiteMat = new T.MeshStandardMaterial({ color:0xfff3df, roughness:0.5 });
  const darkMat = new T.MeshStandardMaterial({ color:0x1a1106, roughness:0.5 });
  const redMat = new T.MeshStandardMaterial({ color:0xff3b30, roughness:0.5 });
  const pinkMat = new T.MeshStandardMaterial({ color:0xff9fc0, roughness:0.5 });
  const brownMat = new T.MeshStandardMaterial({ color:0x5a3d22, roughness:0.6 });

  switch(propId){
    case 'coffee': {
      const cup = new T.Mesh(new T.CylinderGeometry(0.07,0.06,0.14,8), whiteMat);
      const sleeve = new T.Mesh(new T.CylinderGeometry(0.075,0.075,0.05,8), brownMat);
      sleeve.position.y = 0.02;
      const g = new T.Group(); g.add(cup); g.add(sleeve);
      return g;
    }
    case 'paper': {
      const sheet = new T.Mesh(new T.BoxGeometry(0.18,0.24,0.01), whiteMat);
      return sheet;
    }
    case 'megaphone': {
      const horn = new T.Mesh(new T.ConeGeometry(0.13,0.3,10), redMat);
      horn.rotation.z = Math.PI/2;
      return horn;
    }
    case 'pacifier': {
      const ring = new T.Mesh(new T.TorusGeometry(0.05,0.018,8,12), pinkMat);
      return ring;
    }
    default:
      return null;
  }
}

function randomAvatarOpts3D(isBaby){
  const pick = arr => arr[Math.floor(Math.random()*arr.length)].id;
  return {
    skin: pick(PALETTE3D.skin),
    hair: pick(PALETTE3D.hair),
    outfit: isBaby ? 'hanbok' : pick(PALETTE3D.outfit.filter(o=>o.id!=='hanbok')),
    face: pick(PALETTE3D.face),
    prop: pick(PALETTE3D.prop),
    isBaby
  };
}
