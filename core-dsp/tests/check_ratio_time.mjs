import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  computeSTALTA
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const fs = 10000;
const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);

const sta = computeSTALTA(cleanA, 50, 400);

console.log('--- Checking STA/LTA ratio over time for 6dB signal ---');
for (let i = 400; i < 2500; i += 100) {
  let maxR = 0;
  for (let j = i; j < i + 100; j++) if (sta.ratioCurve[j] > maxR) maxR = sta.ratioCurve[j];
  console.log(`[${i}..${i+100}]: max ratio = ${maxR.toFixed(2)}`);
}
