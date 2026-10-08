/**
 * @file adaptiveFilter.ts
 * @brief 4th-Order Zero-Phase Bandpass Filtering and STA/LTA Transient Onset Gating
 * @details Rejects low-frequency traffic rumble (38/54 Hz) and isolates acoustic rupture shockwaves.
 */

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

/**
 * Designs a 2nd-order digital Butterworth Highpass filter section.
 */
export function designButterworthHighpass(cutoffHz: number, sampleRateHz: number): BiquadCoefficients {
  const omega = (2.0 * Math.PI * cutoffHz) / sampleRateHz;
  const alpha = Math.sin(omega) / (2.0 * Math.SQRT1_2); // Q = 1 / sqrt(2) ~ 0.7071
  const cosw = Math.cos(omega);
  const a0 = 1.0 + alpha;

  return {
    b0: ((1.0 + cosw) / 2.0) / a0,
    b1: (-(1.0 + cosw)) / a0,
    b2: ((1.0 + cosw) / 2.0) / a0,
    a1: (-2.0 * cosw) / a0,
    a2: (1.0 - alpha) / a0
  };
}

/**
 * Designs a 2nd-order digital Butterworth Lowpass filter section.
 */
export function designButterworthLowpass(cutoffHz: number, sampleRateHz: number): BiquadCoefficients {
  const omega = (2.0 * Math.PI * cutoffHz) / sampleRateHz;
  const alpha = Math.sin(omega) / (2.0 * Math.SQRT1_2); // Q = 1 / sqrt(2) ~ 0.7071
  const cosw = Math.cos(omega);
  const a0 = 1.0 + alpha;

  return {
    b0: ((1.0 - cosw) / 2.0) / a0,
    b1: (1.0 - cosw) / a0,
    b2: ((1.0 - cosw) / 2.0) / a0,
    a1: (-2.0 * cosw) / a0,
    a2: (1.0 - alpha) / a0
  };
}

/**
 * Processes a signal buffer through a Direct Form II Transposed biquad section.
 */
export function filterDirectFormIIT(x: Float64Array | number[], coeff: BiquadCoefficients): Float64Array {
  const n = x.length;
  const y = new Float64Array(n);
  let w1 = 0.0;
  let w2 = 0.0;

  for (let i = 0; i < n; i++) {
    const input = x[i];
    const out = coeff.b0 * input + w1;
    w1 = coeff.b1 * input - coeff.a1 * out + w2;
    w2 = coeff.b2 * input - coeff.a2 * out;
    y[i] = out;
  }
  return y;
}

/**
 * Executes zero-phase forward-backward filtering (filtfilt) on a buffer with reflection padding.
 */
export function filtfiltSection(x: Float64Array | number[], coeff: BiquadCoefficients): Float64Array {
  const n = x.length;
  const padLen = Math.min(150, Math.floor(n / 2));

  // Extend boundaries with symmetric reflection: x_ext[-k] = 2*x[0] - x[k]
  const extLen = n + 2 * padLen;
  const ext = new Float64Array(extLen);

  for (let i = 0; i < padLen; i++) {
    ext[padLen - 1 - i] = 2.0 * x[0] - x[i + 1];
    ext[extLen - padLen + i] = 2.0 * x[n - 1] - x[n - 2 - i];
  }
  for (let i = 0; i < n; i++) {
    ext[padLen + i] = x[i];
  }

  // Forward pass
  const fwd = filterDirectFormIIT(ext, coeff);

  // Reverse buffer
  fwd.reverse();

  // Backward pass
  const bwd = filterDirectFormIIT(fwd, coeff);
  bwd.reverse();

  // Trim padding
  return bwd.slice(padLen, padLen + n);
}

/**
 * 4th-Order Zero-Phase Butterworth Bandpass Filter (300 Hz - 2200 Hz).
 * Cascades 2nd-order Highpass and Lowpass sections with forward-backward passes.
 */
export function zeroPhaseBandpass(
  samples: number[] | Float64Array,
  sampleRateHz: number = 10000,
  lowCutHz: number = 300,
  highCutHz: number = 2200
): Float64Array {
  const hp = designButterworthHighpass(lowCutHz, sampleRateHz);
  const lp = designButterworthLowpass(highCutHz, sampleRateHz);

  const step1 = filtfiltSection(samples, hp);
  return filtfiltSection(step1, lp);
}

export interface STALTAResult {
  ratioCurve: Float64Array;
  topTriggers: Array<{ index: number; ratio: number }>;
  primaryOnsetIndex: number;
}

/**
 * Computes the Short-Term Average / Long-Term Average (STA/LTA) energy ratio curve.
 */
export function computeSTALTA(
  samples: number[] | Float64Array,
  staSamples: number = 50,
  ltaSamples: number = 400
): STALTAResult {
  const n = samples.length;
  const ratio = new Float64Array(n);
  let staSum = 0.0;
  let ltaSum = 0.0;

  for (let i = 0; i < n; i++) {
    const valSq = samples[i] * samples[i];
    staSum += valSq;
    ltaSum += valSq;

    if (i >= staSamples) staSum -= samples[i - staSamples] * samples[i - staSamples];
    if (i >= ltaSamples) ltaSum -= samples[i - ltaSamples] * samples[i - ltaSamples];

    if (i >= ltaSamples) {
      const sta = staSum / staSamples;
      const lta = ltaSum / ltaSamples + 1e-9;
      ratio[i] = sta / lta;
    }
  }

  // Peak picking with refractory window of 200 samples
  const peaks: Array<{ index: number; ratio: number }> = [];
  for (let i = ltaSamples + 1; i < n - 1; i++) {
    if (ratio[i] > ratio[i - 1] && ratio[i] > ratio[i + 1] && ratio[i] >= 1.5) {
      peaks.push({ index: i, ratio: ratio[i] });
    }
  }

  peaks.sort((a, b) => ((a as any).sampleIndex ?? a.index) - ((b as any).sampleIndex ?? b.index));

  const filteredPeaks: Array<{ index: number; ratio: number }> = [];
  for (const p of peaks) {
    if (filteredPeaks.every((fp) => Math.abs(fp.index - p.index) > 200)) {
      filteredPeaks.push(p);
      if (filteredPeaks.length >= 6) break;
    }
  }

  // If no peaks exceeded threshold, fall back to max ratio index >= ltaSamples
  let primaryOnset = ltaSamples;
  if (filteredPeaks.length > 0) {
    primaryOnset = filteredPeaks[0].index;
  } else {
    let maxVal = -1;
    for (let i = ltaSamples; i < n; i++) {
      if (ratio[i] > maxVal) {
        maxVal = ratio[i];
        primaryOnset = i;
      }
    }
  }

  return {
    ratioCurve: ratio,
    topTriggers: filteredPeaks,
    primaryOnsetIndex: primaryOnset
  };
}

export interface GatedWindowResult {
  gatedA: Float64Array;
  gatedB: Float64Array;
  startA: number;
  startB: number;
  baseOffsetSamples: number;
}

/**
 * Extracts synchronous or trigger-centered window around the acoustic burst.
 */
export function extractGatedWindow(
  samplesA: number[] | Float64Array,
  samplesB: number[] | Float64Array,
  triggerA: number,
  triggerB: number,
  windowLength: number = 1024,
  preTriggerSamples: number = 256
): GatedWindowResult {
  const n = samplesA.length;
  const startA = Math.max(0, Math.min(n - windowLength, triggerA - preTriggerSamples));
  const startB = Math.max(0, Math.min(n - windowLength, triggerB - preTriggerSamples));

  const gatedA = new Float64Array(windowLength);
  const gatedB = new Float64Array(windowLength);

  for (let i = 0; i < windowLength; i++) {
    gatedA[i] = samplesA[startA + i];
    gatedB[i] = samplesB[startB + i];
  }

  // Apply smooth cosine taper to segment boundaries (64 samples)
  const taperLen = 64;
  for (let i = 0; i < taperLen; i++) {
    const w = 0.5 * (1.0 - Math.cos((Math.PI * i) / taperLen));
    gatedA[i] *= w;
    gatedB[i] *= w;
    gatedA[windowLength - 1 - i] *= w;
    gatedB[windowLength - 1 - i] *= w;
  }

  return {
    gatedA,
    gatedB,
    startA,
    startB,
    baseOffsetSamples: startB - startA
  };
}
