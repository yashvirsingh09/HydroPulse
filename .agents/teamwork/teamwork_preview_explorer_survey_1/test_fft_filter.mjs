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

// Zero-phase FFT bandpass filtering
function fftBandpass(samples, fs, fLow = 300, fHigh = 2000) {
  const n = samples.length;
  const nFft = nextPowerOfTwo(n);
  const r = new Float64Array(nFft);
  const imag = new Float64Array(nFft);
  for (let i = 0; i < n; i++) r[i] = samples[i];
  fft(r, imag, false);

  const binWidth = fs / nFft;
  for (let k = 0; k < nFft; k++) {
    const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    let w = 0;
    if (f >= fLow && f <= fHigh) {
      w = 0.5 * (1 - Math.cos(2 * Math.PI * (f - fLow) / (fHigh - fLow)));
    }
    r[k] *= w;
    imag[k] *= w;
  }
  fft(r, imag, true);
  return r.slice(0, n);
}

const cleanA = fftBandpass(sA, fsRate, 300, 2000);
const cleanB = fftBandpass(sB, fsRate, 300, 2000);

// Check peak amplitude and position in cleanA and cleanB
let pA = 0, idxA = 0;
let pB = 0, idxB = 0;
for (let i = 0; i < cleanA.length; i++) {
  if (Math.abs(cleanA[i]) > pA) { pA = Math.abs(cleanA[i]); idxA = i; }
  if (Math.abs(cleanB[i]) > pB) { pB = Math.abs(cleanB[i]); idxB = i; }
}

console.log(`FFT Filtered Peak A: index ${idxA}, amp ${pA.toFixed(1)}`);
console.log(`FFT Filtered Peak B: index ${idxB}, amp ${pB.toFixed(1)}`);
console.log(`Peak difference B - A: ${idxB - idxA} (Ground truth: 1033)`);
