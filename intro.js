/* Seven playable first-person story beats. The prologue owns and disposes its own
   scene; it never advances gameplay clocks or changes promotion mechanics. */
(function(root){
  'use strict';
  const CHAPTERS=[
    {place:'내 방 · 월요일 09:41',objective:'발표를 기다리는 중입니다',action:'메일함 새로고침',camera:[0,1.38,1.25],target:[0,1.22,-.18],interact:[0,1.24,-.18],seated:true,lines:[
      ['나','오늘 발표라더니, 아무것도 없네.'],
      ['나','새로고침만 몇 번째야.'],
      ['문자 메시지','[한마음컴퍼니] 2026 신입 공개채용 최종 합격자가 발표되었습니다.'],
      ['나','홈페이지에서 조회하라고? 수험번호는… 여기 있네.'],
      ['나','…진짜 됐네. 진짜로.'],
      ['나','나 이제 출근한다.']]},
    {place:'한마음컴퍼니 · 첫 출근 09:00',objective:'안내 데스크로 걸어가 사원증을 받으세요',action:'사원증 받기',camera:[0,1.65,4.8],target:[0,1.5,0],interact:[0,1.43,.65],bounds:[-2.4,2.4,1.15,5.3],lines:[['인사 담당자','{name}님이시죠? 어서 오세요. 사원증 여기 있어요.'],['인사 담당자','우리는 규모가 작아서 한 사람 한 사람이 진짜 중요해요.'],['나','그 말이 그렇게 무서운 뜻인 줄은 몰랐다.']]},
    {place:'업무 구역 · 10:15',objective:'팀장님들 앞으로 가서 첫 업무를 받으세요',action:'업무 받기',camera:[0,1.65,3.3],target:[0,1.5,-1.5],interact:[0,1.2,-.3],bounds:[-2.4,2.4,.9,4.3],lines:[['전략팀장','{name} 씨, 이 보고서 오늘부터 맡아줘요.'],['운영팀장','회의록도. 아 참, 기획팀 건도 같이 봐줘요.'],['나','팀장님은 다섯인데, 왜 받는 사람은 나 하나지?']]},
    {place:'내 자리 · 5일째 야근 / 23:47',objective:'쏟아지는 메시지를 확인하세요',action:'잠깐 눈 붙이기',camera:[0,1.38,1.25],target:[0,1.2,-.2],interact:[0,1.24,-.18],seated:true,lines:[['총괄팀장','{name}님 없으면 회사가 안 돌아가요. 이것만 하고 가요.'],['나','내 일은 언제 하지.'],['나','커피 다 식었네. 진짜 딱 5분만.']]},
    {place:'… · 03:12',objective:'책상 앞에서 정신을 차리세요',action:'자리에서 일어나기',camera:[0,1.30,1.25],target:[0,1.17,-.18],interact:[0,1.24,-.18],seated:true,lines:[['나','…나 얼마나 잔 거야?'],['나','불도 다 꺼졌는데. 알림은 왜 계속 울려.'],['어딘가에서','어디 가. 너 없으면 안 된다니까.']]},
    {place:'같은 회사, 다른 밤',objective:'복도 끝에서 다가오는 사람들을 확인하세요',action:'한 걸음 물러서기',camera:[0,1.65,3.7],target:[0,1.4,-3],interact:[0,1.4,-.8],range:6,bounds:[-2,2,2,5],lines:[['팀장님들','퇴근? 이건 그럼 누가 해!'],['나','왜 다섯이 한꺼번에 달려와.'],['나','…꿈이네. 꿈이면 도망쳐도 되잖아.']]},
    {place:'내 자리 · 꿈속의 사내 전화',objective:'책상 위 내선 전화로 사장님을 부르세요',action:'사장님 호출하기',camera:[0,1.50,1.45],target:[.5,1.02,-.05],interact:[.75,1.01,.15],seated:true,lines:[['나','도망만 쳐서는 안 끝나. 뭐라도 있어야 하는데.'],['나','…있다. 팀장님이 무서워하는 사람.'],['나','사장님을 부르면, 저 사람들도 나처럼 뛰겠지.'],['꿈속 사내 방송','야근 모드는 결재 두 곳을 받은 뒤 엘리베이터로 올라가세요.'],['꿈속 사내 방송','한 층 오를 때마다 승진하고, 쫓는 사람이 한 명씩 늘어납니다.']]}
  ];
  let active=false,index=0,busy=false,transitionTimer=0,raf=0,finishCallback,menuMode=false;
  let renderer,scene,camera,key,fill,groups=[],actors=[],floaters=[],interactionObjects={},environmentTarget,documentSurfaces=[],artTextures={};
  let last=0,time=0,chapterTime=0,yaw=0,pitch=0,dragging=false,keys={},motion,ready=false,lineIndex=-1,inspect=false,sound=false;
  // Menu parallax: the room leans with the cursor, which is what makes a title screen
   // feel built rather than rendered. Kept separate from gameplay yaw/pitch.
  let menuBase=null,pointX=0,pointY=0,leanX=0,leanY=0,menuTime=0,restEye=null;
  const SCREEN_VIEW={eye:new THREE.Vector3(0,1.30,1.08),at:new THREE.Vector3(0,1.243,-.22),fov:33};
  // Story beats always play at their authored pace, independently of OS motion settings.
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
    const wood=material(0xe1c9a6,{map:woodTex,bumpMap:woodTex,bumpScale:.003,roughness:.42}),dark=material(0x27343c,{metalness:.5,roughness:.32}),paper=material(0xf3eee2),gold=material(0xb69b6b,{metalness:.72,roughness:.28}),wall=material(0xe2dfd4,{map:wallTex,roughness:.9}),glow=material(0xffebc5,{emissive:0xffd29a,emissiveIntensity:2});
    const stone=material(0xe5e4db,{map:wallTex,bumpMap:wallTex,bumpScale:.002,roughness:.3}),fabric=material(0x4b6867,{map:carpetTex,bumpMap:carpetTex,bumpScale:.0015,roughness:.94}),metal=material(0xabb5b3,{metalness:.85,roughness:.24});
    const art=artTextures={};for(const kind of ['mailList','offerArrived','offer','inbox','badge','report','phone'])art[kind]=IntroArt.texture(T,kind,playerName());
    const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ec=envCanvas.getContext('2d'),eg=ec.createLinearGradient(0,0,0,256);eg.addColorStop(0,'#9bb9cc');eg.addColorStop(.48,'#e6e2cf');eg.addColorStop(1,'#3d4c55');ec.fillStyle=eg;ec.fillRect(0,0,512,256);ec.fillStyle='#fff4d6';ec.fillRect(80,62,100,65);const envTex=new T.CanvasTexture(envCanvas);envTex.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer);environmentTarget=pmrem.fromEquirectangular(envTex);scene.environment=environmentTarget.texture;envTex.dispose();pmrem.dispose();
    function documentPlane(g,kind,x,y,z,w,h,lit=false){const m=lit?new T.MeshBasicMaterial({map:art[kind],toneMapped:false}):material(0xffffff,{map:art[kind],roughness:.7});const page=mesh(g,new T.PlaneGeometry(w,h),m,x,y,z);page.castShadow=false;documentSurfaces.push({mesh:page,kind,chapter:groups.length-1});return page;}
    function rounded(g,mat,x,y,z,w,h,d,r=.03){r=Math.min(r,w*.48,h*.48);const shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const bevel=Math.min(.004,d*.18,h*.12);const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1,curveSegments:7});geo.translate(0,0,-d/2);return mesh(g,geo,mat,x,y,z);}
    // Repeated details share a draw call: small fixtures should not make a room expensive.
    function instances(g,geo,mat,poses){const inst=new T.InstancedMesh(geo,mat,poses.length),pivot=new T.Object3D();poses.forEach((p,i)=>{pivot.position.set(...p.position);pivot.rotation.set(...(p.rotation||[0,0,0]));pivot.scale.set(...(p.scale||[1,1,1]));pivot.updateMatrix();inst.setMatrixAt(i,pivot.matrix);});inst.castShadow=inst.receiveShadow=true;g.add(inst);return inst;}
    function beam(g,mat,start,end,r=.012){const a=new T.Vector3(...start),b=new T.Vector3(...end),delta=b.clone().sub(a),m=mesh(g,new T.CylinderGeometry(r,r,delta.length(),10),mat,...a.clone().add(b).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
    function plant(g,x,z){
      const p=new T.Group();p.position.set(x,0,z);g.add(p);
      mesh(p,new T.LatheGeometry([new T.Vector2(.17,0),new T.Vector2(.21,.025),new T.Vector2(.24,.38),new T.Vector2(.235,.40),new T.Vector2(.21,.40),new T.Vector2(.20,.35)],32),material(0xbab7a9,{roughness:.58}));
      mesh(p,new T.CylinderGeometry(.204,.204,.012,24),material(0x302d26),0,.362,0);
      // Thin curved leaves keep a botanical silhouette even against the window light.
      const vertices=[],uv=[],ids=[];
      for(let row=0;row<=10;row++){const v=row/10,w=Math.pow(Math.sin(v*Math.PI),.75)*.14;for(const side of [-1,0,1]){vertices.push(side*w,v*.60,Math.sin(v*Math.PI)*.075-Math.abs(side)*.025);uv.push((side+1)/2,v);}}
      for(let row=0;row<10;row++)for(let col=0;col<2;col++){const a=row*3+col;ids.push(a,a+3,a+1,a+1,a+3,a+4);}
      const leafGeo=new T.BufferGeometry();leafGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));leafGeo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));leafGeo.setIndex(ids);leafGeo.computeVertexNormals();
      const leaves=[],stems=[];for(let i=0;i<9;i++){const a=i*2.4,h=.38+(i%3)*.13,r=.06+(i%2)*.08;leaves.push({position:[Math.sin(a)*r,h,Math.cos(a)*r],rotation:[.35+(i%3)*.18,a,.15],scale:[1,.85+(i%3)*.14,1]});stems.push({position:[Math.sin(a)*r*.5,.36+(h-.36)/2,Math.cos(a)*r*.5],rotation:[0,a,.18],scale:[1,h-.29,1]});}
      instances(p,leafGeo,material(0x355c48,{side:T.DoubleSide,roughness:.7}),leaves);instances(p,new T.CylinderGeometry(.007,.010,1,8),material(0x547354),stems);
      softShadow(g,x,z,.8,.8);
    }
    function softShadow(g,x,z,w,d,y=.012){const c=document.createElement('canvas');c.width=c.height=64;const p=c.getContext('2d'),gradient=p.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'#07101370');gradient.addColorStop(1,'#07101300');p.fillStyle=gradient;p.fillRect(0,0,64,64);const m=mesh(g,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}),x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=m.receiveShadow=false;}

    function stage(){
      const g=new T.Group();scene.add(g);groups.push(g);
      const floorMap=woodTex.clone();floorMap.repeat.set(4,8);floorMap.needsUpdate=true;box(g,material(0xd4c0a2,{map:floorMap,bumpMap:floorMap,bumpScale:.0015,roughness:.5}),0,-.08,0,10,.16,16);
      box(g,wall,-5,1.7,0,.16,3.4,16);box(g,wall,5,1.7,0,.16,3.4,16);box(g,wall,0,1.7,-8,10,3.4,.16);box(g,wall,0,1.7,8,10,3.4,.16);
      box(g,material(0xcbd0c9),0,3.45,2.75,10,.12,10.5).castShadow=false;
      for(const x of [-4.86,4.86]){
        box(g,dark,x,.075,0,.035,.15,16);box(g,wood,x,1.05,2.75,.06,.024,10.5);
        box(g,wall,x,3.30,2.75,.22,.16,10.5);box(g,glow,x-Math.sign(x)*.08,3.365,2.75,.035,.018,10.3).castShadow=false;
      }
      plant(g,-3.9,-1);plant(g,3.8,.7);
      const rug=carpetTex.clone();rug.repeat.set(3,3);rug.needsUpdate=true;box(g,material(0x576b69,{map:rug,bumpMap:rug,bumpScale:.001,roughness:1}),0,.014,2.5,5,.015,4.5);
      const seams=[];for(let z=-1;z<7;z+=3){rounded(g,dark,0,3.365,z,1.75,.035,.36,.016);box(g,glow,0,3.339,z,1.6,.018,.25).castShadow=false;for(let x=-4;x<5;x+=2)seams.push({position:[x,3.38,z],scale:[.013,.01,3]});}
      instances(g,new T.BoxGeometry(1,1,1),material(0x8e9995),seams);
      for(const x of [-4.5,4.5]){
        rounded(g,wood,x,.52,5,.7,.95,2.1,.025);box(g,stone,x,1.015,5,.74,.055,2.15);
        for(let i=0;i<3;i++){box(g,dark,x-Math.sign(x)*.36,.55,4.35+i*.65,.012,.015,.33);box(g,paper,x,1.065,4.35+i*.6,.40,.038,.49);box(g,fabric,x,1.088,4.35+i*.6,.42,.008,.51);}
      }
      return g;
    }
    function cup(g,x,y,z){const c=buildCoffeeCup(T);c.position.set(x,y,z);c.scale.setScalar(1.25);g.add(c);return c;}
    function desk(g,x=0,z=0){
      rounded(g,wood,x,.84,z,3,.08,1.35,.035);rounded(g,dark,x,.784,z,2.85,.025,1.22,.01);
      for(const side of [-1,1]){box(g,dark,x+side*1.3,.4,z,.055,.8,.065);rounded(g,dark,x+side*1.3,.035,z,.08,.045,1.08,.018);for(const dz of [-.43,.43])mesh(g,new T.CylinderGeometry(.035,.035,.025,16),dark,x+side*1.3,.014,z+dz);}
      box(g,dark,x,.70,z-.37,2.65,.09,.05);rounded(g,wood,x-1.06,.56,z+.04,.57,.40,.85,.025);
      box(g,dark,x-1.06,.57,z+.47,.51,.008,.008);rounded(g,metal,x-1.06,.66,z+.48,.18,.014,.016,.006);
      softShadow(g,x,z,3.5,2.2);
    }
    function chair(g,x,z){
      const c=new T.Group();c.position.set(x,0,z);g.add(c);
      rounded(c,dark,0,.45,0,.55,.055,.55,.027);rounded(c,fabric,0,.50,0,.53,.085,.52,.04);
      const back=rounded(c,fabric,0,.87,.24,.52,.64,.07,.10);back.rotation.x=-.10;
      rounded(c,dark,0,.84,.289,.10,.57,.03,.045);mesh(c,new T.CylinderGeometry(.026,.034,.30,20),metal,0,.28,0);
      for(const side of [-1,1]){beam(c,dark,[side*.25,.45,.11],[side*.29,.69,.08],.017);rounded(c,dark,side*.29,.70,.01,.075,.04,.32,.02);}
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5,s=Math.sin(a)*.30,cosa=Math.cos(a)*.30;beam(c,metal,[0,.15,0],[s,.085,cosa],.022);const wheel=mesh(c,new T.CylinderGeometry(.044,.044,.033,16),dark,s,.05,cosa);wheel.rotation.z=Math.PI/2;}
      softShadow(g,x,z,.9,.9);return c;
    }
    function laptop(g,x,y,z,night=false){
      const l=new T.Group();l.position.set(x,y,z);g.add(l);
      const aluminium=material(0x839197,{metalness:.85,roughness:.28});rounded(l,aluminium,0,0,.07,1,.025,.65,.022);rounded(l,dark,0,-.015,.07,.97,.005,.61,.002);
      const screen=new T.Group();screen.position.set(0,.32,-.23);screen.rotation.x=-.12;l.add(screen);
      const housing=rounded(screen,dark,0,0,0,1.02,.66,.022,.025);
      housing.name='laptop-screen-housing';housing.geometry.computeBoundingBox();
      // Include the bevel: the former .015 offset left only .00004m clearance,
      // causing depth fighting on distant laptops as the camera moved.
      const displayZ=housing.geometry.boundingBox.max.z+.004;
      const display=documentPlane(screen,night?'inbox':groups.length===1?'mailList':'offer',0,0,displayZ,.96,.60,true);
      display.name='laptop-display';display.receiveShadow=false;
      mesh(screen,new T.SphereGeometry(.007,10,8),material(0x151d22),0,.316,.016);box(screen,gold,0,-.313,.016,.08,.003,.001);
      rounded(l,dark,0,.013,.008,.89,.005,.285,.002);
      const keyMat=material(0x202930,{roughness:.45}),keycap=rounded(l,keyMat,0,0,0,.058,.009,.049,.004),caps=[];
      for(let row=0;row<4;row++)for(let col=0;col<12;col++)caps.push({position:[-.407+col*.074,.023,-.09+row*.066]});
      l.remove(keycap);instances(l,keycap.geometry,keyMat,caps);
      rounded(l,dark,0,.019,.265,.278,.002,.124,.001);rounded(l,material(0x9ca8ad,{metalness:.7,roughness:.4}),0,.022,.265,.27,.002,.115,.001);
      const vents=[];for(const side of [-1,1])for(let i=0;i<15;i++)vents.push({position:[side*.465,.016,-.10+i*.016]});instances(l,new T.BoxGeometry(.016,.002,.003),dark,vents);
      for(const side of [-1,1]){const hinge=mesh(l,new T.CylinderGeometry(.020,.020,.14,20),aluminium,side*.35,.008,-.235);hinge.rotation.z=Math.PI/2;}
      mesh(l,new T.SphereGeometry(.0035,8,6),glow,.46,.018,.25);
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
      const night=groups.length>=4,sky=document.createElement('canvas');sky.width=512;sky.height=512;
      const sc=sky.getContext('2d'),gradient=sc.createLinearGradient(0,0,0,512);gradient.addColorStop(0,night?'#111e33':'#99b8c7');gradient.addColorStop(.65,night?'#243b4a':'#d1d8d3');gradient.addColorStop(1,night?'#53636a':'#eee0c7');sc.fillStyle=gradient;sc.fillRect(0,0,512,512);
      const skyMap=new T.CanvasTexture(sky);skyMap.colorSpace=T.SRGBColorSpace;
      const skyMesh=mesh(g,new T.PlaneGeometry(10,4),new T.MeshBasicMaterial({map:skyMap}),0,1.7,-7.65);skyMesh.castShadow=skyMesh.receiveShadow=false;
      const facades=[material(night?0x253645:0x81949b,{roughness:.82}),material(night?0x314451:0x9da9a9,{roughness:.75})],windows=[[],[],[]];
      for(let i=0;i<13;i++){
        const x=-4.8+i*.8,h=1.15+((i*7)%6)*.25,z=-6.1-(i%2)*.65,w=.55+(i%3)*.14;
        box(g,facades[i%2],x,h/2,z,w,h,.52);box(g,facades[i%2],x,h+.055,z,w*.66,.11,.40);
        if(i%3===0)beam(g,metal,[x,h+.1,z],[x,h+.39,z],.007);
        for(let row=0;row<Math.floor((h-.2)/.28);row++)for(let col=0;col<3;col++)windows[(i+row+col)%3].push({position:[x-w*.29+col*w*.29,.20+row*.28,z+.265],scale:[w*.14,.12,.008]});
      }
      [0xd3b889,0x95afba,0x415361].forEach((color,i)=>{const m=material(night?color:0xb9c9cb,{emissive:night?color:0x738f9b,emissiveIntensity:night?(i===2?.05:.65):.15,roughness:.3}),lights=instances(g,new T.BoxGeometry(1,1,1),m,windows[i]);lights.castShadow=false;});
      for(let i=-3;i<=3;i+=2)box(g,dark,i,1.87,-2.38,.055,2.04,.09);
      box(g,wood,0,.84,-2.32,7.1,.06,.3);box(g,dark,0,2.91,-2.4,7.1,.08,.12);
      box(g,dark,0,.91,-2.4,7.1,.045,.1);
      const glass=mesh(g,new T.PlaneGeometry(6.95,1.96),new T.MeshPhysicalMaterial({color:0xb3d2d2,transparent:true,opacity:.065,roughness:.08,metalness:.05,depthWrite:false}),0,1.90,-2.43);glass.castShadow=false;
      const blinds=[];for(let i=0;i<6;i++)blinds.push({position:[0,2.86-i*.105,-2.32],rotation:[.16,0,0]});instances(g,new T.BoxGeometry(7,.024,.13),material(0xc1b8a4,{metalness:.28,roughness:.48}),blinds);
      for(const x of [-3.25,3.25])box(g,paper,x,2.55,-2.27,.012,.7,.012);
    }
    function person(g,i,x,y,z,baby=false){
      // Close-up story scenes need natural silhouettes, not the broad comic build
      // used for the playable boss roster. Distinguish people by face, hair and outfit.
      const reception=groups.length===2;
      const opts={isBaby:baby,identity:['slim','square','tall','slim','round'][i%5],hair:reception?'comb':['comb','spiky','bald','perm','mullet'][i%5],outfit:baby?'hanbok':reception?'suit':['suit','vest','shirt','golf','suit'][i%5],face:i%2?'smug':'angry',skin:['fair','tan','fair','deep','flush'][i%5],prop:'paper'};
      const c=buildBossMesh(opts,T);c.position.set(x,y,z);c.rotation.y=-.12;g.add(c);actors.push({mesh:c,chapter:groups.length-1,seed:i});softShadow(g,x,z,.8,.6);return c;
    }
    // Rooms surround an eye-level player. No miniature platforms or presentation camera.
    function workstation(g,night=false){
      windowWall(g);desk(g);laptop(g,0,.92,0,night);
      mesh(g,new T.CylinderGeometry(.145,.145,.012,32),material(0x76644f,{roughness:.9}),1.2,.898,.32);cup(g,1.2,.99,.32);papers(g,-1,.925,.15,night?20:3);
      mesh(g,new T.CylinderGeometry(.12,.14,.026,32),dark,-1.25,.905,-.45);
      beam(g,gold,[-1.25,.92,-.45],[-1.31,1.42,-.45],.013);beam(g,gold,[-1.31,1.42,-.45],[-1.03,1.65,-.45],.013);
      for(const [x,y] of [[-1.31,1.42],[-1.03,1.65]]){const joint=mesh(g,new T.CylinderGeometry(.028,.028,.042,20),dark,x,y,-.45);joint.rotation.x=Math.PI/2;}
      rounded(g,dark,-.97,1.66,-.40,.43,.045,.19,.019);box(g,glow,-.97,1.63,-.4,.36,.008,.13).castShadow=false;
      const lamp=new T.PointLight(0xffd8ab,night?.78:.36,3,2);lamp.position.set(-.97,1.56,-.4);g.add(lamp);
      rounded(g,material(0x344e4e,{roughness:.83}),0,.899,.13,1.58,.008,1.02,.003);
      const notebook=rounded(g,material(0x365f60),-.82,.925,.42,.27,.032,.37,.014);notebook.rotation.y=-.12;
      box(g,paper,-.82,.926,.434,.254,.020,.35);box(g,gold,-.60,.916,.4,.012,.012,.27);
      const mouse=mesh(g,new T.SphereGeometry(1,24,16),material(0x9ca9a4,{metalness:.15,roughness:.42}),.67,.922,.32);mouse.scale.set(.049,.025,.085);beam(g,dark,[.67,.947,.28],[.67,.947,.31],.003);
      const cable=new T.CatmullRomCurve3([new T.Vector3(.48,.894,-.20),new T.Vector3(.84,.893,-.27),new T.Vector3(.97,.887,-.60),new T.Vector3(.96,.42,-.69)]);mesh(g,new T.TubeGeometry(cable,24,.006,6,false),dark);
      softShadow(g,0,.1,1.4,.9,.904);
      // A narrow radiator and a framed pinboard ground the room beyond the desk.
      box(g,paper,0,.42,-2.32,2.1,.56,.10);const fins=[];for(let i=0;i<23;i++)fins.push({position:[-1+i*.09,.42,-2.255]});instances(g,new T.BoxGeometry(.022,.49,.025),material(0xb9c2bf),fins);
    }
    let g=stage();workstation(g);rounded(g,wood,3.9,.33,2.4,1.65,.4,2.5,.08);rounded(g,material(0x859b92,{map:carpetTex,bumpMap:carpetTex,bumpScale:.002,roughness:1}),3.9,.59,2.4,1.6,.25,2.4,.08);rounded(g,paper,3.9,.77,1.65,1.2,.12,.5,.05);
    rounded(g,wood,2.7,1.65,-2.25,1.50,.80,.07,.025);board(g,['취업 준비 / 지원 기록','지원 38건   면접 4회','이번에는 꼭.'],2.7,1.65,-2.20,1.4,.7,'#d2c6ae','#3c4c49');
    const shelves=new T.Group();shelves.position.set(-4.70,0,2.5);shelves.rotation.y=Math.PI/2;g.add(shelves);
    for(const y of [.40,1.10,1.80]){
      box(shelves,wood,0,y,0,1.8,.045,.34);
      for(let i=0;i<6;i++){const h=.22+(i%3)*.045;box(shelves,i%3===0?fabric:i%3===1?paper:wood,-.65+i*.12,y+h/2+.025,-.03,.075,h,.23);}
    }
    // Arrival is playable: approach the badge on the reception desk.
    g=stage();
    box(g,wall,0,1.7,-2.1,10,3.4,.15);
    const slats=[];for(let i=0;i<45;i++)slats.push({position:[-4.5+i*.2,1.7,-1.99]});instances(g,new T.BoxGeometry(.045,3.4,.09),wood,slats);
    plant(g,-2.7,.1);rounded(g,stone,0,2.19,-1.87,3.2,1.03,.08,.045);
    board(g,['한마음컴퍼니','작지만 함께 성장하는 회사'],0,2.2,-1.82,3,1.0,'#dddcd0','#314e50');
    box(g,glow,0,2.77,-1.90,3.0,.016,.025).castShadow=false;
    rounded(g,wood,0,.55,-.3,3.8,1.1,1,.055);rounded(g,stone,0,1.14,-.3,3.96,.08,1.12,.035);
    box(g,dark,0,.08,-.28,3.65,.14,.97);box(g,glow,0,.145,.222,3.58,.018,.012).castShadow=false;
    const flutes=[];for(let i=0;i<38;i++)flutes.push({position:[-1.80+i*.098,.64,.218]});instances(g,new T.BoxGeometry(.020,.84,.035),wood,flutes);
    rounded(g,dark,-1.20,1.205,-.15,.50,.024,.32,.012);const visitorSign=board(g,['안내 데스크','RECEPTION'],-1.20,1.34,-.24,.43,.215,'#20383b','#dfd5bb');visitorSign.rotation.x=-.16;
    rounded(g,gold,0,1.197,.56,.55,.023,.25,.01);beam(g,gold,[0,1.20,.55],[0,1.46,.61],.012);
    const badge=new T.Group();g.add(badge);badge.position.set(0,1.43,.65);rounded(badge,material(0xd8e2da),0,0,-.012,.44,.29,.02,.022);documentPlane(badge,'badge',0,0,.004,.42,.263);box(badge,gold,0,.156,-.005,.10,.022,.017);const strap=new T.CatmullRomCurve3([new T.Vector3(-.035,.16,-.012),new T.Vector3(-.15,.4,-.08),new T.Vector3(.12,.44,-.1),new T.Vector3(.035,.16,-.012)]);mesh(badge,new T.TubeGeometry(strap,24,.008,6,false),material(0x306963));interactionObjects.badge=badge;person(g,3,2.65,0,-.7);
    const lobbyLight=new T.PointLight(0xffdfb0,1.6,7,2);lobbyLight.position.set(0,2.7,.9);g.add(lobbyLight);
    // A lounge sits outside the playable approach corridor.
    rounded(g,dark,-3.65,.25,3,.78,.20,1.85,.06);rounded(g,fabric,-3.65,.41,3,.81,.20,1.83,.08);rounded(g,fabric,-4.0,.77,3,.16,.72,1.90,.07);
    for(const z of [2.06,3.94])rounded(g,fabric,-3.64,.61,z,.83,.48,.15,.065);
    mesh(g,new T.CylinderGeometry(.42,.42,.055,40),stone,-2.7,.53,3);mesh(g,new T.CylinderGeometry(.035,.035,.48,20),gold,-2.7,.265,3);softShadow(g,-3.5,3,2.0,2.7);
    // Five people occupy your desk, all handing work to one new employee.
    g=stage();windowWall(g);desk(g,0,-1.1);papers(g,0,.925,-.45,10);
    for(let i=0;i<5;i++){const x=(i-2)*1.25;person(g,i,x,0,-2+Math.abs(i-2)*.35);}
    for(const x of [-3.5,3.5]){desk(g,x,-5);laptop(g,x,.92,-5);chair(g,x,-4);}
    // The same physical desk becomes a late-night prison.
    g=stage();workstation(g,true);papers(g,1,.93,-.2,17);board(g,['23:47','미처리 업무 27건'],1.7,2.2,-2.1,1.3,.65);
    // Wake at exactly the same seat; the room is now impossibly quiet.
    g=stage();workstation(g,true);for(let i=0;i<12;i++){const p=box(g,paper,Math.sin(i*2.4)*3,1.6+(i%4)*.4,-1-Math.abs(Math.cos(i))*3,.35,.013,.48);p.rotation.set(i*.2,0,i*.5);floaters.push({mesh:p,base:p.position.clone(),chapter:4,seed:i});}
    // The managers actually close the distance, stopping before contact.
    g=stage();
    const corridorGlass=new T.MeshPhysicalMaterial({color:0x89b4b7,metalness:.06,roughness:.12,transparent:true,opacity:.12,depthWrite:false}),frosted=material(0x87a2a3,{transparent:true,opacity:.19,depthWrite:false});
    const corridors=[],ceilingBaffles=[];
    for(let i=0;i<7;i++){
      const z=3-i*1.7;
      for(const x of [-3.4,3.4]){
        box(g,dark,x,1.65,z,.055,3.3,.09);const glass=box(g,corridorGlass,x,1.65,z-.8,.02,3.2,1.55);glass.castShadow=false;
        box(g,frosted,x,1.0,z-.8,.025,.15,1.53).castShadow=false;
        beam(g,metal,[x-Math.sign(x)*.045,.95,z-.32],[x-Math.sign(x)*.045,1.28,z-.32],.011);
        box(g,dark,x-Math.sign(x)*.045,1.28,z-.04,.04,.10,.06);box(g,glow,x-Math.sign(x)*.071,1.305,z-.04,.008,.012,.033).castShadow=false;
        corridors.push({position:[x-Math.sign(x)*.18,.07,z-.78],scale:[.025,.025,1.52]});
      }
      box(g,dark,0,3.33,z,6.8,.045,.15);box(g,glow,0,3.299,z,6.5,.018,.038).castShadow=false;
      for(let j=0;j<3;j++)ceilingBaffles.push({position:[0,3.28,z-.35-j*.32],scale:[5.9,.11,.038]});
    }
    const guides=instances(g,new T.BoxGeometry(1,1,1),material(0xa8cdd0,{emissive:0x639fa3,emissiveIntensity:.85}),corridors);guides.castShadow=false;
    instances(g,new T.BoxGeometry(1,1,1),wood,ceilingBaffles);
    rounded(g,dark,0,1.38,-7.85,2.1,2.74,.08,.02);box(g,gold,0,1.5,-7.79,.012,2.3,.014);
    board(g,['비상구','EXIT'],0,2.91,-7.75,.62,.31,'#2c6059','#e3f1da');
    const hallLight=new T.PointLight(0x96c5cd,1.2,9,2);hallLight.position.set(0,2.45,-2.7);g.add(hallLight);
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
    el('screen-title').classList.remove('inspecting','flooded');chapterTime=0;lineIndex=-1;inspect=false;ready=false;keys={};motion=FPSMovement.create();
    clearAlerts();if(index!==0)showPhone(false);if(sound)OfficeAudio.room(index<3?'bedroom':index<6?'night':'office');
    if(scene){groups.forEach((g,i)=>g.visible=i===index);camera.fov=65;camera.updateProjectionMatrix();camera.position.set(...c.camera);restEye=new THREE.Vector3(...c.camera);camera.rotation.order='YXZ';camera.lookAt(...c.target);yaw=camera.rotation.y;pitch=camera.rotation.x;key.color.set(index<3?0xffd69b:index===3?0x8ab2dd:0x91a9f7);key.intensity=index<3?2.2:index===3?.65:.45;fill.intensity=index<3?1.5:.48;applyEnvironment(index>=3);}
    updateDialogue();
  }
  function updateDialogue(){
    const lines=CHAPTERS[index].lines,n=Math.min(lines.length-1,Math.floor(chapterTime/4.2));if(n===lineIndex)return;lineIndex=n;
    el('intro-speaker').textContent=lines[n][0]==='나'?playerName():lines[n][0];el('intro-dialogue').textContent=withName(lines[n][1]);
    // Sound follows the beat, not the chapter: one mail at the start, a wall of
    // messages on the fifth night, and the same wall again when nobody should be awake.
    if(index===0&&n===1)messengerTone();
    if(index===2&&n===0)cue('paper');
    if(index===3&&n===0)flood('night');
    if(index===4&&n===1)flood('dawn');
    if(index===5&&n===0)cue('tantrum');
    if(index===6&&n===2)cue('phone');
    if(index===0){
      // Before the lookup the laptop shows a plain inbox; after it, the result page
      // stays on screen. There is no acceptance mail any more.
      if(!openingDone){
        const surface=documentSurfaces.find(s=>s.chapter===0);
        if(surface&&surface.kind!=='mailList'){surface.kind='mailList';surface.mesh.material.map=artTextures.mailList;surface.mesh.material.needsUpdate=true;}
      }
      showPhone(n===2||n===3);
      if(n===2&&sound)OfficeAudio.event('message');
      el('intro-objective').textContent=
        n<2?'발표를 기다리는 중입니다'
        :n===2?'문자를 확인하세요'
        :n===3?'노트북으로 합격자 조회를 여세요'
        :'합격 페이지를 확인하세요';
      el('intro-next-label').textContent=
        n<2?'메일함 새로고침':n===2?'문자 읽기':n===3?'합격자 조회 열기':'계속';
    }
  }
  function updateInteraction(){
    if(busy)return;const c=CHAPTERS[index];let near=true,aimed=true;
    if(camera){const target=new THREE.Vector3(...c.interact),delta=target.sub(camera.position);near=delta.length()<(c.range||2.2);aimed=camera.getWorldDirection(new THREE.Vector3()).dot(delta.normalize())>.84;}
    ready=near&&aimed;el('btn-go-select').disabled=!ready;
    // Say what to do, not just that something is wrong.
    el('intro-interaction').textContent=ready?'E'
      :near?(c.seated?'◎ 화면 가운데로 대상을 맞추세요':'◎ 대상을 바라보세요')
      :'▲ 더 가까이 다가가세요  ·  WASD';
    el('screen-title').classList.toggle('can-interact',ready);
  }
  /* The prologue shares the game's synth so both halves sound like one product. */
  function cue(name,detail){if(sound)OfficeAudio.event(name,detail);}
  function tone(){cue(index<4?'paper':'door');}
  function messengerTone(){cue('message');}

  /* ---- messenger pile-up ----
     One notification is a detail. Twenty arriving on top of each other is the joke,
     and it has to be seen as well as heard, so each cue drops a card on screen. */
  const FLOOD={
    night:[['총괄팀장','내일 아침 회의 자료도 부탁해요',1],['전략팀장','보고서 초안 아직인가요?',0],
      ['운영팀장','회의록 오늘 안에 정리 가능하죠?',0],['기획팀장','이거 {name}님이 제일 잘하잖아요',0],
      ['재무팀장','정산표 양식 좀 바꿔주세요',0],['총괄팀장','확인했으면 답 좀',1],
      ['전략팀장','급한 건 아닌데 오늘까지요',0],['운영팀장','자는 건 아니죠?',1]],
    dawn:[['총괄팀장','어디 가요',1],['전략팀장','아직 회사죠?',1],['운영팀장','{name}님',1],
      ['기획팀장','{name}님?',1],['재무팀장','{name}님!!',1],['총괄팀장','대답 좀 해봐요',1],
      ['알 수 없음','너 없으면 안 된다니까',1],['알 수 없음','어디 가',1],
      ['알 수 없음','어디 가',1],['알 수 없음','어디 가',1]],
  };
  let floodTimers=[];
  function clearAlerts(){floodTimers.forEach(clearTimeout);floodTimers=[];const host=el('intro-alerts');if(host)host.innerHTML='';}
  function dropAlert(from,text,urgent){
    const host=el('intro-alerts');if(!host)return;
    const card=document.createElement('div');card.className='intro-alert'+(urgent?' urgent':'');
    const who=document.createElement('b');who.textContent=from;
    const body=document.createElement('span');body.textContent=withName(text);
    card.append(who,body);host.appendChild(card);
    // Keep the newest few; older ones slide out so the stack never covers the room.
    while(host.children.length>6){const old=host.firstChild;old.classList.add('leaving');const dying=old;setTimeout(()=>dying.remove(),300);host.removeChild(old);}
    floodTimers.push(setTimeout(()=>{card.classList.add('leaving');setTimeout(()=>card.remove(),300);},6500));
  }
  /* Paced so each message lands on its own: one card, one notification sound, far
     enough apart to read. A wall that arrives all at once reads as a single event. */
  const FLOOD_GAP=430;
  function flood(kind){
    const list=FLOOD[kind];if(!list)return;
    clearAlerts();
    if(sound)OfficeAudio.event('messageSwell');
    const stage=el('screen-title');
    list.forEach(([from,text,urgent],i)=>{
      const delay=i*FLOOD_GAP+Math.random()*90;
      floodTimers.push(setTimeout(()=>{
        dropAlert(from,text,urgent);
        if(sound)OfficeAudio.event('message');
        if(i%4===0){stage.classList.remove('flooded');void stage.offsetWidth;stage.classList.add('flooded');}
      },delay));
    });
  }

  function toggleSound(){
    if(!active)return;
    sound=!OfficeAudio.setMuted(sound);   // button reflects the shared mute state
    el('intro-sound').setAttribute('aria-pressed',String(sound));
    el('intro-sound').textContent=sound?'소리 끄기':'소리 켜기';
    if(sound){OfficeAudio.resume();OfficeAudio.room(index<3?'bedroom':'night');}
  }
  function move(){
    if(!active||busy||menuMode||!ready)return;
    // The result has to be looked up; the story cannot step over it.
    if(index===0&&lineIndex===3&&!openingDone){openLookup();return;}
    // Give the short dialogue beats a chance to finish; E can advance each beat.
    if(lineIndex<CHAPTERS[index].lines.length-1){chapterTime=(lineIndex+1)*4.2;updateDialogue();return;}
    busy=true;keys={};el('btn-go-select').disabled=true;el('screen-title').classList.add('changing');
    transitionTimer=setTimeout(()=>{
      if(index===CHAPTERS.length-1){finish();return;}
      index++;updateChapter();tone();el('screen-title').classList.remove('changing');
      transitionTimer=setTimeout(()=>{busy=false;},500);
    },700);
  }
  function frame(now){
    if(!active)return;const dt=Math.min(.04,(now-last)/1000||0);last=now;
    if(menuMode&&camera&&menuBase&&!document.hidden){
      menuTime+=dt;
      const ease=1-Math.exp(-dt*3.4);
      leanX+=(pointX-leanX)*ease;leanY+=(pointY-leanY)*ease;
      // A slow breath underneath, so the room is alive even with the mouse still.
      const breath=Math.sin(menuTime*.42)*.03;
      camera.position.set(menuBase.x+leanX*.62,menuBase.y-leanY*.34+breath,menuBase.z+Math.abs(leanX)*.10);
      camera.lookAt(menuBase.tx+leanX*.26,menuBase.ty-leanY*.20+breath*.5,menuBase.tz);
      el('intro-menu').style.setProperty('--lean-x',(leanX*-9).toFixed(2)+'px');
      el('intro-menu').style.setProperty('--lean-y',(leanY*-5).toFixed(2)+'px');
    }
    if(screenFocus&&camera&&!document.hidden){
      // Push in on the laptop the way R inspects, but aimed and automatic.
      const ease=1-Math.exp(-dt*3.4);
      camera.position.lerp(SCREEN_VIEW.eye,ease);
      camera.lookAt(SCREEN_VIEW.at);
      yaw=camera.rotation.y;pitch=camera.rotation.x;
      camera.fov=THREE.MathUtils.lerp(camera.fov,SCREEN_VIEW.fov,ease);
      camera.updateProjectionMatrix();
      caretClock+=dt;if(lookupPhase==='form'&&caretClock>.53){caretClock=0;caretOn=!caretOn;paintLookup();}
    }
    if(lookupPhase==='congrats'&&partyTime<5.2&&!document.hidden){
      partyTime+=dt;partyClock+=dt;
      if(partyClock>1/15){partyClock=0;paintLookup();}   // 15fps is plenty for falling paper
    }
    if(!document.hidden&&!busy&&!menuMode){time+=dt;if(index!==0)chapterTime+=dt;updateDialogue();
      if(renderer){
        const c=CHAPTERS[index];
        if(!c.seated){const step=FPSMovement.step(motion,{forward:(keys.KeyW?1:0)-(keys.KeyS?1:0),right:(keys.KeyD?1:0)-(keys.KeyA?1:0)},yaw,dt);const b=c.bounds;camera.position.x=THREE.MathUtils.clamp(camera.position.x+step.x*.42,b[0],b[1]);camera.position.z=THREE.MathUtils.clamp(camera.position.z+step.z*.42,b[2],b[3]);}
        camera.rotation.set(pitch,yaw,0,'YXZ');const fov=inspect?38:65;camera.fov=THREE.MathUtils.lerp(camera.fov,fov,1-Math.exp(-dt*9));camera.updateProjectionMatrix();
        // Seated chapters drift back to their framing after a focus push.
        if(restEye&&CHAPTERS[index].seated)camera.position.lerp(restEye,1-Math.exp(-dt*3));
        actors.forEach(a=>{if(a.chapter!==index)return;if(index===5)a.mesh.position.z=Math.min(-.8-Math.abs(a.seed-2)*.4,-3-Math.abs(a.seed-2)*.7+chapterTime*.24);animateBossMesh(a.mesh,time,index===5?1.5:0,false);});
        floaters.forEach(f=>{if(f.chapter!==index)return;f.mesh.position.y=f.base.y+Math.sin(time*.7+f.seed)*.1;});
      }updateInteraction();
    }
    if(busy&&el('screen-title').classList.contains('changing')&&renderer){
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
    clearAlerts();if(sound)OfficeAudio.stop();sound=false;
  }
  function finish(){if(!active)return;active=false;busy=false;dispose();el('screen-title').classList.remove('changing');el('btn-go-select').disabled=false;finishCallback();}
  function start(onFinish,showMenu=false){
    if(active)dispose();el('screen-title').classList.remove('with-howto');resetLookup();active=true;menuMode=showMenu;index=0;busy=false;time=0;last=0;finishCallback=onFinish;el('screen-title').classList.remove('changing');el('btn-go-select').disabled=false;el('intro-begin').disabled=false;el('intro-look').textContent='화면 클릭 · 시점 조작 / 드래그로 둘러보기';sound=true;OfficeAudio.setMuted(false);el('intro-sound').textContent='소리 끄기';el('intro-sound').setAttribute('aria-pressed','true');
    try{buildScene();}catch(error){console.warn('Prologue visual unavailable; story remains readable.',error);dispose();el('intro-canvas').textContent='';}
    updateChapter();el('screen-title').classList.toggle('with-menu',menuMode);if(menuMode){requestAnimationFrame(()=>el('intro-begin').focus());if(camera){groups.forEach((g,i)=>g.visible=i===3);camera.position.set(2.5,1.7,3.2);camera.lookAt(0,1.1,-.2);key.intensity=.6;fill.intensity=.5;applyEnvironment(true);
      menuBase={x:2.5,y:1.7,z:3.2,tx:0,ty:1.1,tz:-.2};pointX=pointY=leanX=leanY=menuTime=0;}}window.addEventListener('resize',resize);raf=requestAnimationFrame(frame);
  }
  let pendingSubmit=false;
  el('intro-player-name').addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();
    // This Enter is spent committing the Hangul syllable; submit as soon as it lands.
    if(e.isComposing||e.keyCode===229){pendingSubmit=true;return;}
    submitLookup();
  });
  /* Name, then a single pass over the controls, then the story. The overview is its
     own step so nobody starts chapter one still hunting for the interact key. */
  function openHowTo(){
    const stage=el('screen-title');
    stage.classList.remove('with-menu');stage.classList.add('with-howto');
    busy=true;requestAnimationFrame(()=>el('howto-go').focus());
  }
  function closeHowTo(){
    const stage=el('screen-title');if(!stage.classList.contains('with-howto'))return;
    stage.classList.remove('with-howto');stage.classList.add('changing');
    if(sound)OfficeAudio.event('paper');
    transitionTimer=setTimeout(()=>{
      menuMode=false;updateChapter();stage.classList.remove('changing');
      transitionTimer=setTimeout(()=>{busy=false;},500);
    },600);
  }
  el('howto-go').addEventListener('click',closeHowTo);

  /* The opening is scripted: wait, a text arrives on the phone, then you look your own
     result up on the recruitment site. The site is painted onto the laptop screen and
     the camera pushes in on it, so the typing happens in the world, not in a dialog. */
  let openingDone=false,screenFocus=false,lookupPhase='form',caretOn=true,caretClock=0,partyTime=0,partyClock=0;
  const EXAM_NO='2026-0417';
  function showPhone(on){el('screen-title').classList.toggle('with-phone',!!on);}
  function typedName(){return cleanName(el('intro-player-name').value);}

  /* Repaint the laptop with the current field contents. */
  function paintLookup(){
    const surface=documentSurfaces.find(s=>s.chapter===0);if(!surface||!scene)return;
    const next=IntroArt.texture(THREE,'lookup',playerName(),
      {examNo:EXAM_NO,typed:typedName(),phase:lookupPhase,caret:screenFocus&&caretOn,name:typedName(),t:partyTime});
    const old=surface.mesh.material.map;
    surface.mesh.material.map=next;surface.mesh.material.needsUpdate=true;
    surface.kind='lookup';
    if(old&&old!==artTextures.mailList&&old!==artTextures.offer&&old!==artTextures.offerArrived&&old!==artTextures.inbox)old.dispose();
  }
  function openLookup(){
    showPhone(false);screenFocus=true;lookupPhase='form';caretOn=true;caretClock=0;
    el('screen-title').classList.add('typing');
    busy=true;paintLookup();
    el('lookup-go').disabled=!typedName();
    requestAnimationFrame(()=>el('intro-player-name').focus());
  }
  function closeLookup(){screenFocus=false;el('screen-title').classList.remove('typing');el('intro-player-name').blur();}
  function resetLookup(){
    openingDone=false;screenFocus=false;lookupPhase='form';pendingSubmit=false;partyTime=partyClock=0;showPhone(false);
    el('screen-title').classList.remove('typing');
    el('intro-player-name').value='';el('lookup-go').disabled=true;
    el('intro-result').hidden=true;
    el('screen-title').classList.remove('with-lookup');
  }

  // Start shows the controls once, then the story opens on the waiting-for-results beat.
  el('intro-begin').addEventListener('click',()=>{
    if(!active||!menuMode||busy)return;
    el('intro-begin').disabled=true;
    if(sound){OfficeAudio.resume();OfficeAudio.room('bedroom');}
    openHowTo();
  });

  el('intro-player-name').addEventListener('input',()=>{
    if(!screenFocus)return;
    el('lookup-go').disabled=!typedName();caretOn=true;caretClock=0;paintLookup();
  });
  el('intro-player-name').addEventListener('compositionend',()=>{
    if(!screenFocus)return;
    el('lookup-go').disabled=!typedName();paintLookup();
    if(pendingSubmit){pendingSubmit=false;submitLookup();}
  });

  function submitLookup(){
    if(!active||openingDone||!screenFocus||lookupPhase!=='form')return;
    const name=typedName();
    if(!personalize(name)){caretOn=true;paintLookup();el('intro-player-name').focus();return;}
    lookupPhase='checking';paintLookup();
    if(sound)OfficeAudio.event('typing',6);
    transitionTimer=setTimeout(()=>{
      lookupPhase='congrats';partyTime=0;partyClock=0;paintLookup();
      el('intro-result').hidden=false;
      el('intro-result-line').textContent=`${name} · 수험번호 ${EXAM_NO}`;
      if(sound){OfficeAudio.event('promotion');OfficeAudio.burst(5);}
      transitionTimer=setTimeout(()=>{
        openingDone=true;closeLookup();busy=false;
        chapterTime=4*4.2;updateDialogue();          // "…진짜 됐네."
      },2600);
    },1200);
  }
  el('intro-entry').addEventListener('submit',e=>{e.preventDefault();submitLookup();});

  el('btn-go-select').addEventListener('click',move);el('intro-skip').addEventListener('click',finish);el('intro-sound').addEventListener('click',toggleSound);
  el('intro-canvas').addEventListener('click',()=>{
    if(screenFocus){if(typedName())submitLookup();else el('intro-player-name').focus();return;}
    if(active&&!menuMode&&renderer&&document.pointerLockElement!==renderer.domElement){const result=renderer.domElement.requestPointerLock();if(result&&result.catch)result.catch(()=>{});}});
  el('intro-canvas').addEventListener('pointerdown',()=>{dragging=true;});
  window.addEventListener('pointerup',()=>{dragging=false;});
  window.addEventListener('pointermove',e=>{
    if(!active||!menuMode)return;
    pointX=Math.max(-1,Math.min(1,(e.clientX/innerWidth-.5)*2));
    pointY=Math.max(-1,Math.min(1,(e.clientY/innerHeight-.5)*2));
  });
  window.addEventListener('pointerleave',()=>{pointX=pointY=0;});
  document.addEventListener('mousemove',e=>{if(!active||busy||menuMode||!camera||(!dragging&&document.pointerLockElement!==renderer.domElement))return;yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.15,1.15);});
  document.addEventListener('pointerlockchange',()=>{keys={};if(active)el('intro-look').textContent=document.pointerLockElement?'ESC · 마우스 해제':'화면 클릭 · 시점 조작 / 드래그로 둘러보기';});
  window.addEventListener('blur',()=>{keys={};dragging=false;});
  document.addEventListener('visibilitychange',()=>{keys={};});
  document.addEventListener('keydown',e=>{if(!active||busy||menuMode||e.altKey||e.ctrlKey||e.metaKey)return;if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys[e.code]=true;}if(!e.repeat&&e.code==='KeyR'){inspect=!inspect;el('screen-title').classList.toggle('inspecting',inspect);}if(!e.repeat&&(e.code==='KeyE'||(e.code==='Enter'&&!e.target.closest('button')))){e.preventDefault();move();}});
  document.addEventListener('keyup',e=>{delete keys[e.code];});
  root.OfficeIntro={start};
})(window);
