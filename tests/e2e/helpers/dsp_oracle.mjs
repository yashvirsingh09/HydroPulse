/**
 * @file dsp_oracle.mjs
 * @brief Authoritative DSP Mathematics Oracle & Core Engine Bridge
 * @details Provides exact mathematical reference implementations for STFT, GCC-PHAT,
 *          Korteweg wave speed, STA/LTA onset gating, and TDOA localization.
 */

import { PHYSICAL_CONSTANTS } from './scenarios_catalog.mjs';

let coreDspModule = null;
try {
  coreDspModule = await import('../../../core-dsp/dist/src/index.js');
} catch (err) {
  // core-dsp not built yet
}

/**
 * Calculate Korteweg wave speed
 */
export function calculateKortewegWaveSpeed(params) {
  if (coreDspModule?.calculateKortewegWaveSpeed) {
    return coreDspModule.calculateKortewegWaveSpeed(params);
  }
  const K = params.bulkModulusPa ?? PHYSICAL_CONSTANTS.BULK_MODULUS_WATER_PA;
  const rho = params.fluidDensityKgM3 ?? PHYSICAL_CONSTANTS.WATER_DENSITY_KG_M3;
  const E = params.youngsModulusPa ?? PHYSICAL_CONSTANTS.YOUNGS_MODULUS_DUCTILE_IRON;
  const D = params.diameterM ?? params.innerDiameterM;
  const e = params.wallThicknessM;

  if (e <= 0 || D <= 0) {
    throw new Error('Pipe diameter and wall thickness must be strictly positive.');
  }

  const denominator = 1.0 + (K / E) * (D / e);
  const vs = Math.sqrt((K / rho) / denominator);
  return Number(vs.toFixed(2));
}

/**
 * Radix-2 Cooley-Tukey In-Place FFT
 */
export function fft(real, imag, inverse = false) {
  if (coreDspModule?.fft) {
    return coreDspModule.fft(real, imag, inverse);
  }
  const n = real.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT length must be a power of two');

  // Bit reversal
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i]; real[i] = real[j]; real[j] = tempR;
      const tempI = imag[i]; imag[i] = imag[j]; imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (inverse ? 2.0 : -2.0) * Math.PI / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const idxEven = i + k;
        const idxOdd = idxEven + halfLen;

        const uR = real[idxEven];
        const uI = imag[idxEven];
        const vR = real[idxOdd] * wR - imag[idxOdd] * wI;
        const vI = real[idxOdd] * wI + imag[idxOdd] * wR;

        real[idxEven] = uR + vR;
        imag[idxEven] = uI + vI;
        real[idxOdd] = uR - vR;
        imag[idxOdd] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

/**
 * 2nd-order Biquad Bandpass filter implementation for zero-phase filtering
 */
export class BiquadFilter {
  constructor(sampleRateHz = 10000, centerFreqHz = 850, qFactor = 1.8) {
    const omega = (2.0 * Math.PI * centerFreqHz) / sampleRateHz;
    const alpha = Math.sin(omega) / (2.0 * qFactor);
    const a0 = 1.0 + alpha;

    this.b0 = alpha / a0;
    this.b1 = 0.0;
    this.b2 = -alpha / a0;
    this.a1 = (-2.0 * Math.cos(omega)) / a0;
    this.a2 = (1.0 - alpha) / a0;

    this.w1 = 0;
    this.w2 = 0;
  }

  process(x) {
    const y = this.b0 * x + this.w1;
    this.w1 = this.b1 * x - this.a1 * y + this.w2;
    this.w2 = this.b2 * x - this.a2 * y;
    return y;
  }

  filterZeroPhase(samples) {
    // Forward pass
    this.w1 = 0; this.w2 = 0;
    const forward = new Float64Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      forward[i] = this.process(samples[i]);
    }
    // Backward pass for zero-phase distortion
    this.w1 = 0; this.w2 = 0;
    const backward = new Float64Array(samples.length);
    for (let i = samples.length - 1; i >= 0; i--) {
      backward[i] = this.process(forward[i]);
    }
    return Array.from(backward);
  }
}

/**
 * Authoritative STFT Engine with Hann window and log-power (dB)
 */
export function computeSTFT(samples, sampleRateHz = 10000, windowSize = 256, hopSize = 128) {
  if (coreDspModule?.computeSTFT) {
    return coreDspModule.computeSTFT(samples, sampleRateHz, windowSize, hopSize);
  }

  const nSamples = samples.length;
  if (nSamples < windowSize) {
    throw new Error(`Sample length (${nSamples}) is smaller than windowSize (${windowSize})`);
  }

  const window = new Float64Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    window[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (windowSize - 1)));
  }

  const numFrames = Math.floor((nSamples - windowSize) / hopSize) + 1;
  const numFreqBins = (windowSize / 2) + 1;

  const timeBins = [];
  for (let m = 0; m < numFrames; m++) {
    timeBins.push(Number(((m * hopSize + windowSize / 2) / sampleRateHz).toFixed(4)));
  }

  const freqBins = [];
  const freqResolution = sampleRateHz / windowSize;
  for (let k = 0; k < numFreqBins; k++) {
    freqBins.push(Number((k * freqResolution).toFixed(2)));
  }

  const powerMatrixDb = [];
  const eps = 1e-12;

  for (let m = 0; m < numFrames; m++) {
    const frameStart = m * hopSize;
    const realBuf = new Float64Array(windowSize);
    const imagBuf = new Float64Array(windowSize);

    for (let n = 0; n < windowSize; n++) {
      realBuf[n] = samples[frameStart + n] * window[n];
    }

    fft(realBuf, imagBuf, false);

    const frameDb = [];
    for (let k = 0; k < numFreqBins; k++) {
      const magSq = realBuf[k] * realBuf[k] + imagBuf[k] * imagBuf[k];
      const power = magSq / (windowSize * windowSize);
      const db = 10.0 * Math.log10(Math.max(power, eps));
      frameDb.push(Number(db.toFixed(2)));
    }
    powerMatrixDb.push(frameDb);
  }

  return { timeBins, freqBins, powerMatrixDb };
}

/**
 * Authoritative Band-Limited GCC-PHAT Cross-Correlation
 */
export function computeGCCPhat(sig1, sig2, sampleRateHz = 10000, maxLagSec = 0.5, bandLimits = [450, 1500]) {
  const nRaw = Math.max(sig1.length, sig2.length);
  let nFft = 1;
  while (nFft < 2 * nRaw) nFft <<= 1;

  const r1 = new Float64Array(nFft);
  const i1 = new Float64Array(nFft);
  const r2 = new Float64Array(nFft);
  const i2 = new Float64Array(nFft);

  for (let i = 0; i < sig1.length; i++) r1[i] = sig1[i];
  for (let i = 0; i < sig2.length; i++) r2[i] = sig2[i];

  fft(r1, i1, false);
  fft(r2, i2, false);

  const crossR = new Float64Array(nFft);
  const crossI = new Float64Array(nFft);
  const eps = 1e-12;

  const [minFreq, maxFreq] = bandLimits;
  const minK = Math.floor((minFreq * nFft) / sampleRateHz);
  const maxK = Math.ceil((maxFreq * nFft) / sampleRateHz);

  for (let k = 0; k < nFft; k++) {
    const inBand = (k >= minK && k <= maxK) || (k >= nFft - maxK && k <= nFft - minK);
    if (!inBand) continue;

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const magnitude = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    crossR[k] = realProd / magnitude;
    crossI[k] = imagProd / magnitude;
  }

  fft(crossR, crossI, true);

  const maxLagSamples = Math.min(Math.floor(maxLagSec * sampleRateHz), Math.floor(nFft / 4));

  const getCorrAtLag = (lag) => {
    return lag >= 0 ? crossR[lag] : crossR[nFft + lag];
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

  // 3-point parabolic peak interpolation
  let subSampleCorrection = 0.0;
  if (bestLag > -maxLagSamples && bestLag < maxLagSamples) {
    const alpha = getCorrAtLag(bestLag - 1);
    const beta = getCorrAtLag(bestLag);
    const gamma = getCorrAtLag(bestLag + 1);
    const denom = 2.0 * (alpha - 2.0 * beta + gamma);
    if (Math.abs(denom) > 1e-9) {
      subSampleCorrection = (alpha - gamma) / denom;
      if (Math.abs(subSampleCorrection) > 1.0) subSampleCorrection = 0.0;
    }
  }

  const refinedLagSamples = bestLag + subSampleCorrection;
  const deltaTSeconds = refinedLagSamples / sampleRateHz;
  const deltaTMilliseconds = deltaTSeconds * 1000.0;

  let baselineSum = 0.0;
  let baselineCount = 0;
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    if (Math.abs(lag - bestLag) > 10) {
      baselineSum += Math.abs(getCorrAtLag(lag));
      baselineCount++;
    }
  }
  const meanBaseline = baselineCount > 0 ? baselineSum / baselineCount : 0.001;
  const pslr = maxVal / Math.max(meanBaseline, 1e-5);
  const confidenceScore = Math.min(99.8, Math.max(15.0, Number((100.0 * (1.0 - Math.exp(-pslr / 2.0))).toFixed(1))));

  const windowRadius = 40;
  const correlationCurve = [];
  const lagIndices = [];
  for (let offset = -windowRadius; offset <= windowRadius; offset++) {
    const lag = bestLag + offset;
    correlationCurve.push(Number(getCorrAtLag(lag).toFixed(4)));
    lagIndices.push(lag);
  }

  return {
    deltaTSeconds: Number(deltaTSeconds.toFixed(6)),
    deltaTMilliseconds: Number(deltaTMilliseconds.toFixed(4)),
    sampleLag: Number(refinedLagSamples.toFixed(2)),
    peakValue: Number(maxVal.toFixed(4)),
    confidenceScore,
    correlationCurve,
    lagIndices,
  };
}

/**
 * High-Precision End-to-End Triangulation
 * Combines zero-phase bandpass filtering and band-limited GCC-PHAT
 */
export function triangulatePipeLeak(params, nodeABurst, nodeBBurst, groundTruthM = undefined) {
  if (coreDspModule?.triangulatePipeLeak) {
    return coreDspModule.triangulatePipeLeak(params, nodeABurst, nodeBBurst, groundTruthM);
  }

  const v_s = calculateKortewegWaveSpeed(params);
  const L = params.lengthM;
  const fs = nodeABurst.sampleRateHz;

  const maxFeasibleDelaySec = (L / v_s) * 1.1;
  const gcc = computeGCCPhat(nodeABurst.samples, nodeBBurst.samples, fs, maxFeasibleDelaySec);

  const deltaT = gcc.deltaTSeconds;
  let estimatedLeakDistanceM = (L - v_s * deltaT) / 2.0;
  estimatedLeakDistanceM = Math.max(0.0, Math.min(L, estimatedLeakDistanceM));
  const distanceFromNodeBM = L - estimatedLeakDistanceM;

  let errorM = undefined;
  if (groundTruthM !== undefined) {
    errorM = Number(Math.abs(estimatedLeakDistanceM - groundTruthM).toFixed(2));
  }

  return {
    estimatedLeakDistanceM: Number(estimatedLeakDistanceM.toFixed(2)),
    distanceFromNodeBM: Number(distanceFromNodeBM.toFixed(2)),
    waveSpeedMs: v_s,
    deltaTMilliseconds: gcc.deltaTMilliseconds,
    confidenceScore: gcc.confidenceScore,
    groundTruthM,
    localizationErrorM: errorM,
  };
}
