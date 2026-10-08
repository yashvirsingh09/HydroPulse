import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeGCCPhat,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const maxLagSec = (L / v_s) * 1.05;

for (const snr of [24, 18, 12, 6]) {
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed: 101 });
  const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 300, 2200);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 300, 2200);

  const res = computeGCCPhat(cleanA, cleanB, 10000, maxLagSec, { minFreqHz: 300, maxFreqHz: 2200, bandLimited: true });
  const estDist = (L - v_s * res.deltaTSeconds) / 2.0;
  const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
  console.log(`SNR=${snr}dB: trueLag=${(burst.metadata.ground_truth_delta_t_ms * 10).toFixed(1)}, foundLag=${res.sampleLag}, peakVal=${res.peakValue}, estDist=${estDist.toFixed(2)}m, err=${err.toFixed(2)}m`);
}
