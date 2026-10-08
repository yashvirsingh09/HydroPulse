import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const fs = 10000;

console.log('Testing Windowed Cross-Correlation at candidate locations...');

for (const snr of [24, 18, 12, 6]) {
  for (const seed of [101, 202, 303, 404, 505]) {
    const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
    const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
    const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

    const W = 400; // 40ms window
    let bestX = 0;
    let maxPeak = -Infinity;
    let bestFineLag = 0;

    // Test candidate x with 1-meter step
    for (let x = 0; x <= L; x += 1.0) {
      const idxA = Math.round((0.05 + x / v_s) * fs);
      const idxB = Math.round((0.05 + (L - x) / v_s) * fs);

      if (idxA + W > cleanA.length || idxB + W > cleanB.length) continue;

      // Cross-correlate subA and subB over a small search lag [-20, 20] samples
      let localMax = -Infinity;
      let localBestLag = 0;

      for (let lag = -20; lag <= 20; lag++) {
        let sum = 0;
        let nA = 0;
        let nB = 0;
        const start = Math.max(0, -lag);
        const end = Math.min(W, W - lag);
        for (let i = start; i < end; i++) {
          const a = cleanA[idxA + i];
          const b = cleanB[idxB + i + lag];
          sum += a * b;
          nA += a * a;
          nB += b * b;
        }
        const val = sum / (Math.sqrt(nA * nB) + 1e-9);
        if (val > localMax) {
          localMax = val;
          localBestLag = lag;
        }
      }

      if (localMax > maxPeak) {
        maxPeak = localMax;
        bestX = x;
        bestFineLag = localBestLag;
      }
    }

    // Refined x
    const refinedX = bestX - (bestFineLag / fs * v_s) / 2.0;
    const err = Math.abs(refinedX - burst.metadata.ground_truth_leak_m);
    console.log(`SNR=${snr}dB Seed=${seed}: estX=${refinedX.toFixed(2)}m (GT=${burst.metadata.ground_truth_leak_m}m), Err=${err.toFixed(3)}m, peak=${maxPeak.toFixed(3)}`);
  }
}
