import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeSTALTA,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

for (const snr of snrLevels) {
  console.log(`\n=================== SNR = ${snr} dB ===================`);
  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    for (const seed of seeds) {
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

      const staA = computeSTALTA(cleanA, 50, 400);
      const staB = computeSTALTA(cleanB, 50, 400);

      const trueDeltaTSec = (burst.metadata.pipe_length_m - 2 * burst.metadata.ground_truth_leak_m) / v_s;
      const trueLagSamples = trueDeltaTSec * fs;
      const staDiff = staB.primaryOnsetIndex - staA.primaryOnsetIndex;
      const diffErr = Math.abs(staDiff - trueLagSamples);

      if (diffErr > 50) {
        console.log(`POOR ONSET: ${scen.id} SNR=${snr} Seed=${seed}: TrueLag=${trueLagSamples.toFixed(1)}, staA=${staA.primaryOnsetIndex}, staB=${staB.primaryOnsetIndex}, staDiff=${staDiff}, diffErr=${diffErr.toFixed(1)}`);
      }
    }
  }
}
