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

const subA = cleanA.slice(1970 - 100, 1970 + 400);
const subB = cleanB.slice(3004 - 100, 3004 + 400);

// Compute energy envelope (moving RMS or squared smoothed)
function getEnvelope(x, smoothLen = 30) {
  const env = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let sum = 0;
    const start = Math.max(0, i - smoothLen);
    const end = Math.min(x.length, i + smoothLen);
    for (let j = start; j < end; j++) sum += x[j] * x[j];
    env[i] = Math.sqrt(sum / (end - start));
  }
  return env;
}

const envA = getEnvelope(subA, 25);
const envB = getEnvelope(subB, 25);

// Cross-correlate envelopes
let maxEnvCorr = -Infinity;
let bestEnvLag = 0;
for (let lag = -50; lag <= 50; lag++) {
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < envA.length; i++) {
    if (i + lag >= 0 && i + lag < envB.length) {
      dot += envA[i] * envB[i + lag];
      nA += envA[i] * envA[i];
      nB += envB[i + lag] * envB[i + lag];
    }
  }
  const corr = dot / Math.sqrt(nA * nB);
  if (corr > maxEnvCorr) {
    maxEnvCorr = corr;
    bestEnvLag = lag;
  }
}

console.log('Envelope correlation best lag:', bestEnvLag, 'corr:', maxEnvCorr.toFixed(3));
