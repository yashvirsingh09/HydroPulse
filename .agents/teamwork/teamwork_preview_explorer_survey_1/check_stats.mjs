import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

// Check standard deviation and max
function stats(arr) {
  let sum = 0, sumSq = 0, max = 0;
  for (const x of arr) {
    sum += x;
    sumSq += x * x;
    if (Math.abs(x) > max) max = Math.abs(x);
  }
  const mean = sum / arr.length;
  const variance = sumSq / arr.length - mean * mean;
  return { mean, std: Math.sqrt(variance), max };
}

console.log('Node A stats:', stats(payload.node_a.samples));
console.log('Node B stats:', stats(payload.node_b.samples));

// Also let's check bawana fixture stats
const bawanaPayload = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../physics-engine/sample_burst_bawana.json'), 'utf-8'));
console.log('Bawana A stats:', stats(bawanaPayload.node_a.samples));
console.log('Bawana B stats:', stats(bawanaPayload.node_b.samples));
