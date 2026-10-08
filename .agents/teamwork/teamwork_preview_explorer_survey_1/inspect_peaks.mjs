import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, '../../../physics-engine/sample_burst_bawana.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

console.log('Node A sample count:', payload.node_a.samples.length);
console.log('Node A max:', Math.max(...payload.node_a.samples.map(Math.abs)));
console.log('Node B max:', Math.max(...payload.node_b.samples.map(Math.abs)));

// find peak sample index in fixture
let maxAIdx = 0, maxAVal = 0;
for (let i = 0; i < payload.node_a.samples.length; i++) {
  if (Math.abs(payload.node_a.samples[i]) > maxAVal) {
    maxAVal = Math.abs(payload.node_a.samples[i]);
    maxAIdx = i;
  }
}

let maxBIdx = 0, maxBVal = 0;
for (let i = 0; i < payload.node_b.samples.length; i++) {
  if (Math.abs(payload.node_b.samples[i]) > maxBVal) {
    maxBVal = Math.abs(payload.node_b.samples[i]);
    maxBIdx = i;
  }
}

console.log(`Peak in Node A: index ${maxAIdx}, val ${maxAVal}`);
console.log(`Peak in Node B: index ${maxBIdx}, val ${maxBVal}`);
console.log(`Index difference B - A: ${maxBIdx - maxAIdx}`);
