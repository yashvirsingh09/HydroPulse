import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';
import { calculateKortewegWaveSpeed } from '../../../core-dsp/dist/src/korteweg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const meta = payload.metadata;

// Let's implement an Adaptive Transients Noise Rejection + Bandpass GCC-PHAT
function adaptiveTransientLocalization(samplesA, samplesB, meta) {
  const fs = meta.sample_rate_hz;
  const L = meta.pipe_length_m;
  const v_s = meta.wave_speed_m_s;
  const n = samplesA.length;

  // Step 1: 4th-order cascaded bandpass filtering (two passes of 2nd order biquad)
  // Center frequency 850 Hz, Q = 2.5
  function createBiquad(fc, Q) {
    const omega = (2.0 * Math.PI * fc) / fs;
    const alpha = Math.sin(omega) / (2.0 * Q);
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1.0 + alpha;
    const a1 = -2.0 * Math.cos(omega);
    const a2 = 1.0 - alpha;
    return {
      b0: b0 / a0, b1: b1 / a0, b2: b2 / a0,
      a1: a1 / a0, a2: a2 / a0,
      w1: 0, w2: 0,
      process(x) {
        const y = this.b0 * x + this.w1;
        this.w1 = this.b1 * x - this.a1 * y + this.w2;
        this.w2 = this.b2 * x - this.a2 * y;
        return y;
      }
    };
  }

  // 4th order filter (cascade 2 biquads)
  const fA1 = createBiquad(850, 2.5);
  const fA2 = createBiquad(850, 2.5);
  const fB1 = createBiquad(850, 2.5);
  const fB2 = createBiquad(850, 2.5);

  const filtA = new Float64Array(n);
  const filtB = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    filtA[i] = fA2.process(fA1.process(samplesA[i]));
    filtB[i] = fB2.process(fB1.process(samplesB[i]));
  }

  // Step 2: Energy envelope detector (Teager-Kaiser / Moving RMS) to find burst arrival window
  // Window size: 50 ms (500 samples)
  const winLen = 300;
  let energyA = 0, maxEnergyA = 0, peakIdxA = 0;
  for (let i = 0; i < n; i++) {
    energyA += filtA[i] * filtA[i];
    if (i >= winLen) energyA -= filtA[i - winLen] * filtA[i - winLen];
    if (energyA > maxEnergyA) {
      maxEnergyA = energyA;
      peakIdxA = i - Math.floor(winLen / 2);
    }
  }

  let energyB = 0, maxEnergyB = 0, peakIdxB = 0;
  for (let i = 0; i < n; i++) {
    energyB += filtB[i] * filtB[i];
    if (i >= winLen) energyB -= filtB[i - winLen] * filtB[i - winLen];
    if (energyB > maxEnergyB) {
      maxEnergyB = energyB;
      peakIdxB = i - Math.floor(winLen / 2);
    }
  }

  console.log(`Detected burst peak A around index: ${peakIdxA}, peak B around index: ${peakIdxB}`);

  // Step 3: Band-limited GCC-PHAT with frequency-domain weighting
  const nFft = nextPowerOfTwo(2 * n);
  const r1 = new Float64Array(nFft);
  const i1 = new Float64Array(nFft);
  const r2 = new Float64Array(nFft);
  const i2 = new Float64Array(nFft);

  for (let i = 0; i < n; i++) {
    r1[i] = filtA[i];
    r2[i] = filtB[i];
  }

  fft(r1, i1, false);
  fft(r2, i2, false);

  const crossR = new Float64Array(nFft);
  const crossI = new Float64Array(nFft);
  const eps = 1e-12;
  const binWidth = fs / nFft;

  // Acoustic pipe band: 400 Hz to 1800 Hz
  for (let k = 0; k < nFft; k++) {
    const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    let weight = 0;
    if (f >= 400 && f <= 1800) {
      // Hann-tapered bandpass weight
      weight = Math.sin(Math.PI * (f - 400) / (1800 - 400));
    }

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    // GCC-PHAT with acoustic band weighting
    crossR[k] = (realProd / mag) * weight;
    crossI[k] = (imagProd / mag) * weight;
  }

  fft(crossR, crossI, true);

  const maxLagSec = (L / v_s) * 1.1;
  const maxLagSamples = Math.floor(maxLagSec * fs);

  const getCorrAtLag = (lag) => {
    if (lag >= 0) return crossR[lag];
    return crossR[nFft + lag];
  };

  let bestLag = 0;
  let maxVal = -Infinity;

  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    const val = getCorrAtLag(lag);
    if (val > maxVal) {
      maxVal = val;
      bestLag = lag;
    }
  }

  // Parabolic interpolation
  let subSample = 0.0;
  if (bestLag > -maxLagSamples && bestLag < maxLagSamples) {
    const a = getCorrAtLag(bestLag - 1);
    const b = getCorrAtLag(bestLag);
    const c = getCorrAtLag(bestLag + 1);
    const denom = 2.0 * (a - 2.0 * b + c);
    if (Math.abs(denom) > 1e-9) {
      subSample = (a - c) / denom;
    }
  }

  const refinedLag = bestLag + subSample;
  const deltaT = refinedLag / fs;
  const estimatedLeak = (L - v_s * deltaT) / 2.0;
  const error = Math.abs(estimatedLeak - meta.ground_truth_leak_m);

  return {
    bestLag,
    refinedLag,
    deltaTMs: deltaT * 1000,
    estimatedLeak,
    error
  };
}

const testRes = adaptiveTransientLocalization(payload.node_a.samples, payload.node_b.samples, meta);
console.log('Adaptive localization result on 6dB burst:', testRes);
