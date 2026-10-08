import { generateSyntheticBurst, computeGCCPhat, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });

// Let's compute GCC-PHAT on gated frame where we gate around the true onsets
// True arrival A = 4233, True arrival B = 6722
// Lag = 6722 - 4233 = 2489
const fs = 10000;
const winLen = 1024;
const preTrigger = 256;
const startA = 4233 - preTrigger;
const startB = 6722 - preTrigger;

const gatedA = burst.node_a.samples.slice(startA, startA + winLen);
const gatedB = burst.node_b.samples.slice(startB, startB + winLen);

const gccGated = computeGCCPhat(gatedA, gatedB, fs, 0.015, { minFreqHz: 450, maxFreqHz: 1500, bandLimited: true });
console.log('Gated around true onsets:');
console.log('residual lag:', gccGated.sampleLag);
console.log('residual peak:', gccGated.peakValue);
console.log('residual conf:', gccGated.confidenceScore);
const totalLag = (startB - startA) + gccGated.sampleLag;
console.log('totalLag:', totalLag, 'trueLag = 2488.97');
const estDist = (1200 - 1205.32 * (totalLag / fs)) / 2.0;
console.log('estDist:', estDist, 'GT = 450. Error =', Math.abs(estDist - 450));
