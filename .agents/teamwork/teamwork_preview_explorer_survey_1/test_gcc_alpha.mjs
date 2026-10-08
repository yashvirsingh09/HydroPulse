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

function testGCCAlpha(alphaVal) {
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

  for (let k = 0; k < nFft; k++) {
    const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    // Strip rumble below 150 Hz
    const rumbleFilter = f < 150 ? 0.0 : (f < 250 ? (f - 150) / 100 : 1.0);

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    const denom = Math.pow(mag, alphaVal);
    crossR[k] = (realProd / denom) * rumbleFilter;
    crossI[k] = (imagProd / denom) * rumbleFilter;
  }

  fft(crossR, crossI, true);

  const maxLagSec = (L / vs) * 1.1;
  const maxLagSamples = Math.floor(maxLagSec * fsRate);

  const getCorrAtLag = (lag) => (lag >= 0 ? crossR[lag] : crossR[nFft + lag]);

  let bestLag = 0;
  let maxVal = -Infinity;

  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    const val = getCorrAtLag(lag);
    if (val > maxVal) {
      maxVal = val;
      bestLag = lag;
    }
  }

  const alpha = getCorrAtLag(bestLag - 1);
  const beta = getCorrAtLag(bestLag);
  const gamma = getCorrAtLag(bestLag + 1);
  const denom = 2.0 * (alpha - 2.0 * beta + gamma);
  let subSample = 0.0;
  if (Math.abs(denom) > 1e-9) subSample = (alpha - gamma) / denom;

  const refinedLag = bestLag + subSample;
  const deltaTSec = refinedLag / fsRate;
  const estimatedLeak = (L - vs * deltaTSec) / 2.0;
  const error = Math.abs(estimatedLeak - meta.ground_truth_leak_m);

  return { alphaVal, bestLag, refinedLag: refinedLag.toFixed(2), error: error.toFixed(2) };
}

for (let a = 0.0; a <= 1.0; a += 0.1) {
  console.log(testGCCAlpha(Number(a.toFixed(1))));
}
