/* Shared, dependency-free presentation for Three r155.
   One scene render, depth contact shading, quarter-size bloom, ACES output.
   No motion blur / depth-of-field: pursuers and interaction text stay sharp. */
(function(root){
  'use strict';
  const presets=Object.freeze({
    performance:{label:'성능',ratio:1,pixels:1900000,effects:false,samples:0,ao:0},
    high:{label:'높음',ratio:1.5,pixels:3000000,effects:true,samples:2,ao:8},
    ultra:{label:'최고',ratio:2,pixels:5000000,effects:true,samples:4,ao:12},
  });
  let quality='high';
  try{const saved=localStorage.getItem('office-visual-quality');if(presets[saved])quality=saved;}catch(_e){}
  function setQuality(value){
    if(!Object.prototype.hasOwnProperty.call(presets,value))return false;
    quality=value;
    try{localStorage.setItem('office-visual-quality',value);}catch(_e){}
    document.querySelectorAll('[data-visual-quality]').forEach(el=>{el.value=value;});
    return true;
  }
  document.addEventListener('change',event=>{if(event.target.matches('[data-visual-quality]'))setQuality(event.target.value);});
  setQuality(quality);

  function attach(renderer,T){
    if(renderer.officeVisuals)return renderer.officeVisuals;
    const draw=renderer.render.bind(renderer),destroy=renderer.dispose.bind(renderer);
    // Older / unsupported GPUs retain the standard antialiased renderer.
    const supported=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
    const size=new T.Vector2(),bufferSize=new T.Vector2();
    let target,bloomA,bloomB,quadScene,quadCamera,quad,geometry,blur,finish;
    let busy=false,disposed=false,currentSamples=-1;
    const vertex=`varying vec2 vUv;
      void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
    function allocate(){
      target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
      target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
      bloomA=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
      bloomB=bloomA.clone();
      blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,vertexShader:vertex,
        uniforms:{source:{value:null},direction:{value:new T.Vector2()},extract:{value:1}},
        fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;uniform float extract;
          vec3 tap(vec2 uv){vec3 c=texture2D(source,uv).rgb;
            float peak=max(c.r,max(c.g,c.b));return c*mix(1.0,smoothstep(1.0,2.2,peak),extract);}
          void main(){vec3 c=tap(vUv)*.227027;
            c+=(tap(vUv+direction*1.384615)+tap(vUv-direction*1.384615))*.316216;
            c+=(tap(vUv+direction*3.230769)+tap(vUv-direction*3.230769))*.070270;
            gl_FragColor=vec4(c,1.0);}`});
      finish=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:true,vertexShader:vertex,
        uniforms:{source:{value:target.texture},depth:{value:target.depthTexture},bloom:{value:bloomB.texture},
          inverseProjection:{value:new T.Matrix4()},resolution:{value:new T.Vector2()},sampleCount:{value:8},projectionY:{value:1}},
        fragmentShader:`varying vec2 vUv;
          uniform sampler2D source,depth,bloom;uniform mat4 inverseProjection;
          uniform vec2 resolution;uniform float sampleCount,projectionY;
          vec3 positionAt(vec2 uv){float z=texture2D(depth,uv).r;
            vec4 p=inverseProjection*vec4(uv*2.0-1.0,z*2.0-1.0,1.0);return p.xyz/p.w;}
          void main(){
            vec3 color=texture2D(source,vUv).rgb;float d=texture2D(depth,vUv).r;
            vec3 p=positionAt(vUv);vec3 n=normalize(cross(dFdx(p),dFdy(p)));
            float occlusion=0.0;
            if(d<.99999&&-p.z>.65){
              float radius=clamp(.32*projectionY*resolution.y/max(-p.z,.5),3.0,36.0);
              for(int i=0;i<12;i++){
                if(float(i)>=sampleCount)break;
                float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/sampleCount);
                vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*radius*r/resolution,vec2(.001),vec2(.999));
                vec3 delta=positionAt(uv)-p;float len=length(delta);
                float horizon=max(dot(n,delta/max(len,.0001))-.12,0.0);
                occlusion+=horizon*(1.0-smoothstep(.08,.6,len));
              }
              occlusion=clamp(occlusion/sampleCount*2.0,0.0,.36)*smoothstep(.65,1.4,-p.z);
            }
            color*=1.0-occlusion;
            color+=texture2D(bloom,vUv).rgb*.085;
            float luma=dot(color,vec3(.2126,.7152,.0722));
            color*=mix(vec3(.98,1.0,1.025),vec3(1.018,1.0,.983),smoothstep(.15,1.3,luma));
            gl_FragColor=vec4(color,1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`});
      quadScene=new T.Scene();quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
      geometry=new T.PlaneGeometry(2,2);quad=new T.Mesh(geometry,finish);quad.frustumCulled=false;quadScene.add(quad);
    }
    function release(){
      if(!target)return;
      [target,bloomA,bloomB,geometry,blur,finish].forEach(item=>item.dispose());
      target=bloomA=bloomB=geometry=blur=finish=quad=quadScene=quadCamera=null;currentSamples=-1;
    }
    const status={supported,active:false,quality,width:0,height:0};
    renderer.officeVisuals=status;
    renderer.render=function(scene,camera){
      if(busy||disposed||renderer.getRenderTarget()||!camera.isPerspectiveCamera)return draw(scene,camera);
      const preset=presets[quality];renderer.getSize(size);
      const ratio=Math.max(.5,Math.min(root.devicePixelRatio||1,preset.ratio,Math.sqrt(preset.pixels/Math.max(1,size.x*size.y))));
      if(Math.abs(renderer.getPixelRatio()-ratio)>.001)renderer.setPixelRatio(ratio);
      renderer.getDrawingBufferSize(bufferSize);
      Object.assign(status,{quality,active:supported&&preset.effects,width:bufferSize.x,height:bufferSize.y});
      if(!status.active){release();return draw(scene,camera);}
      if(!target)allocate();
      if(currentSamples!==preset.samples){target.samples=Math.min(preset.samples,renderer.capabilities.maxSamples);target.dispose();currentSamples=preset.samples;}
      if(target.width!==bufferSize.x||target.height!==bufferSize.y){
        target.setSize(bufferSize.x,bufferSize.y);
        bloomA.setSize(Math.max(1,Math.ceil(bufferSize.x/4)),Math.max(1,Math.ceil(bufferSize.y/4)));
        bloomB.setSize(bloomA.width,bloomA.height);
      }
      const autoReset=renderer.info.autoReset,autoClear=renderer.autoClear;
      busy=true;renderer.info.autoReset=false;renderer.info.reset();renderer.autoClear=true;
      try{
        renderer.setRenderTarget(target);draw(scene,camera);
        quad.material=blur;blur.uniforms.source.value=target.texture;blur.uniforms.extract.value=1;
        blur.uniforms.direction.value.set(1/bloomA.width,0);renderer.setRenderTarget(bloomA);draw(quadScene,quadCamera);
        blur.uniforms.source.value=bloomA.texture;blur.uniforms.extract.value=0;
        blur.uniforms.direction.value.set(0,1/bloomA.height);renderer.setRenderTarget(bloomB);draw(quadScene,quadCamera);
        quad.material=finish;finish.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
        finish.uniforms.projectionY.value=camera.projectionMatrix.elements[5];
        finish.uniforms.resolution.value.copy(bufferSize);finish.uniforms.sampleCount.value=preset.ao;
        renderer.setRenderTarget(null);draw(quadScene,quadCamera);
      }finally{
        renderer.setRenderTarget(null);renderer.autoClear=autoClear;renderer.info.autoReset=autoReset;busy=false;
      }
    };
    renderer.dispose=function(){if(disposed)return;disposed=true;release();destroy();};
    return status;
  }
  root.OfficeVisuals=Object.freeze({attach,setQuality,getQuality:()=>quality,presets});
})(window);
