import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  computeSTALTA,
  extractGatedWindow,
  computeGCCPhat
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;
  const transitSamples = Math.round((L / v_s) * fs);
  const expectedSum = 1000 + transitSamples;

  for (const snr of [24, 18]) {
    for (const seed of [101]) {
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

      const staA = computeSTALTA(cleanA, 50, 400);
      const staB = computeSTALTA(cleanB, 50, 400);

      const listA = [staA.primaryOnsetIndex, ...staA.topTriggers.map(t => t.index)];
      const listB = [staB.primaryOnsetIndex, ...staB.topTriggers.map(t => t.index)];

      let bestPair = null;
      let minSumDiff = Infinity;

      for (const a of listA) {
        for (const b of listB) {
          const sumDiff = Math.abs((a + b) - expectedSum);
          if (sumDiff < minSumDiff) {
            minSumDiff = sumDiff;
            bestPair = { a, b };
          }
        }
      }

      const gated = extractGatedWindow(cleanA, cleanB, bestPair.a, bestPair.b, 1024, 256);
      const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, fs, 64 / fs, {
        minFreqHz: 300,
        maxFreqHz: 2200,
        bandLimited: true
      });
      const totalLagSamples = gated.baseOffsetSamples + gcc.sampleLag;
      const deltaTSec = totalLagSamples / fs;
      const estDist = (L - v_s * deltaTSec) / 2.0;
      const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
      console.log(`${scen.id} SNR=${snr}: a=${bestPair.a}, b=${bestPair.b}, sumDiff=${minSumDiff}, sampleLag=${gcc.sampleLag}, totalLag=${totalLagSamples}, estDist=${estDist.toFixed(2)}, GT=${burst.metadata.ground_truth_leak_m}, err=${err.toFixed(3)}m`);
    }
  }
}
