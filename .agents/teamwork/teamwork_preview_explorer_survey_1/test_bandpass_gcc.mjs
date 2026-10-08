// Test band-limited whitening in scratch script
import { calculateKortewegWaveSpeed } from '../../../core-dsp/dist/src/korteweg.js';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';

function computeBandpassGCCPhat(
  sig1,
  sig2,
  sampleRateHz = 10000,
  maxLagSec = 0.5,
  lowCutHz = 300,
  highCutHz = 2200
) {
  const nRaw = Math.max(sig1.length, sig2.length);
  const nFft = nextPowerOfTwo(2 * nRaw);

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

  const binWidth = sampleRateHz / nFft;
  const kLow = Math.floor(lowCutHz / binWidth);
  const kHigh = Math.ceil(highCutHz / binWidth);

  for (let k = 0; k < nFft; k++) {
    const freq = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    
    // Smooth Tukey/cosine taper window in passband
    let w = 0.0;
    if (freq >= lowCutHz && freq <= highCutHz) {
      // smooth taper at edges
      const edge = 100; // 100 Hz transition
      if (freq < lowCutHz + edge) {
        w = 0.5 * (1.0 - Math.cos(Math.PI * (freq - lowCutHz) / edge));
      } else if (freq > highCutHz - edge) {
        w = 0.5 * (1.0 - Math.cos(Math.PI * (highCutHz - freq) / edge));
      } else {
        w = 1.0;
      }
    }

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const magnitude = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    // Whitened and bandpass weighted
    crossR[k] = (realProd / magnitude) * w;
    crossI[k] = (imagProd / magnitude) * w;
  }

  fft(crossR, crossI, true);

  const maxLagSamples = Math.min(Math.floor(maxLagSec * sampleRateHz), Math.floor(nFft / 4));

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

  // PSLR
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
  const confidenceScore = Math.min(99.8, Math.max(15.0, Number((100.0 * (1.0 - Math.exp(-pslr / 2.0))).toFixed(1))));

  return {
    deltaTSeconds,
    confidenceScore
  };
}

function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  return mean + stdev * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function generatePulse(sampleRate, durationSec, centerFreq = 850) {
  const n = Math.floor(sampleRate * durationSec);
  const arr = new Float64Array(n);
  const t0 = 0.05;
  const sigma = 0.004;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const pulse = Math.exp(-0.5 * Math.pow((t - t0) / sigma, 2));
    const ringing = t >= t0 ? Math.sin(2 * Math.PI * centerFreq * (t - t0)) * Math.exp(-(t - t0) * 150) : 0;
    arr[i] = 0.7 * pulse + 0.3 * ringing;
  }
  return arr;
}

function testScenarioWithBandpassGCC(pipeLength, leakDist, diameter, wallThick, youngs, snrDb) {
  const sampleRate = 10000;
  const v_s = calculateKortewegWaveSpeed({
    lengthM: pipeLength,
    diameterM: diameter,
    wallThicknessM: wallThick,
    youngsModulusPa: youngs
  });

  const distA = leakDist;
  const distB = pipeLength - leakDist;
  const delayA = distA / v_s;
  const delayB = distB / v_s;
  const shiftA = Math.round(delayA * sampleRate);
  const shiftB = Math.round(delayB * sampleRate);

  const durationSec = 1.0;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pulse = generatePulse(sampleRate, durationSec, 850);

  const sigA = new Float64Array(totalSamples);
  const sigB = new Float64Array(totalSamples);
  const gainA = Math.exp(-0.0012 * distA);
  const gainB = Math.exp(-0.0012 * distB);

  for (let i = 0; i < totalSamples - shiftA; i++) sigA[shiftA + i] = pulse[i] * gainA;
  for (let i = 0; i < totalSamples - shiftB; i++) sigB[shiftB + i] = pulse[i] * gainB;

  const noiseSigma = Math.pow(10, -snrDb / 20);

  const finalA = new Array(totalSamples);
  const finalB = new Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const trafA = 0.06 * Math.sin(2 * Math.PI * 38 * t) + gaussianRandom(0, 0.04);
    const trafB = 0.06 * Math.sin(2 * Math.PI * 54 * t) + gaussianRandom(0, 0.04);
    finalA[i] = Math.round((sigA[i] + trafA + gaussianRandom(0, noiseSigma)) * 30000);
    finalB[i] = Math.round((sigB[i] + trafB + gaussianRandom(0, noiseSigma)) * 30000);
  }

  const maxFeasibleDelaySec = (pipeLength / v_s) * 1.1;
  const gcc = computeBandpassGCCPhat(finalA, finalB, sampleRate, maxFeasibleDelaySec, 350, 2000);

  const estimatedLeak = (pipeLength - v_s * gcc.deltaTSeconds) / 2.0;
  const error = Math.abs(estimatedLeak - leakDist);

  return { error, confidence: gcc.confidenceScore, estimatedLeak };
}

console.log('--- Testing Enhanced Bandpass-Weighted GCC-PHAT ---');
const snrs = [24, 18, 12, 6];
for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 20; run++) {
    const r = testScenarioWithBandpassGCC(500, 185, 0.4, 0.012, 2.0e11, snr);
    errors.push(r.error);
    confidences.push(r.confidence);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`Bawana SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}

for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 20; run++) {
    const r = testScenarioWithBandpassGCC(620, 250, 0.3, 0.010, 2.0e11, snr);
    errors.push(r.error);
    confidences.push(r.confidence);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`Rohini SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}

for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 20; run++) {
    const r = testScenarioWithBandpassGCC(1000, 350, 0.9, 0.014, 2.1e11, snr);
    errors.push(r.error);
    confidences.push(r.confidence);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`Wazirabad SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}
