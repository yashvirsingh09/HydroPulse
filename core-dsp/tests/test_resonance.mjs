import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const fs = 10000;

console.log('Testing tighter bandpass around 850 Hz resonance...');

for (const [low, high] of [[300, 2200], [500, 1500], [650, 1100], [750, 950]]) {
  const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, low, high);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, low, high);

  // Peak in transient region (1800-2200) vs peak outside transient region
  let maxTransientA = 0;
  for (let i = 1800; i < 2200; i++) if (Math.abs(cleanA[i]) > maxTransientA) maxTransientA = Math.abs(cleanA[i]);

  let maxNoiseA = 0;
  for (let i = 0; i < 1500; i++) if (Math.abs(cleanA[i]) > maxNoiseA) maxNoiseA = Math.abs(cleanA[i]);

  console.log(`Band [${low}-${high} Hz]: Transient Peak = ${maxTransientA.toFixed(1)}, Noise Peak = ${maxNoiseA.toFixed(1)}, Ratio = ${(maxTransientA / maxNoiseA).toFixed(2)}`);
}
