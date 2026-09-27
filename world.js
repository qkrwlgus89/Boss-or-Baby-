/* A furnished office floor, built in metres. Collision and visual architecture share dimensions. */
const WORLD={colliders:[],bounds:{minX:-12,maxX:12,minZ:-56,maxZ:6},sun:null,meetingRooms:[],glassMaterial:null,theme:null};
function addCollider(x,z,w,d,topY=Infinity,walkable=false,minY=0){WORLD.colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,topY,walkable,minY});}
// Real edge highlights give the office furniture its scale; all repeated variants
// are batched below, so a bevel does not turn every chair into another draw call.
function officeBeveledBox(T,w,h,d,r=.025){
  r=Math.min(r,w*.2,h*.2,d*.2);
  const shape=new T.Shape(),x=w/2-r,y=h/2-r;
  shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:d-2*r,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:1});
  geometry.translate(0,0,-(d-2*r)/2);
  geometry.userData.officeBatchKey=`beveled/${w}/${h}/${d}/${r}`;
  return geometry;
}
function officeTexture(T,kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');let seed=42;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(kind==='wood'){
    c.fillStyle='#d2bea2';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y++){
      const light=48+rand()*27;c.strokeStyle=`hsla(32,23%,${light}%,.22)`;c.beginPath();
      for(let x=0;x<=512;x+=4){const yy=y+Math.sin(x*.018+y*.06)*1.8+Math.sin(x*.051+y*.08)*.6;c.lineTo(x,yy);}c.stroke();
    }
    for(let y=0;y<512;y+=128){c.fillStyle='#463b2e55';c.fillRect(0,y,512,1);c.fillRect((y*2+180)%512,y,1,128);c.fillStyle='#fff8e433';c.fillRect(0,y+1,512,1);}
  }else if(kind==='carpet'){
    c.fillStyle='#818c8b';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=3)for(let x=0;x<512;x+=3){const v=104+Math.floor(rand()*46);c.fillStyle=`rgb(${v},${v+8},${v+7})`;c.fillRect(x+(y%2),y,1,2);}
    c.strokeStyle='#263b3938';c.lineWidth=2;c.strokeRect(1,1,510,510);
  }else if(kind==='stone'){
    c.fillStyle='#c8c4b8';c.fillRect(0,0,512,512);
    for(let i=0;i<23000;i++){const a=.025+rand()*.07;c.fillStyle=`rgba(57,68,66,${a})`;c.fillRect(rand()*512,rand()*512,1+rand()*2,1+rand()*2);}
    c.strokeStyle='#797d752d';c.lineWidth=1.5;c.strokeRect(0,0,512,512);
  }else if(kind==='brushed'){
    c.fillStyle='#bbbdbd';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y++){c.fillStyle=`rgba(60,68,70,${.05+rand()*.15})`;c.fillRect(0,y,512,1);}
  }else{
    c.fillStyle='#e8e5de';c.fillRect(0,0,512,512);
    for(let i=0;i<22000;i++){c.fillStyle=rand()>.5?'#ffffff10':'#2630360d';c.fillRect(rand()*512,rand()*512,2,2);}
  }
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t;
}
function buildWorld(scene,T,renderer){
  WORLD.colliders=[]; WORLD.bounds={minX:-12,maxX:12,minZ:-56,maxZ:6}; WORLD.meetingRooms=[];
  const woodTex=officeTexture(T,'wood'),carpetTex=officeTexture(T,'carpet'),plasterTex=officeTexture(T,'plaster'),stoneTex=officeTexture(T,'stone'),brushedTex=officeTexture(T,'brushed');
  const mat=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
  const wall=mat(0xf0ece2,.86),wood=mat(0xc7aa84,.49),floorWood=mat(0xc5b496,.54),carpet=mat(0x829593,.98),black=mat(0x202c30,.38,.46),metal=mat(0xaebcbb,.3,.78),desk=mat(0xe3d0ae,.4),fabric=mat(0x4b7474,.97),leather=mat(0x344848,.69),paper=mat(0xf5f0df),leaf=mat(0x356b4e,.82),pot=mat(0xd5caba,.61),concrete=mat(0x9fa9a5,.8),stone=mat(0xdbd9cd,.63),brass=mat(0xbe9b5d,.32,.72);
  wood.map=woodTex;wood.bumpMap=woodTex;wood.bumpScale=.012;
  floorWood.map=woodTex.clone();floorWood.map.repeat.set(6,20);floorWood.map.needsUpdate=true;floorWood.bumpMap=floorWood.map;floorWood.bumpScale=.003;
  carpet.map=carpetTex;carpet.map.repeat.set(4,4);carpet.bumpMap=carpetTex;carpet.bumpScale=.007;
  wall.map=plasterTex;wall.bumpMap=plasterTex;wall.bumpScale=.004;
  desk.map=woodTex;desk.bumpMap=woodTex;desk.bumpScale=.003;
  stone.map=stoneTex;stone.map.repeat.set(2,30);stone.bumpMap=stoneTex;stone.bumpScale=.002;
  metal.map=brushedTex;metal.bumpMap=brushedTex;metal.bumpScale=.0008;
  fabric.map=carpetTex;fabric.bumpMap=carpetTex;fabric.bumpScale=.006;
  const glow=new T.MeshStandardMaterial({color:0xfff4d4,emissive:0xffe5b2,emissiveIntensity:2.8});
  const glass=new T.MeshPhysicalMaterial({color:0xb6d2d1,roughness:.1,metalness:.08,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false});
  const pools=new Map(),unit=new T.BoxGeometry(1,1,1);
  function cube(material,x,y,z,w,h,d,solid=false,ry=0,edge=null){
    if(solid)addCollider(x,z,Math.abs(Math.cos(ry))*w+Math.abs(Math.sin(ry))*d,Math.abs(Math.sin(ry))*w+Math.abs(Math.cos(ry))*d,y+h/2,y+h/2<1.5);
    if(edge===null)edge=material===fabric?.05:material===desk?.018:material===wood?.014:0;
    const key=material.uuid+(edge?`/${w}/${h}/${d}/${edge}`:'/unit');
    if(!pools.has(key))pools.set(key,{material,geometry:edge?officeBeveledBox(T,w,h,d,edge):unit,matrices:[]});
    const obj=new T.Object3D();obj.position.set(x,y,z);obj.scale.set(edge?1:w,edge?1:h,edge?1:d);obj.rotation.y=ry;obj.updateMatrix();
    pools.get(key).matrices.push(obj.matrix.clone());
  }
  function mesh(geo,material,x,y,z,rx=0,ry=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,0);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  function rod(material,a,b,r=.02){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=mesh(new T.CylinderGeometry(r,r,delta.length(),8),material,...start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
  function label(text,sub,x,y,z,w=2,ry=0){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const p=c.getContext('2d');
    p.fillStyle='#203639';p.fillRect(0,0,1024,256);p.fillStyle='#c6a66b';p.fillRect(38,48,5,158);p.fillStyle='#f1ead9';p.font='600 65px sans-serif';p.fillText(text,66,117,910);p.font='25px sans-serif';p.fillStyle='#a7c4be';p.fillText(sub,69,181,890);p.fillStyle='#729591';p.fillRect(66,214,892,1);
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
  floor(stone,0,-25,3.45,62,.011);
  for(const side of [-1,1])cube(brass,side*1.745,.015,-25,.018,.008,62);
  cube(black,-11.85,.055,-25,.035,.11,62);cube(black,0,.055,5.85,24,.11,.035);
  cube(wall,-12,1.65,-25,.24,3.3,62,true);cube(wall,0,1.65,-56,24,3.3,.24,true);cube(wall,0,1.65,6,24,3.3,.24,true);
  cube(wood,-11.83,.42,-25,.075,.68,62);cube(brass,-11.775,.78,-25,.018,.018,62);
  cube(black,-11.8,3.08,-25,.14,.11,62);cube(glow,-11.75,3.145,-25,.08,.025,62);
  // Windows on the east façade. A continuous parapet also supplies the collision boundary.
  cube(concrete,12,.24,-25,.2,.48,62,true);
  for(let z=4;z>-56;z-=3){
    cube(black,12,1.9,z,.14,2.85,.065);cube(glass,12,1.86,z-1.5,.025,2.74,2.94);
    cube(black,12,3.26,z-1.5,.16,.08,3);cube(black,12,.5,z-1.5,.16,.08,3);
    cube(wood,11.82,.535,z-1.5,.34,.065,3);
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
    for(const side of [-1,1]){
      cube(metal,side*5,3.26,z-.96,.018,.18,.018);
      cube(metal,side*5,3.26,z+.96,.018,.18,.018);
      cube(wood,side*1.9,3.22,z,.045,.22,2.45);
    }
  }
  cube(ceiling,0,3.63,-25,24,.08,62);
  for(let z=3;z>-56;z-=1.5)cube(black,0,3.68,z,24,.018,.02);
  const leafLight=mat(0x4f8053,.8),leafDark=mat(0x244a3a,.83),soil=mat(0x302d25,.98);
  function planter(x,z){
    contactShadow(x,z,1.05,1.05);
    mesh(new T.CylinderGeometry(.26,.20,.46,24),pot,x,.23,z);addCollider(x,z,.52,.52,.46,false);
    mesh(new T.CylinderGeometry(.245,.245,.022,24),soil,x,.464,z);
    mesh(new T.TorusGeometry(.248,.014,6,24),pot,x,.466,z,Math.PI/2);
    mesh(new T.TorusGeometry(.211,.009,6,24),brass,x,.067,z,Math.PI/2);
    for(let i=0;i<11;i++){
      const a=i*2.399,height=.85+(i%4)*.18;
      rod(leaf,[x,.35,z],[x+Math.cos(a)*.3,height,z+Math.sin(a)*.3],.012);
      const l=mesh(new T.SphereGeometry(1,12,8),i%3===0?leafLight:i%3===1?leaf:leafDark,x+Math.cos(a)*.3,height,z+Math.sin(a)*.3);
      l.scale.set(.115,.29,.028);l.rotation.set(.45,a,.5);
    }
  }
  function chair(x,z,angle=0){
    contactShadow(x,z,.95,.95);
    const group=new T.Group();group.position.set(x,0,z);group.rotation.y=angle;scene.add(group);
    const part=(geo,mat,px,py,pz)=>{const o=new T.Mesh(geo,mat);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
    part(new T.CylinderGeometry(.035,.035,.42,10),metal,0,.26,0);
    part(officeBeveledBox(T,.49,.095,.47,.035),leather,0,.49,0);
    const back=part(officeBeveledBox(T,.46,.48,.085,.035),leather,0,.77,-.23);back.rotation.x=-.11;
    const pad=part(officeBeveledBox(T,.38,.27,.024,.012),fabric,0,.79,-.175);pad.rotation.x=-.11;
    part(new T.BoxGeometry(.08,.25,.045),black,0,.51,-.215);
    for(const side of [-1,1]){
      part(new T.BoxGeometry(.025,.23,.025),metal,side*.27,.58,-.08);part(officeBeveledBox(T,.065,.045,.30,.012),black,side*.27,.69,0);
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
  const screenMaterial=new T.MeshStandardMaterial({map:screenTex,emissiveMap:screenTex,emissive:0xffffff,emissiveIntensity:.55,roughness:.27,metalness:.08});
  const keycap=mat(0x526367,.54),coffee=mat(0x352a23,.19),ceramic=mat(0xdfdfcf,.22),stationery=mat(0x677f79,.61);
  function workstation(x,z,flip=false){
    contactShadow(x,z,2.1,1.4);
    cube(desk,x,.77,z,1.65,.055,.8,true);
    for(const side of [-1,1]){cube(black,x+side*.73,.38,z,.045,.76,.66);cube(black,x+side*.73,.05,z,.11,.06,.72);}
    const sign=flip?-1:1;
    addCollider(x,z-sign*.16,.68,.06,1.335,true,.80);
    cube(black,x,1.13,z-sign*.16,.68,.41,.042,false,0,.008);mesh(new T.PlaneGeometry(.625,.355),screenMaterial,x,1.13,z-sign*.16+sign*.025,0,flip?Math.PI:0);
    cube(glow,x+.295, .955,z-sign*.16+sign*.024,.01,.003,.003);
    cube(metal,x,.89,z-sign*.16,.03,.20,.03);cube(black,x,.812,z-sign*.12,.22,.025,.16);
    cube(black,x,.815,z+sign*.19,.44,.016,.14,false,0,.004);
    for(let row=0;row<3;row++)for(let k=0;k<12;k++)cube(keycap,x-.194+k*.035,.826,z+sign*(.148+row*.035),.027,.006,.025);
    cube(keycap,x,.826,z+sign*.248,.18,.006,.016);
    cube(stationery,x+.55,.813,z+.18,.24,.025,.30,false,.08,.008);cube(paper,x+.55,.829,z+.18,.217,.008,.284,false,.08);
    cube(brass,x+.56,.84,z+.18,.006,.007,.21,false,.22);
    cube(black,x+.32,.82,z+sign*.18,.075,.035,.11,false,0,.017);
    mesh(new T.CylinderGeometry(.043,.034,.1,16),ceramic,x-.57,.845,z+.12);
    mesh(new T.CylinderGeometry(.035,.035,.003,16),coffee,x-.57,.896,z+.12);
    mesh(new T.TorusGeometry(.03,.009,6,12),ceramic,x-.518,.858,z+.12,0,Math.PI/2);
    cube(black,x-.7,.852,z-sign*.21,.065,.08,.065,false,0,.008);
    for(let i=0;i<3;i++)rod(i===1?brass:stationery,[x-.72+i*.019,.86,z-sign*.21],[x-.73+i*.025,.998,z-sign*.21],.004);
    cube(metal,x,.713,z,.8,.025,.52);cube(black,x+.5,.38,z-.19,.055,.68,.028);
    chair(x,z+sign*.85,flip?Math.PI:0);
  }
  // Arrival lobby: reception, timber backdrop, waiting furniture and architectural signage.
  cube(wood,-6.3,1.65,4.9,8,3.3,.15);
  for(let x=-10.3;x<-2.3;x+=.13)cube(black,x,1.65,4.8,.025,3.25,.03);
  cube(wall,-6.3,.53,2.4,4.1,1.06,1.1,true);cube(desk,-6.3,1.075,2.4,4.2,.055,1.17);
  cube(wood,-6.3,.5,1.835,3.92,.83,.035);cube(brass,-6.3,.91,1.806,3.92,.018,.015);
  cube(black,-6.3,.065,1.86,3.9,.12,.08);cube(glow,-6.3,.12,1.806,3.7,.012,.018);
  cube(black,-6.7,1.23,2.54,.63,.34,.045,false,.1,.009);
  cube(metal,-6.7,1.1,2.54,.16,.12,.11);
  label('AFTER HOURS','CREATIVE OFFICE  /  18:00',-6.3,2.1,4.69,4,Math.PI);
  label('퇴근은 정시에.','야근은 사양합니다.',-11.85,1.65,0,2,Math.PI/2);
  function sofa(x,z){
    contactShadow(x,z,3.2,1.45);
    cube(fabric,x,.34,z,2.6,.43,.9,true);cube(fabric,x,.70,z-.37,2.6,.6,.22);
    for(const side of [-1,1])cube(fabric,x+side*1.19,.6,z,.22,.38,.95);
    for(const xx of [-.73,0,.73])cube(fabric,x+xx,.57,z+.045,.70,.12,.66);
    for(const xx of [-.73,0,.73]){
      cube(fabric,x+xx,.84,z-.29,.72,.39,.16,false,-.025);
      cube(black,x+xx,.638,z+.353,.58,.005,.005);
    }
    for(const side of [-1,1])cube(black,x+side*1.05,.09,z,.055,.18,.65);
  }
  sofa(7,3.4);cube(desk,7,.36,1.6,1.6,.065,.7,true);cube(black,7,.17,1.6,1.2,.3,.045);
  cube(stationery,7.3,.41,1.6,.38,.055,.27,false,.13,.008);cube(paper,7.3,.445,1.6,.36,.012,.25,false,.13);
  planter(10.7,4.4);planter(-2.8,4.8);
  // West work bays with real clearances; carpet separates desks from circulation.
  for(const z of [-7,-20,-33,-46]){
    floor(carpet,-6.5,z,8.8,8.8,FLOOR_RUG);
    for(const side of [-1,1])cube(black,-6.5+side*4.4,.027,z,.025,.018,8.8);
    for(const x of [-8.5,-5.2]){workstation(x,z-1.2);workstation(x,z+1.2,true);}
    cube(fabric,-6.85,1.02,z,5.1,.48,.055);
    // Split storage leaves a 2 m cross-passage through every work bay.
    for(const x of [-9,-4.4]){
      cube(wood,x,.53,z-4.55,2.5,1.06,.42,true);
      cube(black,x,.075,z-4.55,2.36,.12,.34);
      for(const face of [-1,1])for(const door of [-1,1]){
        cube(black,x+door*.62,.55,z-4.55+face*.216,.014,.82,.008);
        cube(brass,x+door*.1,.64,z-4.55+face*.238,.024,.18,.03);
      }
      for(let i=0;i<5;i++)cube(i%3?paper:black,x-1+i*.45,1.22,z-4.55,.035,.29,.21);
    }
    label('← SIDE LOOP','책상 위로 SPACE / 옆 통로로 우회',-6.7,2.5,z-4.55,2.6);
    planter(-2.7,z-3.2);
    label('STUDIO '+String(1+Math.round((-z-7)/13)).padStart(2,'0'),'집중 근무 중',-11.759,2,z,2.4,Math.PI/2);
    for(let j=0;j<5;j++)cube(fabric,-11.80,1.84,z-1.72+j*.84,.055,1.66,.69,false,0,.018);
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
    cube(wood,6,.708,z,2.02,.04,4.62);
    cube(black,6,.38,z,1.4,.74,.09);
    for(const zz of [-1.6,0,1.6]){chair(4.45,z+zz,-Math.PI/2);chair(7.55,z+zz,Math.PI/2);}
    for(const xx of [5.24,6.76])for(const zz of [-1.45,0,1.45]){
      cube(stationery,xx,.812,z+zz,.3,.022,.23,false,.07,.006);cube(paper,xx,.828,z+zz,.277,.009,.214,false,.07);
      mesh(new T.CylinderGeometry(.035,.032,.085,12),ceramic,xx,.837,z+zz+.22);
    }
    cube(black,6,.813,z,.26,.035,.3,false,0,.009);
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
  cube(metal,10.86,1.02,-24,.14,.025,.38);cube(black,10.848,1.034,-24,.145,.008,.32);
  mesh(new T.CylinderGeometry(.045,.035,.11,16),ceramic,10.865,1.09,-24);
  for(const z of [-26.8,-25.6,-24.4,-23.2,-22]){
    cube(black,10.789,.49,z,.014,.79,.025);cube(brass,10.775,.77,z-.36,.035,.03,.26);
  }
  cube(paper,11.18,1.1,-22.9,.16,.23,.16);planter(10.8,-20.2);
  sofa(5.9,-24);cube(desk,6,.4,-22.1,1.8,.055,.75,true);
  label('COFFEE / RESET','복지의 전부는 아니길',11.75,2,-24,2.4,-Math.PI/2);
  // Far lounge and end-wall exit wayfinding.
  sofa(7,-50);planter(10.7,-53.8);
  cube(black,0,1.25,-55.85,2.5,2.5,.07);cube(metal,0,1.25,-55.8,.045,2.5,.02);
  label('EXIT  →','오늘도 수고하셨습니다',0,2.9,-55.72,2.8);
  // A layered skyline, with occupied and dark offices instead of luminous stripes.
  const buildingMats=[mat(0x718087),mat(0x8b989c),mat(0x5b6a72)],exteriorWindows=new T.MeshStandardMaterial({color:0xaab6b3,roughness:.32,metalness:.38,emissive:0x000000}),exteriorDarkWindows=mat(0x3c5664,.28,.5),rooftop=mat(0x425359,.7);
  [...buildingMats,exteriorWindows,exteriorDarkWindows,rooftop].forEach(m=>{m.userData.exterior=true;});
  for(let i=0;i<27;i++){
    const x=22+(i%3)*13,z=14-Math.floor(i/3)*11,h=5+(i*7%18);
    cube(buildingMats[i%3],x,h/2-8,z,7,h,8);
    cube(rooftop,x,h-7.85,z,7.15,.18,8.15);cube(rooftop,x+1,h-7.55,z-1,2,.5,2.5);
    for(let y=-6;y<h-8.3;y+=1.35)for(let bay=0;bay<6;bay++){
      const lit=(i*7+bay*3+Math.round(y*10))%5>1;
      cube(lit?exteriorWindows:exteriorDarkWindows,x-3.516,y,z-3.3+bay*1.3,.026,.84,.91);
    }
  }
  // Architectural cross-beams and numbered portals break up the long perspective.
  for(const z of [-3,-17,-30,-43]){
    cube(wood,-2.05,1.65,z,.16,3.3,.20,true);
    cube(wood,2.1,3.18,z,8.4,.23,.20);
    label('AFTER HOURS / '+String(Math.round((-z+10)/13)).padStart(2,'0'),'WORK / MEET / RESET',0,2.91,z+.11,2.4);
  }
  // Bake repeated architecture into instanced batches to preserve FPS.
  for(const {material,geometry,matrices} of pools.values()){
    const inst=new T.InstancedMesh(geometry,material,matrices.length);matrices.forEach((m,i)=>inst.setMatrixAt(i,m));
    inst.castShadow=material!==glass && material!==glow && !material.transparent && !material.userData.exterior;
    inst.receiveShadow=true;inst.computeBoundingSphere();scene.add(inst);
  }
  // Chairs, plant leaves and metal rods are also instanced, including nested transforms.
  scene.updateMatrixWorld(true);
  const repeats=new Map();
  scene.traverse(o=>{
    if(!o.isMesh || o.isInstancedMesh || !o.geometry.parameters)return;
    const key=o.material.uuid+(o.geometry.userData.officeBatchKey||o.geometry.type+JSON.stringify(o.geometry.parameters));
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
  WORLD.panels=[];for(const z of [-3,-18,-33,-48]){const panel=new T.PointLight(0xffe7c3,1.1,19,1);panel.position.set(0,2.9,z);scene.add(panel);WORLD.panels.push(panel);}
  const hemi=new T.HemisphereLight(0xc5dbea,0x68736d,.78);scene.add(hemi);WORLD.hemi=hemi;
  const officeFill=new T.AmbientLight(0xb8c8d4,.08);scene.add(officeFill);WORLD.officeFill=officeFill;
  const sun=new T.DirectionalLight(0xffe4bd,2.35);sun.position.set(16,14,9);sun.target.position.set(0,0,-8);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:70});sun.shadow.bias=-.0002;sun.shadow.normalBias=.035;scene.add(sun,sun.target);WORLD.sun=sun;
  const bounce=new T.DirectionalLight(0xc5dfe6,.42);bounce.position.set(-5,5,-20);scene.add(bounce);WORLD.bounce=bounce;
  WORLD.glassMaterial=glass;
  WORLD.stats={colliders:WORLD.colliders.length,instancedBatches:pools.size+detailBatches};
}
function setWorldTheme(scene,mode){
  const night=mode==='endless',theme=WORLD.theme;if(!theme)return;const selected=night?theme.night:theme.day;scene.background=selected.background;scene.environment=selected.environment;if(scene.fog)scene.fog.color.setHex(night?0x111d2a:0xc7d7df);
  const dayColors=[0x718087,0x8b989c,0x5b6a72],nightColors=[0x172333,0x202d3b,0x111c2a];theme.buildingMats.forEach((m,i)=>m.color.setHex((night?nightColors:dayColors)[i]));theme.exteriorWindows.color.setHex(night?0x5d6670:0x9aa9aa);theme.exteriorWindows.emissive.setHex(night?0xe7c681:0x000000);theme.exteriorWindows.emissiveIntensity=night?.75:0;
  WORLD.sun.color.setHex(night?0xa8c2ee:0xffe4bd);WORLD.sun.intensity=night?.86:2.35;WORLD.hemi.color.setHex(night?0x92abc8:0xc5dbea);WORLD.hemi.groundColor.setHex(night?0x424d55:0x68736d);WORLD.hemi.intensity=night?.62:.78;WORLD.officeFill.intensity=night?.18:.08;WORLD.bounce.intensity=night?.42:.42;WORLD.panels.forEach(p=>{p.intensity=night?2.7:1.1;});
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
  const spec=OfficeFloors.layout(level),accent=new T.MeshStandardMaterial({color:spec.color,emissive:spec.color,emissiveIntensity:.3}),metal=new T.MeshStandardMaterial({color:0x465963,metalness:.72,roughness:.31}),cabinet=new T.MeshStandardMaterial({color:level%3===1?0x879692:level%3===2?0xb99d74:0x638982,roughness:.58}),brass=new T.MeshStandardMaterial({color:0xc5a56e,roughness:.32,metalness:.73}),trim=new T.MeshStandardMaterial({color:0x26383d,roughness:.51,metalness:.24});
  metal.map=officeTexture(T,'brushed');
  if(level%3===2){cabinet.map=officeTexture(T,'wood');cabinet.bumpMap=cabinet.map;cabinet.bumpScale=.005;}
  function box(mat,x,y,z,w,h,d,edge=0){const m=new T.Mesh(edge?officeBeveledBox(T,w,h,d,edge):new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!mat.transparent;m.receiveShadow=true;floorDecor.add(m);return m;}
  function sign(text,x,y,z,w=2.5,ry=0){const c=document.createElement('canvas');c.width=1024;c.height=256;const p=c.getContext('2d');p.fillStyle='#203639';p.fillRect(0,0,1024,256);p.fillStyle='#bd9b63';p.fillRect(36,31,4,194);p.fillStyle='#eaf0e1';p.font='600 60px sans-serif';p.textAlign='center';p.fillText(text,512,145,920);p.fillStyle='#75948e';p.fillRect(71,205,882,1);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.rotation.y=ry;floorDecor.add(m);return m;}
  for(const [x,z,w,d] of spec.blocks){
    box(cabinet,x,1.1,z,w,2.2,d,.025);box(trim,x,.075,z,w-.1,.15,d-.08);box(accent,x,2.23,z,w,.06,d,.012);addCollider(x,z,w,d,2.26,false);
    // Cabinet fronts and pulls give the route blockers a familiar office scale.
    for(const side of [-1,1]){
      box(metal,x,1.05,z+side*(d/2+.012),.025,2.03,.018);
      for(const offset of [-.12,.12])box(brass,x+offset,1.12,z+side*(d/2+.04),.028,.23,.05,.007);
      if(level%3===1)for(let y=.35;y<2;y+=.4)box(metal,x,y,z+side*(d/2+.015),w*.86,.025,.025);
      if(level%3===0)for(let vent=0;vent<5;vent++)box(trim,x,.25+vent*.065,z+side*(d/2+.013),w*.7,.012,.015);
      if(level%3===2)for(let slat=-w/2+.13;slat<w/2-.08;slat+=.14)box(brass,x+slat,1.04,z+side*(d/2+.01),.009,1.73,.011);
    }
    sign(level%3===1?'ARCHIVE':level%3===2?'EXECUTIVE':'OPERATIONS',x,1.85,z+d/2+.035,Math.min(w*.85,2.1));
  }
  const paper=new T.MeshStandardMaterial({color:0xfff4dc}),stampInk=new T.MeshStandardMaterial({color:0xbf5146});
  function approvalLabel(i,done){
    const c=document.createElement('canvas');c.width=1024;c.height=320;const p=c.getContext('2d');
    p.fillStyle=done?'#214b46':'#f4f1e4';p.beginPath();p.roundRect(8,8,1008,284,28);p.fill();
    p.strokeStyle=done?'#77b79b':'#cabfa7';p.lineWidth=3;p.stroke();p.fillStyle=done?'#81c9ac':'#b79861';p.fillRect(50,91,924,2);
    p.beginPath();p.moveTo(475,292);p.lineTo(512,320);p.lineTo(549,292);p.fill();
    p.textAlign='center';p.fillStyle=done?'#adf0ca':'#307164';p.font='bold 38px sans-serif';p.fillText(`${i+1}차 결재 담당 · 추격하지 않아요`,512,68);
    p.fillStyle=done?'#ffffff':'#182e36';p.font='bold 52px sans-serif';p.fillText(done?'결재 완료! 수고하셨어요.':'이쪽으로 결재받으러 오세요!',512,153);
    p.font='36px sans-serif';p.fillText(done?'다음 담당자 또는 엘리베이터로 가세요':'가까이 와서 E · 서류 제출',512,233);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;
  }
  spec.stops.forEach((s,i)=>{
    const side=Math.sign(s.x),deskX=s.x+side*.78;
    // A staffed approval counter faces the aisle. The interaction point stays in front.
    box(cabinet,deskX,.45,s.z,.58,.9,1.2,.025);box(paper,deskX,.925,s.z,.65,.05,1.28,.014);addCollider(deskX,s.z,.58,1.2,.95,true);
    box(trim,deskX,.055,s.z,.49,.11,1.1);box(brass,deskX-side*.298,.81,s.z,.012,.025,1.09);
    sign(`${i+1}차 결재`,deskX-side*.298,.54,s.z,.87,-side*Math.PI/2);
    for(const zz of [-.43,0,.43])box(trim,deskX+side*.297,.44,s.z+zz,.009,.68,.012);
    const floorPad=new T.MeshStandardMaterial({color:0x426761,roughness:.95});
    box(floorPad,s.x,.026,s.z,.56,.01,1.24,.025);
    for(const end of [-1,1])box(brass,s.x,.034,s.z+end*.62,.56,.008,.018);
    box(paper,deskX,.968,s.z,.36,.025,.48);box(stampInk,deskX,.995,s.z+.34,.15,.07,.15,.012);box(metal,deskX,1.07,s.z+.34,.065,.1,.065,.014);
    for(let line=0;line<4;line++)box(metal,deskX,.983,s.z-.13+line*.055,.24,.001,.004);
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
  box(metal,-1.5,1.5,-53.3,.12,3,.15,.012);box(metal,1.5,1.5,-53.3,.12,3,.15,.012);box(accent,0,3,-53.3,3.2,.08,.15,.012);
  for(const side of [-1,1]){
    box(brass,side*1.425,1.39,-53.21,.018,2.76,.025);
    box(trim,side*1.59,1.35,-53.3,.045,2.7,.075);
  }
  // A lit cabin back masks the old exit artwork when the sliding doors open.
  const cabin=new T.MeshStandardMaterial({color:0xb9c7c5,roughness:.37,metalness:.38,emissive:0x48616e,emissiveIntensity:.18});
  cabin.map=officeTexture(T,'brushed');
  box(cabin,0,1.35,-55.55,2.8,2.7,.08);box(brass,0,.95,-55.41,2.5,.035,.035,.008);box(accent,0,2.6,-55.45,2.4,.045,.04);
  box(trim,0,.1,-55.49,2.8,.18,.022);
  for(const x of [-.92,0,.92])box(metal,x,1.4,-55.504,.012,2.36,.01);
  for(const side of [-1,1]){
    box(accent,side*1.29,1.38,-55.495,.025,2.35,.016);
    box(metal,side*1.44,.95,-54.44,.035,.035,1.85,.008);
  }
  const ceilingGlow=new T.MeshStandardMaterial({color:0xfff2d6,emissive:0xffe0ac,emissiveIntensity:1.4});
  box(metal,0,2.78,-54.35,2.8,.08,2.2);box(ceilingGlow,0,2.732,-54.35,2.4,.012,1.85);
  sign(String(level+1).padStart(2,'0')+' F',0,1.96,-55.493,.88);
  const glassDoor=new T.MeshPhysicalMaterial({color:0xc9eee9,transparent:true,opacity:.13,roughness:.08,metalness:0,depthWrite:false});
  for(const side of [-1,1]){
    const door=box(glassDoor,side*.7,1.35,-53.3,1.38,2.7,.035);door.castShadow=false;WORLD.liftDoors.push(door);
    // Slender hardware moves with the glass; no opaque band can hide a pursuer.
    for(const edge of [-1,1]){
      const rail=new T.Mesh(new T.BoxGeometry(.009,2.68,.043),metal);rail.position.set(edge*.687,0,0);door.add(rail);
    }
    const sideWall=box(glassDoor,side*1.5,1.35,-54.4,.035,2.7,2.2);sideWall.castShadow=false;addCollider(side*1.5,-54.4,.035,2.2,2.7,false);
  }
  sign('↑ ELEVATOR · E',0,2.8,-53.15,2.7);
  box(cabin,0,.03,-54,2.8,.025,2);
  for(const side of [-1,1])box(brass,side*1.3,.046,-54,.018,.008,1.85);
  box(accent,0,.046,-53.045,2.65,.008,.025);
  // Keep changing NPCs, stamps, markers and doors separate; batch static fittings.
  const moving=new Set([...WORLD.floorMarkers,...WORLD.liftDoors,...WORLD.approvalNpcs.map(n=>n.approvedSeal)]),batches=new Map();
  for(const m of floorDecor.children){
    if(!m.isMesh||m.children.length||moving.has(m))continue;
    const key=m.material.uuid+(m.geometry.userData.officeBatchKey||m.geometry.type+JSON.stringify(m.geometry.parameters));
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(m);
  }
  for(const meshes of batches.values())if(meshes.length>1){
    const first=meshes[0],inst=new T.InstancedMesh(first.geometry,first.material,meshes.length);
    meshes.forEach((m,i)=>{m.updateMatrix();inst.setMatrixAt(i,m.matrix);m.removeFromParent();if(m.geometry!==first.geometry)m.geometry.dispose();});
    inst.castShadow=first.castShadow;inst.receiveShadow=first.receiveShadow;inst.computeBoundingSphere();floorDecor.add(inst);
  }
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
