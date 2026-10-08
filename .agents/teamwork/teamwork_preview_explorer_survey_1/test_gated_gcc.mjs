import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload6 = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const meta = payload6.metadata;

const sA = payload6.node_a.samples;
const sB = payload6.node_b.samples;
const fsRate = meta.sample_rate_hz;
const L = meta.pipe_length_m;
const vs = meta.wave_speed_m_s;

// Adaptive transient localization pipeline
function adaptiveTDOA(sigA, sigB, sampleRate, pipeLength, waveSpeed) {
  // 1. Sliding energy window to detect burst trigger
  const frameSize = 256;
  const hop = 16;
  let maxE_A = 0, bestStartA = 0;
  for (let i = 0; i <= sigA.length - 2048; i += hop) {
    let e = 0;
    for (let j = 0; j < frameSize; j++) e += sigA[i + j] * sigA[i + j];
    if (e > maxE_A) {
      maxE_A = e;
      bestStartA = i;
    }
  }

  // Transient window of 2048 samples centered around peak energy
  const winLen = 2048;
  const startA = Math.max(0, bestStartA - 200);
  const endA = Math.min(sigA.length, startA + winLen);

  // Maximum transit delay across pipe:
  const maxDelaySamples = Math.ceil((pipeLength / waveSpeed) * sampleRate);

  // For sensor B, take a window that covers the search range [startA - maxDelay, startA + maxDelay + winLen]
  const startB = Math.max(0, startA - Math.floor(maxDelaySamples * 0.2));
  const endB = Math.min(sigB.length, startB + winLen + maxDelaySamples + 400);

  const subA = sigA.slice(startA, endA);
  const subB = sigB.slice(startB, endB);

  // Now compute bandpass GCC-PHAT on the gated transient frames
  const nFft = nextPowerOfTwo(subA.length + subB.length);
  const r1 = new Float64Array(nFft);
  const i1 = new Float64Array(nFft);
  const r2 = new Float64Array(nFft);
  const i2 = new Float64Array(nFft);

  for (let i = 0; i < subA.length; i++) r1[i] = subA[i];
  for (let i = 0; i < subB.length; i++) r2[i] = subB[i];

  fft(r1, i1, false);
  fft(r2, i2, false);

  const crossR = new Float64Array(nFft);
  const crossI = new Float64Array(nFft);
  const eps = 1e-12;
  const binWidth = sampleRate / nFft;

  for (let k = 0; k < nFft; k++) {
    const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    let w = 0.0;
    // Acoustic burst resonance band: 300 - 2500 Hz
    if (f >= 300 && f <= 2500) {
      w = 0.5 * (1.0 - Math.cos(2 * Math.PI * (f - 300) / (2500 - 300)));
    }

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    crossR[k] = (realProd / mag) * w;
    crossI[k] = (imagProd / mag) * w;
  }

  fft(crossR, crossI, true);

  // Map lag relative to the original signal index:
  // Physical delay tau = tB - tA.
  // In our sub-windows, subA starts at startA, subB starts at startB.
  // So lag in sub-windows: k_sub = lag_orig - (startB - startA).
  const offset = startB - startA;
  const maxLagPhysical = maxDelaySamples;

  let bestLagPhysical = 0;
  let maxVal = -Infinity;

  for (let lagPhys = -maxLagPhysical; lagPhys <= maxLagPhysical; lagPhys++) {
    const k_sub = lagPhys - offset;
    const val = k_sub >= 0 ? crossR[k_sub] : crossR[nFft + k_sub];
    if (val > maxVal) {
      maxVal = val;
      bestLagPhysical = lagPhys;
    }
  }

  // Sub-sample refinement
  const k_best = bestLagPhysical - offset;
  const getVal = (k) => k >= 0 ? crossR[k] : crossR[nFft + k];
  const alpha = getVal(k_best - 1);
  const beta = getVal(k_best);
  const gamma = getVal(k_best + 1);
  const denom = 2.0 * (alpha - 2.0 * beta + gamma);
  let subSample = 0.0;
  if (Math.abs(denom) > 1e-9) {
    subSample = (alpha - gamma) / denom;
    if (Math.abs(subSample) > 1.0) subSample = 0.0;
  }

  const refinedLag = bestLagPhysical + subSample;
  const deltaTSec = refinedLag / sampleRate;
  const estimatedLeak = (pipeLength - waveSpeed * deltaTSec) / 2.0;

  return {
    bestLagPhysical,
    refinedLag,
    deltaTMs: deltaTSec * 1000,
    estimatedLeak,
    error: Math.abs(estimatedLeak - meta.ground_truth_leak_m),
    maxVal
  };
}

console.log('Testing Gated + Bandpass GCC-PHAT on 6dB burst:');
const res = adaptiveTDOA(sA, sB, fsRate, L, vs);
console.log(res);
