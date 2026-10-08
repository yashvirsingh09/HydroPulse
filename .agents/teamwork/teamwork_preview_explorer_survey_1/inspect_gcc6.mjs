import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BiquadBandpass } from '../../../core-dsp/dist/src/bandpassFilter.js';
import { computeGCCPhat } from '../../../core-dsp/dist/src/gccPhat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload6 = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

const fA = new BiquadBandpass(10000, 850, 1.8);
const fB = new BiquadBandpass(10000, 850, 1.8);
const cA = fA.filterArray(payload6.node_a.samples);
const cB = fB.filterArray(payload6.node_b.samples);

const gcc6 = computeGCCPhat(cA, cB, 10000, (500 / 1258.1) * 1.1);

console.log('GCC at 6dB:');
console.log('deltaT ms:', gcc6.deltaTMilliseconds);
console.log('sampleLag:', gcc6.sampleLag);
console.log('peakValue:', gcc6.peakValue);
console.log('confidenceScore:', gcc6.confidenceScore);

// Check correlation at ground truth lag (approx 1033 samples)
// Let's inspect correlation curve values around lag 1033 vs at sampleLag
console.log('Lag indices around peak:', gcc6.lagIndices.slice(35, 45));
console.log('Correlation values around peak:', gcc6.correlationCurve.slice(35, 45));
