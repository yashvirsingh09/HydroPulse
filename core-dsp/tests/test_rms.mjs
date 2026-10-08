import { DELHI_PIPE_SCENARIOS, generateSyntheticBurst, computeSTALTA, zeroPhaseBandpass } from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 12, seed: 101 });
const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 300, 2200);
const n = cleanA.length;

console.log('--- Energy profile across 1000-sample slices ---');
for (let start = 0; start < n; start += 1000) {
  let sumSq = 0;
  for (let i = start; i < start + 1000; i++) sumSq += cleanA[i] * cleanA[i];
  const rms = Math.sqrt(sumSq / 1000);
  console.log('Slice [' + start + ', ' + (start+1000) + ']: RMS = ' + rms.toFixed(2));
}

const staA = computeSTALTA(cleanA, 50, 400);
console.log('staA ratio at 1950..2050:', Math.max(...staA.ratioCurve.slice(1950, 2050)));
console.log('staA ratio at 6900..7000:', Math.max(...staA.ratioCurve.slice(6900, 7000)));
console.log('staA max overall ratio:', Math.max(...staA.ratioCurve));
console.log('staA all triggers:', staA.topTriggers);
