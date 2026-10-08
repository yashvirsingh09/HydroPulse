import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload6 = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

const sA = payload6.node_a.samples;
const sB = payload6.node_b.samples;

// Let's compute short-term energy (window 256 samples)
const win = 256;
const energyA = [];
const energyB = [];

for (let i = 0; i < sA.length - win; i += 32) {
  let eA = 0, eB = 0;
  for (let j = 0; j < win; j++) {
    eA += sA[i + j] * sA[i + j];
    eB += sB[i + j] * sB[i + j];
  }
  energyA.push({ idx: i, e: eA });
  energyB.push({ idx: i, e: eB });
}

energyA.sort((a, b) => b.e - a.e);
energyB.sort((a, b) => b.e - a.e);

console.log('Top energy windows in A:');
for (let e of energyA.slice(0, 3)) console.log(`Idx: ${e.idx}, Energy: ${e.e}`);

console.log('Top energy windows in B:');
for (let e of energyB.slice(0, 3)) console.log(`Idx: ${e.idx}, Energy: ${e.e}`);
