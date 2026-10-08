/**
 * @file spectrogram.ts
 * @brief High-Performance Real-Time Short-Time Fourier Transform (STFT) Engine
 * @details Computes 2D time-frequency spectrogram representations for acoustic transients
 * utilizing precomputed Hann windowing, in-place Cooley-Tukey Radix-2 FFT, and log-magnitude (dB) power scaling.
 * 
 * Zero external dependencies; leverages pure TypeScript Float64Array arithmetic.
 */

import { fft, nextPowerOfTwo } from './fft.js';
import { SpectrogramData, STFTOptions } from './types.js';

/**
 * Default STFT parameters optimized for 10 kHz acoustic pipe rupture transients
 */
export const DEFAULT_STFT_WINDOW_SIZE = 128; // 12.8 ms window at 10 kHz
export const DEFAULT_STFT_HOP_SIZE = 32;     // 3.2 ms hop (75% overlap)
export const DEFAULT_DYNAMIC_RANGE_DB = 80;  // 80 dB dynamic range floor

/**
 * Generates a precomputed symmetric Hann window buffer.
 * w[n] = 0.5 * (1 - cos(2 * PI * n / (N - 1)))
 * 
 * @param size Window length (must be >= 1)
 * @returns Float64Array of window coefficients
 */
export function createHannWindow(size: number): Float64Array {
  if (size <= 0) {
    throw new Error('Hann window size must be greater than zero.');
  }
  const window = new Float64Array(size);
  if (size === 1) {
    window[0] = 1.0;
    return window;
  }
  const denominator = size - 1;
  const factor = (2.0 * Math.PI) / denominator;
  for (let n = 0; n < size; n++) {
    window[n] = 0.5 * (1.0 - Math.cos(factor * n));
  }
  return window;
}

/**
 * Computes frequency bin center values in Hz from 0 to Nyquist (f_s / 2).
 * Bin count is (windowSize / 2) + 1.
 * 
 * @param windowSize FFT frame size N
 * @param sampleRateHz Sampling rate in Hz
 * @returns Array of bin center frequencies
 */
export function calculateFrequencyBins(windowSize: number, sampleRateHz: number): number[] {
  const numBins = (windowSize >> 1) + 1;
  const freqStep = sampleRateHz / windowSize;
  const bins = new Array<number>(numBins);
  for (let k = 0; k < numBins; k++) {
    bins[k] = Number((k * freqStep).toFixed(2));
  }
  return bins;
}

/**
 * Normalizes a 2D decibel power matrix into a [0.0, 1.0] intensity range.
 * Clamps values below (maxDb - dynamicRangeDb) to 0.0, and maps maxDb to 1.0.
 * 
 * @param powerMatrix 2D array of decibel values [timeIndex][freqBinIndex]
 * @param dynamicRangeDb Dynamic range floor in dB (default: 80 dB)
 * @returns 2D array normalized to [0.0, 1.0]
 */
export function normalizePowerMatrix(
  powerMatrix: number[][],
  dynamicRangeDb: number = DEFAULT_DYNAMIC_RANGE_DB
): number[][] {
  if (powerMatrix.length === 0 || powerMatrix[0].length === 0) {
    return [];
  }

  let maxDb = -Infinity;
  for (let t = 0; t < powerMatrix.length; t++) {
    const row = powerMatrix[t];
    for (let f = 0; f < row.length; f++) {
      if (row[f] > maxDb) {
        maxDb = row[f];
      }
    }
  }

  if (!Number.isFinite(maxDb)) {
    return powerMatrix.map((row) => row.map(() => 0.0));
  }

  const floorDb = maxDb - dynamicRangeDb;
  const range = maxDb - floorDb;

  return powerMatrix.map((row) =>
    row.map((val) => {
      if (val <= floorDb) return 0.0;
      if (val >= maxDb) return 1.0;
      return (val - floorDb) / range;
    })
  );
}

/**
 * Computes real-time Short-Time Fourier Transform (STFT) frequency spectrogram.
 * 
 * Strictly satisfies the project interface contract:
 * computeSTFT(samples: Float64Array | number[], sampleRateHz: number, windowSize?: number, hopSize?: number): SpectrogramData
 * 
 * @param samples Raw acoustic waveform samples
 * @param sampleRateHz Sampling rate in Hz (e.g., 10000)
 * @param windowSize STFT frame size N (default: 128, must be power of 2)
 * @param hopSize Frame hop stride H (default: 32, 75% overlap)
 * @returns SpectrogramData with timeBins, freqBins, and powerMatrixDb
 */
export function computeSTFT(
  samples: Float64Array | number[],
  sampleRateHz: number,
  windowSize: number = DEFAULT_STFT_WINDOW_SIZE,
  hopSize: number = DEFAULT_STFT_HOP_SIZE
): SpectrogramData {
  return computeSpectrogram(samples, sampleRateHz, {
    windowSize,
    hopSize,
    normalize: false
  });
}

/**
 * Computes Short-Time Fourier Transform with extended configuration options.
 * 
 * @param samples Raw acoustic waveform samples
 * @param sampleRateHz Sampling frequency in Hz
 * @param options STFT configuration options
 * @returns SpectrogramData
 */
export function computeSpectrogram(
  samples: Float64Array | number[],
  sampleRateHz: number,
  options?: STFTOptions
): SpectrogramData {
  if (sampleRateHz <= 0) {
    throw new Error('Sample rate must be greater than zero.');
  }

  const rawWindowSize = options?.windowSize ?? DEFAULT_STFT_WINDOW_SIZE;
  const hopSize = options?.hopSize ?? DEFAULT_STFT_HOP_SIZE;
  const normalize = options?.normalize ?? false;
  const dynamicRangeDb = options?.dynamicRangeDb ?? DEFAULT_DYNAMIC_RANGE_DB;

  if (rawWindowSize <= 0) {
    throw new Error('STFT window size must be greater than zero.');
  }
  if (hopSize <= 0) {
    throw new Error('STFT hop size must be greater than zero.');
  }

  // Ensure window size is a power of two for Cooley-Tukey Radix-2 FFT
  const windowSize = nextPowerOfTwo(rawWindowSize);
  const numFreqBins = (windowSize >> 1) + 1;
  const freqBins = calculateFrequencyBins(windowSize, sampleRateHz);

  // Convert input to Float64Array for memory locality
  const inputBuffer = samples instanceof Float64Array ? samples : new Float64Array(samples);
  const totalSamples = inputBuffer.length;

  if (totalSamples === 0) {
    return {
      timeBins: [],
      freqBins,
      powerMatrixDb: [],
      sampleRateHz,
      windowSize,
      hopSize,
      minPowerDb: -dynamicRangeDb,
      maxPowerDb: 0,
      dominantFrequencyHz: 0,
      peakEnergyTimeSec: 0
    };
  }

  // Precompute Hann window
  const hannWindow = createHannWindow(windowSize);

  // Determine frame count
  let numFrames: number;
  let paddedBuffer: Float64Array;

  if (totalSamples < windowSize) {
    // Zero-pad small signal to at least one full window length
    numFrames = 1;
    paddedBuffer = new Float64Array(windowSize);
    paddedBuffer.set(inputBuffer);
  } else {
    numFrames = Math.floor((totalSamples - windowSize) / hopSize) + 1;
    paddedBuffer = inputBuffer;
  }

  const timeBins = new Array<number>(numFrames);
  const powerMatrixDb: number[][] = new Array(numFrames);

  // Reusable FFT work buffers (zero garbage collection allocations in frame loop)
  const realBuf = new Float64Array(windowSize);
  const imagBuf = new Float64Array(windowSize);

  let globalMaxPowerDb = -Infinity;
  let dominantFreqHz = 0;
  let peakEnergyTimeSec = 0;

  for (let f = 0; f < numFrames; f++) {
    const startIdx = f * hopSize;
    const centerSample = startIdx + (windowSize >> 1);
    timeBins[f] = Number((centerSample / sampleRateHz).toFixed(4));

    // Apply Hann window directly into reusable buffer
    for (let n = 0; n < windowSize; n++) {
      realBuf[n] = paddedBuffer[startIdx + n] * hannWindow[n];
      imagBuf[n] = 0.0;
    }

    // Execute in-place Cooley-Tukey Radix-2 FFT
    fft(realBuf, imagBuf, false);

    // Compute log-magnitude power density in dB
    const framePower = new Array<number>(numFreqBins);
    for (let k = 0; k < numFreqBins; k++) {
      const magSq = realBuf[k] * realBuf[k] + imagBuf[k] * imagBuf[k];
      // 10 * log10(power + eps) to prevent log10(0)
      const pDb = 10.0 * Math.log10(magSq + 1e-12);
      framePower[k] = pDb;

      if (pDb > globalMaxPowerDb) {
        globalMaxPowerDb = pDb;
        dominantFreqHz = freqBins[k];
        peakEnergyTimeSec = timeBins[f];
      }
    }
    powerMatrixDb[f] = framePower;
  }

  // Handle normalization if requested
  let outputMatrix = powerMatrixDb;
  let minPowerDb = globalMaxPowerDb - dynamicRangeDb;
  let maxPowerDb = globalMaxPowerDb;

  if (normalize) {
    outputMatrix = normalizePowerMatrix(powerMatrixDb, dynamicRangeDb);
    minPowerDb = 0.0;
    maxPowerDb = 1.0;
  }

  return {
    timeBins,
    freqBins,
    powerMatrixDb: outputMatrix,
    sampleRateHz,
    windowSize,
    hopSize,
    minPowerDb: Number(minPowerDb.toFixed(2)),
    maxPowerDb: Number(maxPowerDb.toFixed(2)),
    dominantFrequencyHz: dominantFreqHz,
    peakEnergyTimeSec
  };
}
