/* Procedural in-game sound. No downloads: every cue is synthesized at runtime and
   starts only after the player presses the game start button. */
(function(root){
  'use strict';
  let ctx=null,master=null,ambience=null,muted=false,paused=false,stepClock=0,pulseClock=0,airClock=0;
  const active=[];
  function ensure(){
    if(ctx)return true;const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return false;
    ctx=new Audio();master=ctx.createGain();ambience=ctx.createGain();master.gain.value=.72;ambience.gain.value=.055;ambience.connect(master);master.connect(ctx.destination);return true;
  }
  function resume(){if(ensure()&&ctx.state!=='running')ctx.resume().catch(()=>{});}
  function tone(freq,duration=.12,type='sine',volume=.08,when=0,endFreq=freq){
    if(!ensure()||muted)return;const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);
  }
  function noise(duration=.14,volume=.06,frequency=1200,when=0){
    if(!ensure()||muted)return;const length=Math.max(1,Math.floor(ctx.sampleRate*duration)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),t=ctx.currentTime+when;source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t);
  }
  function stopAmbience(){while(active.length){const node=active.pop();try{node.stop();}catch(_){}}}
  function start(options={}){
    if(!ensure())return;resume();paused=false;stopAmbience();master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setTargetAtTime(muted?0:.72,ctx.currentTime,.03);ambience.gain.cancelScheduledValues(ctx.currentTime);ambience.gain.setTargetAtTime(options.night?.075:.045,ctx.currentTime,.25);
    const hum=ctx.createOscillator(),humGain=ctx.createGain();hum.type='sine';hum.frequency.value=options.night?58:64;humGain.gain.value=.42;hum.connect(humGain);humGain.connect(ambience);hum.start();active.push(hum);
    const air=ctx.createOscillator(),airGain=ctx.createGain();air.type='triangle';air.frequency.value=options.night?116:128;airGain.gain.value=.10;air.connect(airGain);airGain.connect(ambience);air.start();active.push(air);
    stepClock=pulseClock=airClock=0;event('start');
  }
  function event(name,detail=0){
    resume();
    if(name==='start'){tone(392,.09,'sine',.035,0,523);tone(659,.12,'sine',.03,.08,784);}
    else if(name==='jump'){tone(150,.13,'triangle',.055,0,260);noise(.07,.025,700);}
    else if(name==='land'){noise(.11,.07,260);tone(82,.09,'sine',.045);}
    else if(name==='coffee'){noise(.34,.10,1450);tone(520,.18,'sine',.045,0,260);}
    else if(name==='coffeeHit'){tone(180,.10,'square',.055);tone(120,.16,'triangle',.05,.07);noise(.15,.065,620);}
    else if(name==='coffeeMiss'){tone(230,.13,'triangle',.035,0,150);}
    else if(name==='summon'){[659,880,1047].forEach((f,i)=>tone(f,.24,'sine',.085,i*.16,f));tone(1318,.45,'triangle',.055,.48,988);}
    else if(name==='door'){noise(.28,.10,260);tone(92,.24,'sawtooth',.045,0,55);}
    else if(name==='tantrum'){tone(440,.16,'square',.05);tone(330,.16,'square',.05,.16);tone(220,.25,'square',.055,.32);}
    else if(name==='speedUp'){tone(165,.38,'sawtooth',.055,0,330);tone(220,.38,'sawtooth',.04,.12,440);noise(.24,.04,900,.08);}
    else if(name==='promotion'){[523,659,784,1047].forEach((f,i)=>tone(f,.28,'triangle',.075,i*.12,f*1.03));}
    else if(name==='ready'){tone(880,.12,'sine',.045);tone(1175,.18,'sine',.04,.1);}
    else if(name==='message'){tone(720,.045,'sine',.018);}
    else if(name==='caught'){tone(150,.65,'sawtooth',.11,0,48);noise(.45,.12,420);}
    else if(name==='win'){[523,659,784,1047].forEach((f,i)=>tone(f,.32,'sine',.065,i*.13));}
    else if(name==='pause'){tone(300,.08,'triangle',.025,0,220);}
  }
  function movement(speed,sprinting,grounded,dt,distance){
    if(!ctx||paused||muted)return;stepClock-=dt;pulseClock-=dt;airClock-=dt;
    if(grounded&&speed>.7&&stepClock<=0){const fast=sprinting&&speed>4;noise(fast?.075:.06,fast?.047:.032,fast?520:430);tone(fast?105:88,.055,'sine',fast?.028:.018);stepClock=fast?.25:.39;}
    if(sprinting&&speed>4&&airClock<=0){noise(.18,.018,1700);airClock=.42;}
    if(distance<4&&pulseClock<=0){tone(distance<2?76:68,.11,'sine',distance<2?.055:.032);tone(distance<2?62:55,.10,'sine',distance<2?.045:.024,.13);pulseClock=distance<2?.52:.78;}
  }
  function setPaused(value){paused=!!value;if(!ctx)return;const target=paused?.10:(muted?0:.72);master.gain.setTargetAtTime(target,ctx.currentTime,.05);if(paused)event('pause');else resume();}
  function toggle(){muted=!muted;if(ensure())master.gain.setTargetAtTime(muted?0:(paused?.10:.72),ctx.currentTime,.04);return muted;}
  function stop(){stopAmbience();if(ctx)master.gain.setTargetAtTime(0,ctx.currentTime+.8,.08);}
  function isMuted(){return muted;}
  root.OfficeAudio={start,event,movement,setPaused,toggle,stop,isMuted,resume};
})(window);
