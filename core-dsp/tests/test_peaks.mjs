import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Analyzing signal characteristics across all 80 runs...');

for (const scen of scenarios) {
  const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
  const L = scen.pipeParams.lengthM;

  console.log(`\nScenario: ${scen.id} (L=${L}m, v_s=${v_s.toFixed(1)}m/s, GT leak=${scen.defaultRuptureDistanceM}m)`);

  for (const snr of [24, 6]) {
    const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed: 101 });
    const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
    const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

    // Find peak of cleanSignal
    let maxIdxA = 0, maxValA = 0;
    let maxIdxB = 0, maxValB = 0;
    for (let i = 0; i < burst.cleanSignalA.length; i++) {
      if (Math.abs(burst.cleanSignalA[i]) > maxValA) {
        maxValA = Math.abs(burst.cleanSignalA[i]);
        maxIdxA = i;
      }
      if (Math.abs(burst.cleanSignalB[i]) > maxValB) {
        maxValB = Math.abs(burst.cleanSignalB[i]);
        maxIdxB = i;
      }
    }

    console.log(`  SNR=${snr}dB: TruePeakA=${maxIdxA}, TruePeakB=${maxIdxB}, TrueDeltaT_ms=${burst.metadata.ground_truth_delta_t_ms}`);
  }
}
