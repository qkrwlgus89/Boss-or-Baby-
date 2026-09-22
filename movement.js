/* Camera-relative FPS locomotion. Local velocity follows yaw immediately, never pitch. */
(function(root){
  'use strict';
  const tuning = { speed:5.6, sprint:1.48, acceleration:24, braking:32 };
  function create(){ return { right:0, forward:0, stamina:1, exhausted:false, sprinting:false }; }
  function step(s, input, yaw, dt){
    let x = input.right || 0, z = input.forward || 0;
    const length = Math.hypot(x,z);
    if (length > 1){ x /= length; z /= length; }
    if (s.exhausted && s.stamina >= 0.35) s.exhausted = false;
    s.sprinting = !!input.sprint && length > 0 && !s.exhausted && s.stamina > 0;
    s.stamina = Math.max(0, Math.min(1, s.stamina + dt*(s.sprinting ? -0.27 : 0.22)));
    if (s.stamina === 0) s.exhausted = true;
    const speed = tuning.speed * (s.sprinting ? tuning.sprint : 1);
    const rate = length ? tuning.acceleration : tuning.braking;
    const decay = Math.exp(-rate*dt);
    // Exact integral of exponential velocity: consistent travel at 30/60/144 Hz.
    const targetX = x*speed, targetZ = z*speed;
    const localX = targetX*dt + (s.right-targetX)*(1-decay)/rate;
    const localZ = targetZ*dt + (s.forward-targetZ)*(1-decay)/rate;
    s.right = targetX + (s.right-targetX)*decay;
    s.forward = targetZ + (s.forward-targetZ)*decay;
    return { x:Math.cos(yaw)*localX-Math.sin(yaw)*localZ,
      z:-Math.sin(yaw)*localX-Math.cos(yaw)*localZ };
  }
  root.FPSMovement = { create, step, tuning };
})(typeof module === 'object' ? module.exports : window);
