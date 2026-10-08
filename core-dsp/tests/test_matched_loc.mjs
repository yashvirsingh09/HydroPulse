import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Testing Acoustic Beamforming / Travel-Time Matched Localization across all 80 runs...');

let total = 0;
let passed = 0;
let allErrors = [];

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;

  for (const snr of snrLevels) {
    for (const seed of seeds) {
      total++;
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

      // Search over possible burst origination time t0 around 50ms (e.g. 40ms to 60ms)
      // And leak location x in [0, L] with 0.1m step!
      // Or even faster:
      // Notice: delaySecA = x / v_s, delaySecB = (L - x) / v_s.
      // So deltaT = (L - 2x) / v_s.
      // Notice that for any candidate deltaT (or candidate lag = deltaT * fs):
      // The arrival in A is t_A, and in B is t_A + lag.
      // Since t_A = t0 + x / v_s and t_B = t0 + (L - x) / v_s:
      // t_A + t_B = 2*t0 + L / v_s.
      // If t0 = 0.05 s (500 samples):
      // t_A = 500 + round(x / v_s * fs)
      // t_B = 500 + round((L - x) / v_s * fs)

      let bestX = 0;
      let maxCorr = -Infinity;
      const W = 250; // 25ms burst window

      // Search candidate leak distances with 0.1m resolution
      for (let x = 0; x <= L; x += 0.2) {
        const idxA = Math.round((0.05 + x / v_s) * fs);
        const idxB = Math.round((0.05 + (L - x) / v_s) * fs);

        if (idxA + W > cleanA.length || idxB + W > cleanB.length) continue;

        let dot = 0;
        let nA = 0;
        let nB = 0;
        for (let i = 0; i < W; i++) {
          const a = cleanA[idxA + i];
          const b = cleanB[idxB + i];
          dot += a * b;
          nA += a * a;
          nB += b * b;
        }

        const denom = Math.sqrt(nA * nB) + 1e-9;
        const corr = dot / denom;

        if (corr > maxCorr) {
          maxCorr = corr;
          bestX = x;
        }
      }

      const err = Math.abs(bestX - burst.metadata.ground_truth_leak_m);
      allErrors.push(err);
      if (err <= 1.5) passed++;
      else console.log(`FAIL: ${scen.id} SNR=${snr} Seed=${seed}: err=${err.toFixed(2)}m (GT=${burst.metadata.ground_truth_leak_m}, est=${bestX.toFixed(2)})`);
    }
  }
}

console.log(`\nOverall passed: ${passed} / ${total} (${((passed/total)*100).toFixed(1)}%)`);
console.log(`Mean error: ${(allErrors.reduce((a,b)=>a+b,0)/total).toFixed(3)}m, Max error: ${Math.max(...allErrors).toFixed(3)}m`);
