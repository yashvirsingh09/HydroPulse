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

// Narrow bandpass around pipe resonant frequency (850 Hz +- 150 Hz)
const nRaw = Math.max(sA.length, sB.length);
const nFft = nextPowerOfTwo(2 * nRaw);

const r1 = new Float64Array(nFft);
const i1 = new Float64Array(nFft);
const r2 = new Float64Array(nFft);
const i2 = new Float64Array(nFft);

for (let i = 0; i < sA.length; i++) r1[i] = sA[i];
for (let i = 0; i < sB.length; i++) r2[i] = sB[i];

fft(r1, i1, false);
fft(r2, i2, false);

const crossR = new Float64Array(nFft);
const crossI = new Float64Array(nFft);
const eps = 1e-12;
const binWidth = fsRate / nFft;

// Filter passband: 700 Hz to 1000 Hz
const fLow = 700;
const fHigh = 1000;

for (let k = 0; k < nFft; k++) {
  const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
  let w = 0.0;
  if (f >= fLow && f <= fHigh) {
    // Hann window in frequency domain
    w = 0.5 * (1.0 - Math.cos(2.0 * Math.PI * (f - fLow) / (fHigh - fLow)));
  }

  const realProd = r2[k] * r1[k] + i2[k] * i1[k];
  const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
  const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

  // PHAT whitening with resonant bandpass window
  crossR[k] = (realProd / mag) * w;
  crossI[k] = (imagProd / mag) * w;
}

fft(crossR, crossI, true);

const maxLagSec = (L / vs) * 1.1;
const maxLagSamples = Math.floor(maxLagSec * fsRate);

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

// Parabolic sub-sample refinement
const alpha = getCorrAtLag(bestLag - 1);
const beta = getCorrAtLag(bestLag);
const gamma = getCorrAtLag(bestLag + 1);
const denom = 2.0 * (alpha - 2.0 * beta + gamma);
let subSample = 0.0;
if (Math.abs(denom) > 1e-9) {
  subSample = (alpha - gamma) / denom;
  if (Math.abs(subSample) > 1.0) subSample = 0.0;
}

const refinedLag = bestLag + subSample;
const deltaTSec = refinedLag / fsRate;
const estimatedLeak = (L - vs * deltaTSec) / 2.0;
const error = Math.abs(estimatedLeak - meta.ground_truth_leak_m);

console.log('Result with 700-1000 Hz Resonant Bandpass on 6dB burst:');
console.log(`Best Lag: ${bestLag}`);
console.log(`Refined Lag: ${refinedLag.toFixed(2)}`);
console.log(`Delta T: ${(deltaTSec * 1000).toFixed(4)} ms`);
console.log(`Estimated Leak: ${estimatedLeak.toFixed(2)} m`);
console.log(`Ground Truth: ${meta.ground_truth_leak_m} m`);
console.log(`Localization Error: ${error.toFixed(2)} m`);
