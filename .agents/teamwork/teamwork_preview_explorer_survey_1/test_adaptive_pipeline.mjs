import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';
import { BiquadBandpass } from '../../../core-dsp/dist/src/bandpassFilter.js';

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

// Pre-filter with biquad bandpass
const filterA = new BiquadBandpass(fsRate, 850, 1.8);
const filterB = new BiquadBandpass(fsRate, 850, 1.8);
const cleanA = filterA.filterArray(sA);
const cleanB = filterB.filterArray(sB);

// STA/LTA to find trigger windows
function computeSTALTA(samples, staLen = 50, ltaLen = 400) {
  const n = samples.length;
  const ratio = new Float64Array(n);
  let staSum = 0, ltaSum = 0;
  for (let i = 0; i < n; i++) {
    const valSq = samples[i] * samples[i];
    staSum += valSq;
    ltaSum += valSq;
    if (i >= staLen) staSum -= samples[i - staLen] * samples[i - staLen];
    if (i >= ltaLen) ltaSum -= samples[i - ltaLen] * samples[i - ltaLen];
    if (i >= ltaLen) {
      ratio[i] = (staSum / staLen) / ((ltaSum / ltaLen) + 1e-6);
    }
  }
  return ratio;
}

const rA = computeSTALTA(cleanA, 50, 400);
const rB = computeSTALTA(cleanB, 50, 400);

let maxRA = 0, trigA = 0;
let maxRB = 0, trigB = 0;
for (let i = 400; i < cleanA.length; i++) {
  if (rA[i] > maxRA) { maxRA = rA[i]; trigA = i; }
  if (rB[i] > maxRB) { maxRB = rB[i]; trigB = i; }
}

console.log(`Detected triggers: A at ${trigA}, B at ${trigB}`);

// Extract focused window around the triggers
// Max delay is ~4000 samples. Window size: 1024 samples around trigger A and trigger B
const winLen = 1024;
const winStartA = Math.max(0, trigA - 256);
const winStartB = Math.max(0, trigB - 256);

const frameA = cleanA.slice(winStartA, winStartA + winLen);
const frameB = cleanB.slice(winStartB, winStartB + winLen);

// Zero pad to power of two
const nFft = 2048;
const r1 = new Float64Array(nFft);
const i1 = new Float64Array(nFft);
const r2 = new Float64Array(nFft);
const i2 = new Float64Array(nFft);

for (let i = 0; i < frameA.length; i++) r1[i] = frameA[i];
for (let i = 0; i < frameB.length; i++) r2[i] = frameB[i];

fft(r1, i1, false);
fft(r2, i2, false);

const crossR = new Float64Array(nFft);
const crossI = new Float64Array(nFft);
const eps = 1e-12;

for (let k = 0; k < nFft; k++) {
  const realProd = r2[k] * r1[k] + i2[k] * i1[k];
  const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
  const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;
  crossR[k] = realProd / mag;
  crossI[k] = imagProd / mag;
}

fft(crossR, crossI, true);

// Search lag within [-128, +128] around the relative offset
// Original lag = (winStartB - winStartA) + frameLag
const baseOffset = winStartB - winStartA;

let bestFrameLag = 0;
let maxVal = -Infinity;
for (let l = -256; l <= 256; l++) {
  const k = l >= 0 ? l : nFft + l;
  if (crossR[k] > maxVal) {
    maxVal = crossR[k];
    bestFrameLag = l;
  }
}

// Parabolic interpolation
const getVal = (l) => {
  const k = l >= 0 ? l : nFft + l;
  return crossR[k];
};

const alpha = getVal(bestFrameLag - 1);
const beta = getVal(bestFrameLag);
const gamma = getVal(bestFrameLag + 1);
const denom = 2.0 * (alpha - 2.0 * beta + gamma);
let subSample = 0.0;
if (Math.abs(denom) > 1e-9) subSample = (alpha - gamma) / denom;

const totalLag = baseOffset + bestFrameLag + subSample;
const deltaT = totalLag / fsRate;
const estimatedLeak = (L - vs * deltaT) / 2.0;
const error = Math.abs(estimatedLeak - meta.ground_truth_leak_m);

console.log(`Base offset: ${baseOffset}, Frame lag: ${bestFrameLag}, Sub-sample: ${subSample.toFixed(3)}`);
console.log(`Total lag samples: ${totalLag.toFixed(3)} (Ground truth: 1033.302)`);
console.log(`Extracted Delta T: ${(deltaT * 1000).toFixed(4)} ms`);
console.log(`Estimated Leak Distance: ${estimatedLeak.toFixed(2)} m (Ground truth: ${meta.ground_truth_leak_m} m)`);
console.log(`Localization Error: ${error.toFixed(2)} m`);
