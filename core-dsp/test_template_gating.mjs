import { generateSyntheticBurst, computeGCCPhat, zeroPhaseBandpass, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const fs = 10000;
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const maxDelaySec = (L / v_s) * 1.05;

for (let r = 0; r < 5; r++) {
  const seed = [101, 202, 303, 404, 505][r];
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed });
  const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 450, 1500);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 450, 1500);

  // 1. Find the prominent transient trigger in cleanA:
  // STA/LTA or energy peak
  let maxSq = 0, peakA = 0;
  // Let's compute STA/LTA on cleanA
  let staSum = 0, ltaSum = 0;
  let maxRatio = 0;
  for (let i = 0; i < cleanA.length; i++) {
    const v = cleanA[i] * cleanA[i];
    staSum += v; ltaSum += v;
    if (i >= 50) staSum -= cleanA[i - 50] * cleanA[i - 50];
    if (i >= 400) ltaSum -= cleanA[i - 400] * cleanA[i - 400];
    if (i >= 400) {
      const rat = (staSum / 50) / (ltaSum / 400 + 1e-9);
      if (rat > maxRatio) {
        maxRatio = rat;
        peakA = i;
      }
    }
  }

  // Onset is roughly ~45 samples before peak ratio
  const triggerA = Math.max(0, peakA - 45);

  // Now, what is the feasible range for Node B?
  // Since rupture happens at x in [0, L]:
  // t_B - t_A = (L - 2x) / v_s => deltaT in [-L/v_s, +L/v_s]
  // In samples: deltaSamples in [-maxLag, +maxLag]
  const maxLagSamples = Math.round((L / v_s) * fs);

  // Extract a template from cleanA around triggerA
  const winLen = 1024;
  const preTrigger = 256;
  const startA = Math.max(0, Math.min(cleanA.length - winLen, triggerA - preTrigger));
  const templateA = cleanA.slice(startA, startA + winLen);

  // Cross-correlate templateA against cleanB to find triggerB!
  // Search lag in [startA - maxLagSamples, startA + maxLagSamples]
  let bestCorr = -Infinity;
  let bestStartB = startA;

  // Compute normalized cross-correlation or standard cross-correlation
  const minStartB = Math.max(0, startA - maxLagSamples);
  const maxStartB = Math.min(cleanB.length - winLen, startA + maxLagSamples);

  // Fast cross-correlation using frequency domain or time domain
  for (let sB = minStartB; sB <= maxStartB; sB += 4) { // coarse search every 4 samples
    let dot = 0, normB = 0;
    for (let i = 0; i < winLen; i += 2) {
      dot += templateA[i] * cleanB[sB + i];
      normB += cleanB[sB + i] * cleanB[sB + i];
    }
    const score = dot / Math.sqrt(normB + 1e-9);
    if (score > bestCorr) {
      bestCorr = score;
      bestStartB = sB;
    }
  }

  // Refine coarse search around bestStartB
  let refinedStartB = bestStartB;
  let fineBest = -Infinity;
  for (let sB = Math.max(minStartB, bestStartB - 8); sB <= Math.min(maxStartB, bestStartB + 8); sB++) {
    let dot = 0, normB = 0;
    for (let i = 0; i < winLen; i++) {
      dot += templateA[i] * cleanB[sB + i];
      normB += cleanB[sB + i] * cleanB[sB + i];
    }
    const score = dot / Math.sqrt(normB + 1e-9);
    if (score > fineBest) {
      fineBest = score;
      refinedStartB = sB;
    }
  }

  // Now extract gated frames:
  const gatedA = cleanA.slice(startA, startA + winLen);
  const gatedB = cleanB.slice(refinedStartB, refinedStartB + winLen);

  // Fine GCC-PHAT on the gated segment with small maxSegmentDelay
  const gcc = computeGCCPhat(gatedA, gatedB, fs, 0.015, { minFreqHz: 450, maxFreqHz: 1500, bandLimited: true });
  const totalLagSamples = (refinedStartB - startA) + gcc.sampleLag;
  const deltaTSec = totalLagSamples / fs;
  const estDist = (L - v_s * deltaTSec) / 2.0;
  const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);

  console.log(`Run ${r+1}: peakA=${peakA}, refinedStartB-startA=${refinedStartB-startA}, residual=${gcc.sampleLag.toFixed(2)}, totalLag=${totalLagSamples.toFixed(2)} | estDist=${estDist.toFixed(2)}, err=${err.toFixed(3)}m`);
}
