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

console.log('Testing Acoustic Transit Conservation on all 80 runs...');

let foundCount = 0;
let total = 0;
let allErrors = [];

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;
  const transitSamples = Math.round((L / v_s) * fs);
  const expectedSum = 1000 + transitSamples; // 2 * 50ms * fs + L/v_s * fs

  for (const snr of snrLevels) {
    for (const seed of seeds) {
      total++;
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

      const staA = computeSTALTA(cleanA, 50, 400);
      const staB = computeSTALTA(cleanB, 50, 400);

      const listA = [staA.primaryOnsetIndex, ...staA.topTriggers.map(t => t.index)];
      const listB = [staB.primaryOnsetIndex, ...staB.topTriggers.map(t => t.index)];

      // Find pair (a, b) that best minimizes |(a + b) - expectedSum|
      let bestPair = null;
      let minSumDiff = Infinity;

      for (const a of listA) {
        if (a < 450 || a > 550 + transitSamples) continue;
        for (const b of listB) {
          if (b < 450 || b > 550 + transitSamples) continue;
          const sumDiff = Math.abs((a + b) - expectedSum);
          if (sumDiff < minSumDiff) {
            minSumDiff = sumDiff;
            bestPair = { a, b };
          }
        }
      }

      if (bestPair && minSumDiff <= 150) {
        foundCount++;
        // Now refine with GCC-PHAT
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
        allErrors.push(err);
      } else {
        allErrors.push(999);
        console.log(`NO PAIR: ${scen.id} SNR=${snr} Seed=${seed}: minSumDiff=${minSumDiff}`);
      }
    }
  }
}

const passed = allErrors.filter(e => e <= 1.5).length;
console.log(`\nPairs matching physical conservation: ${foundCount} / ${total} (${((foundCount/total)*100).toFixed(1)}%)`);
console.log(`Passed <= 1.5m: ${passed} / ${total} (${((passed/total)*100).toFixed(1)}%)`);
console.log(`Max error of passed: ${Math.max(...allErrors.filter(e => e <= 1.5)).toFixed(3)}m`);
