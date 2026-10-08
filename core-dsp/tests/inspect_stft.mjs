import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeSTFT
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const stftA = computeSTFT(burst.node_a.samples, 10000, 128, 32);

// Find 850 Hz bin
let targetBin = 0, minDiff = Infinity;
for (let i = 0; i < stftA.freqBins.length; i++) {
  const d = Math.abs(stftA.freqBins[i] - 850);
  if (d < minDiff) { minDiff = d; targetBin = i; }
}

console.log('--- STFT 850 Hz power profile over time ---');
for (let t = 0; t < stftA.timeBins.length; t += 10) {
  const sec = stftA.timeBins[t];
  const p = stftA.powerMatrixDb[t][targetBin];
  console.log(`t=${(sec*1000).toFixed(1)}ms: ${p.toFixed(1)} dB`);
}
