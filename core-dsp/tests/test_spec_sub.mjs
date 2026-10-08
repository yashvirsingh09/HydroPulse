import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const fs = 10000;
const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

console.log('--- Testing Spectral Subtraction / Energy Differential on 6dB SNR ---');

// Baseline noise energy (first 400 samples = 40 ms)
let baseEnergyA = 0, baseEnergyB = 0;
for (let i = 0; i < 400; i++) {
  baseEnergyA += cleanA[i] * cleanA[i];
  baseEnergyB += cleanB[i] * cleanB[i];
}
baseEnergyA /= 400;
baseEnergyB /= 400;

console.log('Baseline noise variance A:', baseEnergyA.toFixed(1), 'B:', baseEnergyB.toFixed(1));

// Sliding window energy (e.g. 150 samples)
const win = 150;
const excessEnergyA = new Float64Array(cleanA.length - win);
const excessEnergyB = new Float64Array(cleanB.length - win);

for (let i = 0; i < cleanA.length - win; i += 10) {
  let eA = 0, eB = 0;
  for (let j = 0; j < win; j++) {
    eA += cleanA[i + j] * cleanA[i + j];
    eB += cleanB[i + j] * cleanB[i + j];
  }
  eA /= win;
  eB /= win;
  // Subtract baseline
  excessEnergyA[i] = Math.max(0, eA - baseEnergyA);
  excessEnergyB[i] = Math.max(0, eB - baseEnergyB);
}

// Find peak excess energy
let maxEA = 0, maxIA = 0;
let maxEB = 0, maxIB = 0;
for (let i = 0; i < excessEnergyA.length; i += 10) {
  if (excessEnergyA[i] > maxEA) { maxEA = excessEnergyA[i]; maxIA = i; }
  if (excessEnergyB[i] > maxEB) { maxEB = excessEnergyB[i]; maxIB = i; }
}

console.log(`Peak Excess Energy A at index: ${maxIA} (True arrival: 1970)`);
console.log(`Peak Excess Energy B at index: ${maxIB} (True arrival: 3004)`);
console.log(`Estimated Lag: ${maxIB - maxIA} (True Lag: 1034)`);
