import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  computeGCCPhat
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const fs = 10000;
const maxDelaySec = (L / v_s) * 1.05;

const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 101 });
const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

// GCC-PHAT on clean signals
const resClean = computeGCCPhat(burst.cleanSignalA, burst.cleanSignalB, fs, maxDelaySec);
console.log('Clean Signal Lag:', resClean.sampleLag, 'Peak:', resClean.peakValue);

// GCC-PHAT on raw signals
const resRaw = computeGCCPhat(cleanA, cleanB, fs, maxDelaySec);
console.log('Raw Filtered Signal Lag:', resRaw.sampleLag, 'Peak:', resRaw.peakValue);
console.log('True Lag in samples:', (burst.metadata.ground_truth_delta_t_ms * 10).toFixed(2));
