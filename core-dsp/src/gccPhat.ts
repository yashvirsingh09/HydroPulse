/**
 * @file gccPhat.ts
 * @brief Generalized Cross-Correlation with Phase Transform (GCC-PHAT)
 * @details Extracts high-precision Time Difference of Arrival (TDOA) between dual sensor streams.
 */

import { fft, nextPowerOfTwo } from './fft.js';
import { GCCPhatResult, GCCPhatOptions } from './types.js';

export function computeGCCPhat(
  sig1: number[] | Float64Array,
  sig2: number[] | Float64Array,
  sampleRateHz: number = 10000,
  maxLagSec: number = 0.5,
  options?: GCCPhatOptions
): GCCPhatResult {
  const minFreqHz = options?.minFreqHz ?? 450;
  const maxFreqHz = options?.maxFreqHz ?? 1500;
  const bandLimited = options?.bandLimited ?? true;
  const taperWidthHz = options?.taperWidthHz ?? 100;

  const nRaw = Math.max(sig1.length, sig2.length);
  const nFft = nextPowerOfTwo(2 * nRaw);

  const r1 = new Float64Array(nFft);
  const i1 = new Float64Array(nFft);
  const r2 = new Float64Array(nFft);
  const i2 = new Float64Array(nFft);

  // Copy raw samples into buffers
  for (let i = 0; i < sig1.length; i++) r1[i] = sig1[i];
  for (let i = 0; i < sig2.length; i++) r2[i] = sig2[i];

  // Forward FFT for both channels
  fft(r1, i1, false);
  fft(r2, i2, false);

  // Cross-spectral density: G12(w) = X2(w) * conj(X1(w))
  // Band-Limited Whitening: G12_phat(w) = W(w) * [ G12(w) / (|G12(w)| + eps) ]
  const crossR = new Float64Array(nFft);
  const crossI = new Float64Array(nFft);
  const eps = 1e-12;
  const binWidthHz = sampleRateHz / nFft;

  for (let k = 0; k < nFft; k++) {
    // Determine physical frequency of bin k
    const freqHz = k <= nFft / 2 ? k * binWidthHz : (nFft - k) * binWidthHz;

    let spectralWeight = 1.0;
    if (bandLimited) {
      if (freqHz >= minFreqHz && freqHz <= maxFreqHz) {
        if (freqHz < minFreqHz + taperWidthHz) {
          spectralWeight = 0.5 * (1.0 - Math.cos((Math.PI * (freqHz - minFreqHz)) / taperWidthHz));
        } else if (freqHz > maxFreqHz - taperWidthHz) {
          spectralWeight = 0.5 * (1.0 - Math.cos((Math.PI * (maxFreqHz - freqHz)) / taperWidthHz));
        } else {
          spectralWeight = 1.0;
        }
      } else {
        spectralWeight = 0.0;
      }
    }

    if (spectralWeight > 0.0) {
      // (r2 + j*i2) * (r1 - j*i1)
      const realProd = r2[k] * r1[k] + i2[k] * i1[k];
      const imagProd = i2[k] * r1[k] - r2[k] * i1[k];

      const magnitude = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

      crossR[k] = (realProd / magnitude) * spectralWeight;
      crossI[k] = (imagProd / magnitude) * spectralWeight;
    }
  }

  // Inverse FFT to recover time-domain cross-correlation
  fft(crossR, crossI, true);

  // Map physical lag k in [-maxLag, +maxLag] to IFFT output index
  const maxLagSamples = Math.min(Math.floor(maxLagSec * sampleRateHz), Math.floor(nFft / 4));

  const getCorrAtLag = (lag: number): number => {
    if (lag >= 0 && lag < nFft) {
      return crossR[lag];
    } else if (lag < 0 && nFft + lag >= 0 && nFft + lag < nFft) {
      return crossR[nFft + lag];
    }
    return 0.0;
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

  // 3-point parabolic peak interpolation for sub-sample accuracy
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

  // PSLR (Peak-to-Sidelobe Ratio) for confidence score
  let baselineSum = 0.0;
  let baselineCount = 0;
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    if (Math.abs(lag - bestLag) > 15) {
      baselineSum += Math.abs(getCorrAtLag(lag));
      baselineCount++;
    }
  }
  const meanBaseline = baselineCount > 0 ? baselineSum / baselineCount : 0.001;
  const pslr = maxVal / Math.max(meanBaseline, 1e-5);
  const confidenceScore = Math.min(
    99.8,
    Math.max(15.0, Number((100.0 * (1.0 - Math.exp(-pslr / 2.0))).toFixed(1)))
  );

  // Extract visualization window of 80 points around peak
  const windowRadius = 40;
  const correlationCurve: number[] = [];
  const lagIndices: number[] = [];

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
    lagIndices
  };
}
