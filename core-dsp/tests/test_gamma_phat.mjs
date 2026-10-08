import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  fft,
  nextPowerOfTwo
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Testing regularized GCC-PHAT with different gamma exponents...');

for (const gamma of [0.0, 0.2, 0.3, 0.5, 0.7, 0.8, 1.0]) {
  let passed = 0;
  let total = 0;
  let errors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxLagSec = (L / v_s) * 1.05;
    const maxLagSamples = Math.floor(maxLagSec * fs);

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
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

        const crossR = new Float64Array(nFft);
        const crossI = new Float64Array(nFft);
        const binWidth = fs / nFft;

        for (let k = 0; k < nFft; k++) {
          const freq = k <= nFft / 2 ? k * binWidth : (nFft - k) * binWidth;
          if (freq >= 500 && freq <= 1500) {
            const realProd = r2[k] * r1[k] + i2[k] * i1[k];
            const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
            const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + 1e-12;
            const weight = 1.0 / Math.pow(mag, gamma);
            crossR[k] = realProd * weight;
            crossI[k] = imagProd * weight;
          }
        }

        fft(crossR, crossI, true);

        let bestLag = 0;
        let maxVal = -Infinity;
        for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
          const val = lag >= 0 ? crossR[lag] : crossR[nFft + lag];
          if (val > maxVal) {
            maxVal = val;
            bestLag = lag;
          }
        }

        // Parabolic interpolation
        let subCorr = 0;
        if (bestLag > -maxLagSamples && bestLag < maxLagSamples) {
          const a = bestLag - 1 >= 0 ? crossR[bestLag - 1] : crossR[nFft + bestLag - 1];
          const b = bestLag >= 0 ? crossR[bestLag] : crossR[nFft + bestLag];
          const c = bestLag + 1 >= 0 ? crossR[bestLag + 1] : crossR[nFft + bestLag + 1];
          const denom = 2 * (a - 2 * b + c);
          if (Math.abs(denom) > 1e-9) {
            subCorr = (a - c) / denom;
            if (Math.abs(subCorr) > 1.0) subCorr = 0;
          }
        }

        const lag = bestLag + subCorr;
        const deltaTSec = lag / fs;
        const estDist = (L - v_s * deltaTSec) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }

  console.log(`gamma=${gamma}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m`);
}
