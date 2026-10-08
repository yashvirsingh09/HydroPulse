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

// Max arrival time physically possible
const maxTransitTimeSec = 0.05 + (L / v_s) + 0.05; // 50ms margin
const maxSearchSample = Math.min(10000, Math.floor(maxTransitTimeSec * fs));
console.log(`Max search sample for Bawana: ${maxSearchSample}`);

for (const snr of [24, 18, 12, 6]) {
  console.log(`\n--- SNR = ${snr} dB ---`);
  for (const seed of [101, 202, 303, 404, 505]) {
    const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
    const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
    const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

    const trueDeltaT = burst.metadata.ground_truth_delta_t_ms * 1e-3;
    const trueLag = Math.round(trueDeltaT * fs);

    const W = 300;
    let bestLag = 0;
    let globalMaxCoherence = -Infinity;
    let bestTime = 0;

    for (let lag = -maxLagSamples; lag <= maxLagSamples; lag += 1) {
      const startI = Math.max(0, -lag);
      const endI = Math.min(maxSearchSample, cleanA.length, cleanB.length - lag);

      let currentDot = 0;
      let currentNormA = 0;
      let currentNormB = 0;
      for (let i = startI; i < startI + W && i < endI; i++) {
        currentDot += cleanA[i] * cleanB[i + lag];
        currentNormA += cleanA[i] * cleanA[i];
        currentNormB += cleanB[i + lag] * cleanB[i + lag];
      }

      for (let i = startI; i < endI - W; i += 10) {
        if (i > startI) {
          for (let k = 0; k < 10; k++) {
            const outIdx = i - 10 + k;
            const inIdx = i + W - 10 + k;
            currentDot += cleanA[inIdx] * cleanB[inIdx + lag] - cleanA[outIdx] * cleanB[outIdx + lag];
            currentNormA += cleanA[inIdx] * cleanA[inIdx] - cleanA[outIdx] * cleanA[outIdx];
            currentNormB += cleanB[inIdx + lag] * cleanB[inIdx + lag] - cleanB[outIdx + lag] * cleanB[outIdx + lag];
          }
        }

        const denom = Math.sqrt(currentNormA * currentNormB) + 1e-9;
        const normCorr = currentDot / denom;
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
