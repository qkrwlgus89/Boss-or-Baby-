/* 사장님 호출 — ultimate charge, room targeting and the summon phase machine.
   One sequence for every mode and every map: no per-mode branches, no extra character.
   Pure logic, so the same rules run in the browser and under `node --test`. */
(function(root){
  'use strict';
  const START=.25, BASE=.05, DANGER=.045, DANGER_RANGE=6;
  const RAGE=6, RAGE_SPEED=1.35;
  // Nobody is late to a meeting the 사장님 called, so the walk there is a sprint.
  const GATHER_SPEED=5.6, ARRIVE_RADIUS=.55;
  const TIMING={arrive:.8,gather:4.0,meeting:2.6};
  const ORDER=['arrive','gather','meeting'];

  function create(){return {charge:START,phase:'idle',t:0,room:null,uses:0};}

  /* The gauge only fills while idle, and fills faster the closer the danger is. */
  function gain(s,dt,minDist){
    if(s.phase!=='idle')return s.charge;
    let rate=BASE;
    if(minDist<DANGER_RANGE)rate+=DANGER*(DANGER_RANGE-minDist)/DANGER_RANGE;
    s.charge=Math.max(0,Math.min(1,s.charge+rate*dt));
    return s.charge;
  }
  function ready(s){return s.phase==='idle' && s.charge>=1;}
  function active(s){return s.phase!=='idle';}

  /* The ultimate is aimed: whichever meeting room you face is the one they are
     called to. Look the wrong way and you summon them straight onto yourself. */
  function aimRoom(rooms,origin,forward){
    if(!rooms || !rooms.length)return null;
    let best=rooms[0],bestScore=-Infinity;
    for(const r of rooms){
      const dx=r.x-origin.x,dz=r.z-origin.z,d=Math.hypot(dx,dz)||1e-6;
      const score=(dx*forward.x+dz*forward.z)/d*2-d/60;
      if(score>bestScore){bestScore=score;best=r;}
    }
    return best;
  }

  function start(s,room){
    if(!ready(s))return false;
    s.charge=0;s.phase=ORDER[0];s.t=0;s.room=room||null;s.uses++;
    return true;
  }

  /* Returns the name of the phase just entered, or null while one is still running. */
  function advance(s,dt,settled){
    if(s.phase==='idle')return null;
    s.t+=dt;
    const early=s.phase==='gather' && settled && s.t>.8;
    if(!early && s.t<(TIMING[s.phase]||0))return null;
    const next=ORDER[ORDER.indexOf(s.phase)+1]||'idle';
    s.phase=next;s.t=0;
    if(next==='idle')s.room=null;
    return next;
  }

  /* One standing spot per pursuer, nearest first, so nobody shares a slot. */
  function assign(spots,positions){
    const taken=spots.map(()=>false);
    return positions.map(p=>{
      let best=-1,bestD=Infinity;
      for(let i=0;i<spots.length;i++){
        if(taken[i])continue;
        const d=(spots[i].x-p.x)**2+(spots[i].z-p.z)**2;
        if(d<bestD){bestD=d;best=i;}
      }
      if(best<0)return spots[spots.length-1];
      taken[best]=true;return spots[best];
    });
  }

  const api={create,gain,ready,active,aimRoom,start,advance,assign,
    START,BASE,DANGER,DANGER_RANGE,RAGE,RAGE_SPEED,GATHER_SPEED,ARRIVE_RADIUS,TIMING,ORDER};
  root.OfficeSummon=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
