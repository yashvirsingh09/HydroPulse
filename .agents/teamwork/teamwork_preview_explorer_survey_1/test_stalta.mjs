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

// Compute STA / LTA
function computeSTALTA(samples, staLen = 50, ltaLen = 400) {
  const n = samples.length;
  const ratio = new Float64Array(n);
  let staSum = 0;
  let ltaSum = 0;

  for (let i = 0; i < n; i++) {
    const valSq = samples[i] * samples[i];
    staSum += valSq;
    ltaSum += valSq;
    if (i >= staLen) staSum -= samples[i - staLen] * samples[i - staLen];
    if (i >= ltaLen) ltaSum -= samples[i - ltaLen] * samples[i - ltaLen];

    const staAvg = staSum / staLen;
    const ltaAvg = (ltaSum / ltaLen) + 1e-6;
    ratio[i] = staAvg / ltaAvg;
  }
  return ratio;
}

const rA = computeSTALTA(sA, 40, 300);
const rB = computeSTALTA(sB, 40, 300);

let maxRatioA = 0, triggerA = 0;
let maxRatioB = 0, triggerB = 0;
for (let i = 0; i < sA.length; i++) {
  if (rA[i] > maxRatioA) { maxRatioA = rA[i]; triggerA = i; }
  if (rB[i] > maxRatioB) { maxRatioB = rB[i]; triggerB = i; }
}

console.log(`STA/LTA Peak A: idx ${triggerA}, ratio ${maxRatioA.toFixed(2)}`);
console.log(`STA/LTA Peak B: idx ${triggerB}, ratio ${maxRatioB.toFixed(2)}`);
console.log(`STA/LTA delta samples (B - A): ${triggerB - triggerA}`);
console.log(`Ground truth delta samples: ${Math.round((meta.ground_truth_delta_t_ms / 1000) * fsRate)}`);
