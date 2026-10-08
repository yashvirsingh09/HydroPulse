import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeSTFT,
  DEFAULT_STFT_HOP_SIZE,
  DEFAULT_STFT_WINDOW_SIZE
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const stftA = computeSTFT(burst.node_a.samples, 10000, 256, 64);
const stftB = computeSTFT(burst.node_b.samples, 10000, 256, 64);

// Find 850 Hz bin
let targetBin = 0;
let minDiff = Infinity;
for (let i = 0; i < stftA.freqBins.length; i++) {
  const diff = Math.abs(stftA.freqBins[i] - 850);
  if (diff < minDiff) { minDiff = diff; targetBin = i; }
}

console.log('Target freq bin for 850 Hz:', stftA.freqBins[targetBin]);

// Plot power along time bins for target bin
let maxPowerA = -Infinity, maxTimeA = 0;
let maxPowerB = -Infinity, maxTimeB = 0;
for (let t = 0; t < stftA.timeBins.length; t++) {
  const pA = stftA.powerMatrixDb[t][targetBin];
  const pB = stftB.powerMatrixDb[t][targetBin];
  if (pA > maxPowerA) { maxPowerA = pA; maxTimeA = stftA.timeBins[t]; }
  if (pB > maxPowerB) { maxPowerB = pB; maxTimeB = stftB.timeBins[t]; }
}

console.log('STFT 850 Hz peak time A:', (maxTimeA * 1000).toFixed(1), 'ms (Sample: ' + Math.round(maxTimeA * 10000) + ')');
console.log('STFT 850 Hz peak time B:', (maxTimeB * 1000).toFixed(1), 'ms (Sample: ' + Math.round(maxTimeB * 10000) + ')');
console.log('STFT time diff:', ((maxTimeB - maxTimeA) * 1000).toFixed(1), 'ms');
console.log('Ground truth time diff:', burst.metadata.ground_truth_delta_t_ms, 'ms');
