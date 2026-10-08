import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  computeGCCPhat,
  computeSTALTA,
  extractGatedWindow
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Evaluating different triangulation strategies...');

// Strategy 1: How does direct GCC-PHAT perform if passband is around the burst resonance [600, 1200] Hz?
{
  let passed = 0, total = 0, errors = [];
  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxDelay = (L / v_s) * 1.05;

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 600, 1200);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 600, 1200);

        const gcc = computeGCCPhat(cleanA, cleanB, fs, maxDelay, { minFreqHz: 600, maxFreqHz: 1200, bandLimited: true });
        const estDist = (L - v_s * gcc.deltaTSeconds) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }
  console.log(`Strategy 1 (Resonant Bandpass 600-1200 Hz Direct GCC-PHAT): passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m`);
}
