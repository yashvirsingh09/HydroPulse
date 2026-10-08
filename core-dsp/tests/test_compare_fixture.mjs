import fs from 'fs';
import { generateScenarioBurst } from '../dist/src/index.js';

const fixture = JSON.parse(fs.readFileSync('physics-engine/sample_burst_bawana.json', 'utf-8'));
const syn18 = generateScenarioBurst('DEL-BAWANA-01', { seed: 1337, snrDb: 18 });
const syn24 = generateScenarioBurst('DEL-BAWANA-01', { seed: 1337, snrDb: 24 });

console.log('--- Comparison of Fixture vs Synthetic ---');
console.log('Fixture sample rate:', fixture.metadata.sample_rate_hz);
console.log('Fixture ground truth leak:', fixture.metadata.ground_truth_leak_m);
console.log('Fixture ground truth deltaT:', fixture.metadata.ground_truth_delta_t_ms);

// Energy / amplitude statistics
function stats(arr, name) {
  let max = -Infinity, min = Infinity, sum = 0, sumSq = 0;
  for (let x of arr) {
    if (x > max) max = x;
    if (x < min) min = x;
    sum += x;
    sumSq += x * x;
  }
  const mean = sum / arr.length;
  const rms = Math.sqrt(sumSq / arr.length);
  console.log(`${name}: min=${min}, max=${max}, mean=${mean.toFixed(1)}, rms=${rms.toFixed(1)}`);
}

stats(fixture.node_a.samples, 'Fixture Node A');
stats(fixture.node_b.samples, 'Fixture Node B');
stats(syn18.node_a.samples, 'Synthetic 18dB Node A');
stats(syn18.node_b.samples, 'Synthetic 18dB Node B');
stats(syn24.node_a.samples, 'Synthetic 24dB Node A');
stats(syn24.node_b.samples, 'Synthetic 24dB Node B');
