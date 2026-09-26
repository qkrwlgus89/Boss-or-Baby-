/* Elevator progression. Pure state and shared geometry specs for play and QA. */
(function(root){
  'use strict';
  const layouts=[
    {name:'영업지원 · 교차 동선',color:0x4fc6ae,stops:[{x:-10.5,z:-14.5},{x:10.5,z:-43}],blocks:[[-.9,-18,2.6,1.4],[.9,-32,2.6,1.4]]},
    {name:'자료관리 · 서가 통로',color:0xd5a65c,stops:[{x:10.5,z:-19},{x:-10.5,z:-41.5}],blocks:[[0,-11,1.3,7],[0,-28,1.3,7],[0,-43,1.3,7]]},
    {name:'임원지원 · 지그재그',color:0x91a5ed,stops:[{x:-10.5,z:-28.5},{x:10.5,z:-49}],blocks:[[-.8,-8,2.8,1.3],[.8,-23,2.8,1.3],[-.8,-39,2.8,1.3]]}
  ];
  const ELEVATOR={x:0,z:-54},LIMIT=65,WAIT=4,RIDE=.6;
  const confined=s=>s.phase==='waiting'||s.phase==='riding';
  function confine(p){p.x=Math.max(-1,Math.min(1,p.x));p.z=Math.max(-55,Math.min(-53.8,p.z));p.y=1.65;return p;}
  const layout=level=>layouts[level%layouts.length];
  const create=level=>({level,time:0,stamps:[false,false],phase:'work',wait:0,ride:0,reinforcements:0});
  function tick(s,dt){
    if(s.phase==='riding'){s.ride+=dt;return s.ride>=RIDE?'arrived':null;}
    s.time+=dt;
    if(s.phase==='waiting'){s.wait=Math.max(0,s.wait-dt);if(s.wait<1e-6){s.wait=0;s.phase='riding';s.ride=0;return 'boarded';}return null;}
    const count=Math.min(4,Math.floor(Math.max(0,s.time-LIMIT)/15)+Number(s.time>=LIMIT));
    if(count>s.reinforcements){s.reinforcements=count;return 'reinforce';}
    return null;
  }
  function target(s,p){
    const stops=layout(s.level).stops.map((v,i)=>({...v,id:i})).filter(v=>!s.stamps[v.id]);
    return stops.length?stops.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]:{...ELEVATOR,id:'lift'};
  }
  function interact(s,p){
    if(s.phase==='riding'||Math.abs((p.y??1.65)-1.65)>.5)return null;
    const t=target(s,p);if(Math.hypot(t.x-p.x,t.z-p.z)>1.8)return null;
    if(t.id!=='lift'){s.stamps[t.id]=true;return 'stamp';}
    if(s.phase==='work'){s.phase='waiting';s.wait=WAIT;return 'called';}
    return null;
  }
  const pressure=s=>1+s.level*.055+Math.max(0,s.time-20)/65;
  const api={layouts,layout,create,tick,target,interact,pressure,confined,confine,ELEVATOR,LIMIT,WAIT,RIDE};
  root.OfficeFloors=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
