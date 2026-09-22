/* Sculpted, graphic office characters. No photographic skin or anatomical hand assets. */
const PALETTE3D = {
  identity: [
    {id:'round',label:'둥근 인상'}, {id:'square',label:'각진 인상'}, {id:'tall',label:'긴 인상'}, {id:'soft',label:'통통한 인상'}, {id:'slim',label:'갸름한 인상'},
  ],
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

function humanGeometry(data,T){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));g.setIndex(data.index);g.computeVertexNormals();return g;
}
// Continuous elliptical cross-sections, rather than separate balls for body parts.
function tailorGeometry(rings,T,segments=32){
  // Catmull-Rom interpolation removes stacked-ring ridges from the silhouette.
  const original=rings;rings=[];
  for(let k=0;k<original.length-1;k++)for(let j=0;j<4;j++){
    const t=j/4,a=original[Math.max(0,k-1)],b=original[k],c=original[k+1],d=original[Math.min(original.length-1,k+2)];
    const r=[];for(let n=0;n<5;n++){const p=a[n]||0,q=b[n]||0,u=c[n]||0,v=d[n]||0;r[n]=n===0?q+(u-q)*t:.5*((2*q)+(-p+u)*t+(2*p-5*q+4*u-v)*t*t+(-p+3*q-3*u+v)*t*t*t);}
    r[1]=Math.max(.001,r[1]);r[2]=Math.max(.001,r[2]);rings.push(r);
  }rings.push(original[original.length-1]);
  const p=[],uv=[],indices=[];
  rings.forEach(([y,rx,rz,cx=0,cz=0],j)=>{
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2;p.push(cx+rx*Math.sin(a),y,cz+rz*Math.cos(a));uv.push(i/segments,j/(rings.length-1));
      if(j && i){const n=j*(segments+1)+i;indices.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1);}
    }
  });
  if(rings[rings.length-1][0]<rings[0][0])for(let i=0;i<indices.length;i+=3){const t=indices[i];indices[i]=indices[i+2];indices[i+2]=t;}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function styleMaterial(T,color){return new T.MeshStandardMaterial({color,roughness:.88,metalness:0});}
function styleMesh(T,parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=false;parent.add(m);return m;}
function styleCurve(T,parent,points,material,r=.004){return styleMesh(T,parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,7,false),material);}
function stylePatch(T,parent,points,material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return styleMesh(T,parent,new T.ShapeGeometry(shape),material);}
function roundedShape(T,w,h,r=.03,depth=.025){
  const s=new T.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.007,bevelThickness:.006,bevelSegments:3,steps:1,curveSegments:12});g.translate(0,0,-depth/2);return g;
}
function stylizedHand(T,material,grip=false){
  // One continuous mitten silhouette with an integrated thumb, deliberately no exposed finger rig.
  const s=new T.Shape();s.moveTo(-.026,0);s.quadraticCurveTo(-.045,-.045,-.040,-.085);s.quadraticCurveTo(-.035,-.124,.006,-.121);s.quadraticCurveTo(.041,-.118,.042,-.080);s.quadraticCurveTo(.070,-.070,.060,-.044);s.quadraticCurveTo(.047,-.025,.030,-.034);s.lineTo(.025,0);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:grip?.050:.030,bevelEnabled:true,bevelSize:.012,bevelThickness:.010,bevelSegments:4,steps:1,curveSegments:16});g.translate(0,0,-.015);
  const group=new T.Group();styleMesh(T,group,g,material);return group;
}
function buildCoffeeCup(T){
  const g=new T.Group(),cream=styleMaterial(T,0xfff2dc),teal=styleMaterial(T,0x268d88),coffee=styleMaterial(T,0x633f2c);
  styleMesh(T,g,new T.CylinderGeometry(.073,.055,.20,40,1,true),cream);
  styleMesh(T,g,new T.CylinderGeometry(.067,.062,.071,40),teal,0,-.012,0);
  cream.side=T.DoubleSide;
  const bottom=styleMesh(T,g,new T.CircleGeometry(.055,40),cream,0,-.096,0);bottom.rotation.x=-Math.PI/2;
  const rim=styleMesh(T,g,new T.TorusGeometry(.070,.006,8,40),cream,0,.101,0);rim.rotation.x=Math.PI/2;
  const liquid=styleMesh(T,g,new T.CircleGeometry(.064,40),coffee,0,.094,0);liquid.rotation.x=-Math.PI/2;liquid.name='coffeeSurface';
  const logo=styleMesh(T,g,new T.CircleGeometry(.022,24),cream,0,-.010,.068);logo.rotation.x=.05;
  return g;
}
function buildProp3D(id,T){
  const g=new T.Group(),cream=styleMaterial(T,0xfff3dc),ink=styleMaterial(T,0x284454),coral=styleMaterial(T,0xe96c58);
  if(id==='coffee')return buildCoffeeCup(T);
  if(id==='paper'){
    styleMesh(T,g,roundedShape(T,.21,.28,.015),styleMaterial(T,0xd3a662));
    styleMesh(T,g,roundedShape(T,.175,.235,.005,.003),cream,0,-.008,.022);
    styleMesh(T,g,roundedShape(T,.07,.035,.008,.009),ink,0,.12,.031);
    for(let i=0;i<4;i++)styleMesh(T,g,new T.BoxGeometry(i===0?.105:.13,.006,.003),ink,0,.064-i*.027,.028);
  }else if(id==='megaphone'){
    const horn=styleMesh(T,g,new T.CylinderGeometry(.095,.034,.20,32,1,true),coral,0,.02,.06);horn.rotation.x=Math.PI/2;
    styleMesh(T,g,new T.CylinderGeometry(.018,.018,.11,16),ink,0,-.08,0);
    const edge=styleMesh(T,g,new T.TorusGeometry(.095,.009,8,32),cream,0,.02,-.04);
  }else if(id==='pacifier'){
    styleMesh(T,g,roundedShape(T,.10,.055,.026,.013),coral);
    styleMesh(T,g,new T.TorusGeometry(.025,.006,8,24),cream,0,-.008,.017);
  }else return null;
  return g;
}
function buildBossMesh(opts,T){
  const baby=!!opts.isBaby;
  const profiles={round:[1.1,.96,1.02,.90],square:[1.04,1.02,1.08,1.04],tall:[.89,1.14,.91,1.11],soft:[1.19,.94,1.20,.92],slim:[.90,1.04,.89,1.00]};
  const identity=opts.identity||'round',profile=profiles[identity]||profiles.round;
  const group=new T.Group(),root=new T.Group();group.add(root);
  const skin=styleMaterial(T,(PALETTE3D.skin.find(s=>s.id===opts.skin)||PALETTE3D.skin[0]).hex);
  const ink=styleMaterial(T,0x293647),white=styleMaterial(T,0xfff5e3),hairMat=styleMaterial(T,identity==='soft'?0x655047:identity==='slim'?0x293147:0x37313b);
  const cloth=styleMaterial(T,(PALETTE3D.outfit.find(s=>s.id===opts.outfit)||PALETTE3D.outfit[0]).hex);
  const trouser=styleMaterial(T,opts.outfit==='suit'?0x34435b:0x3e4d60),accent=styleMaterial(T,baby?0xffcb67:0xe78669);
  const add=(p,g,m,x=0,y=0,z=0)=>styleMesh(T,p,g,m,x,y,z);
  // Soft tapered jacket, shortened legs and broad hands share one illustration style.
  const torso=add(root,tailorGeometry([[.64,.001,.001],[.655,.18,.12],[.69,.22,.145],[.80,.228,.16],[.95,.245,.155],[1.075,.27,.14],[1.12,.25,.12],[1.16,.18,.095],[1.20,.065,.065]],T,48),cloth);
  const jacket=['suit','vest'].includes(opts.outfit);
  if(jacket){const shirt=stylePatch(T,root,[[-.072,1.17],[.072,1.17],[0,.89]],white);shirt.position.z=.163;
    for(const side of [-1,1]){const lapel=stylePatch(T,root,[[side*.065,1.17],[side*.167,1.10],[side*.12,1.04],[side*.14,1.00],[0,.86]],cloth);lapel.position.z=.173;}
  }
  const tie=new T.Group();tie.position.set(0,1.13,.184);root.add(tie);tie.visible=jacket;
  stylePatch(T,tie,[[-.017,0],[.017,0],[.028,-.19],[0,-.22],[-.028,-.19]],accent);
  for(const side of [-1,1]){const c=stylePatch(T,root,[[side*.06,1.195],[0,1.15],[side*.063,1.10],[side*.108,1.16]],white);c.position.z=.139;}
  if(!jacket)for(const y of [.76,.88,1.0])add(root,new T.SphereGeometry(.008,12,8),white,0,y,.163);
  add(root,roundedShape(T,.06,.082,.006,.006),white,.145,.985,.164);
  add(root,new T.BoxGeometry(.04,.008,.006),accent,.145,1.005,.173);
  const head=new T.Group();head.position.set(0,1.17,0);root.add(head);
  const headRings=[[0,.06,.065],[.05,.065,.065],[.075,.075,.078],[.095,.112,.10],[.14,.149,.117],[.22,.171,.132],[.30,.173,.133],[.375,.158,.128],[.425,.127,.105],[.455,.075,.06],[.468,.001,.001]];
  const geo=tailorGeometry(headRings,T,64),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(identity==='square' && y>.09 && y<.23)x*=1.12;
    // The nose is sculpted into the surface, not attached as a ball.
    if(z>0)z+=.040*Math.exp(-((x/.035)**2)-(((y-.225)/.041)**2));
    p.setXYZ(i,x*profile[0],y*profile[1],z);
  }
  geo.computeVertexNormals();add(head,geo,skin);
  const fy=v=>v*profile[1],eyeX=.069*profile[0],eyes=[];
  for(const side of [-1,1]){
    // Small ears have the same matte finish; eyes sit flush in the face.
    const ear=add(head,roundedShape(T,.044,.073,.025,.027),skin,side*.173*profile[0],fy(.245),.004);ear.rotation.y=side*.5;
    const eye=new T.Group();eye.position.set(side*eyeX,fy(.285),.129);head.add(eye);eyes.push(eye);
    const sclera=add(eye,roundedShape(T,.054,opts.face==='smug'?.024:.036,.017,.002),white);sclera.rotation.y=side*.13;
    add(eye,new T.SphereGeometry(.011,16,12),ink,-side*.003,0,.010).scale.set(.75,1,.32);
    add(eye,new T.SphereGeometry(.0035,8,6),white,-side*.003-.003,.005,.014);
    const angry=opts.face==='angry',raised=opts.face==='sparkle'||opts.face==='screaming';
    styleCurve(T,head,[[side*(eyeX-.027),fy(.326)+(angry?-.012:raised?.012:0),.135],[side*eyeX,fy(.338)+(raised?.01:0),.139],[side*(eyeX+.031),fy(.327)+(angry?.007:0),.123]],hairMat,.007);
    const cheek=add(head,new T.CircleGeometry(.021,24),styleMaterial(T,0xe9a089),side*.113*profile[0],fy(.218),.110);cheek.rotation.y=side*.35;
  }
  const mouthY=fy(.158);
  if(opts.face==='screaming'){
    add(head,roundedShape(T,.061,.065,.025,.001),styleMaterial(T,0x794958),0,mouthY,.120);
    add(head,roundedShape(T,.043,.011,.004,.001),white,0,mouthY+.022,.129);
  }else styleCurve(T,head,[[-.037,mouthY+.008,.124],[0,mouthY-(opts.face==='angry'?-.006:.010),.130],[.040,mouthY+(opts.face==='smug'?.025:.008),.124]],styleMaterial(T,0x87545b),.004);
  if(identity==='round'||opts.face==='sparkle'){
    for(const side of [-1,1]){const r=add(head,new T.TorusGeometry(.039,.004,8,36),ink,side*eyeX,fy(.285),.150);r.scale.y=.76;}
    styleCurve(T,head,[[-.028,fy(.287),.152],[0,fy(.295),.161],[.028,fy(.287),.152]],ink,.003);
  }
  if(opts.hair!=='bald'){
    // A single shaped scalp with a continuous hairline; each style has a distinct silhouette.
    const hp=[],hu=[],hi=[],rows=18,segments=64;
    for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,front=Math.cos(a),edge=front>0?.345+.025*Math.sin(a*2+.7):opts.hair==='mullet'?.10:.225;
      const t=j/rows,y=edge+(.484-edge)*t,sy=Math.min(.468,y-.016);
      let k=1;while(k<headRings.length-1 && headRings[k][0]<sy)k++;
      const ra=headRings[k-1],rb=headRings[k],mix=Math.max(0,Math.min(1,(sy-ra[0])/(rb[0]-ra[0])));
      const rx=(ra[1]+(rb[1]-ra[1])*mix)*1.10+.006,rz=(ra[2]+(rb[2]-ra[2])*mix)*1.10+.006;
      let x=Math.sin(a)*rx*profile[0],z=Math.cos(a)*rz,yy=y*profile[1];
      if(opts.hair==='comb'){x+=.031*t;yy+=.032*t*(.7+Math.sin(a)*.3);}
      if(opts.hair==='perm'){const wave=1+.08*Math.sin(a*9+j*.9);x*=1.15*wave;z*=1.15*wave;yy+=.027*t;}
      if(opts.hair==='spiky')yy+=t*.045+Math.sin(a*7)**2*.021*Math.sin(t*Math.PI);
      if(opts.hair==='mullet'){x*=1.08;z*=1.10;}
      hp.push(x,yy,z-.004);hu.push(i/segments,t);
      if(j&&i){const n=j*(segments+1)+i;hi.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1);}
    }
    const h=new T.BufferGeometry();h.setAttribute('position',new T.Float32BufferAttribute(hp,3));h.setAttribute('uv',new T.Float32BufferAttribute(hu,2));h.setIndex(hi);h.computeVertexNormals();add(head,h,hairMat);
  }
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.255,1.095,0);root.add(arm);
    const sleeve=opts.outfit==='vest'?white:cloth;
    // One skinned sleeve, smoothly weighted through its elbow instead of detached tubes.
    const sleeveGeo=tailorGeometry([[.034,.001,.001],[.025,.049,.060],[0,.075,.08],[-.09,.069,.068],[-.20,.058,.055],[-.26,.051,.048],[-.36,.044,.042],[-.44,.036,.036]],T,32);
    const sp=sleeveGeo.attributes.position,indices=[],weights=[];
    for(let i=0;i<sp.count;i++){const t=T.MathUtils.smoothstep(-sp.getY(i),.15,.29);indices.push(0,1,0,0);weights.push(1-t,t,0,0);}
    sleeveGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));sleeveGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skinned=new T.SkinnedMesh(sleeveGeo,sleeve),upper=new T.Bone(),elbow=new T.Bone();elbow.position.y=-.22;upper.add(elbow);skinned.add(upper);skinned.bind(new T.Skeleton([upper,elbow]));skinned.castShadow=true;arm.add(skinned);
    add(elbow,tailorGeometry([[-.207,.037,.037],[-.237,.036,.036]],T),white);
    const hand=stylizedHand(T,skin,side===1&&opts.prop!=='none');hand.position.y=-.23;elbow.add(hand);
    const holding=side===1 && opts.prop!=='none' && opts.prop!=='pacifier';
    if(holding){const prop=buildProp3D(opts.prop,T);if(prop){prop.position.set(-.015,-.034,.058);hand.add(prop);if(opts.prop==='paper'){hand.rotation.x=.72;hand.children[0].position.x=.084;prop.position.x=0;const thumb=add(hand,roundedShape(T,.033,.050,.016,.013),skin,.085,-.036,.086);}}}
    const hip=new T.Group();hip.position.set(side*.105,.69,0);root.add(hip);
    const legGeo=tailorGeometry([[.035,.091,.115],[0,.10,.115],[-.13,.085,.092],[-.29,.073,.073],[-.40,.064,.068],[-.54,.059,.060],[-.60,.062,.065]],T,32);
    const lp=legGeo.attributes.position,li=[],lw=[];for(let i=0;i<lp.count;i++){const t=T.MathUtils.smoothstep(-lp.getY(i),.22,.38);li.push(0,1,0,0);lw.push(1-t,t,0,0);}
    legGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(li,4));legGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(lw,4));
    const leg=new T.SkinnedMesh(legGeo,trouser),thigh=new T.Bone(),knee=new T.Bone();knee.position.y=-.30;thigh.add(knee);leg.add(thigh);leg.bind(new T.Skeleton([thigh,knee]));leg.castShadow=true;hip.add(leg);
    const shoe=add(knee,roundedShape(T,.137,.105,.040,.21),ink,0,-.335,.036);shoe.rotation.x=-.04;
    limbs.push({arm,elbow,hip,knee,side,holding});
  }
  if(opts.prop==='pacifier'){const p=buildProp3D('pacifier',T);p.position.set(0,mouthY,.145);head.add(p);}
  root.scale.set(profile[2],profile[3],1);
  if(baby){group.scale.setScalar(.64);head.scale.setScalar(1.15);root.scale.set(1.05,.90,1);}
  group.userData={root,head,limbs,tie,eyes,isBaby:baby,identity,headY:baby?1.02:1.68*profile[3],phase:0,lastTime:null};return group;
}
function animateBossMesh(mesh,time,speed,stunned){
  const d=mesh.userData,dt=d.lastTime===null?0:Math.min(.05,Math.max(0,time-d.lastTime));d.lastTime=time;
  d.phase+=dt*(d.isBaby?18:12)*Math.min(1,speed/2.8);const p=d.phase,run=Math.min(1,speed/3);
  d.root.rotation.x=stunned?-.04:run*.07;d.root.position.y=stunned?0:Math.abs(Math.sin(p))*run*.022;
  d.head.rotation.y=Math.sin(time*1.3)*.035;d.head.rotation.z=stunned?Math.sin(time*13)*.06:0;
  for(const l of d.limbs){l.arm.rotation.set(l.holding?-.22:stunned?-.6:Math.sin(p)*l.side*.48*run,0,l.side*.06);l.elbow.rotation.x=l.holding?-.90:stunned?-1:-.18-run*.5;l.hip.rotation.x=stunned?0:-Math.sin(p)*l.side*.6*run;l.knee.rotation.x=stunned?0:Math.max(0,Math.sin(p)*l.side)*.8*run;}
  d.tie.rotation.x=-Math.abs(Math.sin(p+1))*.12*run;
}
function randomAvatarOpts3D(isBaby,index){
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)].id;
  return {identity:index===undefined?pick(PALETTE3D.identity):PALETTE3D.identity[index%5].id,skin:pick(PALETTE3D.skin),hair:index===undefined?pick(PALETTE3D.hair):PALETTE3D.hair[(index+1)%5].id,outfit:isBaby?'hanbok':index===undefined?pick(PALETTE3D.outfit):PALETTE3D.outfit[index%4].id,face:pick(PALETTE3D.face),prop:pick(PALETTE3D.prop),isBaby};
}
