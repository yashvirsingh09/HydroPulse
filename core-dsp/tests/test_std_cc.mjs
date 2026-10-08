import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  fft,
  nextPowerOfTwo
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const fs = 10000;
const maxDelaySec = (L / v_s) * 1.05;
const maxLagSamples = Math.floor(maxDelaySec * fs);

console.log('Testing cross-correlation algorithms on Bawana...');

for (const snr of [24, 18, 12, 6]) {
  for (const seed of [101, 202, 303, 404, 505]) {
    const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
    const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
    const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

    const nRaw = Math.max(cleanA.length, cleanB.length);
    const nFft = nextPowerOfTwo(2 * nRaw);

    const r1 = new Float64Array(nFft);
    const i1 = new Float64Array(nFft);
    const r2 = new Float64Array(nFft);
    const i2 = new Float64Array(nFft);

    for (let i = 0; i < cleanA.length; i++) r1[i] = cleanA[i];
    for (let i = 0; i < cleanB.length; i++) r2[i] = cleanB[i];

    fft(r1, i1, false);
    fft(r2, i2, false);

    // Test 1: Standard Cross-Correlation (no whitening): X2 * conj(X1)
    const crossR_std = new Float64Array(nFft);
    const crossI_std = new Float64Array(nFft);
    for (let k = 0; k < nFft; k++) {
      crossR_std[k] = r2[k] * r1[k] + i2[k] * i1[k];
      crossI_std[k] = i2[k] * r1[k] - r2[k] * i1[k];
    }
    fft(crossR_std, crossI_std, true);

    let bestLagStd = 0;
    let maxValStd = -Infinity;
    for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
      const val = lag >= 0 ? crossR_std[lag] : crossR_std[nFft + lag];
      if (val > maxValStd) {
        maxValStd = val;
        bestLagStd = lag;
      }
    }

    // Parabolic interpolation on std
    let subCorr = 0;
    const a = bestLagStd - 1 >= 0 ? crossR_std[bestLagStd - 1] : crossR_std[nFft + bestLagStd - 1];
    const b = bestLagStd >= 0 ? crossR_std[bestLagStd] : crossR_std[nFft + bestLagStd];
    const c = bestLagStd + 1 >= 0 ? crossR_std[bestLagStd + 1] : crossR_std[nFft + bestLagStd + 1];
    const denom = 2 * (a - 2 * b + c);
    if (Math.abs(denom) > 1e-9) {
      subCorr = (a - c) / denom;
      if (Math.abs(subCorr) > 1.0) subCorr = 0;
    }
    const lagStd = bestLagStd + subCorr;
    const deltaTStd = lagStd / fs;
    const estDistStd = (L - v_s * deltaTStd) / 2.0;
    const errStd = Math.abs(estDistStd - burst.metadata.ground_truth_leak_m);

    console.log(`SNR=${snr}dB Seed=${seed}: Standard CC Lag=${lagStd.toFixed(2)}, EstDist=${estDistStd.toFixed(2)}m, Err=${errStd.toFixed(3)}m (GT=${burst.metadata.ground_truth_leak_m}m)`);
  }
}
