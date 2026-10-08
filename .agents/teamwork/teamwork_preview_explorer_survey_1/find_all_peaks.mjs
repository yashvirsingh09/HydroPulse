import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BiquadBandpass } from '../../../core-dsp/dist/src/bandpassFilter.js';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload6 = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

const fA = new BiquadBandpass(10000, 850, 1.8);
const fB = new BiquadBandpass(10000, 850, 1.8);
const cA = fA.filterArray(payload6.node_a.samples);
const cB = fB.filterArray(payload6.node_b.samples);

const nRaw = Math.max(cA.length, cB.length);
const nFft = nextPowerOfTwo(2 * nRaw);
const r1 = new Float64Array(nFft);
const i1 = new Float64Array(nFft);
const r2 = new Float64Array(nFft);
const i2 = new Float64Array(nFft);

for (let i = 0; i < cA.length; i++) r1[i] = cA[i];
for (let i = 0; i < cB.length; i++) r2[i] = cB[i];

fft(r1, i1, false);
fft(r2, i2, false);

const crossR = new Float64Array(nFft);
const crossI = new Float64Array(nFft);
const eps = 1e-12;

for (let k = 0; k < nFft; k++) {
  const realProd = r2[k] * r1[k] + i2[k] * i1[k];
  const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
  const magnitude = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;
  crossR[k] = realProd / magnitude;
  crossI[k] = imagProd / magnitude;
}

fft(crossR, crossI, true);

console.log('Correlation at true lag 1033:', crossR[1033]);
console.log('Correlation at false lag 2390:', crossR[2390]);

// Find all top 5 peaks
const peaks = [];
for (let lag = -4000; lag <= 4000; lag++) {
  const val = lag >= 0 ? crossR[lag] : crossR[nFft + lag];
  peaks.push({ lag, val });
}
peaks.sort((a, b) => b.val - a.val);
console.log('Top 5 peaks in cross-correlation:');
for (let p of peaks.slice(0, 5)) {
  console.log(`Lag: ${p.lag}, Val: ${p.val}`);
}
