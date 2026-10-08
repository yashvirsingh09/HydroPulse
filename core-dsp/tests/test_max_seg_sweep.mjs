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

console.log('Testing constrained maxSegmentDelaySec across all 80 runs...');

for (const maxSegSamples of [40, 60, 80, 100, 120]) {
  let passed = 0, total = 0, errors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxDelaySec = (L / v_s) * 1.05;

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

        const staA = computeSTALTA(cleanA, 50, 400);
        const staB = computeSTALTA(cleanB, 50, 400);

        const winLen = Math.min(2048, Math.max(1024, Math.ceil((L / v_s) * fs * 1.5)));
        const gated = extractGatedWindow(cleanA, cleanB, staA.primaryOnsetIndex, staB.primaryOnsetIndex, winLen, 256);

        const maxSegmentDelaySec = maxSegSamples / fs;
        const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, fs, maxSegmentDelaySec, {
          minFreqHz: 300,
          maxFreqHz: 2200,
          bandLimited: true
        });

        const totalLagSamples = gated.baseOffsetSamples + gcc.sampleLag;
        const deltaTSec = totalLagSamples / fs;
        const estDist = (L - v_s * deltaTSec) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }

  console.log(`maxSegSamples=${maxSegSamples}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m`);
}
