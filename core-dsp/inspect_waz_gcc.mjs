import { generateSyntheticBurst, computeGCCPhat, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;
const maxDelay = (L / v_s) * 1.05;

for (let r = 0; r < 5; r++) {
  const seed = [101, 202, 303, 404, 505][r];
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed });
  const gcc = computeGCCPhat(burst.node_a.samples, burst.node_b.samples, 10000, maxDelay, { bandLimited: false });
  const estDist = (L - v_s * gcc.deltaTSeconds) / 2.0;
  const trueLag = (L - 2 * burst.metadata.ground_truth_leak_m) / v_s * 10000;
  console.log(`Run ${r+1}: estDist=${estDist.toFixed(2)} (GT=${burst.metadata.ground_truth_leak_m}) | gccLag=${gcc.sampleLag.toFixed(2)} vs trueLag=${trueLag.toFixed(2)}`);
}
