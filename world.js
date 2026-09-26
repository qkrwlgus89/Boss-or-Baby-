/* A furnished office floor, built in metres. Collision and visual architecture share dimensions. */
const WORLD={colliders:[],bounds:{minX:-12,maxX:12,minZ:-56,maxZ:6},sun:null,meetingRooms:[],glassMaterial:null,theme:null};
function addCollider(x,z,w,d,topY=Infinity,walkable=false,minY=0){WORLD.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,topY,walkable,minY});}
function officeTexture(T,kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');let seed=42;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='wood'){
    c.fillStyle='#98724c';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y++){
      const light=44+rand()*16;c.strokeStyle=`hsla(30,32%,${light}%,.28)`;c.beginPath();
      for(let x=0;x<=512;x+=8){const yy=y+Math.sin(x*.025+y*.12)*2.2;c.lineTo(x,yy);}c.stroke();
    }
    for(let y=0;y<512;y+=128){c.fillStyle='#37281e66';c.fillRect(0,y,512,2);c.fillRect((y*2+180)%512,y,2,128);}
  }else if(kind==='carpet'){
    c.fillStyle='#696e70';c.fillRect(0,0,512,512);
    for(let i=0;i<55000;i++){const v=65+Math.floor(rand()*65);c.fillStyle=`rgb(${v},${v+4},${v+5})`;c.fillRect(rand()*512,rand()*512,1,3);}
    c.strokeStyle='#353b3d66';c.strokeRect(0,0,512,512);
  }else{
    c.fillStyle='#c9c5bc';c.fillRect(0,0,512,512);
    for(let i=0;i<22000;i++){c.fillStyle=rand()>.5?'#ffffff10':'#2630360d';c.fillRect(rand()*512,rand()*512,2,2);}
  }
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
}
function buildWorld(scene,T,renderer){
  WORLD.colliders=[]; WORLD.bounds={minX:-12,maxX:12,minZ:-56,maxZ:6}; WORLD.meetingRooms=[];
  const woodTex=officeTexture(T,'wood'),carpetTex=officeTexture(T,'carpet'),plasterTex=officeTexture(T,'plaster');
  const mat=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const wall=mat(0xdad6cb),wood=mat(0xb69773,.52),floorWood=mat(0xc7ab88,.72),carpet=mat(0xa3a9a8),black=mat(0x20282b,.36,.5),metal=mat(0xa6b3b4,.27,.78),desk=mat(0xc5b9a0,.45),fabric=mat(0x466263,.93),leather=mat(0x363a39,.75),paper=mat(0xe9e5d9),leaf=mat(0x315b36,.85),pot=mat(0xc3b8a6),concrete=mat(0x969d9c);
  wood.map=woodTex;wood.bumpMap=woodTex;wood.bumpScale=.012;
  floorWood.map=woodTex.clone();floorWood.map.repeat.set(9,27);floorWood.map.needsUpdate=true;floorWood.bumpMap=floorWood.map;floorWood.bumpScale=.0015;
  carpet.map=carpetTex;carpet.bumpMap=carpetTex;carpet.bumpScale=.015;
  wall.map=plasterTex;wall.bumpMap=plasterTex;wall.bumpScale=0;
  const glow=new T.MeshStandardMaterial({color:0xfff4d4,emissive:0xffe5b2,emissiveIntensity:2.8});
  const glass=new T.MeshPhysicalMaterial({color:0xb6d2d1,roughness:.1,metalness:.08,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false});
  const pools=new Map(),unit=new T.BoxGeometry(1,1,1);
  function cube(material,x,y,z,w,h,d,solid=false,ry=0){
    if(solid)addCollider(x,z,Math.abs(Math.cos(ry))*w+Math.abs(Math.sin(ry))*d,Math.abs(Math.sin(ry))*w+Math.abs(Math.cos(ry))*d,y+h/2,y+h/2<1.5);
    const obj=new T.Object3D();obj.position.set(x,y,z);obj.scale.set(w,h,d);obj.rotation.y=ry;obj.updateMatrix();
    if(!pools.has(material))pools.set(material,[]);pools.get(material).push(obj.matrix.clone());
  }
  function mesh(geo,material,x,y,z,rx=0,ry=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,0);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  function rod(material,a,b,r=.02){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=mesh(new T.CylinderGeometry(r,r,delta.length(),8),material,...start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
  function label(text,sub,x,y,z,w=2,ry=0){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const p=c.getContext('2d');
    p.fillStyle='#243234';p.fillRect(0,0,1024,256);p.fillStyle='#e9e1cb';p.font='500 72px sans-serif';p.fillText(text,52,117);p.font='25px sans-serif';p.fillStyle='#98b3ac';p.fillText(sub,55,181);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    mesh(new T.PlaneGeometry(w,w/4),new T.MeshStandardMaterial({map:tex,roughness:.7}),x,y,z,0,ry);
  }
  // Floor layers must never be coplanar. The base slab, the area rugs laid on it and the
  // contact-shadow decals each get their own height, or they z-fight into a black shimmer
  // that crawls across the carpet as the camera moves.
  const FLOOR_BASE=.008, FLOOR_RUG=.016, FLOOR_DECAL=.024;
  function floor(material,x,z,w,d,y=FLOOR_BASE){const m=mesh(new T.PlaneGeometry(w,d),material,x,y,z,-Math.PI/2);m.castShadow=false;}
  const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;
  const ao=aoCanvas.getContext('2d'),fade=ao.createRadialGradient(64,64,8,64,64,64);
  fade.addColorStop(0,'rgba(12,19,22,.38)');fade.addColorStop(.55,'rgba(12,19,22,.18)');fade.addColorStop(1,'rgba(12,19,22,0)');ao.fillStyle=fade;ao.fillRect(0,0,128,128);
  const contact=new T.MeshBasicMaterial({map:new T.CanvasTexture(aoCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function contactShadow(x,z,w,d){const m=mesh(new T.PlaneGeometry(1,1),contact,x,FLOOR_DECAL,z,-Math.PI/2);m.scale.set(w,d,1);m.castShadow=m.receiveShadow=false;}
  floor(floorWood,0,-25,24,62);
  cube(black,-11.85,.055,-25,.035,.11,62);cube(black,0,.055,5.85,24,.11,.035);
  cube(wall,-12,1.65,-25,.24,3.3,62,true);cube(wall,0,1.65,-56,24,3.3,.24,true);cube(wall,0,1.65,6,24,3.3,.24,true);
  // Windows on the east façade. A continuous parapet also supplies the collision boundary.
  cube(concrete,12,.24,-25,.2,.48,62,true);
  for(let z=4;z>-56;z-=3){
    cube(black,12,1.9,z,.14,2.85,.065);cube(glass,12,1.86,z-1.5,.025,2.74,2.94);
    cube(black,12,3.26,z-1.5,.16,.08,3);cube(black,12,.5,z-1.5,.16,.08,3);
    // Blind slats near the top leave the view open.
    for(let y=2.9;y<3.25;y+=.09)cube(paper,11.85,y,z-1.5,.24,.025,2.94);
  }
  const ceiling=mat(0xe1e4e1,.95);
  // Ceiling strips are interrupted over the central circulation route, with acoustic baffles.
  cube(ceiling,-7,3.35,-25,10,.12,62);cube(ceiling,7,3.35,-25,10,.12,62);
  for(let z=4;z>-56;z-=3){
    cube(black,0,3.35,z,4,.08,.065);
    cube(black,-5,3.15,z,2.5,.08,.16);cube(glow,-5,3.105,z,2.4,.02,.12);
    cube(black,5,3.15,z,2.5,.08,.16);cube(glow,5,3.105,z,2.4,.02,.12);
  }
  cube(ceiling,0,3.63,-25,24,.08,62);
  for(let z=3;z>-56;z-=1.5)cube(black,0,3.68,z,24,.018,.02);
  function planter(x,z){
    contactShadow(x,z,1.05,1.05);
    mesh(new T.CylinderGeometry(.26,.20,.46,24),pot,x,.23,z);addCollider(x,z,.52,.52,.46,false);
    for(let i=0;i<11;i++){
      const a=i*2.399,height=.85+(i%4)*.18;
      rod(leaf,[x,.35,z],[x+Math.cos(a)*.3,height,z+Math.sin(a)*.3],.012);
      const l=mesh(new T.SphereGeometry(1,12,8),leaf,x+Math.cos(a)*.3,height,z+Math.sin(a)*.3);
      l.scale.set(.105,.27,.022);l.rotation.set(.45,a,.5);
    }
  }
  function chair(x,z,angle=0){
    contactShadow(x,z,.95,.95);
    const group=new T.Group();group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);
    const part=(geo,mat,px,py,pz)=>{const o=new T.Mesh(geo,mat);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
    part(new T.CylinderGeometry(.035,.035,.42,10),metal,0,.26,0);
    const seat=part(new T.BoxGeometry(.49,.085,.47),leather,0,.49,0);
    const back=part(new T.BoxGeometry(.46,.48,.065),leather,0,.77,-.23);back.rotation.x=-.11;
    for(const side of [-1,1]){
      part(new T.BoxGeometry(.025,.23,.025),metal,side*.27,.58,-.08);part(new T.BoxGeometry(.065,.045,.30),black,side*.27,.69,0);
    }
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5,leg=part(new T.BoxGeometry(.035,.035,.34),metal,Math.sin(a)*.14,.10,Math.cos(a)*.14);leg.rotation.y=a;
      const wheel=part(new T.CylinderGeometry(.045,.045,.05,10),black,Math.sin(a)*.28,.06,Math.cos(a)*.28);wheel.rotation.z=Math.PI/2;
    }
    addCollider(x,z,.55,.55,1.01,true);
  }
  const monitorMat=mat(0x89a9b0,.4);monitorMat.emissive.set(0x527c85);monitorMat.emissiveIntensity=.25;
  const displayCanvas=document.createElement('canvas');displayCanvas.width=512;displayCanvas.height=288;
  const ui=displayCanvas.getContext('2d');ui.fillStyle='#192d38';ui.fillRect(0,0,512,288);ui.fillStyle='#304a56';ui.fillRect(0,0,512,26);ui.fillRect(0,26,95,262);
  ui.fillStyle='#90b4b7';ui.font='12px sans-serif';ui.fillText('PROJECT / Q4',112,52);
  for(let i=0;i<9;i++){ui.fillStyle=i===2?'#71c7b5':'#638794';ui.fillRect(15,46+i*23,55,5);}
  for(let i=0;i<12;i++){ui.fillStyle=i%3?'#7693a0':'#d2b891';ui.fillRect(114+(i%3)*9,75+i*13,105+(i*37)%180,4);}
  ui.fillStyle='#4b8f92';ui.fillRect(375,56,108,182);for(let i=0;i<5;i++){ui.fillStyle='#b1d1c8';ui.fillRect(386+i*18,201-i*20,10,24+i*20);}
  const screenTex=new T.CanvasTexture(displayCanvas);screenTex.colorSpace=T.SRGBColorSpace;
  const screenMaterial=new T.MeshBasicMaterial({map:screenTex});
  function workstation(x,z,flip=false){
    contactShadow(x,z,2.1,1.4);
    cube(desk,x,.77,z,1.65,.055,.8,true);
    for(const side of [-1,1]){cube(black,x+side*.73,.38,z,.045,.76,.66);cube(black,x+side*.73,.05,z,.11,.06,.72);}
    const sign=flip?-1:1;
    addCollider(x,z-sign*.16,.68,.06,1.335,true,.80);
    cube(black,x,1.13,z-sign*.16,.68,.41,.042);mesh(new T.PlaneGeometry(.625,.355),screenMaterial,x,1.13,z-sign*.16+sign*.025,0,flip?Math.PI:0);
    cube(metal,x,.89,z-sign*.16,.03,.20,.03);cube(black,x,.812,z-sign*.12,.22,.025,.16);
    cube(black,x,.815,z+sign*.19,.44,.016,.14);cube(paper,x+.55,.812,z+.18,.21,.012,.29);
    // Keyboard keys and screen document lines have a believable small scale.
    for(let k=0;k<6;k++)cube(paper,x-.2+k*.075,1.15,z-sign*.16+sign*.031,.055,.007,.002);
    mesh(new T.CylinderGeometry(.043,.034,.1,16),paper,x-.57,.845,z+.12);
    chair(x,z+sign*.85,flip?Math.PI:0);
  }
  // Arrival lobby: reception, timber backdrop, waiting furniture and architectural signage.
  cube(wood,-6.3,1.65,4.9,8,3.3,.15);
  for(let x=-10.3;x<-2.3;x+=.13)cube(black,x,1.65,4.8,.025,3.25,.03);
  cube(wall,-6.3,.53,2.4,4.1,1.06,1.1,true);cube(desk,-6.3,1.075,2.4,4.2,.055,1.17);
  label('AFTER HOURS','CREATIVE OFFICE  /  18:00',-6.3,2.1,4.69,4,Math.PI);
  label('퇴근은 정시에.','야근은 사양합니다.',-11.85,1.65,0,2,Math.PI/2);
  function sofa(x,z){
    contactShadow(x,z,3.2,1.45);
    cube(fabric,x,.34,z,2.6,.43,.9,true);cube(fabric,x,.70,z-.37,2.6,.6,.22);
    for(const side of [-1,1])cube(fabric,x+side*1.19,.6,z,.22,.38,.95);
    for(const xx of [-.73,0,.73])cube(fabric,x+xx,.57,z+.045,.70,.12,.66);
    for(const side of [-1,1])cube(black,x+side*1.05,.09,z,.055,.18,.65);
  }
  sofa(7,3.4);cube(desk,7,.36,1.6,1.6,.065,.7,true);cube(black,7,.17,1.6,1.2,.3,.045);
  planter(10.7,4.4);planter(-2.8,4.8);
  // West work bays with real clearances; carpet separates desks from circulation.
  for(const z of [-7,-20,-33,-46]){
    floor(carpet,-6.5,z,8.8,8.8,FLOOR_RUG);
    for(const x of [-8.5,-5.2]){workstation(x,z-1.2);workstation(x,z+1.2,true);}
    cube(fabric,-6.85,1.02,z,5.1,.48,.055);
    // Split storage leaves a 2 m cross-passage through every work bay.
    for(const x of [-9,-4.4]){
      cube(wood,x,.53,z-4.55,2.5,1.06,.42,true);
      for(let i=0;i<5;i++)cube(i%3?paper:black,x-1+i*.45,1.22,z-4.55,.035,.29,.21);
    }
    label('← SIDE LOOP','책상 위로 SPACE / 옆 통로로 우회',-6.7,2.5,z-4.55,2.6);
    planter(-2.7,z-3.2);
    label('STUDIO '+String(1+Math.round((-z-7)/13)).padStart(2,'0'),'집중 근무 중',-11.84,2,z,2.4,Math.PI/2);
  }
  function glassWall(x,z,w,d){
    cube(glass,x,1.6,z,w,3.1,d,true);cube(black,x,.06,z,w,.10,d+.025);cube(black,x,3.14,z,w,.06,d+.025);
    if(w>d){for(let xx=x-w/2;xx<=x+w/2;xx+=1.5)cube(black,xx,1.6,z,.035,3.1,.05);}
    else {for(let zz=z-d/2;zz<=z+d/2;zz+=1.5)cube(black,x,1.6,zz,.05,3.1,.035);}
    // Frosted privacy band with subtle opaque lines.
    const frost=new T.MeshStandardMaterial({color:0xd7dfd9,transparent:true,opacity:.32,roughness:.8,depthWrite:false});
    cube(frost,x,1.25,z,w,.32,d+.008);
  }
  // Two glass meeting rooms. Doorways on both ends create escape loops.
  for(const z of [-12,-36]){
    floor(carpet,6.6,z,8.4,9,FLOOR_RUG);
    glassWall(2.5,z,.04,5);
    // A 2 m opening from the main aisle, plus the existing east-side loop.
    cube(black,2.5,3.14,z+3.5,.06,.06,2);
    label('ENTRY →','반대편 출구로 이어집니다',2.44,2.75,z+3.5,1.3,-Math.PI/2);
    cube(black,2.5,3.14,z-3.5,.06,.06,2);glassWall(6,z-4.5,7,.04);glassWall(6,z+4.5,7,.04);
    // East-side gaps near the façade remain open, with door hardware identifying entries.
    cube(metal,9.65,1.05,z+4.5,.04,.35,.04);
    cube(desk,6,.76,z,2.2,.07,4.8,true);
    cube(black,6,.38,z,1.4,.74,.09);
    for(const zz of [-1.6,0,1.6]){chair(4.45,z+zz,-Math.PI/2);chair(7.55,z+zz,Math.PI/2);}
    cube(black,6.4,1.9,z-4.43,2.6,1.45,.065);cube(monitorMat,6.4,1.9,z-4.39,2.48,1.32,.01);
    label('THIS COULD BE AN EMAIL','회의는 짧게, 퇴근은 빠르게',6.4,1.9,z-4.375,2.35);
    label(z===-12?'01 / MEETING':'02 / CONFERENCE','예약 없이 들어오지 마세요',2.46,2.4,z,1.7,-Math.PI/2);
    planter(10.7,z+3.4);
    // Where the 사장님 ultimate herds everyone: the aisle between the west glazing and
    // the table is the one strip wide enough to line five people up without clipping chairs.
    WORLD.meetingRooms.push({
      code:z===-12?'01 / MEETING':'02 / CONFERENCE',
      name:z===-12?'제1회의실':'대회의실',
      x:6,z,
      muster:{x:3.5,z},
      host:{x:2.15,z:z+3.5},
      doors:[{x:2.5,z:z+3.5},{x:2.5,z:z-3.5}],
      spots:[-3.2,-1.6,0,1.6,3.2].map(off=>({x:3.5,z:z+off})),
    });
  }
  // Pantry in the open interval between meeting rooms.
  cube(wood,11.25,.46,-24,.9,.92,8,true);cube(desk,11.20,.95,-24,1.05,.07,8);
  for(let z=-27;z<-21;z+=1.4){cube(black,11.65,1.02,z,.07,.06,.035);}
  cube(black,11.15,1.18,-24,.43,.45,.48);cube(metal,10.91,1.18,-24,.025,.25,.30);
  cube(paper,11.18,1.1,-22.9,.16,.23,.16);planter(10.8,-20.2);
  sofa(5.9,-24);cube(desk,6,.4,-22.1,1.8,.055,.75,true);
  label('COFFEE / RESET','복지의 전부는 아니길',11.75,2,-24,2.4,-Math.PI/2);
  // Far lounge and end-wall exit wayfinding.
  sofa(7,-50);planter(10.7,-53.8);
  cube(black,0,1.25,-55.85,2.5,2.5,.07);cube(metal,0,1.25,-55.8,.045,2.5,.02);
  label('EXIT  →','오늘도 수고하셨습니다',0,2.9,-55.72,2.8);
  // City massing outside the glazing: depth and warm late-afternoon atmosphere.
  const buildingMats=[mat(0x718087),mat(0x8b989c),mat(0x5b6a72)],exteriorWindows=new T.MeshStandardMaterial({color:0x9aa9aa,roughness:.42,metalness:.3,emissive:0x000000});
  for(let i=0;i<27;i++){
    const x=22+(i%3)*13,z=14-Math.floor(i/3)*11,h=5+(i*7%18);
    cube(buildingMats[i%3],x,h/2-8,z,7,h,8);
    for(let y=-5;y<h-8;y+=1.25)cube(exteriorWindows,x-3.52,y,z,.025,.055,7.8);
  }
  // Architectural cross-beams and numbered portals break up the long perspective.
  for(const z of [-3,-17,-30,-43]){
    cube(wood,-2.05,1.65,z,.16,3.3,.20,true);
    cube(wood,2.1,3.18,z,8.4,.23,.20);
    label('AFTER HOURS / '+String(Math.round((-z+10)/13)).padStart(2,'0'),'WORK / MEET / RESET',0,2.91,z+.11,2.4);
  }
  // Bake repeated architecture into instanced batches to preserve FPS.
  for(const [material,matrices] of pools){
    const inst=new T.InstancedMesh(unit,material,matrices.length);matrices.forEach((m,i)=>inst.setMatrixAt(i,m));
    inst.castShadow=material!==glass && material!==glow && !material.transparent;
    inst.receiveShadow=true;inst.computeBoundingSphere();scene.add(inst);
  }
  // Chairs, plant leaves and metal rods are also instanced, including nested transforms.
  scene.updateMatrixWorld(true);
  const repeats=new Map();
  scene.traverse(o=>{
    if(!o.isMesh || o.isInstancedMesh || !o.geometry.parameters)return;
    const key=o.material.uuid+o.geometry.type+JSON.stringify(o.geometry.parameters);
    if(!repeats.has(key))repeats.set(key,[]);repeats.get(key).push(o);
  });
  let detailBatches=0;
  for(const meshes of repeats.values())if(meshes.length>1){
    const first=meshes[0],inst=new T.InstancedMesh(first.geometry,first.material,meshes.length);
    meshes.forEach((m,i)=>{inst.setMatrixAt(i,m.matrixWorld);m.removeFromParent();if(m.geometry!==first.geometry)m.geometry.dispose();});
    inst.castShadow=first.castShadow;inst.receiveShadow=first.receiveShadow;inst.computeBoundingSphere();scene.add(inst);detailBatches++;
  }
  if(renderer){
    function skyTexture(night){const sky=document.createElement('canvas');sky.width=1024;sky.height=512;const ctx=sky.getContext('2d'),grad=ctx.createLinearGradient(0,0,0,512);if(night){grad.addColorStop(0,'#07101d');grad.addColorStop(.52,'#17283a');grad.addColorStop(.78,'#344354');grad.addColorStop(1,'#141b25');}else{grad.addColorStop(0,'#749bb6');grad.addColorStop(.48,'#dce7e9');grad.addColorStop(.57,'#f2ddba');grad.addColorStop(1,'#7a7970');}ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);if(night){let seed=19;for(let i=0;i<120;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%1024;seed=(seed*1664525+1013904223)>>>0;const y=seed%260;const a=.28+(seed%55)/100;ctx.fillStyle=`rgba(220,235,255,${a})`;ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);}ctx.fillStyle='#d9e6e6';ctx.beginPath();ctx.arc(820,102,33,0,Math.PI*2);ctx.fill();ctx.fillStyle='#07101d';ctx.beginPath();ctx.arc(836,91,32,0,Math.PI*2);ctx.fill();}const tex=new T.CanvasTexture(sky);tex.colorSpace=T.SRGBColorSpace;tex.mapping=T.EquirectangularReflectionMapping;return tex;}
    const day=skyTexture(false),night=skyTexture(true),pmrem=new T.PMREMGenerator(renderer),dayTarget=pmrem.fromEquirectangular(day),nightTarget=pmrem.fromEquirectangular(night);pmrem.dispose();WORLD.theme={day:{background:day,environment:dayTarget.texture,target:dayTarget},night:{background:night,environment:nightTarget.texture,target:nightTarget},buildingMats,exteriorWindows};scene.environment=dayTarget.texture;scene.background=day;
  }
  WORLD.panels=[];for(const z of [-3,-18,-33,-48]){const panel=new T.PointLight(0xfff0d8,.7,20,1);panel.position.set(0,2.9,z);scene.add(panel);WORLD.panels.push(panel);}
  const hemi=new T.HemisphereLight(0xc5dbea,0x7c807e,.9);scene.add(hemi);WORLD.hemi=hemi;
  const officeFill=new T.AmbientLight(0xb8c8d4,.08);scene.add(officeFill);WORLD.officeFill=officeFill;
  const sun=new T.DirectionalLight(0xffead0,2.1);sun.position.set(16,14,9);sun.target.position.set(0,0,-8);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:70});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun,sun.target);WORLD.sun=sun;
  const bounce=new T.DirectionalLight(0xd4e8ff,.5);bounce.position.set(-5,5,-20);scene.add(bounce);WORLD.bounce=bounce;
  WORLD.glassMaterial=glass;
  WORLD.stats={colliders:WORLD.colliders.length,instancedBatches:pools.size+detailBatches};
}
function setWorldTheme(scene,mode){
  const night=mode==='endless',theme=WORLD.theme;if(!theme)return;const selected=night?theme.night:theme.day;scene.background=selected.background;scene.environment=selected.environment;if(scene.fog)scene.fog.color.setHex(night?0x111d2a:0xc7d7df);
  const dayColors=[0x718087,0x8b989c,0x5b6a72],nightColors=[0x172333,0x202d3b,0x111c2a];theme.buildingMats.forEach((m,i)=>m.color.setHex((night?nightColors:dayColors)[i]));theme.exteriorWindows.color.setHex(night?0x5d6670:0x9aa9aa);theme.exteriorWindows.emissive.setHex(night?0xe7c681:0x000000);theme.exteriorWindows.emissiveIntensity=night?.75:0;
  WORLD.sun.color.setHex(night?0xa8c2ee:0xffead0);WORLD.sun.intensity=night?.72:2.1;WORLD.hemi.color.setHex(night?0x92abc8:0xc5dbea);WORLD.hemi.groundColor.setHex(night?0x515861:0x7c807e);WORLD.hemi.intensity=night?.88:.9;WORLD.officeFill.intensity=night?.62:.08;WORLD.bounce.intensity=night?.5:.5;WORLD.panels.forEach(p=>{p.intensity=night?1.85:.7;});
}
function updateWorldLighting(x,z){
  if(!WORLD.sun)return;
  WORLD.sun.position.set(x+24,7,z+9);WORLD.sun.target.position.set(x,0,z-8);
}
// Floor-specific architecture shares its dimensions with collision and navigation.
let floorDecor=null,baseFloorColliders=null;
function configureOfficeFloor(scene,T,level=null){
  if(!baseFloorColliders)baseFloorColliders=WORLD.colliders.slice();
  WORLD.colliders=baseFloorColliders.slice();
  if(floorDecor){const geos=new Set(),mats=new Set(),textures=new Set();floorDecor.traverse(o=>{if(o.skeleton)o.skeleton.dispose();if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);if(o.userData.approvalTextures)o.userData.approvalTextures.forEach(t=>textures.add(t));});geos.forEach(g=>g.dispose());mats.forEach(m=>{if(m.map)textures.add(m.map);m.dispose();});textures.forEach(t=>t.dispose());floorDecor.removeFromParent();}
  floorDecor=null;WORLD.floorMarkers=[];WORLD.approvalNpcs=[];WORLD.liftDoors=[];
  if(level===null)return;
  floorDecor=new T.Group();scene.add(floorDecor);
  const spec=OfficeFloors.layout(level),accent=new T.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:.35}),metal=new T.MeshStandardMaterial({color:0x465362,metalness:.65,roughness:.35}),cabinet=new T.MeshStandardMaterial({color:level%3===1?0x88918c:level%3===2?0x987951:0x6c8c88,roughness:.85});
  function box(mat,x,y,z,w,h,d){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;floorDecor.add(m);return m;}
  function sign(text,x,y,z,w=2.5){const c=document.createElement('canvas');c.width=1024;c.height=256;const p=c.getContext('2d');p.fillStyle='#102331';p.fillRect(0,0,1024,256);p.fillStyle='#e4fff5';p.font='bold 64px sans-serif';p.textAlign='center';p.fillText(text,512,145);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);floorDecor.add(m);}
  for(const [x,z,w,d] of spec.blocks){
    box(cabinet,x,1.1,z,w,2.2,d);box(accent,x,2.23,z,w,.06,d);addCollider(x,z,w,d,2.26,false);
    // Cabinet fronts and pulls give the route blockers a familiar office scale.
    for(const side of [-1,1]){
      box(metal,x,1.05,z+side*(d/2+.012),.025,2.03,.018);
      for(const offset of [-.12,.12])box(metal,x+offset,1.12,z+side*(d/2+.04),.028,.23,.05);
      if(level%3===1)for(let y=.35;y<2;y+=.4)box(metal,x,y,z+side*(d/2+.015),w*.86,.025,.025);
    }
    sign(level%3===1?'ARCHIVE':level%3===2?'EXECUTIVE':'OPERATIONS',x,1.85,z+d/2+.035,Math.min(w*.85,2.1));
  }
  const paper=new T.MeshStandardMaterial({color:0xfff4dc}),stampInk=new T.MeshStandardMaterial({color:0xbf5146});
  function approvalLabel(i,done){
    const c=document.createElement('canvas');c.width=1024;c.height=320;const p=c.getContext('2d');
    p.fillStyle=done?'#214b46':'#f4f1e4';p.beginPath();p.roundRect(8,8,1008,284,28);p.fill();
    p.beginPath();p.moveTo(475,292);p.lineTo(512,320);p.lineTo(549,292);p.fill();
    p.textAlign='center';p.fillStyle=done?'#adf0ca':'#307164';p.font='bold 38px sans-serif';p.fillText(`${i+1}차 결재 담당 · 추격하지 않아요`,512,68);
    p.fillStyle=done?'#ffffff':'#182e36';p.font='bold 52px sans-serif';p.fillText(done?'결재 완료! 수고하셨어요.':'이쪽으로 결재받으러 오세요!',512,153);
    p.font='36px sans-serif';p.fillText(done?'다음 담당자 또는 엘리베이터로 가세요':'가까이 와서 E · 서류 제출',512,233);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  spec.stops.forEach((s,i)=>{
    const side=Math.sign(s.x),deskX=s.x+side*.78;
    // A staffed approval counter faces the aisle. The interaction point stays in front.
    box(cabinet,deskX,.45,s.z,.58,.9,1.2);box(paper,deskX,.925,s.z,.65,.05,1.28);addCollider(deskX,s.z,.58,1.2,.95,true);
    box(paper,deskX,.968,s.z,.36,.025,.48);box(stampInk,deskX,.995,s.z+.34,.15,.07,.15);box(metal,deskX,1.07,s.z+.34,.065,.1,.065);
    const approvedSeal=box(stampInk,deskX,.984,s.z,.17,.004,.13);approvedSeal.visible=false;
    const npc=buildBossMesh({identity:'slim',skin:i?'tan':'fair',hair:i?'perm':'comb',outfit:'vest',face:'smug',prop:'paper'},T);
    npc.position.set(s.x+side*.7,0,s.z-.95);npc.rotation.y=-side*Math.PI/2;floorDecor.add(npc);
    addCollider(npc.position.x,npc.position.z,.4,.45,1.7,false);
    const textures=[approvalLabel(i,false),approvalLabel(i,true)];
    const bubble=new T.Sprite(new T.SpriteMaterial({map:textures[0],depthTest:true,depthWrite:false}));bubble.position.set(s.x,2.55,s.z);bubble.scale.set(3.1,.97,1);bubble.userData.approvalTextures=textures;floorDecor.add(bubble);
    const marker=box(accent.clone(),s.x,.035,s.z,.16,.025,1.2);WORLD.floorMarkers.push(marker);
    WORLD.approvalNpcs.push({mesh:npc,bubble,textures,approvedSeal,done:false});
    animateBossMesh(npc,0,0,false);
  });
  for(const z of [-3,-22,-42]){box(accent,0,.028,z,.1,.025,2);sign(`${level+1}F · ${spec.name}`,0,2.65,z,3.2);}
  box(metal,-1.5,1.5,-53.3,.12,3,.15);box(metal,1.5,1.5,-53.3,.12,3,.15);box(accent,0,3,-53.3,3.2,.08,.15);
  // A lit cabin back masks the old exit artwork when the sliding doors open.
  const cabin=new T.MeshStandardMaterial({color:0xa4b6be,roughness:.4,metalness:.25,emissive:0x48616e,emissiveIntensity:.3});
  box(cabin,0,1.35,-55.55,2.8,2.7,.08);box(metal,0,.95,-55.48,2.5,.035,.035);box(accent,0,2.6,-55.45,2.4,.045,.04);
  const glassDoor=new T.MeshPhysicalMaterial({color:0xc9eee9,transparent:true,opacity:.13,roughness:.08,metalness:0,depthWrite:false});
  for(const side of [-1,1]){
    const door=box(glassDoor,side*.7,1.35,-53.3,1.38,2.7,.035);door.castShadow=false;WORLD.liftDoors.push(door);
    const sideWall=box(glassDoor,side*1.5,1.35,-54.4,.035,2.7,2.2);sideWall.castShadow=false;addCollider(side*1.5,-54.4,.035,2.2,2.7,false);
  }
  sign('↑ ELEVATOR · E',0,2.8,-53.15,2.7);
  box(accent,0,.03,-54,2.8,.025,2);
}
function updateOfficeFloorVisuals(progress){
  WORLD.approvalNpcs.forEach((npc,i)=>{
    const done=progress.stamps[i];if(npc.done!==done){npc.bubble.material.map=npc.textures[Number(done)];npc.done=done;npc.approvedSeal.visible=done;}
    animateBossMesh(npc.mesh,progress.time,0,false);
  });
  WORLD.floorMarkers.forEach((m,i)=>{m.material.color.setHex(progress.stamps[i]?0x647571:OfficeFloors.layout(progress.level).color);m.material.emissiveIntensity=progress.stamps[i]?0:.35;});
  WORLD.liftDoors.forEach((m,i)=>{m.position.x=(i?1:-1)*(OfficeFloors.confined(progress)?.7:2.1);});
}
function resolveCollision(x,z,r,feet=-Infinity){
  let rx=x,rz=z;
  for(let pass=0;pass<3;pass++)for(const c of WORLD.colliders){
    if(feet>=(c.topY??Infinity)-.015)continue;
    const cx=Math.max(c.minX,Math.min(rx,c.maxX)),cz=Math.max(c.minZ,Math.min(rz,c.maxZ));
    const dx=rx-cx,dz=rz-cz,ds=dx*dx+dz*dz;
    if(ds>=r*r)continue;
    if(ds<1e-12){const sides=[rx-c.minX,c.maxX-rx,rz-c.minZ,c.maxZ-rz],side=sides.indexOf(Math.min(...sides));if(side===0)rx=c.minX-r;else if(side===1)rx=c.maxX+r;else if(side===2)rz=c.minZ-r;else rz=c.maxZ+r;}
    else {const d=Math.sqrt(ds);rx+=dx/d*(r-d);rz+=dz/d*(r-d);}
  }
  return {x:Math.max(WORLD.bounds.minX+r,Math.min(WORLD.bounds.maxX-r,rx)),z:Math.max(WORLD.bounds.minZ+r,Math.min(WORLD.bounds.maxZ-r,rz))};
}
