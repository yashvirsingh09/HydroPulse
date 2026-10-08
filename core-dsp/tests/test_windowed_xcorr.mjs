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
const maxLagSamples = Math.floor((L / v_s) * fs);

for (const snr of [24, 18, 12, 6]) {
  console.log(`\n--- SNR = ${snr} dB ---`);
  for (const seed of [101, 202, 303, 404, 505]) {
    const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
    const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
    const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

    const trueDeltaT = burst.metadata.ground_truth_delta_t_ms * 1e-3;
    const trueLag = Math.round(trueDeltaT * fs);

    // Let's test: for each candidate lag tau in [-maxLagSamples, maxLagSamples]:
    // In time domain, if Channel B is shifted by tau:
    // sB_shifted[i] = cleanB[i + tau].
    // What is the correlation between cleanA and cleanB with a sliding window of length W?
    // Let's compute the localized energy of cleanA[i] * cleanB[i + tau]!
    const W = 300; // 30ms burst window
    let bestLag = 0;
    let globalMaxCoherence = -Infinity;
    let bestTime = 0;

    for (let lag = -maxLagSamples; lag <= maxLagSamples; lag += 2) {
      // For this lag, compute moving window dot product sum
      const startI = Math.max(0, -lag);
      const endI = Math.min(cleanA.length, cleanB.length - lag);
      
      // Moving dot product of length W
      let currentDot = 0;
      let currentNormA = 0;
      let currentNormB = 0;
      for (let i = startI; i < startI + W && i < endI; i++) {
        currentDot += cleanA[i] * cleanB[i + lag];
        currentNormA += cleanA[i] * cleanA[i];
        currentNormB += cleanB[i + lag] * cleanB[i + lag];
      }

      for (let i = startI; i < endI - W; i += 20) {
        if (i > startI) {
          for (let k = 0; k < 20; k++) {
            const outIdx = i - 20 + k;
            const inIdx = i + W - 20 + k;
            currentDot += cleanA[inIdx] * cleanB[inIdx + lag] - cleanA[outIdx] * cleanB[outIdx + lag];
            currentNormA += cleanA[inIdx] * cleanA[inIdx] - cleanA[outIdx] * cleanA[outIdx];
            currentNormB += cleanB[inIdx + lag] * cleanB[inIdx + lag] - cleanB[outIdx + lag] * cleanB[outIdx + lag];
          }
        }

        const denom = Math.sqrt(currentNormA * currentNormB) + 1e-9;
        const normCorr = currentDot / denom;
        // Also weight by energy: dot product itself
        const metric = currentDot * Math.max(0, normCorr);

        if (metric > globalMaxCoherence) {
          globalMaxCoherence = metric;
          bestLag = lag;
          bestTime = i;
        }
      }
    }

    const estDist = (L - v_s * (bestLag / fs)) / 2.0;
    const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
    console.log(`Seed=${seed}: TrueLag=${trueLag}, BestLag=${bestLag}, BestTime=${bestTime}, Err=${err.toFixed(2)}m`);
  }
}
