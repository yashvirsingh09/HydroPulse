import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const fs = 10000;
const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

console.log('--- Analyzing energy / transient detection on 6dB signal ---');

// Compute energy in short moving window (e.g. 100 samples = 10 ms)
const w = 100;
const energyA = new Float64Array(cleanA.length - w);
const energyB = new Float64Array(cleanB.length - w);

let sumA = 0, sumB = 0;
for (let i = 0; i < w; i++) {
  sumA += cleanA[i] * cleanA[i];
  sumB += cleanB[i] * cleanB[i];
}

energyA[0] = sumA / w;
energyB[0] = sumB / w;

for (let i = 1; i < cleanA.length - w; i++) {
  sumA += cleanA[i + w - 1] * cleanA[i + w - 1] - cleanA[i - 1] * cleanA[i - 1];
  sumB += cleanB[i + w - 1] * cleanB[i + w - 1] - cleanB[i - 1] * cleanB[i - 1];
  energyA[i] = sumA / w;
  energyB[i] = sumB / w;
}

// Find max energy
let maxEA = 0, maxIA = 0;
let maxEB = 0, maxIB = 0;
for (let i = 0; i < energyA.length; i++) {
  if (energyA[i] > maxEA) { maxEA = energyA[i]; maxIA = i; }
  if (energyB[i] > maxEB) { maxEB = energyB[i]; maxIB = i; }
}

console.log('Peak short-term energy A:', maxIA, 'Peak short-term energy B:', maxIB);
console.log('True peak A: 1973, True peak B: 3007');
console.log('Difference:', maxIB - maxIA, 'True difference: 1033.3');
