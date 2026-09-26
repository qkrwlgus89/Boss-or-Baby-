/* Rank and scoring. Elevator arrival promotes; floors.js owns local pressure.
   ramp() remains available for historical simulations, not live floor difficulty. */
(function(root){
  'use strict';
  const TITLES = ['사원','대리','과장','차장','부장','이사','사장','회장'];
  const BASE_RATE = 10;          // points per second at 사원
  const START_CHASERS = 2;       // and one more for every promotion
  const RAMP_SECONDS = 120;      // pursuers reach double speed after this long
  const PROMOTION_SPEED = 1.15;  // permanent, compounding, and deliberately uncapped

  function create(){ return { level:0, score:0, promotedAt:[0] }; }

  function title(level){ return TITLES[Math.max(0, Math.min(level|0, TITLES.length-1))]; }

  /* Steeply superlinear, so surviving long at a low rank can never beat climbing. */
  function rate(level){ const n = (level|0) + 1; return BASE_RATE * n * n; }

  function gain(state, dt){
    state.score += rate(state.level) * dt;
    return state.score;
  }

  function promote(state, elapsedSec){
    state.level += 1;
    state.promotedAt.push(elapsedSec || 0);
    return state.level;
  }

  function chasers(level){ return START_CHASERS + Math.max(0, level|0); }

  /* Uncapped, unlike the timed modes: a run with no promotions still has to end. */
  function ramp(elapsedSec){ return 1 + Math.max(0, elapsedSec) / RAMP_SECONDS; }

  /* Rank first, then how long that rank was held. Ties on seconds are the whole reason
     the timed modes make a poor leaderboard. */
  function compare(a, b){
    if (a.level !== b.level) return b.level - a.level;
    return b.score - a.score;
  }

  const api = { create, title, rate, gain, promote, chasers, ramp, compare,
    TITLES, BASE_RATE, START_CHASERS, RAMP_SECONDS, PROMOTION_SPEED };
  root.OfficeRank = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
