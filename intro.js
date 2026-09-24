/* Seven playable first-person story beats. The prologue owns and disposes its own
   scene; it never advances gameplay clocks or changes promotion mechanics. */
(function(root){
  'use strict';
  const CHAPTERS=[
    {place:'내 방 · 월요일 09:41',objective:'노트북의 받은메일함을 확인하세요',action:'메일함 새로고침',camera:[0,1.38,1.25],target:[0,1.22,-.18],interact:[0,1.24,-.18],seated:true,lines:[['나','합격 발표일인데… 아직 새 메일은 없네.'],['메일 알림','새 메일 1건이 도착했습니다.'],['나','한마음컴퍼니… 최종 합격? 진짜?'],['나','작은 회사지만, 드디어 나도 출근한다.']]},
    {place:'한마음컴퍼니 · 첫 출근 09:00',objective:'안내 데스크로 걸어가 사원증을 받으세요',action:'사원증 받기',camera:[0,1.65,4.8],target:[0,1.5,0],interact:[0,1.43,.65],bounds:[-2.4,2.4,1.15,5.3],lines:[['인사 담당자','{name}님, 오신 걸 환영해요. 사원증은 앞에 준비해 뒀어요.'],['인사 담당자','우리 회사는 한 사람이 정말 중요하거든요.'],['나','작지만 함께 성장하는 회사… 괜찮은 시작 같았다.']]},
    {place:'업무 구역 · 10:15',objective:'팀장님들 앞으로 가서 첫 업무를 받으세요',action:'업무 받기',camera:[0,1.65,3.3],target:[0,1.5,-1.5],interact:[0,1.2,-.3],bounds:[-2.4,2.4,.9,4.3],lines:[['전략팀장','{name} 씨, 오늘부터 제 보고서 좀 맡아줘요.'],['운영팀장','회의록도요. 아, 기획팀 건도 같이.'],['나','팀장님이 다섯… 그런데 일할 사람은 나 하나잖아?']]},
    {place:'내 자리 · 5일째 야근 / 23:47',objective:'끝나지 않는 메일을 확인하세요',action:'잠깐 눈 붙이기',camera:[0,1.38,1.25],target:[0,1.2,-.2],interact:[0,1.24,-.18],seated:true,lines:[['메신저 · 총괄팀장','{name}님 없으면 회사가 안 돌아가. 이것만 하고 퇴근해.'],['나','보고서, 회의록, 내 일도 아닌 일까지.'],['나','커피도 다 식었네. 딱 5분만…']]},
    {place:'… · 03:12',objective:'책상 앞에서 정신을 차리세요',action:'자리에서 일어나기',camera:[0,1.30,1.25],target:[0,1.17,-.18],interact:[0,1.24,-.18],seated:true,lines:[['나','…얼마나 잔 거지?'],['나','불은 꺼졌는데, 왜 아직 메신저 소리가 나?'],['어딘가에서','어디 가? 너 없으면 안 된다니까.']]},
    {place:'같은 회사, 다른 밤',objective:'복도 끝에서 다가오는 사람들을 확인하세요',action:'한 걸음 물러서기',camera:[0,1.65,3.7],target:[0,1.4,-3],interact:[0,1.4,-.8],range:6,bounds:[-2,2,2,5],lines:[['팀장님들','퇴근? 이거 누가 다 해!'],['나','왜 다들 나한테 달려오는 거야?'],['나','꿈이다. 그럼… 이번에는 내가 시켜도 되잖아.']]},
    {place:'내 자리 · 꿈속 인사 시스템',objective:'책상 위 내선 전화로 사장님을 부르세요',action:'사장님 호출하기',camera:[0,1.50,1.45],target:[.5,1.02,-.05],interact:[.75,1.01,.15],seated:true,lines:[['나','팀장님 위에는… 사장님이 있지.'],['나','지시는 위로 돌려보내고, 나는 여기서 살아남는다.'],['꿈속 사내 방송','야근 모드: 사장님 호출 시 승진. 직급이 오를수록 추격 인원 증가.']]}
  ];
  let active=false,index=0,busy=false,transitionTimer=0,raf=0,finishCallback,menuMode=false;
  let renderer,scene,camera,key,fill,groups=[],actors=[],floaters=[],interactionObjects={},environmentTarget,documentSurfaces=[],artTextures={};
  let last=0,time=0,chapterTime=0,yaw=0,pitch=0,dragging=false,keys={},motion,ready=false,lineIndex=-1,inspect=false,audioContext=null,audioGain=null,sound=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const el=id=>document.getElementById(id);
  root.OfficePlayer=root.OfficePlayer||{name:''};
  function cleanName(value){return Array.from(String(value||'').normalize('NFC').replace(/[<>\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' ')).slice(0,12).join('');}
  function playerName(){return cleanName(root.OfficePlayer.name)||'신입사원';}
  function withName(value){return String(value).replaceAll('{name}',playerName());}
  function personalize(value){
    const name=cleanName(value);if(!name)return false;root.OfficePlayer.name=name;el('runner-name').textContent=name;
    if(scene){const next={};for(const kind of ['mailList','offerArrived','offer','inbox','badge','report','phone'])next[kind]=IntroArt.texture(THREE,kind,name);documentSurfaces.forEach(({mesh,kind})=>{mesh.material.map=next[kind];mesh.material.needsUpdate=true;});Object.values(artTextures).forEach(t=>t.dispose());artTextures=next;}
    return true;
  }
  function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.72,...extra});}
  function mesh(parent,geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,mat,x,y,z,w,h,d){return mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
  function textTexture(lines,bg='#162e3b',color='#e4d6bb'){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const p=c.getContext('2d');p.fillStyle=bg;p.fillRect(0,0,1024,512);p.fillStyle=color;
    lines.forEach((s,i)=>{p.font=i===0?'600 67px sans-serif':'400 37px sans-serif';p.fillText(s,64,110+i*82);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  function board(parent,lines,x,y,z,w=2.5,h=1.25,bg,color){return mesh(parent,new THREE.PlaneGeometry(w,h),material(0xffffff,{map:textTexture(lines,bg,color),emissive:0x263737,emissiveIntensity:.2}),x,y,z);}
  function buildScene(){
    const T=THREE;renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;el('intro-canvas').appendChild(renderer.domElement);
    scene=new T.Scene();scene.background=new T.Color(0x17272f);scene.fog=new T.FogExp2(0x17272f,.015);camera=new T.PerspectiveCamera(65,1,.06,90);
    fill=new T.HemisphereLight(0xc2dce6,0x394447,1.4);scene.add(fill);
    key=new T.DirectionalLight(0xffdb9d,3.6);key.position.set(-3,3.1,1.8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-9,right:9,top:8,bottom:-8,near:.1,far:30});key.shadow.normalBias=.025;scene.add(key);
    const rim=new T.DirectionalLight(0x67baca,1.7);rim.position.set(5,3,-5);scene.add(rim);scene.userData.rim=rim;
    const floor=mesh(scene,new T.PlaneGeometry(150,150),material(0x17272d),0,-.075,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    const woodTex=officeTexture(T,'wood'),wallTex=officeTexture(T,'plaster'),carpetTex=officeTexture(T,'carpet');
    const wood=material(0xd3b68c,{map:woodTex,bumpMap:woodTex,bumpScale:.003,roughness:.45}),dark=material(0x27343c,{metalness:.5,roughness:.32}),paper=material(0xf3eee2),gold=material(0xb69b6b,{metalness:.72,roughness:.28}),wall=material(0xe2dfd4,{map:wallTex,roughness:.9}),glow=material(0xffebc5,{emissive:0xffd29a,emissiveIntensity:2});
    const art=artTextures={};for(const kind of ['mailList','offerArrived','offer','inbox','badge','report','phone'])art[kind]=IntroArt.texture(T,kind,playerName());
    const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ec=envCanvas.getContext('2d'),eg=ec.createLinearGradient(0,0,0,256);eg.addColorStop(0,'#9bb9cc');eg.addColorStop(.48,'#e6e2cf');eg.addColorStop(1,'#3d4c55');ec.fillStyle=eg;ec.fillRect(0,0,512,256);ec.fillStyle='#fff4d6';ec.fillRect(80,62,100,65);const envTex=new T.CanvasTexture(envCanvas);envTex.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer);environmentTarget=pmrem.fromEquirectangular(envTex);scene.environment=environmentTarget.texture;envTex.dispose();pmrem.dispose();
    function documentPlane(g,kind,x,y,z,w,h,lit=false){const m=lit?new T.MeshBasicMaterial({map:art[kind],toneMapped:false}):material(0xffffff,{map:art[kind],roughness:.7});const page=mesh(g,new T.PlaneGeometry(w,h),m,x,y,z);page.castShadow=false;documentSurfaces.push({mesh:page,kind,chapter:groups.length-1});return page;}
    function rounded(g,mat,x,y,z,w,h,d,r=.03){const shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:5});geo.translate(0,0,-d/2);return mesh(g,geo,mat,x,y,z);}
    function plant(g,x,z){mesh(g,new T.CylinderGeometry(.22,.17,.35,24),material(0xc9bba3),x,.175,z);for(let i=0;i<9;i++){const leaf=mesh(g,new T.SphereGeometry(1,10,8),material(i%2?0x47755a:0x325f4a),x+Math.sin(i*2.4)*.25,.55+(i%3)*.22,z+Math.cos(i*2.4)*.22);leaf.scale.set(.12,.36,.055);leaf.rotation.set(.3, i,.5*Math.sin(i));}}
    function softShadow(g,x,z,w,d,y=.012){const c=document.createElement('canvas');c.width=c.height=64;const p=c.getContext('2d'),gradient=p.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'#07101370');gradient.addColorStop(1,'#07101300');p.fillStyle=gradient;p.fillRect(0,0,64,64);const m=mesh(g,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}),x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=m.receiveShadow=false;}

    function stage(){
      const g=new T.Group();scene.add(g);groups.push(g);
      const floorMap=woodTex.clone();floorMap.repeat.set(4,8);floorMap.needsUpdate=true;box(g,material(0xc7ae86,{map:floorMap,roughness:.56}),0,-.08,0,10,.16,16);
      box(g,wall,-5,1.7,0,.16,3.4,16);box(g,wall,5,1.7,0,.16,3.4,16);box(g,wall,0,1.7,-8,10,3.4,.16);box(g,wall,0,1.7,8,10,3.4,.16);
      box(g,material(0xc4ccc8),0,3.45,2.75,10,.12,10.5).castShadow=false;for(const x of [-4.86,4.86])box(g,dark,x,.075,0,.035,.15,16);plant(g,-3.9,-1);plant(g,3.8,.7);const rug=carpetTex.clone();rug.repeat.set(3,3);rug.needsUpdate=true;box(g,material(0x85918d,{map:rug,roughness:1}),0,.014,2.5,5,.015,4.5);
      for(let z=-1;z<7;z+=3){box(g,glow,0,3.35,z,1.6,.025,.3);for(let x=-4;x<5;x+=2)box(g,dark,x,3.36,z,.018,.015,3);}
      for(const x of [-4.5,4.5]){box(g,wood,x,.5,5,.7,1,2.1);for(let i=0;i<3;i++){box(g,paper,x,1.07,4.3+i*.6,.57,.1,.45);}}
      return g;
    }
    function cup(g,x,y,z){const c=buildCoffeeCup(T);c.position.set(x,y,z);c.scale.setScalar(1.25);g.add(c);return c;}
    function desk(g,x=0,z=0){rounded(g,wood,x,.84,z,3,.08,1.35,.035);box(g,dark,x,.78,z,2.85,.045,1.22);for(const side of [-1,1]){box(g,dark,x+side*1.3,.4,z,.055,.8,.055);box(g,dark,x+side*1.3,.04,z,.08,.04,1.08);}softShadow(g,x,z,3.5,2.2);}
    function chair(g,x,z){const c=new T.Group();c.position.set(x,0,z);g.add(c);box(c,dark,0,.48,0,.68,.12,.65);box(c,material(0x385e67),0,.87,.28,.68,.75,.11);box(c,dark,0,.22,0,.09,.44,.09);box(c,dark,0,.06,0,.65,.08,.08);box(c,dark,0,.06,0,.08,.08,.65);return c;}
    function laptop(g,x,y,z,night=false){
      const l=new T.Group();l.position.set(x,y,z);g.add(l);
      const aluminium=material(0x839197,{metalness:.85,roughness:.28});rounded(l,aluminium,0,0,.07,1,.025,.65,.022);
      const screen=new T.Group();screen.position.set(0,.32,-.23);screen.rotation.x=-.12;l.add(screen);
      rounded(screen,dark,0,0,0,1.02,.66,.022,.025);documentPlane(screen,night?'inbox':groups.length===1?'mailList':'offer',0,0,.015,.96,.60,true);
      mesh(screen,new T.SphereGeometry(.007,10,8),material(0x151d22),0,.316,.016);box(screen,gold,0,-.313,.016,.08,.003,.001);
      const keyMat=material(0x202930,{roughness:.45});for(let row=0;row<4;row++)for(let col=0;col<12;col++)rounded(l,keyMat,-.41+col*.074,.023,-.09+row*.068,.058,.013,.05,.006);
      box(l,material(0x9ca8ad,{metalness:.7,roughness:.4}),0,.015,.265,.27,.002,.115);
      for(const side of [-1,1])for(let i=0;i<15;i++)box(l,dark,side*.465,.016,-.10+i*.016,.016,.002,.003);
      const light=new T.PointLight(night?0x92bfd5:0xdce7ff,night?.16:.25,2.5,2);light.position.set(0,.35,.1);l.add(light);
    }
    function papers(g,x,y,z,count){
      // Compact sheaves with a designed cover, rather than floating blank slabs.
      for(let i=0;i<count;i++){const p=box(g,paper,x+Math.sin(i*2)*.012,y+i*.007,z,.38,.005,.51);p.rotation.y=Math.sin(i*1.7)*.045;}
      const cover=documentPlane(g,'report',x,y+count*.007+.001,z,.38,.51);cover.rotation.x=-Math.PI/2;
      box(g,gold,x-.15,y+count*.007+.008,z-.19,.02,.009,.065);
    }
    function windowWall(g){
      // A real opening, with a sill and an exterior city instead of a blue wall.
      box(g,wall,0,.42,-2.5,10,.84,.16);box(g,wall,0,3.13,-2.5,10,.60,.16);
      box(g,wall,-4.25,1.9,-2.5,1.5,2.3,.16);box(g,wall,4.25,1.9,-2.5,1.5,2.3,.16);
      const night=groups.length>=4;box(g,material(night?0x172a43:0xb4c8cd,{emissive:night?0x15223a:0x759aaa,emissiveIntensity:.32}),0,1.8,-7.6,10,3.2,.04);
      for(let i=0;i<8;i++){const x=-4.5+i*1.3,h=1.2+(i%3)*.6;box(g,material(night?(i%2?0x293847:0x344754):(i%2?0x768b98:0x8b9ca0)),x,h/2,-5.8-(i%2)*.5,1.05,h,.8);for(let r=0;r<4;r++)for(let k=0;k<3;k++)box(g,material(night?0xab9f73:0xc5d8d9,{emissive:night?0xefc47c:0x91a7ae,emissiveIntensity:night?.65:.3}),x-.34+k*.32,.3+r*.45,-5.38-(i%2)*.5,.16,.22,.01);}
      for(let i=-3;i<=3;i+=2)box(g,dark,i,1.87,-2.38,.055,2.04,.09);
      box(g,wood,0,.84,-2.32,7.1,.06,.3);box(g,dark,0,2.91,-2.4,7.1,.08,.12);
      for(let i=0;i<6;i++){const blind=box(g,material(0xc1b8a4),0,2.86-i*.105,-2.32,7,.035,.13);blind.rotation.x=.16;}
      for(const x of [-3.25,3.25])box(g,paper,x,2.55,-2.27,.012,.7,.012);
    }
    function person(g,i,x,y,z,baby=false){
      // Close-up story scenes need natural silhouettes, not the broad comic build
      // used for the playable boss roster. Distinguish people by face, hair and outfit.
      const opts={isBaby:baby,identity:['slim','square','tall','slim','round'][i%5],hair:['comb','spiky','bald','perm','mullet'][i%5],outfit:baby?'hanbok':['suit','vest','shirt','golf','suit'][i%5],face:i%2?'smug':'angry',skin:['fair','tan','fair','deep','flush'][i%5],prop:'paper'};
      const c=buildBossMesh(opts,T);c.scale.multiply(new T.Vector3(.90,1,.94));c.position.set(x,y,z);c.rotation.y=-.12;g.add(c);actors.push({mesh:c,chapter:groups.length-1,seed:i});return c;
    }
    // Rooms surround an eye-level player. No miniature platforms or presentation camera.
    function workstation(g,night=false){windowWall(g);desk(g);laptop(g,0,.92,0,night);cup(g,1.2,.99,.32);papers(g,-1,.925,.15,night?20:3);mesh(g,new T.CylinderGeometry(.14,.15,.024,24),dark,-1.25,.93,-.45);box(g,gold,-1.25,1.31,-.45,.025,.76,.025);rounded(g,dark,-1.05,1.69,-.45,.46,.04,.17,.015);box(g,glow,-1.05,1.664,-.45,.39,.008,.13);const lamp=new T.PointLight(0xffd197,night?.7:.32,3,2);lamp.position.set(-1.05,1.56,-.4);g.add(lamp);
      box(g,material(0x4f6566,{map:carpetTex,roughness:1}),0,.899,.13,1.5,.008,1.0);const notebook=box(g,material(0x365f60),-.82,.932,.42,.27,.035,.37);notebook.rotation.y=-.12;box(g,gold,-.60,.941,.4,.014,.014,.27);softShadow(g,0,.1,1.4,.9,.904);}
    let g=stage();workstation(g);box(g,wood,3.9,.33,2.4,1.65,.4,2.5);rounded(g,material(0x859b92,{roughness:1}),3.9,.59,2.4,1.6,.25,2.4,.08);rounded(g,paper,3.9,.77,1.65,1.2,.12,.5,.05);board(g,['취업 준비 / 지원 기록','지원 38건   면접 4회','이번에는 꼭.'],2.7,1.65,-2.2,1.4,.7);
    // Arrival is playable: approach the badge on the reception desk.
    g=stage();box(g,wall,0,1.7,-2.1,10,3.4,.15);for(let i=0;i<45;i++)box(g,wood,-4.5+i*.2,1.7,-1.99,.045,3.4,.09);plant(g,-2.7,.1);board(g,['한마음컴퍼니','작지만 함께 성장하는 회사'],0,2.2,-1.91,3,1.25);box(g,wood,0,.55,-.3,3.8,1.1,1);box(g,paper,0,1.14,-.3,3.9,.08,1.08);for(let i=0;i<24;i++)box(g,dark,-1.8+i*.155,.55,.215,.035,1.05,.02);const badge=new T.Group();g.add(badge);badge.position.set(0,1.43,.65);rounded(badge,material(0xd8e2da),0,0,-.012,.44,.29,.02,.022);documentPlane(badge,'badge',0,0,.004,.42,.263);box(badge,gold,0,.156,-.005,.10,.022,.017);const strap=new T.CatmullRomCurve3([new T.Vector3(-.035,.16,-.012),new T.Vector3(-.15,.4,-.08),new T.Vector3(.12,.44,-.1),new T.Vector3(.035,.16,-.012)]);mesh(badge,new T.TubeGeometry(strap,24,.008,6,false),material(0x306963));interactionObjects.badge=badge;person(g,3,2.65,0,-.7);
    // Five people occupy your desk, all handing work to one new employee.
    g=stage();windowWall(g);desk(g,0,-1.1);papers(g,0,.925,-.45,10);
    for(let i=0;i<5;i++){const x=(i-2)*1.25;person(g,i,x,0,-2+Math.abs(i-2)*.35);}
    for(const x of [-3.5,3.5]){desk(g,x,-5);laptop(g,x,.92,-5);chair(g,x,-4);}
    // The same physical desk becomes a late-night prison.
    g=stage();workstation(g,true);papers(g,1,.93,-.2,17);board(g,['23:47','미처리 업무 27건'],1.7,2.2,-2.1,1.3,.65);
    // Wake at exactly the same seat; the room is now impossibly quiet.
    g=stage();workstation(g,true);for(let i=0;i<12;i++){const p=box(g,paper,Math.sin(i*2.4)*3,1.6+(i%4)*.4,-1-Math.abs(Math.cos(i))*3,.35,.013,.48);p.rotation.set(i*.2,0,i*.5);floaters.push({mesh:p,base:p.position.clone(),chapter:4,seed:i});}
    // The managers actually close the distance, stopping before contact.
    g=stage();for(let i=0;i<7;i++){const z=3-i*1.7;for(const x of [-3.4,3.4]){box(g,dark,x,1.65,z,.12,3.3,.15);box(g,material(0x507078,{transparent:true,opacity:.25}),x,1.65,z-.8,.04,3.2,1.55);}box(g,glow,0,3.3,z,6.8,.025,.055);}
    for(let i=0;i<5;i++)person(g,i,(i-2)*.95,0,-3-Math.abs(i-2)*.7);
    // An ordinary extension phone is the first act of defiance, not a tutorial slide.
    g=stage();workstation(g,true);const phone=new T.Group();g.add(phone);phone.position.set(.75,.96,.15);box(phone,dark,0,0,0,.38,.07,.40);interactionObjects.receiver=rounded(phone,material(0x19242a,{roughness:.38}),0,.09,-.11,.42,.045,.08,.02);for(const side of [-1,1])rounded(interactionObjects.receiver,dark,side*.16,-.024,0,.09,.065,.11,.025);for(let i=0;i<9;i++)box(phone,paper,-.09+(i%3)*.09,.04,.01+Math.floor(i/3)*.07,.06,.015,.045);const lcd=documentPlane(phone,'phone',0,.05,-.08,.26,.13,true);lcd.rotation.x=-Math.PI/2;const cord=new T.CatmullRomCurve3(Array.from({length:90},(_,i)=>new T.Vector3(-.21+Math.cos(i*.9)*.012,.015+Math.sin(i*.9)*.012,-.1+i*.003)));mesh(phone,new T.TubeGeometry(cord,100,.004,5,false),dark);
    groups.forEach((g,i)=>g.visible=i===index);resize();
  }
  function resize(){if(!renderer)return;const host=el('intro-canvas'),w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function applyEnvironment(night){scene.userData.rim.intensity=night?.28:1.0;scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m.isMeshStandardMaterial)m.envMapIntensity=night?.12:.6;});});}
  function updateChapter(){
    const c=CHAPTERS[index];el('screen-title').dataset.chapter=index;
    el('intro-kicker').textContent=c.place;el('intro-objective').textContent=c.objective;
    el('intro-next-label').textContent=c.action;el('intro-movement').textContent=c.seated?'마우스 · 둘러보기':'WASD · 이동 / 마우스 · 둘러보기';
    el('screen-title').classList.remove('inspecting');chapterTime=0;lineIndex=-1;inspect=false;ready=false;keys={};motion=FPSMovement.create();
    if(scene){groups.forEach((g,i)=>g.visible=i===index);camera.fov=65;camera.updateProjectionMatrix();camera.position.set(...c.camera);camera.rotation.order='YXZ';camera.lookAt(...c.target);yaw=camera.rotation.y;pitch=camera.rotation.x;key.color.set(index<3?0xffd69b:index===3?0x8ab2dd:0x91a9f7);key.intensity=index<3?2.2:index===3?.65:.45;fill.intensity=index<3?1.5:.48;applyEnvironment(index>=3);}
    updateDialogue();
  }
  function updateDialogue(){
    const lines=CHAPTERS[index].lines,n=Math.min(lines.length-1,Math.floor(chapterTime/4.2));if(n===lineIndex)return;lineIndex=n;
    el('intro-speaker').textContent=lines[n][0]==='나'?playerName():lines[n][0];el('intro-dialogue').textContent=withName(lines[n][1]);
    if((index===0&&n===1)||(index===4&&n===1))messengerTone();
    if(index===0){const surface=documentSurfaces.find(s=>s.chapter===0);const kind=n===0?'mailList':n===1?'offerArrived':'offer';if(surface&&surface.kind!==kind){surface.kind=kind;surface.mesh.material.map=artTextures[kind];surface.mesh.material.needsUpdate=true;}el('intro-objective').textContent=n===0?'노트북의 받은메일함을 확인하세요':n===1?'방금 도착한 메일을 확인하세요':'합격 메일 내용을 확인하세요';el('intro-next-label').textContent=n===0?'메일함 새로고침':n===1?'합격 메일 열기':'내용 확인';}
  }
  function updateInteraction(){
    if(busy)return;const c=CHAPTERS[index];let near=true,aimed=true;
    if(camera){const target=new THREE.Vector3(...c.interact),delta=target.sub(camera.position);near=delta.length()<(c.range||2.2);aimed=camera.getWorldDirection(new THREE.Vector3()).dot(delta.normalize())>.84;}
    ready=near&&aimed;el('btn-go-select').disabled=!ready;
    el('intro-interaction').textContent=ready?'E':near?'대상을 바라보세요':'가까이 다가가세요';
    el('screen-title').classList.toggle('can-interact',ready);
  }
  function tone(){if(!sound||!audioContext)return;const t=audioContext.currentTime,o=audioContext.createOscillator(),gain=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(index<4?392:261.63,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.04,t+.04);gain.gain.exponentialRampToValueAtTime(.0001,t+.7);o.connect(gain);gain.connect(audioContext.destination);o.start(t);o.stop(t+.8);}
  function messengerTone(){
    if(!sound||!audioContext)return;
    const start=audioContext.currentTime;
    // Bright paired notes: recognisable as a messenger notification, not dialogue audio.
    [0,.115].forEach((delay,n)=>{const o=audioContext.createOscillator(),gain=audioContext.createGain(),t=start+delay;o.type='sine';o.frequency.setValueAtTime(n?1046.5:783.99,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.075,t+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+.17);o.connect(gain);gain.connect(audioContext.destination);o.start(t);o.stop(t+.19);});
  }
  function toggleSound(){
    if(!active)return;sound=!sound;el('intro-sound').setAttribute('aria-pressed',String(sound));el('intro-sound').textContent=sound?'소리 끄기':'소리 켜기';
    if(sound){try{const Audio=root.AudioContext||root.webkitAudioContext;if(!audioContext){audioContext=new Audio();audioGain=audioContext.createGain();audioGain.gain.value=.014;audioGain.connect(audioContext.destination);for(const f of [130.81,196]){const o=audioContext.createOscillator();o.type='sine';o.frequency.value=f;o.connect(audioGain);o.start();}}audioContext.resume().catch(()=>{});tone();}catch(_){sound=false;el('intro-sound').textContent='소리 사용 불가';el('intro-sound').setAttribute('aria-pressed','false');}}
    else if(audioContext)audioContext.suspend().catch(()=>{});
  }
  function move(){
    if(!active||busy||menuMode||!ready)return;
    // Give the short dialogue beats a chance to finish; E can advance each beat.
    if(lineIndex<CHAPTERS[index].lines.length-1){chapterTime=(lineIndex+1)*4.2;updateDialogue();return;}
    busy=true;keys={};el('btn-go-select').disabled=true;el('screen-title').classList.add('changing');
    transitionTimer=setTimeout(()=>{
      if(index===CHAPTERS.length-1){finish();return;}
      index++;updateChapter();tone();el('screen-title').classList.remove('changing');
      transitionTimer=setTimeout(()=>{busy=false;},reduced.matches?0:500);
    },reduced.matches?0:700);
  }
  function frame(now){
    if(!active)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;
    if(!document.hidden&&!busy&&!menuMode){time+=dt;if(index!==0)chapterTime+=dt;updateDialogue();
      if(renderer){
        const c=CHAPTERS[index];
        if(!c.seated){const step=FPSMovement.step(motion,{forward:(keys.KeyW?1:0)-(keys.KeyS?1:0),right:(keys.KeyD?1:0)-(keys.KeyA?1:0)},yaw,dt);const b=c.bounds;camera.position.x=THREE.MathUtils.clamp(camera.position.x+step.x*.42,b[0],b[1]);camera.position.z=THREE.MathUtils.clamp(camera.position.z+step.z*.42,b[2],b[3]);}
        camera.rotation.set(pitch,yaw,0,'YXZ');const fov=inspect?38:65;camera.fov=reduced.matches?fov:THREE.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*9));camera.updateProjectionMatrix();
        if(!reduced.matches){actors.forEach(a=>{if(a.chapter!==index)return;if(index===5)a.mesh.position.z=Math.min(-.8-Math.abs(a.seed-2)*.4,-3-Math.abs(a.seed-2)*.7+chapterTime*.24);animateBossMesh(a.mesh,time,index===5?1.5:0,false);});floaters.forEach(f=>{if(f.chapter!==index)return;f.mesh.position.y=f.base.y+Math.sin(time*.7+f.seed)*.1;});}
      }updateInteraction();
    }
    if(busy&&el('screen-title').classList.contains('changing')&&renderer&&!reduced.matches){
      if(index===1&&interactionObjects.badge){interactionObjects.badge.position.y+=dt*.35;interactionObjects.badge.rotation.x-=dt*.3;}
      if(index===3){pitch=Math.max(-.6,pitch-dt*.35);camera.rotation.x=pitch;}
      if(index===6&&interactionObjects.receiver){interactionObjects.receiver.position.y+=dt*.3;interactionObjects.receiver.rotation.z+=dt*.4;}
    }
    const firstMail=documentSurfaces.find(s=>s.chapter===0);if(firstMail?.mesh.material.color){const glow=index===0&&lineIndex===1?1.035+Math.sin(time*5)*.025:1;firstMail.mesh.material.color.setRGB(glow,glow,glow);}
    if(!document.hidden&&renderer)renderer.render(scene,camera);raf=requestAnimationFrame(frame);
  }
  function dispose(){
    keys={};dragging=false;if(renderer&&document.pointerLockElement===renderer.domElement)document.exitPointerLock();cancelAnimationFrame(raf);clearTimeout(transitionTimer);window.removeEventListener('resize',resize);
    if(scene){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.skeleton)o.skeleton.dispose();if(o.shadow)o.shadow.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});materials.forEach(m=>{for(const v of Object.values(m))if(v&&v.isTexture)textures.add(v);m.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());}
    if(environmentTarget){environmentTarget.dispose();environmentTarget=null;}if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}renderer=scene=camera=null;groups=[];actors=[];floaters=[];interactionObjects={};documentSurfaces=[];artTextures={};
    if(audioContext){audioContext.close().catch(()=>{});audioContext=null;audioGain=null;}sound=false;
  }
  function finish(){if(!active)return;active=false;busy=false;dispose();el('screen-title').classList.remove('changing');el('btn-go-select').disabled=false;finishCallback();}
  function start(onFinish,showMenu=false){
    if(active)dispose();active=true;menuMode=showMenu;index=0;busy=false;time=0;last=0;finishCallback=onFinish;el('screen-title').classList.remove('changing');el('btn-go-select').disabled=false;el('intro-look').textContent='화면 클릭 · 시점 조작 / 드래그로 둘러보기';el('intro-sound').textContent='소리 켜기';el('intro-sound').setAttribute('aria-pressed','false');
    try{buildScene();}catch(error){console.warn('Prologue visual unavailable; story remains readable.',error);dispose();el('intro-canvas').textContent='';}
    updateChapter();el('screen-title').classList.toggle('with-menu',menuMode);if(menuMode){const input=el('intro-player-name');input.value=cleanName(root.OfficePlayer.name);input.dispatchEvent(new Event('input'));requestAnimationFrame(()=>input.focus());if(camera){groups.forEach((g,i)=>g.visible=i===3);camera.position.set(2.5,1.7,3.2);camera.lookAt(0,1.1,-.2);key.intensity=.6;fill.intensity=.5;applyEnvironment(true);}}window.addEventListener('resize',resize);raf=requestAnimationFrame(frame);
  }
  el('intro-player-name').addEventListener('input',e=>{const name=cleanName(e.target.value),valid=!!name;el('intro-begin').disabled=!valid;e.target.setAttribute('aria-invalid',String(!valid));el('intro-name-help').textContent=valid?`${name}님의 합격 메일과 사원증이 준비됩니다.`:'이름을 입력하면 합격 메일이 도착합니다.';});
  el('intro-entry').addEventListener('submit',e=>{e.preventDefault();if(!active||!menuMode||busy)return;const input=el('intro-player-name'),name=cleanName(input.value);if(!personalize(name)){input.setAttribute('aria-invalid','true');input.focus();return;}input.value=name;busy=true;el('intro-begin').disabled=true;el('screen-title').classList.add('changing');transitionTimer=setTimeout(()=>{menuMode=false;el('screen-title').classList.remove('with-menu');updateChapter();el('screen-title').classList.remove('changing');transitionTimer=setTimeout(()=>{busy=false;},reduced.matches?0:500);},reduced.matches?0:700);});
  el('btn-go-select').addEventListener('click',move);el('intro-skip').addEventListener('click',finish);el('intro-sound').addEventListener('click',toggleSound);
  el('intro-canvas').addEventListener('click',()=>{if(active&&!menuMode&&renderer&&document.pointerLockElement!==renderer.domElement){const result=renderer.domElement.requestPointerLock();if(result&&result.catch)result.catch(()=>{});}});
  el('intro-canvas').addEventListener('pointerdown',()=>{dragging=true;});
  window.addEventListener('pointerup',()=>{dragging=false;});
  document.addEventListener('mousemove',e=>{if(!active||busy||menuMode||!camera||(!dragging&&document.pointerLockElement!==renderer.domElement))return;yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.15,1.15);});
  document.addEventListener('pointerlockchange',()=>{keys={};if(active)el('intro-look').textContent=document.pointerLockElement?'ESC · 마우스 해제':'화면 클릭 · 시점 조작 / 드래그로 둘러보기';});
  window.addEventListener('blur',()=>{keys={};dragging=false;});
  document.addEventListener('visibilitychange',()=>{keys={};});
  document.addEventListener('keydown',e=>{if(!active||busy||menuMode||e.altKey||e.ctrlKey||e.metaKey)return;if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys[e.code]=true;}if(!e.repeat&&e.code==='KeyR'){inspect=!inspect;el('screen-title').classList.toggle('inspecting',inspect);}if(!e.repeat&&(e.code==='KeyE'||(e.code==='Enter'&&!e.target.closest('button')))){e.preventDefault();move();}});
  document.addEventListener('keyup',e=>{delete keys[e.code];});
  root.OfficeIntro={start};
})(window);
