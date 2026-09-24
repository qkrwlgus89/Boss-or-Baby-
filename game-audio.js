/* Procedural sound for the whole game, prologue included. Nothing is downloaded:
   every cue is synthesized at runtime and only after a user gesture.

   Three things separate this from beep-synth: every one-shot is LAYERED (a transient
   plus a body plus a tail), every one-shot is RANDOMISED (identical repeats are the
   loudest tell of cheap procedural audio), and everything is fed through a small
   convolution reverb so the office is a room instead of a vacuum.

   Frequency budget matters as much as design. Anything that repeats often lives low
   and quiet; only rare, important cues are allowed to be bright. A notification ping
   on every line of boss chatter is what makes a mix exhausting. */
(function(root){
  'use strict';
  let ctx=null,master=null,dry=null,verb=null,verbReturn=null,ambience=null;
  let muted=false,paused=false,stepClock=0,pulseClock=0,airClock=0,stepSide=1,chatterSide=1;
  const active=[];

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  /* A short, dense impulse: carpeted open-plan office, not a cathedral. */
  function roomImpulse(seconds,decay){
    const len=Math.max(1,Math.floor(ctx.sampleRate*seconds)),buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);
      for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);
      [.009,.017,.026,.041].forEach((tap,k)=>{const i=Math.floor(tap*ctx.sampleRate);if(i<len)d[i]+=(k%2?-.55:.6)*(1-k*.18);});
    }
    return buf;
  }

  function ensure(){
    if(ctx)return true;
    const AudioCtx=root.AudioContext||root.webkitAudioContext;if(!AudioCtx)return false;
    ctx=new AudioCtx();
    master=ctx.createGain();master.gain.value=muted?0:.72;master.connect(ctx.destination);
    dry=ctx.createGain();dry.gain.value=.92;dry.connect(master);
    try{
      verb=ctx.createConvolver();verb.buffer=roomImpulse(1.05,2.8);
      verbReturn=ctx.createGain();verbReturn.gain.value=.5;verb.connect(verbReturn);verbReturn.connect(master);
    }catch(_){verb=null;}
    ambience=ctx.createGain();ambience.gain.value=.05;ambience.connect(master);
    return true;
  }
  function resume(){if(ensure()&&ctx.state!=='running')ctx.resume().catch(()=>{});}

  function out(node,pan,send){
    let tail=node;
    if(ctx.createStereoPanner&&pan){const p=ctx.createStereoPanner();p.pan.value=clamp(pan,-1,1);node.connect(p);tail=p;}
    tail.connect(dry);
    if(verb&&send>0){const s=ctx.createGain();s.gain.value=send;tail.connect(s);s.connect(verb);}
  }

  function tone(freq,duration=.12,type='sine',volume=.08,when=0,endFreq=freq,pan=0,send=.16){
    if(!ensure()||muted)return;
    const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);out(g,pan,send);o.start(t);o.stop(t+duration+.02);
  }

  function noise(duration=.14,volume=.06,frequency=1200,when=0,type='lowpass',q=.7,pan=0,send=.16,endFrequency=0){
    if(!ensure()||muted)return;
    const len=Math.max(1,Math.floor(ctx.sampleRate*duration)),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+when;
    src.buffer=buf;f.type=type;f.frequency.setValueAtTime(frequency,t);f.Q.value=q;
    // A filter that moves is the difference between "hiss" and "something happening".
    if(endFrequency>0)f.frequency.exponentialRampToValueAtTime(Math.max(40,endFrequency),t+duration);
    g.gain.setValueAtTime(Math.max(.0002,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(g);out(g,pan,send);src.start(t);
  }

  /* Softness is mostly attack time. `tone` snaps on in 12ms, which reads as a beep no
     matter what note it plays. This one breathes in, so it lands as a sigh. */
  function swell(freq,duration,volume,when=0,type='triangle',pan=0,send=.5,attack=.14,endFreq=0){
    if(!ensure()||muted)return;
    const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+attack);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);out(g,pan,send);o.start(t);o.stop(t+duration+.04);
  }

  /* Air, not a note. A held pitch from an oscillator reads as "synthesizer" however soft
     the waveform is, so cues that must feel human are built only from filtered noise
     with a slow attack and a filter that closes as it fades. */
  function air(duration=.8,volume=.05,fromF=800,toF=280,when=0,q=.7,pan=0,send=.5,attack=.22,type='lowpass'){
    if(!ensure()||muted)return;
    const len=Math.max(1,Math.floor(ctx.sampleRate*duration)),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+when;
    src.buffer=buf;f.type=type;f.Q.value=q;
    f.frequency.setValueAtTime(fromF,t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40,toF),t+duration);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+attack);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(g);out(g,pan,send);src.start(t);src.stop(t+duration+.05);
  }

  /* ---- liquid ----
     A bubble is a damped sine whose pitch RISES. That single fact is what makes
     synthesized water sound like water instead of like static. A pour is a scatter of
     them under a broadband stream whose filter opens and then closes. */
  function droplet(when,freq,volume,pan){
    if(!ensure()||muted)return;
    const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(freq*rand(1.6,2.6),t+rand(.018,.038));
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.004);
    g.gain.exponentialRampToValueAtTime(.0001,t+rand(.04,.075));
    o.connect(g);out(g,pan,.24);o.start(t);o.stop(t+.10);
  }
  function pour(options={}){
    const amount=options.amount??1,pan=options.pan??0,when=options.when||0;
    // The stream: hiss that opens as it leaves the cup, then closes as it thins out.
    noise(.14,.055*amount,700,when,'bandpass',.9,pan,.22,2300);
    noise(.30,.070*amount,2500,when+.05,'bandpass',1.0,pan,.28,480);
    // The liquid: dozens of little rising bubbles, never the same twice.
    const drops=Math.round(rand(16,24)*amount);
    for(let i=0;i<drops;i++)droplet(when+rand(.01,.34),rand(560,2100),rand(.010,.026)*amount,pan+rand(-.25,.25));
    // The weight of it leaving your hand.
    tone(rand(190,240),.16,'sine',.026*amount,when,rand(90,120),pan,.25);
  }
  function splat(options={}){
    const pan=options.pan??0,when=options.when||0;
    // Wet impact: a slap transient, a low body, then the drips.
    noise(.05,.085,1500,when,'bandpass',.7,pan,.25,320);
    noise(.22,.075,520,when+.01,'lowpass',.9,pan,.38,180);
    tone(rand(120,155),.20,'sine',.05,when,rand(60,80),pan,.3);
    for(let i=0;i<14;i++)droplet(when+rand(.03,.30),rand(420,1500),rand(.008,.022),pan+rand(-.45,.45));
  }

  /* ---- messenger ---- */
  function ping(when=0,pan=0,gainScale=1){
    const f=rand(1130,1345);
    noise(.012,.05*gainScale,3200,when,'bandpass',1.6,pan,.10);
    tone(f,.085,'triangle',.055*gainScale,when,f*.96,pan,.22);
    tone(f*1.51,.055,'sine',.030*gainScale,when+.004,f*1.44,pan,.26);
    tone(f*.5,.14,'sine',.018*gainScale,when+.006,f*.47,pan,.20);
  }
  function burst(count=6,options={}){
    if(!ensure())return;resume();
    const n=clamp(count|0,1,24),spread=options.spread??.9,lead=options.delay||0;
    let when=lead;
    for(let i=0;i<n;i++){ping(when,rand(-spread,spread),rand(.72,1));when+=rand(.045,.16);}
    if(n>=4){tone(70,.9,'sine',.05,lead+.03,52,0,.35);noise(.7,.03,340,lead+.05,'lowpass',.6,0,.3);}
    return when;
  }

  /* A boss shouting at you fires many times a second across five people. It has to be
     a low, soft mouth noise, not a notification chime, or the mix becomes fatiguing. */
  function chatter(){
    const pan=chatterSide*rand(.15,.5);chatterSide=-chatterSide;
    noise(.055,.020,rand(380,620),0,'bandpass',1.1,pan,.18);
    tone(rand(150,215),.075,'triangle',.016,0,rand(110,150),pan,.2);
  }

  function typing(count=5,when=0,pan=-.25){
    for(let i=0;i<count;i++){
      const t=when+i*rand(.055,.13);
      noise(.016,rand(.018,.032),rand(2200,3400),t,'bandpass',2.2,pan+rand(-.1,.1),.12);
      tone(rand(150,210),.03,'square',.012,t,120,pan,.08);
    }
  }
  function phoneRing(when=0){
    for(const offset of [0,.42])for(let i=0;i<9;i++){
      const t=when+offset+i*.026;
      tone(i%2?1046:784,.03,'square',.022,t,i%2?1046:784,0,.3);
    }
  }

  /* ---- ambience ---- */
  function stopAmbience(){while(active.length){const n=active.pop();try{n.stop();}catch(_){}}}
  const ROOMS={
    day:{hum:64,air:128,level:.045},
    night:{hum:58,air:116,level:.075},
    bedroom:{hum:52,air:96,level:.035},
    office:{hum:61,air:122,level:.055},
  };
  function room(kind='day'){
    if(!ensure())return;resume();stopAmbience();
    const r=ROOMS[kind]||ROOMS.day;
    ambience.gain.cancelScheduledValues(ctx.currentTime);
    ambience.gain.setTargetAtTime(r.level,ctx.currentTime,.4);
    const hum=ctx.createOscillator(),humGain=ctx.createGain();
    hum.type='sine';hum.frequency.value=r.hum;humGain.gain.value=.42;
    hum.connect(humGain);humGain.connect(ambience);hum.start();active.push(hum);
    const air=ctx.createOscillator(),airGain=ctx.createGain();
    air.type='triangle';air.frequency.value=r.air;airGain.gain.value=.10;
    air.connect(airGain);airGain.connect(ambience);air.start();active.push(air);
    const len=Math.floor(ctx.sampleRate*2),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1);
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=buf;src.loop=true;f.type='lowpass';f.frequency.value=kind==='bedroom'?380:620;
    g.gain.value=.22;src.connect(f);f.connect(g);g.connect(ambience);src.start();active.push(src);
  }

  function start(options={}){
    if(!ensure())return;resume();paused=false;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.03);
    room(options.night?'night':'day');
    stepClock=pulseClock=airClock=0;event('start');
  }

  function event(name,detail=0){
    resume();
    if(name==='start'){tone(392,.10,'sine',.032,0,523,-.2,.3);tone(659,.14,'sine',.026,.08,784,.2,.3);}
    else if(name==='jump'){noise(.05,.028,900,0,'bandpass',1.2,0,.12);tone(rand(140,162),.13,'triangle',.05,0,260,0,.2);}
    else if(name==='land'){noise(.09,.07,rand(220,300),0,'lowpass',.8,0,.22);noise(.03,.035,2400,0,'bandpass',1.8);tone(rand(74,90),.10,'sine',.045,0,58,0,.25);}
    else if(name==='coffee'){pour({amount:1,pan:.1});}
    else if(name==='coffeeHit'){splat({pan:0});}
    else if(name==='coffeeMiss'){pour({amount:.75,pan:.1});noise(.30,.03,700,.18,'lowpass',.6,0,.35,240);}
    else if(name==='summon'){
      // A tannoy switching on, then the two descending notes every Korean office PA
      // uses. Rising chimes read as an alarm; this one has to read as an announcement.
      noise(.05,.05,900,0,'bandpass',.8,0,.2,240);        // the system clicking live
      tone(72,.5,'sine',.05,0,54,0,.45);                  // cabinet thunk
      tone(587,.75,'sine',.07,.09,587,-.25,.6);           // 딩
      tone(587*.5,.75,'sine',.022,.09,587*.5,0,.5);
      tone(440,1.1,'sine',.065,.44,440,.25,.65);          // 동
      tone(440*.5,1.1,'sine',.020,.44,440*.5,0,.55);
      noise(.9,.016,420,.12,'lowpass',.5,0,.55);          // the room answering
    }
    else if(name==='door'){noise(.26,.09,rand(230,300),0,'lowpass',.8,0,.45);swell(92,.34,.038,0,'triangle',0,.4,.05,54);noise(.05,.05,1800,.24,'bandpass',2.4,0,.35);}
    else if(name==='tantrum'){[440,330,220].forEach((f,i)=>{swell(f*rand(.97,1.03),.26,.042,i*.15,'triangle',rand(-.4,.4),.35,.05,f*.82);});}
    else if(name==='speedUp'){
      // A rising breath rather than a synth ramp: it has to be bearable every few seconds.
      swell(196,.5,.040,0,'triangle',-.25,.45,.16,294);
      swell(147,.62,.030,.08,'sine',.25,.45,.20,220);
      noise(.34,.026,700,.05,'lowpass',.6,0,.4,1500);
    }
    else if(name==='promotion'){
      // Rising, but capped: the octave partials used to reach 2kHz and hurt.
      [262,330,392,523].forEach((f,i)=>{tone(f,.40,'triangle',.07,i*.11,f*1.01,(i-1.5)*.4,.45);tone(f*1.5,.24,'sine',.020,i*.11,f*1.5,0,.45);});
      noise(.3,.024,1600,.02,'bandpass',.9,0,.4);
    }
    else if(name==='ready'){
      // Was a pair of bright sines at 880/1175. Now a soft warm two-note, well under 700Hz.
      tone(392,.22,'triangle',.038,0,392,.15,.4);tone(523,.30,'sine',.030,.11,523,-.15,.45);
      noise(.18,.014,900,0,'lowpass',.6,0,.3);
    }
    else if(name==='chatter'){chatter();}
    else if(name==='message'){ping(0,rand(-.5,.5),1);}
    else if(name==='messageSwell'){tone(70,1.1,'sine',.045,0,50,0,.4);noise(.9,.026,320,.04,'lowpass',.6,0,.35);}
    else if(name==='messageStorm'){burst(detail||8);}
    else if(name==='typing'){typing(detail||5);}
    else if(name==='phone'){phoneRing();}
    else if(name==='paper'){noise(.19,.04,rand(2600,3600),0,'bandpass',.8,rand(-.3,.3),.2);}
    else if(name==='caught'){
      // No oscillator at all. Triangles still sang like a synth pad, so this is built
      // entirely from filtered air: a hand on cloth, an exhale, the room going quiet.
      noise(.19,.055,250,0,'lowpass',.8,0,.4);          // the grab
      air(1.15,.060,820,170,.02,.55,-.10,.62,.30);      // the long exhale
      air(.60,.026,1600,480,0,.75,.12,.45,.12);         // a short catch of breath
      air(1.7,.034,280,80,.12,.5,.08,.75,.45);          // the floor settling under it
    }
    else if(name==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,.36,'sine',.06,i*.12,f,(i-1.5)*.35,.45));}
    else if(name==='pause'){tone(300,.09,'triangle',.022,0,220,0,.2);}
  }

  /* ---- continuous ---- */
  function movement(speed,sprinting,grounded,dt,distance){
    if(!ctx||paused||muted)return;
    stepClock-=dt;pulseClock-=dt;airClock-=dt;
    if(grounded&&speed>.7&&stepClock<=0){
      const fast=sprinting&&speed>4,pan=stepSide*rand(.18,.34);stepSide=-stepSide;
      noise(fast?.030:.026,fast?.040:.026,rand(1900,2700),0,'bandpass',1.5,pan,.14);
      noise(fast?.075:.065,fast?.036:.024,rand(300,430),.006,'lowpass',.8,pan,.20);
      tone(rand(88,118),.055,'sine',fast?.024:.016,0,rand(58,74),pan,.18);
      stepClock=(fast?.25:.39)*rand(.93,1.07);
    }
    if(sprinting&&speed>4&&airClock<=0){noise(.20,.017,1700,0,'lowpass',.5,0,.2);airClock=.42;}
    if(distance<4&&pulseClock<=0){
      const close=distance<2;
      tone(close?76:68,.12,'sine',close?.055:.03,0,close?60:58,0,.3);
      tone(close?62:55,.11,'sine',close?.045:.022,.13,close?50:46,0,.3);
      pulseClock=(close?.52:.78);
    }
  }

  function setPaused(value){
    paused=!!value;if(!ctx)return;
    master.gain.setTargetAtTime(paused?.10:(muted?0:.72),ctx.currentTime,.05);
    if(paused)event('pause');else resume();
  }
  function toggle(){
    muted=!muted;
    if(ensure())master.gain.setTargetAtTime(muted?0:(paused?.10:.72),ctx.currentTime,.04);
    return muted;
  }
  function setMuted(value){if(!!value!==muted)toggle();return muted;}
  function stop(){stopAmbience();if(ctx)master.gain.setTargetAtTime(0,ctx.currentTime+.8,.08);}
  function isMuted(){return muted;}

  root.OfficeAudio={start,room,event,burst,typing,movement,setPaused,toggle,setMuted,stop,isMuted,resume};
})(window);
