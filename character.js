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
function styleMaterial(T,color,finish={}){return new T.MeshStandardMaterial({color,roughness:.74,metalness:0,...finish});}
function styleMesh(T,parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=false;parent.add(m);return m;}
function styleCurve(T,parent,points,material,r=.004){return styleMesh(T,parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(6,Math.min(20,points.length*4)),r,6,false),material);}
function stylePatch(T,parent,points,material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return styleMesh(T,parent,new T.ShapeGeometry(shape),material);}
function roundedShape(T,w,h,r=.03,depth=.025){
  const s=new T.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:Math.min(.007,r*.34,w*.12,h*.12),bevelThickness:Math.min(.006,depth*.4),bevelSegments:3,steps:1,curveSegments:10});g.translate(0,0,-depth/2);return g;
}
// A tiny, shared weave gives close-ups fabric grain without any downloaded assets.
const characterWeaves=new WeakMap();
function characterFabric(T,color){
  let weave=characterWeaves.get(T);
  if(!weave){
    const size=64,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=(y*size+x)*4,value=125+(((x&3)<2)^((y&3)<2)?24:-24)+((x*17+y*29)%11);
      data[k]=data[k+1]=data[k+2]=value;data[k+3]=255;
    }
    weave=new T.DataTexture(data,size,size,T.RGBAFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;
    weave.repeat.set(7,7);weave.magFilter=T.LinearFilter;weave.minFilter=T.LinearMipmapLinearFilter;weave.generateMipmaps=true;weave.needsUpdate=true;
    characterWeaves.set(T,weave);
  }
  return styleMaterial(T,color,{roughness:.86,bumpMap:weave,bumpScale:.0011});
}
// Combine fixed details by material inside each joint. Articulation, named props
// and the small public groups stay intact while tailoring does not multiply draws.
function batchCharacterDetails(parent,T){
  for(const child of [...parent.children])if(child.children.length)batchCharacterDetails(child,T);
  const batches=new Map();
  for(const mesh of parent.children){
    if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.children.length||mesh.name||!mesh.visible||Array.isArray(mesh.material))continue;
    const key=mesh.material;
    if(!batches.has(key))batches.set(key,[]);
    batches.get(key).push(mesh);
  }
  for(const [material,meshes]of batches){
    if(meshes.length<2)continue;
    const positions=[],normals=[],uvs=[],colors=[],indices=[];
    for(const mesh of meshes){
      mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,c=g.attributes.color,offset=positions.length/3;
      for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv?uv.getX(i):0,uv?uv.getY(i):0);if(material.vertexColors)colors.push(c?c.getX(i):1,c?c.getY(i):1,c?c.getZ(i):1);}
      if(g.index)for(let i=0;i<g.index.count;i++)indices.push(offset+g.index.getX(i));
      else for(let i=0;i<p.count;i++)indices.push(offset+i);
      g.dispose();parent.remove(mesh);mesh.geometry.dispose();
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));if(colors.length)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);
    styleMesh(T,parent,g,material);
  }
}
function stylizedHand(T,material,grip=false){
  // One continuous mitten silhouette with an integrated thumb, deliberately no exposed finger rig.
  const s=new T.Shape();s.moveTo(-.026,0);s.quadraticCurveTo(-.045,-.045,-.040,-.085);s.quadraticCurveTo(-.035,-.124,.006,-.121);s.quadraticCurveTo(.041,-.118,.042,-.080);s.quadraticCurveTo(.070,-.070,.060,-.044);s.quadraticCurveTo(.047,-.025,.030,-.034);s.lineTo(.025,0);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:grip?.050:.030,bevelEnabled:true,bevelSize:.012,bevelThickness:.010,bevelSegments:4,steps:1,curveSegments:16});g.translate(0,0,-.015);
  const group=new T.Group();styleMesh(T,group,g,material);return group;
}
function buildCoffeeCup(T){
  const g=new T.Group(),cream=styleMaterial(T,0xfff2dc,{roughness:.55}),teal=characterFabric(T,0x286862),coffee=styleMaterial(T,0x3a2014,{roughness:.22}),print=styleMaterial(T,0xd6ba81);
  styleMesh(T,g,new T.CylinderGeometry(.073,.055,.20,40,1,true),cream);
  styleMesh(T,g,new T.CylinderGeometry(.067,.062,.071,40),teal,0,-.012,0);
  cream.side=T.DoubleSide;
  const bottom=styleMesh(T,g,new T.CircleGeometry(.055,40),cream,0,-.096,0);bottom.rotation.x=-Math.PI/2;
  const rim=styleMesh(T,g,new T.TorusGeometry(.070,.006,8,40),cream,0,.101,0);rim.rotation.x=Math.PI/2;
  const liquid=styleMesh(T,g,new T.CircleGeometry(.064,40),coffee,0,.094,0);liquid.rotation.x=-Math.PI/2;liquid.name='coffeeSurface';
  const logo=styleMesh(T,g,new T.CircleGeometry(.022,24),cream,0,-.010,.068);logo.rotation.x=.05;
  for(const side of [-1,1]){const leaf=styleMesh(T,g,new T.SphereGeometry(.010,10,8),teal,side*.006,-.01,.070);leaf.scale.set(.42,1,.14);leaf.rotation.z=-side*.45;}
  for(const y of [-.049,.027]){const band=styleMesh(T,g,new T.TorusGeometry(y>0?.065:.060,.0015,5,32),print,0,y,0);band.rotation.x=Math.PI/2;}
  batchCharacterDetails(g,T);
  return g;
}
function buildProp3D(id,T){
  const g=new T.Group(),cream=styleMaterial(T,0xfff3dc),ink=styleMaterial(T,0x284454),coral=styleMaterial(T,0xc56449),metal=styleMaterial(T,0xb8c5cb,{roughness:.28,metalness:.8});
  if(id==='coffee')return buildCoffeeCup(T);
  if(id==='paper'){
    styleMesh(T,g,roundedShape(T,.21,.28,.015),characterFabric(T,0x916b3f));
    styleMesh(T,g,roundedShape(T,.181,.241,.005,.003),styleMaterial(T,0xd9d4c2),.003,-.010,.018);
    styleMesh(T,g,roundedShape(T,.175,.235,.005,.003),cream,0,-.008,.022);
    styleMesh(T,g,roundedShape(T,.07,.035,.008,.009),metal,0,.12,.031);
    styleMesh(T,g,roundedShape(T,.048,.008,.003,.002),ink,0,.124,.039);
    for(let i=0;i<5;i++)styleMesh(T,g,new T.BoxGeometry(i===0?.085:.125,.003,.001),ink,i===0?-.021:0,.065-i*.023,.028);
    const stamp=styleMesh(T,g,new T.TorusGeometry(.019,.002,5,24),coral,.04,-.080,.029);stamp.rotation.z=.17;
    styleCurve(T,g,[[-.060,-.080,.029],[-.044,-.068,.029],[-.049,-.087,.029],[-.020,-.075,.029]],ink,.0018);
  }else if(id==='megaphone'){
    const horn=styleMesh(T,g,new T.CylinderGeometry(.095,.034,.20,32,1,true),coral,0,.02,.06);horn.rotation.x=Math.PI/2;
    styleMesh(T,g,new T.CylinderGeometry(.018,.018,.11,16),ink,0,-.08,0);
    const edge=styleMesh(T,g,new T.TorusGeometry(.095,.009,8,32),cream,0,.02,-.04);
    const inner=styleMesh(T,g,new T.ConeGeometry(.044,.12,24),ink,0,.02,.025);inner.rotation.x=-Math.PI/2;
    styleMesh(T,g,roundedShape(T,.027,.021,.005,.007),metal,0,-.035,.045);
  }else if(id==='pacifier'){
    styleMesh(T,g,roundedShape(T,.10,.055,.026,.013),coral);
    styleMesh(T,g,new T.TorusGeometry(.025,.006,8,24),cream,0,-.008,.017);
  }else return null;
  batchCharacterDetails(g,T);return g;
}
function buildBossMesh(opts,T){
  const baby=!!opts.isBaby;
  // Face proportions stay close to human variation. Build shape locally instead of
  // stretching the skeleton, eyes, hands, hair and held objects together.
  const profiles={round:[1.012,1,.004,.995],square:[1.008,1.004,.003,1.01],tall:[.992,1.025,-.004,1.025],soft:[1.008,1,.014,1],slim:[.986,1.01,-.008,1.01]};
  const identity=opts.identity||'round',profile=profiles[identity]||profiles.round;
  const group=new T.Group(),root=new T.Group();group.add(root);
  const skinColor=(PALETTE3D.skin.find(s=>s.id===opts.skin)||PALETTE3D.skin[0]).hex;
  const skin=styleMaterial(T,skinColor,{roughness:.58,vertexColors:true});
  const skinShade=styleMaterial(T,new T.Color(skinColor).multiplyScalar(.81),{roughness:.66});
  const ink=styleMaterial(T,0x24313c),white=styleMaterial(T,0xf4eee1,{roughness:.66}),hairColor=identity==='soft'?0x514239:identity==='slim'?0x242833:0x332b29;
  const hairMat=styleMaterial(T,hairColor,{roughness:.42}),hairLight=styleMaterial(T,new T.Color(hairColor).multiplyScalar(1.18),{roughness:.48});
  const clothColor=(PALETTE3D.outfit.find(s=>s.id===opts.outfit)||PALETTE3D.outfit[0]).hex;
  const cloth=characterFabric(T,clothColor),lapelMat=characterFabric(T,new T.Color(clothColor).multiplyScalar(.82));
  const seamMat=styleMaterial(T,new T.Color(clothColor).multiplyScalar(1.3),{roughness:.9});
  const trouser=characterFabric(T,opts.outfit==='suit'?0x29394c:0x35424c),accent=characterFabric(T,baby?0xeec76b:0xb75d46);
  const leather=styleMaterial(T,0x1b252c,{roughness:.38}),metal=styleMaterial(T,0xb8b4a2,{roughness:.3,metalness:.72});
  const add=(p,g,m,x=0,y=0,z=0)=>styleMesh(T,p,g,m,x,y,z);
  // Tailored shoulder, waist and hem silhouettes are sculpted locally. No whole
  // character axis is stretched, so heads, hands and held objects keep their shape.
  const fullness=baby?profile[2]*.45:profile[2];
  const belly=y=>Math.exp(-(((y-.84)/.19)**2));
  const torsoRings=[[.655,.001,.001],[.666,.171,.111],[.69,.194,.132],[.80,.192,.143],[.95,.213,.147],[1.075,.239,.132],[1.12,.219,.113],[1.16,.157,.087],[1.20,.062,.065]];
  const torso=add(root,tailorGeometry(torsoRings.map(([y,x,z])=>[y,x+(x>.1?fullness*.2*belly(y):0),z+(z>.09?fullness*.9*belly(y):0)]),T,48),cloth);
  const frontAt=(x,y)=>{
    let n=1;while(n<torsoRings.length-1&&torsoRings[n][0]<y)n++;
    const a=torsoRings[n-1],b=torsoRings[n],t=T.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1),rx=a[1]+(b[1]-a[1])*t,rz=a[2]+(b[2]-a[2])*t;
    return rz*Math.sqrt(Math.max(.10,1-(x/rx)**2));
  };
  const sewnPatch=(points,material,lift=.008)=>{
    const patch=stylePatch(T,root,points,material),attr=patch.geometry.attributes.position;
    for(let i=0;i<attr.count;i++)attr.setZ(i,frontAt(attr.getX(i),attr.getY(i))+lift);
    attr.needsUpdate=true;patch.geometry.computeVertexNormals();return patch;
  };
  const jacket=['suit','vest'].includes(opts.outfit);
  if(jacket){sewnPatch([[-.074,1.17],[.074,1.17],[0,.89]],white,.005);
    for(const side of [-1,1]){
      const pts=opts.outfit==='vest'?[[side*.075,1.17],[side*.121,1.13],[side*.099,.98],[0,.86]]:[[side*.065,1.17],[side*.157,1.105],[side*.115,1.047],[side*.137,1.015],[0,.86]];
      sewnPatch(pts,lapelMat,.012);
      styleCurve(T,root,[[side*.061,1.16],[side*.106,1.08],[side*.089,1.0],[side*.017,.894]].map(([x,y])=>[x,y,frontAt(x,y)+.015]),seamMat,.0016);
      const pocket=add(root,roundedShape(T,.089,.017,.004,.006),lapelMat,side*.124,.789,frontAt(side*.124,.789)+.006);pocket.rotation.y=side*.48;
      styleCurve(T,root,[[side*.169,.708,.075],[side*.107,.685,.122],[side*.018,.689,.136]],seamMat,.0015);
    }
    for(const y of [.86,.785])add(root,new T.SphereGeometry(.008,10,8),metal,.018,y,.151);
    styleCurve(T,root,[[.018,.859,.149],[.015,.761,.143],[.006,.695,.136]],lapelMat,.003);
  }
  const tie=new T.Group();tie.position.set(0,1.13,.133);root.add(tie);tie.visible=jacket;
  const tieBlade=stylePatch(T,tie,[[-.013,0],[.013,0],[.023,-.185],[0,-.21],[-.023,-.185]],accent),tiePosition=tieBlade.geometry.attributes.position;
  for(let i=0;i<tiePosition.count;i++)tiePosition.setZ(i,frontAt(tiePosition.getX(i),1.13+tiePosition.getY(i))+.020-tie.position.z);
  tiePosition.needsUpdate=true;tieBlade.geometry.computeVertexNormals();
  const knot=add(tie,roundedShape(T,.033,.029,.007,.016),accent,0,.004,.006);knot.rotation.z=.04;
  for(let i=0;i<4;i++)styleCurve(T,tie,[[-.011-i*.002,-.047-i*.037],[.015+i*.002,-.033-i*.037]].map(([x,y])=>[x,y,frontAt(x,1.13+y)+.022-tie.position.z]),seamMat,.0016);
  for(const side of [-1,1])sewnPatch([[side*.052,1.195],[0,1.15],[side*.052,1.104],[side*.095,1.16]],white,.017);
  if(!jacket){
    styleCurve(T,root,[[0,.70,.135],[0,.83,.149],[0,1.08,.141]],seamMat,.003);
    for(const y of [.76,.88,1.0])add(root,new T.SphereGeometry(.006,10,8),white,0,y,.153);
    const pocket=add(root,roundedShape(T,.084,.087,.010,.004),cloth,-.125,.988,.132);pocket.rotation.y=-.16;
    styleCurve(T,root,[[-.163,1.028,.129],[-.12,1.023,.149],[-.086,1.028,.149]],seamMat,.002);
  }
  // A clipped, legible badge rather than a large floating white block.
  const badge=new T.Group();badge.position.set(.132,.992,frontAt(.132,.992)+.010);badge.rotation.y=.38;badge.rotation.z=-.035;root.add(badge);
  add(badge,roundedShape(T,.055,.075,.004,.005),white);
  add(badge,roundedShape(T,.019,.014,.003,.006),metal,0,.043,0);
  add(badge,new T.BoxGeometry(.044,.012,.002),accent,0,.026,.005);
  add(badge,roundedShape(T,.017,.021,.002,.001),lapelMat,-.012,.002,.006);
  for(const y of [.004,-.006,-.024])add(badge,new T.BoxGeometry(y===-.024?.038:.016,.002,.001),ink,y===-.024?0:.012,y,.006);
  const head=new T.Group();head.position.set(0,1.17,0);root.add(head);
  const headRings=[[0,.06,.065],[.05,.065,.065],[.075,.075,.078],[.095,.112,.10],[.14,.149,.117],[.22,.171,.132],[.30,.173,.133],[.375,.158,.128],[.425,.127,.105],[.455,.075,.06],[.468,.001,.001]];
  const geo=tailorGeometry(headRings,T,64),p=geo.attributes.position,skinColors=[];
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(identity==='square')x*=1+.055*Math.exp(-(((y-.16)/.065)**2));
    if(identity==='soft'||identity==='round')z*=1+.025*Math.exp(-(((y-.23)/.065)**2));
    // The nose is sculpted into the surface, not attached as a ball.
    if(z>0){
      z+=.039*Math.exp(-((x/.029)**2)-(((y-.225)/.038)**2));
      z+=.009*Math.exp(-(((Math.abs(x)-.103)/.05)**2)-(((y-.211)/.05)**2));
      z-=.004*Math.exp(-(((Math.abs(x)-.066)/.036)**2)-(((y-.284)/.032)**2));
    }
    p.setXYZ(i,x*profile[0],y*profile[1],z);
    const blush=z>0?Math.exp(-(((Math.abs(x)-.105)/.046)**2)-(((y-.221)/.038)**2))*.16:0;
    const neckShade=y<.08?.92:1;skinColors.push(neckShade,neckShade*(1-blush),neckShade*(1-blush*.86));
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(skinColors,3));geo.computeVertexNormals();add(head,geo,skin);
  const fy=v=>v*profile[1],eyeX=.069*profile[0],eyes=[];
  for(const side of [-1,1]){
    // Small ears have the same matte finish; eyes sit flush in the face.
    const ear=add(head,roundedShape(T,.033,.067,.018,.025),skin,side*.173*profile[0],fy(.245),.002);ear.rotation.y=side*.5;
    const innerEar=add(head,roundedShape(T,.013,.037,.006,.002),skinShade,side*.181*profile[0],fy(.246),.019);innerEar.rotation.y=side*.5;
    const eye=new T.Group();eye.position.set(side*eyeX,fy(.285),.129);head.add(eye);eyes.push(eye);
    const eyeWhite=styleMaterial(T,0xf5f1e9,{roughness:.26}),irisMat=styleMaterial(T,0x604638,{roughness:.32});
    const eyeHeight=opts.face==='smug'?.023:.030;
    const sclera=add(eye,roundedShape(T,.052,eyeHeight,.012,.003),eyeWhite);sclera.rotation.y=side*.13;
    add(eye,new T.SphereGeometry(.0107,14,10),irisMat,-side*.003,0,.004).scale.set(.78,1,.46);
    add(eye,new T.SphereGeometry(.0058,10,8),ink,-side*.003,0,.009).scale.set(.84,1,.35);
    add(eye,new T.SphereGeometry(.0026,8,6),eyeWhite,-side*.003-.002,.004,.012);
    styleCurve(T,eye,[[-.025,0,.002],[-.013,eyeHeight*.48,.004],[.01,eyeHeight*.49,.004],[.025,0,.002]],skinShade,.0027);
    styleCurve(T,eye,[[-.022,-.006,.001],[0,-eyeHeight*.48,.003],[.022,-.005,.001]],skin,.0023);
    const angry=opts.face==='angry',raised=opts.face==='sparkle'||opts.face==='screaming';
    styleCurve(T,head,[[side*(eyeX-.027),fy(.326)+(angry?-.012:raised?.012:0),.135],[side*eyeX,fy(.338)+(raised?.01:0),.139],[side*(eyeX+.031),fy(.327)+(angry?.007:0),.123]],hairMat,.007);
  }
  const mouthY=fy(.158);
  if(opts.face==='screaming'){
    add(head,roundedShape(T,.061,.065,.025,.001),styleMaterial(T,0x794958),0,mouthY,.120);
    add(head,roundedShape(T,.043,.011,.004,.001),white,0,mouthY+.022,.129);
  }else{
    styleCurve(T,head,[[-.031,mouthY+.006,.121],[0,mouthY-(opts.face==='angry'?-.006:.008),.130],[.034,mouthY+(opts.face==='smug'?.020:.006),.122]],styleMaterial(T,0x815447),.0031);
    styleCurve(T,head,[[-.019,mouthY-.013,.123],[0,mouthY-.017,.127],[.020,mouthY-.012,.123]],skinShade,.0018);
  }
  if(identity==='round'||opts.face==='sparkle'){
    for(const side of [-1,1]){const r=add(head,new T.TorusGeometry(.038,.003,7,32),metal,side*eyeX,fy(.285),.148);r.scale.y=.77;styleCurve(T,head,[[side*(eyeX+.035),fy(.285),.143],[side*.162,fy(.285),.099],[side*.174,fy(.264),.008]],ink,.0025);}
    styleCurve(T,head,[[-.028,fy(.287),.152],[0,fy(.295),.161],[.028,fy(.287),.152]],ink,.003);
  }
  if(opts.hair!=='bald'){
    // A single shaped scalp with a continuous hairline; each style has a distinct silhouette.
    const hp=[],hu=[],hi=[],rows=24,segments=64;
    for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,front=Math.cos(a),frontBlend=T.MathUtils.smoothstep(front,-.20,.50),backEdge=opts.hair==='mullet'?.115:.235;
      const edge=backEdge+(.350+.020*Math.sin(a*2+.7)-backEdge)*frontBlend;
      const t=j/rows,y=edge+(.484-edge)*t,sy=Math.min(.468,y-.016);
      let k=1;while(k<headRings.length-1 && headRings[k][0]<sy)k++;
      const ra=headRings[k-1],rb=headRings[k],mix=Math.max(0,Math.min(1,(sy-ra[0])/(rb[0]-ra[0])));
      const ridge=1+.012*Math.cos(a*11+t*5)*Math.sin(t*Math.PI);
      const rx=((ra[1]+(rb[1]-ra[1])*mix)*1.10+.004)*ridge,rz=((ra[2]+(rb[2]-ra[2])*mix)*1.10+.004)*ridge;
      let x=Math.sin(a)*rx*profile[0],z=Math.cos(a)*rz,yy=y*profile[1];
      if(opts.hair==='comb'){x+=.031*t;yy+=.032*t*(.7+Math.sin(a)*.3);}
      if(opts.hair==='perm'){const wave=1+.035*Math.sin(a*9+j*.9);x*=1.035*wave;z*=1.05*wave;yy+=.027*t;}
      if(opts.hair==='spiky')yy+=t*.045+Math.sin(a*7)**2*.021*Math.sin(t*Math.PI);
      if(opts.hair==='mullet'){x*=1.08;z*=1.10;}
      hp.push(x,yy,z-.004);hu.push(i/segments,t);
      if(j&&i){const n=j*(segments+1)+i;hi.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1);}
    }
    const h=new T.BufferGeometry();h.setAttribute('position',new T.Float32BufferAttribute(hp,3));h.setAttribute('uv',new T.Float32BufferAttribute(hu,2));h.setIndex(hi);h.computeVertexNormals();add(head,h,hairMat);
    // Follow the actual scalp vertices so the part and combed ridges never float.
    if(opts.hair==='comb'||opts.hair==='mullet')for(let strand=0;strand<6;strand++){
      const points=[];
      for(let row=1;row<=18;row+=3){
        const column=(segments-8+strand*3+Math.round(row*.23))%segments,k=(row*(segments+1)+column)*3;
        points.push([hp[k]*1.008,hu[(row*(segments+1)+column)*2+1]>.7?hp[k+1]+.001:hp[k+1],hp[k+2]*1.008]);
      }
      styleCurve(T,head,points,hairLight,strand===2?.0022:.0015);
    }
    if(opts.hair==='perm')for(let curl=0;curl<9;curl++){
      const column=(segments-12+curl*3)%segments,row=5+(curl%3)*3,k=(row*(segments+1)+column)*3;
      const lock=add(head,new T.SphereGeometry(.026,12,8),curl%3?hairMat:hairLight,hp[k],hp[k+1],hp[k+2]);lock.scale.set(1,.73,.54);lock.rotation.z=(curl%3-1)*.35;
    }
  }
  // Move sewn details with the jacket surface; keep their own dimensions intact.
  root.children.forEach(part=>{
    if(part===torso||part===head)return;
    if(part===tie){part.position.z+=Math.max(0,fullness)*.45;return;}
    if(part.geometry){const attr=part.geometry.attributes.position;
      for(let i=0;i<attr.count;i++){const worldY=attr.getY(i)+part.position.y;attr.setZ(i,attr.getZ(i)+fullness*.8*belly(worldY));}
      attr.needsUpdate=true;part.geometry.computeVertexNormals();
    }
  });
  const limbs=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*(.244+Math.max(0,fullness)*.06),1.095,0);root.add(arm);
    const sleeve=opts.outfit==='vest'?white:cloth;
    // One skinned sleeve, smoothly weighted through its elbow instead of detached tubes.
    const sleeveRings=opts.outfit==='golf'?[[.034,.001,.001],[.025,.049,.056],[0,.068,.073],[-.09,.063,.063],[-.18,.054,.050],[-.205,.052,.049]]:[[.034,.001,.001],[.025,.049,.056],[0,.068,.073],[-.09,.063,.063],[-.20,.053,.051],[-.26,.047,.045],[-.36,.041,.039],[-.44,.034,.034]];
    const sleeveGeo=tailorGeometry(sleeveRings,T,28);
    const sp=sleeveGeo.attributes.position,indices=[],weights=[];
    for(let i=0;i<sp.count;i++){const t=T.MathUtils.smoothstep(-sp.getY(i),.15,.29);indices.push(0,1,0,0);weights.push(1-t,t,0,0);}
    sleeveGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));sleeveGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
    const skinned=new T.SkinnedMesh(sleeveGeo,sleeve),upper=new T.Bone(),elbow=new T.Bone();elbow.position.y=-.22;upper.add(elbow);skinned.add(upper);skinned.bind(new T.Skeleton([upper,elbow]));skinned.castShadow=true;arm.add(skinned);
    if(opts.outfit==='golf'){
      add(elbow,tailorGeometry([[.020,.049,.047],[-.03,.045,.043],[-.13,.037,.034],[-.235,.031,.030]],T,24),skin);
      add(arm,tailorGeometry([[-.194,.055,.052],[-.21,.055,.052]],T,24),lapelMat);
    }else{
      add(elbow,tailorGeometry([[-.207,.035,.035],[-.237,.034,.034]],T,24),white);
      add(elbow,new T.SphereGeometry(.005,8,6),metal,side*.027,-.222,.024);
      for(let b=0;b<2;b++)add(elbow,new T.SphereGeometry(.004,8,6),metal,side*.033,-.168+b*.025,.023);
    }
    // Small cuff, seam and a watch give the hand a finished wrist transition.
    if(side===-1){
      add(elbow,tailorGeometry([[-.239,.035,.033],[-.258,.035,.033]],T,20),leather);
      add(elbow,roundedShape(T,.034,.032,.007,.007),metal,-.007,-.247,.032);
      add(elbow,roundedShape(T,.024,.022,.004,.002),ink,-.007,-.247,.038);
    }
    const hand=stylizedHand(T,skin,side===1&&opts.prop!=='none');hand.position.y=-.23;elbow.add(hand);
    const holding=side===1 && opts.prop!=='none' && opts.prop!=='pacifier';
    if(holding){const prop=buildProp3D(opts.prop,T);if(prop){prop.position.set(-.015,-.034,.058);hand.add(prop);if(opts.prop==='paper'){hand.rotation.x=.72;hand.children[0].position.x=.084;prop.position.x=0;const thumb=add(hand,roundedShape(T,.033,.050,.016,.013),skin,.085,-.036,.086);}}}
    const hip=new T.Group();hip.position.set(side*(.098+Math.max(0,fullness)*.04),.69,0);root.add(hip);
    const legGeo=tailorGeometry([[.035,.087,.105],[0,.094,.107],[-.13,.080,.087],[-.29,.067,.069],[-.40,.058,.063],[-.54,.054,.055],[-.60,.057,.060]],T,28);
    const lp=legGeo.attributes.position,li=[],lw=[];for(let i=0;i<lp.count;i++){const t=T.MathUtils.smoothstep(-lp.getY(i),.22,.38);li.push(0,1,0,0);lw.push(1-t,t,0,0);}
    legGeo.setAttribute('skinIndex',new T.Uint16BufferAttribute(li,4));legGeo.setAttribute('skinWeight',new T.Float32BufferAttribute(lw,4));
    const leg=new T.SkinnedMesh(legGeo,trouser),thigh=new T.Bone(),knee=new T.Bone();knee.position.y=-.30;thigh.add(knee);leg.add(thigh);leg.bind(new T.Skeleton([thigh,knee]));leg.castShadow=true;hip.add(leg);
    const shoe=add(knee,roundedShape(T,.127,.084,.034,.205),leather,0,-.326,.040);shoe.rotation.x=-.035;
    add(knee,roundedShape(T,.133,.018,.007,.214),ink,0,-.365,.042);
    styleCurve(T,knee,[[-.05,-.323,.126],[0,-.32,.144],[.05,-.323,.126]],metal,.0012);
    for(let lace=0;lace<3;lace++)styleCurve(T,knee,[[-.027,-.283,.025+lace*.021],[.027,-.283,.029+lace*.021]],ink,.0018);
    limbs.push({arm,elbow,hip,knee,side,holding});
  }
  if(opts.prop==='pacifier'){const p=buildProp3D('pacifier',T);p.position.set(0,mouthY,.145);head.add(p);}
  batchCharacterDetails(root,T);
  group.scale.setScalar(profile[3]);
  if(baby){group.scale.setScalar(.64);head.scale.setScalar(1.15);root.scale.setScalar(1);}
  group.userData={root,head,limbs,tie,eyes,isBaby:baby,identity,headY:baby?1.10:1.68*profile[3],phase:0,lastTime:null};return group;
}
function animateBossMesh(mesh,time,speed,stunned){
  const d=mesh.userData,dt=d.lastTime===null?0:Math.min(.05,Math.max(0,time-d.lastTime));d.lastTime=time;
  d.phase+=dt*(d.isBaby?18:12)*Math.min(1,speed/2.8);const p=d.phase,run=Math.min(1,speed/3);
  d.root.rotation.x=stunned?-.04:run*.07;d.root.rotation.z=stunned?0:Math.sin(p)*run*.009;
  d.root.position.y=stunned?0:Math.abs(Math.sin(p))*run*.020+Math.sin(time*2.2)*.0018*(1-run);
  d.head.rotation.y=Math.sin(time*1.3)*.035;d.head.rotation.x=stunned?-.045:Math.sin(time*1.7)*.009*(1-run);d.head.rotation.z=stunned?Math.sin(time*13)*.06:Math.sin(p+.4)*run*.008;
  const blinkClock=(time+(d.identity==='slim'?1.7:d.identity==='square'?2.3:.6))%4.7;
  const blink=blinkClock<.16?Math.max(.1,Math.abs(blinkClock-.08)/.08):1;
  for(const eye of d.eyes)eye.scale.y=stunned?.74:blink;
  for(const l of d.limbs){l.arm.rotation.set(l.holding?-.22:stunned?-.6:Math.sin(p)*l.side*.48*run,0,l.side*.06);l.elbow.rotation.x=l.holding?-.90:stunned?-1:-.18-run*.5;l.hip.rotation.x=stunned?0:-Math.sin(p)*l.side*.6*run;l.knee.rotation.x=stunned?0:Math.max(0,Math.sin(p)*l.side)*.8*run;}
  d.tie.rotation.x=-Math.abs(Math.sin(p+1))*.12*run;
}
function randomAvatarOpts3D(isBaby,index){
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)].id;
  return {identity:index===undefined?pick(PALETTE3D.identity):PALETTE3D.identity[index%5].id,skin:pick(PALETTE3D.skin),hair:index===undefined?pick(PALETTE3D.hair):PALETTE3D.hair[(index+1)%5].id,outfit:isBaby?'hanbok':index===undefined?pick(PALETTE3D.outfit):PALETTE3D.outfit[index%4].id,face:pick(PALETTE3D.face),prop:pick(PALETTE3D.prop),isBaby};
}
