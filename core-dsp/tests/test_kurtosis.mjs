import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const fs = 10000;
const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

// Let's test a kurtosis detector or energy detector or matched wavelet
// Rupture transient has high kurtosis (spikiness / impulsiveness)!
// Gaussian noise has kurtosis = 3. A transient pulse has kurtosis >> 3!
console.log('Testing sliding kurtosis / envelope on 6 dB signal...');

const win = 300;
const kurtA = new Float64Array(cleanA.length - win);
for (let i = 0; i < cleanA.length - win; i += 10) {
  let m1 = 0, m2 = 0, m4 = 0;
  for (let j = 0; j < win; j++) {
    const x = cleanA[i + j];
    m1 += x;
    m2 += x * x;
    m4 += x * x * x * x;
  }
  m1 /= win;
  m2 /= win;
  m4 /= win;
  const var_ = m2 - m1 * m1;
  const kurt = var_ > 1e-6 ? m4 / (var_ * var_) : 0;
  kurtA[i] = kurt;
}

// Find peak kurtosis
let maxK = 0, maxKI = 0;
for (let i = 0; i < kurtA.length; i += 10) {
  if (kurtA[i] > maxK) { maxK = kurtA[i]; maxKI = i; }
}
console.log('Peak Kurtosis A at index:', maxKI, 'value:', maxK.toFixed(2), '(True burst at ~1973)');
