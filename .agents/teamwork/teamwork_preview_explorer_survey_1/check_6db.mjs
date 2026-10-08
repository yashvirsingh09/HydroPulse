import { triangulatePipeLeak } from '../../../core-dsp/dist/src/triangulate.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const meta = payload.metadata;

console.log('Testing with burst_6db.json:');
const res = triangulatePipeLeak(
  {
    lengthM: meta.pipe_length_m,
    diameterM: meta.pipe_diameter_m,
    wallThicknessM: meta.wall_thickness_m
  },
  {
    nodeId: 1,
    sampleRateHz: meta.sample_rate_hz,
    samples: payload.node_a.samples
  },
  {
    nodeId: 2,
    sampleRateHz: meta.sample_rate_hz,
    samples: payload.node_b.samples
  },
  meta.ground_truth_leak_m
);

console.log('Result on 6dB burst:', res);
