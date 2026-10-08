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

console.log('Testing Candidate-Pair Transient Gating across all 80 runs...');

let total = 0;
let passed = 0;
let allErrors = [];

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;
  const maxDelaySec = (L / v_s) * 1.05;
  const maxLagSamples = Math.floor(maxDelaySec * fs);

  for (const snr of snrLevels) {
    for (const seed of seeds) {
      total++;
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

      const staA = computeSTALTA(cleanA, 50, 400);
      const staB = computeSTALTA(cleanB, 50, 400);

      // Collect candidate onset triggers
      const candidatesA = [staA.primaryOnsetIndex, ...staA.topTriggers.map(t => t.index)];
      const candidatesB = [staB.primaryOnsetIndex, ...staB.topTriggers.map(t => t.index)];

      // Deduplicate
      const uniqueA = [...new Set(candidatesA)];
      const uniqueB = [...new Set(candidatesB)];

      let bestScore = -Infinity;
      let bestResult = null;

      const winLen = 1024;
      const preTrigger = 256;
      const maxSegmentDelaySec = 64 / fs; // Search +/- 64 samples around onset alignment!

      for (const tA of uniqueA) {
        for (const tB of uniqueB) {
          const lagDiff = tB - tA;
          // Must satisfy physical acoustic travel time constraint
          if (Math.abs(lagDiff) > maxLagSamples) continue;

          const gated = extractGatedWindow(cleanA, cleanB, tA, tB, winLen, preTrigger);
          const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, fs, maxSegmentDelaySec, {
            minFreqHz: 300,
            maxFreqHz: 2200,
            bandLimited: true
          });

          // Overall lag
          const totalLagSamples = gated.baseOffsetSamples + gcc.sampleLag;
          if (Math.abs(totalLagSamples) > maxLagSamples) continue;

          // Score by peak correlation value * confidenceScore
          const score = gcc.peakValue * gcc.confidenceScore;
          if (score > bestScore) {
            bestScore = score;
            const deltaTSec = totalLagSamples / fs;
            const estDist = (L - v_s * deltaTSec) / 2.0;
            bestResult = {
              totalLagSamples,
              deltaTSec,
              estDist,
              gcc
            };
          }
        }
      }

      if (!bestResult) {
        // Fallback to primary
        const gated = extractGatedWindow(cleanA, cleanB, staA.primaryOnsetIndex, staB.primaryOnsetIndex, winLen, preTrigger);
        const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, fs, maxSegmentDelaySec, {
          minFreqHz: 300,
          maxFreqHz: 2200,
          bandLimited: true
        });
        const totalLagSamples = gated.baseOffsetSamples + gcc.sampleLag;
        const deltaTSec = totalLagSamples / fs;
        const estDist = (L - v_s * deltaTSec) / 2.0;
        bestResult = { totalLagSamples, deltaTSec, estDist, gcc };
      }

      const err = Math.abs(bestResult.estDist - burst.metadata.ground_truth_leak_m);
      allErrors.push(err);
      if (err <= 1.5) {
        passed++;
      } else {
        console.log(`FAIL: ${scen.id} SNR=${snr} Seed=${seed}: err=${err.toFixed(2)}m (GT=${burst.metadata.ground_truth_leak_m}, est=${bestResult.estDist.toFixed(2)})`);
      }
    }
  }
}

console.log(`\nOverall passed: ${passed} / ${total} (${((passed/total)*100).toFixed(1)}%)`);
console.log(`Mean error: ${(allErrors.reduce((a,b)=>a+b,0)/total).toFixed(3)}m, Max error: ${Math.max(...allErrors).toFixed(3)}m`);
