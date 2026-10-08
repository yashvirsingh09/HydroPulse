import { generateSyntheticBurst, computeGCCPhat, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const fs = 10000;
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const maxDelay = (L / v_s) * 1.05;

for (let r = 0; r < 5; r++) {
  const seed = [101, 202, 303, 404, 505][r];
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed });
  
  // Try several frequency bands
  for (const [minF, maxF] of [[650, 1050], [700, 1000], [750, 950], [600, 1200], [500, 1200]]) {
    const gcc = computeGCCPhat(burst.node_a.samples, burst.node_b.samples, fs, maxDelay, {
      minFreqHz: minF,
      maxFreqHz: maxF,
      bandLimited: true
    });
    const estDist = (L - v_s * gcc.deltaTSeconds) / 2.0;
    const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
    if (err <= 1.5) {
      console.log(`Run ${r+1} PASS with [${minF}, ${maxF}]: err=${err.toFixed(3)}m, lag=${gcc.sampleLag.toFixed(2)}`);
    }
  }
}
