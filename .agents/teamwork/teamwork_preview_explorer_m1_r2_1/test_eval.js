import { DELHI_PIPE_SCENARIOS, generateScenarioBurst, calculateKortewegWaveSpeed } from '../../../core-dsp/dist/src/index.js';
import { zeroPhaseBandpass, extractGatedWindow } from '../../../core-dsp/dist/src/adaptiveFilter.js';
import { computeGCCPhat } from '../../../core-dsp/dist/src/gccPhat.js';

function mySTALTA(samples, staSamples = 50, ltaSamples = 400) {
  const n = samples.length;
  const ratio = new Float64Array(n);
  let staSum = 0, ltaSum = 0;
  for (let i = 0; i < n; i++) {
    const v2 = samples[i] * samples[i];
    staSum += v2; ltaSum += v2;
    if (i >= staSamples) staSum -= samples[i - staSamples] * samples[i - staSamples];
    if (i >= ltaSamples) ltaSum -= samples[i - ltaSamples] * samples[i - ltaSamples];
    if (i >= ltaSamples) {
      ratio[i] = (staSum / staSamples) / (ltaSum / ltaSamples + 1e-9);
    }
  }
  const peaks = [];
  for (let i = ltaSamples + 1; i < n - 1; i++) {
    if (ratio[i] > ratio[i - 1] && ratio[i] > ratio[i + 1] && ratio[i] >= 1.5) {
      peaks.push({ index: i, ratio: ratio[i] });
    }
  }
  // Sort by ratio DESCENDING
  peaks.sort((a, b) => b.ratio - a.ratio);
  const filteredPeaks = [];
  for (const p of peaks) {
    if (filteredPeaks.every(fp => Math.abs(fp.index - p.index) > 200)) {
      filteredPeaks.push(p);
      if (filteredPeaks.length >= 6) break;
    }
  }
  const primaryOnset = filteredPeaks.length > 0 ? filteredPeaks[0].index : ltaSamples;
  return { primaryOnsetIndex: primaryOnset, topTriggers: filteredPeaks };
}

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrs = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];

let total = 0, passed = 0;
const errors = [];
const failures = [];

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;
  const truth = scen.defaultRuptureDistanceM;
  for (const snr of snrs) {
    for (const seed of seeds) {
      total++;
      const burst = generateScenarioBurst(scen.id, { snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);
      const staA = mySTALTA(cleanA, 50, 400);
      const staB = mySTALTA(cleanB, 50, 400);
      const winLen = 1024;
      const maxFeasibleDelaySec = (L / v_s) * 1.05;
      const maxDelaySamples = Math.ceil(maxFeasibleDelaySec * 10000);

      let bestDeltaT = (staB.primaryOnsetIndex - staA.primaryOnsetIndex) / 10000;
      let bestPeak = -1;

      // Evaluate candidate onset pairs
      const candA = staA.topTriggers.slice(0, 3);
      const candB = staB.topTriggers.slice(0, 3);

      for (const trA of candA) {
        for (const trB of candB) {
          const baseOffset = trB.index - trA.index;
          if (Math.abs(baseOffset) > maxDelaySamples) continue;

          const gated = extractGatedWindow(cleanA, cleanB, trA.index, trB.index, winLen, 256);
          const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, 10000, 0.008, { minFreqHz: 450, maxFreqHz: 1500, bandLimited: true });
          const totalLagSec = (baseOffset + gcc.deltaTSeconds * 10000) / 10000;
          if (Math.abs(totalLagSec) > maxFeasibleDelaySec) continue;

          // Score: cross-spectral peak confidence
          if (gcc.peakValue > bestPeak) {
            bestPeak = gcc.peakValue;
            bestDeltaT = totalLagSec;
          }
        }
      }

      let est = (L - v_s * bestDeltaT) / 2;
      est = Math.max(0, Math.min(L, est));
      const err = Math.abs(est - truth);
      errors.push(err);
      if (err <= 1.5) {
        passed++;
      } else {
        failures.push({ scen: scen.id, snr, seed, err: Number(err.toFixed(3)), est: Number(est.toFixed(2)), truth });
      }
    }
  }
}

console.log(`Passed: ${passed} / ${total} (${(passed/total*100).toFixed(1)}%)`);
console.log(`Mean Error: ${(errors.reduce((a,b)=>a+b,0)/errors.length).toFixed(3)} m`);
console.log(`Max Error: ${Math.max(...errors).toFixed(3)} m`);
if (failures.length > 0) {
  console.log('Failures:');
  console.table(failures);
}
