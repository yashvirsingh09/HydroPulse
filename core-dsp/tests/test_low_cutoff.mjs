import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  computeGCCPhat
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Testing GCC-PHAT and Cross-Correlation with 120-2200 Hz bandpass filter...');

for (const pass of [[100, 2200], [120, 2200], [150, 2200], [200, 2200]]) {
  let passed = 0, total = 0, errors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxDelay = (L / v_s) * 1.05;

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, pass[0], pass[1]);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, pass[0], pass[1]);

        const gcc = computeGCCPhat(cleanA, cleanB, fs, maxDelay, { minFreqHz: pass[0], maxFreqHz: pass[1], bandLimited: true });
        const estDist = (L - v_s * gcc.deltaTSeconds) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }

  console.log(`Passband ${pass[0]}-${pass[1]}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m`);
}
