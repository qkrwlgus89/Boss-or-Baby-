/* ========================================================================
   world.js
   오피스 맵: 메인 복도 + 중간 십자 교차로(가로 복도) + 회의실 2곳
   + 가로 복도 끝 휴게실 + 대형 오픈 회의실 + 복도 끝 오픈 큐비클존.
   각 장애물은 충돌용 AABB(axis-aligned bounding box)를 함께 등록해서
   플레이어/추격자 이동 시 막힌다.
   좌표계: x = 좌우, z = 앞(-z 방향으로 전진), y = 높이.
   ========================================================================*/

const WORLD = {
  colliders: [], // { minX, maxX, minZ, maxZ }
  floorY: 0,
  bounds: { minX:-9, maxX:9, minZ:-60, maxZ:6 }, // 플레이어가 나갈 수 있는 전체 영역
};

function addCollider(x, z, w, d){
  WORLD.colliders.push({
    minX: x - w/2, maxX: x + w/2,
    minZ: z - d/2, maxZ: z + d/2,
  });
}

function buildWorld(scene, THREERef){
  const T = THREERef || THREE;
  WORLD.colliders.length = 0;

  const floorMat = new T.MeshStandardMaterial({ color:0x9a8268, roughness:0.85 });
  const wallMat = new T.MeshStandardMaterial({ color:0x8a7058, roughness:0.8 });
  const ceilingMat = new T.MeshStandardMaterial({ color:0xeae3d6, roughness:0.9 });
  const trimMat = new T.MeshStandardMaterial({ color:0xffd23f, roughness:0.5, emissive:0xffb000, emissiveIntensity:0.5 });

  const corridorWidth = 9;
  const corridorLength = 78; // along -z, main spine
  const wallHeight = 3.2;

  // 가로 교차 복도(십자로) 위치/크기
  const crossZ = -24;
  const crossHalfLen = 13;
  const crossWidth = 8;
  const crossHalfW = crossWidth/2;

  // 복도 맨 끝의 넓은 오픈 큐비클존
  const openZoneCenterZ = -68;
  const openZoneWidth = 16;
  const openZoneDepth = 16;

  function ceilingLight(x, z, h=wallHeight){
    const light = new T.PointLight(0xfff4d8, 1.8, 16, 1.6);
    light.position.set(x, h-0.3, z);
    scene.add(light);
    const fixture = new T.Mesh(new T.BoxGeometry(1.6,0.08,0.4), trimMat);
    fixture.position.set(x, h-0.1, z);
    scene.add(fixture);
  }

  function flatFloor(x, z, w, d, mat){
    const f = new T.Mesh(new T.PlaneGeometry(w, d), mat || floorMat);
    f.rotation.x = -Math.PI/2;
    f.position.set(x, 0.005, z);
    scene.add(f);
    return f;
  }
  function flatCeiling(x, z, w, d, y, mat){
    const c = new T.Mesh(new T.PlaneGeometry(w, d), mat || ceilingMat);
    c.rotation.x = Math.PI/2;
    c.position.set(x, y, z);
    scene.add(c);
  }

  // ---- floor ----
  const floor = new T.Mesh(new T.PlaneGeometry(corridorWidth+10, corridorLength+10), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(0, 0, -corridorLength/2 + 6);
  scene.add(floor);

  // floor tile lines (visual only, helps depth perception while running)
  const tileMat = new T.LineBasicMaterial({ color:0x5a4634, transparent:true, opacity:0.4 });
  for(let zz=4; zz>-corridorLength; zz-=3){
    const pts = [new T.Vector3(-corridorWidth/2-3, 0.01, zz), new T.Vector3(corridorWidth/2+3, 0.01, zz)];
    const geo = new T.BufferGeometry().setFromPoints(pts);
    scene.add(new T.Line(geo, tileMat));
  }

  // ---- ceiling ----
  const ceiling = new T.Mesh(new T.PlaneGeometry(corridorWidth+10, corridorLength+10), ceilingMat);
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.set(0, wallHeight, -corridorLength/2 + 6);
  scene.add(ceiling);

  // ---- main corridor side walls (with gaps for meeting rooms) ----
  function wallSegment(x, z, w, d, h=wallHeight){
    const wall = new T.Mesh(new T.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, h/2, z);
    scene.add(wall);
    addCollider(x, z, w, d);
  }

  const halfW = corridorWidth/2;

  // left wall: 회의실1(z=-18, 폭10 → z=-13~-23)과 십자로(z=-24±2.75) 입구는 뚫어둔다
  wallSegment(-halfW-0.15, 4, 0.3, 6);          // z: 1~7 (near entrance)
  wallSegment(-halfW-0.15, -8, 0.3, 8);         // z: -4~-12 (before room1 entrance)
  wallSegment(-halfW-0.15, -42.5, 0.3, 19);     // z: -33~-52 (between crossroad and open zone)

  // right wall: 사이드 회의실(z=-10, 폭9 → z=-5.5~-14.5)과 십자로 입구는 뚫어둔다
  wallSegment(halfW+0.15, 4, 0.3, 6);           // z: 1~7
  wallSegment(halfW+0.15, -42.5, 0.3, 19);      // z: -33~-52

  // far end wall은 오픈 큐비클존 자체 벽으로 대체되므로 별도 막음벽 없음

  // ---- meeting room 1 (left, around z=-18) ----
  buildMeetingRoom(scene, T, wallMat, trimMat, -halfW-5, -18, 8, 10);

  // ---- side meeting room (right, around z=-10, before crossroad) ----
  buildMeetingRoom(scene, T, wallMat, trimMat, halfW+5, -10, 7, 9);

  // ---- 십자 교차로 (가로 복도): 메인 복도를 가로질러 좌우로 새 공간을 연결 ----
  flatFloor(-crossHalfLen/2 - halfW, crossZ, crossHalfLen, crossWidth);
  flatFloor(crossHalfLen/2 + halfW, crossZ, crossHalfLen, crossWidth);
  flatCeiling(-crossHalfLen/2 - halfW, crossZ, crossHalfLen, crossWidth, wallHeight);
  flatCeiling(crossHalfLen/2 + halfW, crossZ, crossHalfLen, crossWidth, wallHeight);

  wallSegment(-halfW-crossHalfLen/2, crossZ-crossHalfW-0.15, crossHalfLen, 0.3);
  wallSegment(-halfW-crossHalfLen/2, crossZ+crossHalfW+0.15, crossHalfLen, 0.3);
  wallSegment(halfW+crossHalfLen/2, crossZ-crossHalfW-0.15, crossHalfLen, 0.3);
  wallSegment(halfW+crossHalfLen/2, crossZ+crossHalfW+0.15, crossHalfLen, 0.3);

  ceilingLight(-halfW-crossHalfLen*0.5, crossZ);
  ceilingLight(halfW+crossHalfLen*0.5, crossZ);

  // ---- 휴게실 / 라운지 (십자로 왼쪽 끝) ----
  buildLoungeRoom(scene, T, wallMat, trimMat, -halfW-crossHalfLen-4.5, crossZ, 9, 11);

  // ---- 대형 오픈 회의실 (십자로 오른쪽 끝, 통유리 파티션) ----
  buildBigGlassRoom(scene, T, wallMat, trimMat, halfW+crossHalfLen+5.5, crossZ, 11, 13);

  // ---- 오픈 큐비클존 (메인 복도 맨 끝, 격자형 책상이 넓게 펼쳐진 공간) ----
  flatFloor(0, openZoneCenterZ, openZoneWidth, openZoneDepth);
  flatCeiling(0, openZoneCenterZ, openZoneWidth, openZoneDepth, wallHeight);
  wallSegment(-openZoneWidth/2-0.15, openZoneCenterZ, 0.3, openZoneDepth+1);
  wallSegment(openZoneWidth/2+0.15, openZoneCenterZ, 0.3, openZoneDepth+1);
  wallSegment(0, openZoneCenterZ-openZoneDepth/2-0.15, openZoneWidth+0.6, 0.3);
  wallSegment(-openZoneWidth/2*0.55, openZoneCenterZ+openZoneDepth/2+0.15, openZoneWidth*0.4, 0.3);
  wallSegment(openZoneWidth/2*0.55, openZoneCenterZ+openZoneDepth/2+0.15, openZoneWidth*0.4, 0.3);

  buildCubicleGrid(scene, T, openZoneCenterZ, openZoneWidth, openZoneDepth);

  for(let zz=openZoneCenterZ-5; zz<=openZoneCenterZ+5; zz+=6){
    ceilingLight(-4, zz);
    ceilingLight(4, zz);
  }

  // ---- obstacles scattered down the corridor ----
  const obstacleMat = new T.MeshStandardMaterial({ color:0x6b5436, roughness:0.85 });
  const chairMat = new T.MeshStandardMaterial({ color:0x3a3a3a, roughness:0.6 });
  const plantPotMat = new T.MeshStandardMaterial({ color:0x7a5a3a, roughness:0.8 });
  const plantLeafMat = new T.MeshStandardMaterial({ color:0x3a6b3a, roughness:0.7 });
  const cabinetMat = new T.MeshStandardMaterial({ color:0x4a4a52, roughness:0.7 });

  function desk(x,z, rotY=0){
    const top = new T.Mesh(new T.BoxGeometry(1.4,0.08,0.7), obstacleMat);
    top.position.set(x, 0.75, z);
    top.rotation.y = rotY;
    scene.add(top);
    const legGeo = new T.CylinderGeometry(0.04,0.04,0.72,6);
    [[-0.6,-0.3],[0.6,-0.3],[-0.6,0.3],[0.6,0.3]].forEach(([dx,dz])=>{
      const rx = dx*Math.cos(rotY) - dz*Math.sin(rotY);
      const rz = dx*Math.sin(rotY) + dz*Math.cos(rotY);
      const leg = new T.Mesh(legGeo, chairMat);
      leg.position.set(x+rx, 0.36, z+rz);
      scene.add(leg);
    });
    // collider uses rotated bbox approx (slightly generous)
    addCollider(x, z, rotY%Math.PI===0 ? 1.5 : 0.8, rotY%Math.PI===0 ? 0.8 : 1.5);
  }

  function chair(x,z){
    const seat = new T.Mesh(new T.BoxGeometry(0.45,0.07,0.45), chairMat);
    seat.position.set(x,0.46,z);
    scene.add(seat);
    const back = new T.Mesh(new T.BoxGeometry(0.45,0.5,0.06), chairMat);
    back.position.set(x,0.7,z-0.2);
    scene.add(back);
    addCollider(x,z,0.5,0.5);
  }

  function plant(x,z){
    const pot = new T.Mesh(new T.CylinderGeometry(0.22,0.18,0.3,8), plantPotMat);
    pot.position.set(x,0.15,z);
    scene.add(pot);
    const leaf = new T.Mesh(new T.SphereGeometry(0.32,8,8), plantLeafMat);
    leaf.position.set(x,0.55,z);
    leaf.scale.set(1,1.4,1);
    scene.add(leaf);
    addCollider(x,z,0.5,0.5);
  }

  function cabinet(x,z,rotY=0){
    const box = new T.Mesh(new T.BoxGeometry(1.0,1.6,0.5), cabinetMat);
    box.position.set(x,0.8,z);
    box.rotation.y = rotY;
    scene.add(box);
    addCollider(x,z, rotY%Math.PI===0?1.0:0.5, rotY%Math.PI===0?0.5:1.0);
  }

  // scatter along corridor (avoid the very start z>0, and avoid the crossroad z~-24)
  desk(-2.0, -4, 0);
  chair(-1.4, -3.2);
  plant(2.4, -2);
  cabinet(2.6, -6, Math.PI/2);
  desk(1.8, -14, 0.3);
  plant(-2.6, -36);
  desk(-1.5, -40, -0.2);
  chair(-2.0, -39.2);
  cabinet(-2.6, -48, Math.PI/2);
  plant(2.2, -44);
  desk(2.0, -56, 0.1);
  chair(1.4, -55.2);
  plant(-1.8, -58);

  // ---- ambient + lights ----
  const ambient = new T.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);

  const hemi = new T.HemisphereLight(0xffffff, 0x8a7058, 0.7);
  scene.add(hemi);

  // ceiling strip lights down the main corridor
  for(let zz=2; zz>-corridorLength; zz-=8){
    ceilingLight(0, zz);
  }

  // 오픈 큐비클존 내부도 격자로 조명 추가
  for(let zz=openZoneCenterZ-5; zz<=openZoneCenterZ+5; zz+=6){
    ceilingLight(-4, zz);
    ceilingLight(4, zz);
  }

  // exit glow far at the end of the open zone (visual goal marker, optional)
  const exitLight = new T.PointLight(0xff6b4a, 1.5, 20, 1.6);
  exitLight.position.set(0, 2, openZoneCenterZ);
  scene.add(exitLight);

  // 새로 추가된 십자교차로/휴게실/대형회의실/오픈큐비클존까지 모두 포함하도록 경계를 넓힌다
  const totalMinZ = openZoneCenterZ - openZoneDepth/2 - 2;
  WORLD.bounds = {
    minX: -halfW-crossHalfLen-9,
    maxX: halfW+crossHalfLen+9,
    minZ: totalMinZ,
    maxZ: 5
  };
}

function buildMeetingRoom(scene, T, wallMat, trimMat, cx, cz, w, d){
  const h = 3.0;
  const floorMat = new T.MeshStandardMaterial({ color:0x7a6248, roughness:0.9 });

  const floor = new T.Mesh(new T.PlaneGeometry(w,d), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(cx, 0.005, cz);
  scene.add(floor);

  // back + side walls (leave the side facing corridor open)
  const backWall = new T.Mesh(new T.BoxGeometry(w,h,0.25), wallMat);
  const facingCorridorOnLeft = cx < 0;
  backWall.position.set(cx + (facingCorridorOnLeft? -w/2 : w/2), h/2, cz);
  scene.add(backWall);
  addCollider(backWall.position.x, cz, 0.25, d);

  const sideWallA = new T.Mesh(new T.BoxGeometry(0.25,h,d), wallMat);
  sideWallA.position.set(cx, h/2, cz - d/2);
  scene.add(sideWallA);
  addCollider(cx, cz-d/2, w, 0.25);

  const sideWallB = new T.Mesh(new T.BoxGeometry(0.25,h,d), wallMat);
  sideWallB.position.set(cx, h/2, cz + d/2);
  scene.add(sideWallB);
  addCollider(cx, cz+d/2, w, 0.25);

  // meeting table
  const tableMat = new T.MeshStandardMaterial({ color:0x8a6e4e, roughness:0.7 });
  const table = new T.Mesh(new T.BoxGeometry(w*0.45, 0.08, d*0.55), tableMat);
  table.position.set(cx, 0.7, cz);
  scene.add(table);
  addCollider(cx, cz, w*0.45, d*0.55);

  // small light
  const light = new T.PointLight(0xfff4d8, 1.6, 14, 1.6);
  light.position.set(cx, h-0.4, cz);
  scene.add(light);

  const fixture = new T.Mesh(new T.BoxGeometry(1.2,0.06,0.3), trimMat);
  fixture.position.set(cx, h-0.15, cz);
  scene.add(fixture);
}

/* ------------------------------------------------------------------ */
/* 휴게실 / 라운지 — 소파, 원형 커피테이블, 자판기 박스                   */
/* ------------------------------------------------------------------ */
function buildLoungeRoom(scene, T, wallMat, trimMat, cx, cz, w, d){
  const h = 3.0;
  const floorMat = new T.MeshStandardMaterial({ color:0x5e4a36, roughness:0.95 });
  const sofaMat = new T.MeshStandardMaterial({ color:0x3a5a6b, roughness:0.75 });
  const tableMat = new T.MeshStandardMaterial({ color:0x6b5034, roughness:0.6 });
  const vendingMat = new T.MeshStandardMaterial({ color:0xd83a3a, roughness:0.4 });

  const floor = new T.Mesh(new T.PlaneGeometry(w,d), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(cx, 0.005, cz);
  scene.add(floor);

  // 둘러싸는 벽 (복도/교차로 쪽 한 면은 열어둔다)
  const backWall = new T.Mesh(new T.BoxGeometry(0.25,h,d), wallMat);
  backWall.position.set(cx - w/2, h/2, cz);
  scene.add(backWall);
  addCollider(cx-w/2, cz, 0.25, d);

  const sideWallA = new T.Mesh(new T.BoxGeometry(w,h,0.25), wallMat);
  sideWallA.position.set(cx, h/2, cz - d/2);
  scene.add(sideWallA);
  addCollider(cx, cz-d/2, w, 0.25);

  const sideWallB = new T.Mesh(new T.BoxGeometry(w,h,0.25), wallMat);
  sideWallB.position.set(cx, h/2, cz + d/2);
  scene.add(sideWallB);
  addCollider(cx, cz+d/2, w, 0.25);

  // 소파 두 개 (L자 배치)
  const sofa1 = new T.Mesh(new T.BoxGeometry(2.6,0.6,0.9), sofaMat);
  sofa1.position.set(cx-1.5, 0.32, cz-2.5);
  scene.add(sofa1);
  addCollider(cx-1.5, cz-2.5, 2.6, 0.9);

  const sofaBack1 = new T.Mesh(new T.BoxGeometry(2.6,0.5,0.2), sofaMat);
  sofaBack1.position.set(cx-1.5, 0.62, cz-2.9);
  scene.add(sofaBack1);

  const sofa2 = new T.Mesh(new T.BoxGeometry(0.9,0.6,2.4), sofaMat);
  sofa2.position.set(cx-3.0, 0.32, cz-0.8);
  scene.add(sofa2);
  addCollider(cx-3.0, cz-0.8, 0.9, 2.4);

  // 원형 커피테이블
  const coffeeTable = new T.Mesh(new T.CylinderGeometry(0.7,0.7,0.4,16), tableMat);
  coffeeTable.position.set(cx-1.6, 0.2, cz-1.0);
  scene.add(coffeeTable);
  addCollider(cx-1.6, cz-1.0, 1.5, 1.5);

  // 자판기 박스
  const vending = new T.Mesh(new T.BoxGeometry(0.9,1.9,0.7), vendingMat);
  vending.position.set(cx+w/2-0.7, 0.95, cz+d/2-0.7);
  scene.add(vending);
  addCollider(vending.position.x, vending.position.z, 0.9, 0.7);

  const light = new T.PointLight(0xffe0c0, 1.5, 13, 1.6);
  light.position.set(cx, h-0.4, cz);
  scene.add(light);

  const fixture = new T.Mesh(new T.BoxGeometry(1.4,0.06,0.4), trimMat);
  fixture.position.set(cx, h-0.15, cz);
  scene.add(fixture);
}

/* ------------------------------------------------------------------ */
/* 대형 오픈 회의실 — 통유리 파티션(반투명 박스) 느낌의 넓은 공간          */
/* ------------------------------------------------------------------ */
function buildBigGlassRoom(scene, T, wallMat, trimMat, cx, cz, w, d){
  const h = 3.2;
  const floorMat = new T.MeshStandardMaterial({ color:0x8a7a64, roughness:0.7 });
  const glassMat = new T.MeshStandardMaterial({ color:0xbfe0e8, roughness:0.15, transparent:true, opacity:0.28 });
  const frameMat = new T.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.5 });
  const tableMat = new T.MeshStandardMaterial({ color:0x4a3a2a, roughness:0.6 });
  const chairMat = new T.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.6 });

  const floor = new T.Mesh(new T.PlaneGeometry(w,d), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(cx, 0.005, cz);
  scene.add(floor);

  // 통유리 파티션 (서쪽=복도/교차로 쪽 입구는 열어둔다)
  function glassWall(x,z,ww,dd){
    const glass = new T.Mesh(new T.BoxGeometry(ww,h*0.78,dd), glassMat);
    glass.position.set(x, h*0.78/2, z);
    scene.add(glass);
    addCollider(x,z,ww,dd);
    const frameTop = new T.Mesh(new T.BoxGeometry(ww,0.08,dd), frameMat);
    frameTop.position.set(x, h*0.78, z);
    scene.add(frameTop);
  }
  glassWall(cx+w/2, cz, 0.15, d);
  glassWall(cx, cz-d/2, w, 0.15);
  glassWall(cx, cz+d/2, w, 0.15);

  // 큰 회의 테이블 + 의자들
  const table = new T.Mesh(new T.BoxGeometry(w*0.5, 0.08, d*0.4), tableMat);
  table.position.set(cx, 0.72, cz);
  scene.add(table);
  addCollider(cx, cz, w*0.5, d*0.4);

  const chairOffsets = [
    [-w*0.22,-d*0.16],[0,-d*0.16],[w*0.22,-d*0.16],
    [-w*0.22, d*0.16],[0, d*0.16],[w*0.22, d*0.16],
  ];
  chairOffsets.forEach(([dx,dz])=>{
    const seat = new T.Mesh(new T.BoxGeometry(0.4,0.06,0.4), chairMat);
    seat.position.set(cx+dx, 0.42, cz+dz);
    scene.add(seat);
  });

  const light1 = new T.PointLight(0xfff4e0, 1.6, 16, 1.6);
  light1.position.set(cx-w*0.2, h-0.4, cz);
  scene.add(light1);
  const light2 = new T.PointLight(0xfff4e0, 1.6, 16, 1.6);
  light2.position.set(cx+w*0.2, h-0.4, cz);
  scene.add(light2);

  const fixture = new T.Mesh(new T.BoxGeometry(w*0.7,0.06,0.4), trimMat);
  fixture.position.set(cx, h-0.15, cz);
  scene.add(fixture);
}

/* ------------------------------------------------------------------ */
/* 오픈 큐비클존 — 격자형 책상 배치, 메인 복도 끝의 넓은 사무 구역         */
/* ------------------------------------------------------------------ */
function buildCubicleGrid(scene, T, centerZ, zoneWidth, zoneDepth){
  const deskTopMat = new T.MeshStandardMaterial({ color:0x6b5436, roughness:0.85 });
  const partitionMat = new T.MeshStandardMaterial({ color:0x9c8d72, roughness:0.9 });
  const chairMat = new T.MeshStandardMaterial({ color:0x3a3a3a, roughness:0.6 });

  const cols = 3;
  const rows = 3;
  const cellW = zoneWidth/cols;
  const cellD = zoneDepth/rows;

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      // 가운데 "열"(c=1) 전체를 진입부터 안쪽까지 트인 통로로 비워서
      // 플레이어가 큐비클존을 가로질러 곧장 지나갈 수 있게 한다.
      if (c===1) continue;

      const cx = -zoneWidth/2 + cellW*(c+0.5);
      const cz = centerZ - zoneDepth/2 + cellD*(r+0.5);

      const desk = new T.Mesh(new T.BoxGeometry(cellW*0.6,0.06,cellD*0.5), deskTopMat);
      desk.position.set(cx, 0.72, cz);
      scene.add(desk);
      addCollider(cx, cz, cellW*0.6, cellD*0.5);

      const legGeo = new T.CylinderGeometry(0.04,0.04,0.7,6);
      [[-cellW*0.27,-cellD*0.2],[cellW*0.27,-cellD*0.2],[-cellW*0.27,cellD*0.2],[cellW*0.27,cellD*0.2]].forEach(([dx,dz])=>{
        const leg = new T.Mesh(legGeo, chairMat);
        leg.position.set(cx+dx, 0.34, cz+dz);
        scene.add(leg);
      });

      const partition = new T.Mesh(new T.BoxGeometry(cellW*0.62,1.0,0.06), partitionMat);
      partition.position.set(cx, 0.5, cz - cellD*0.27);
      scene.add(partition);

      const seat = new T.Mesh(new T.BoxGeometry(0.4,0.06,0.4), chairMat);
      seat.position.set(cx, 0.42, cz + cellD*0.26);
      scene.add(seat);
    }
  }
}

/**
 * 충돌 검사: 점 (x,z) 가 반경 r 안에서 어떤 collider와 겹치는지 확인.
 * 겹치면 가장 가까운 비충돌 위치로 밀어내는 보정된 {x,z} 반환.
 * 모서리(코너)나 두 벽이 맞붙은 지점에서는 한 번의 보정으로 다른 벽과 새로
 * 충돌하는 경우가 있어, 안정적으로 막히도록 두 차례 반복해서 보정한다.
 */
function resolveCollision(x, z, r){
  let rx = x, rz = z;
  for (let pass=0; pass<2; pass++){
    for (const c of WORLD.colliders){
      const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx*dx + dz*dz;
      if (distSq < r*r){
        const dist = Math.sqrt(distSq) || 0.0001;
        const overlap = r - dist;
        rx += (dx/dist) * overlap;
        rz += (dz/dist) * overlap;
      }
    }
  }
  // clamp to world bounds
  rx = Math.max(WORLD.bounds.minX+0.3, Math.min(WORLD.bounds.maxX-0.3, rx));
  rz = Math.max(WORLD.bounds.minZ+0.3, Math.min(WORLD.bounds.maxZ-0.3, rz));
  return { x: rx, z: rz };
}
