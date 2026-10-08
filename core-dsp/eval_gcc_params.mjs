import { generateSyntheticBurst, zeroPhaseBandpass, computeGCCPhat, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];
const fs = 10000;

for (const bandLimited of [false, true]) {
  for (const filter of [false, true]) {
    let passed = 0;
    let failedList = [];
    for (const scen of scenarios) {
      const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
      const L = scen.pipeParams.lengthM;
      const maxDelay = (L / v_s) * 1.05;

      for (const snr of snrLevels) {
        for (let r = 0; r < 5; r++) {
          const seed = baseSeeds[r];
          const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
          const sigA = filter ? zeroPhaseBandpass(burst.node_a.samples, fs, 450, 1500) : burst.node_a.samples;
          const sigB = filter ? zeroPhaseBandpass(burst.node_b.samples, fs, 450, 1500) : burst.node_b.samples;

          const gcc = computeGCCPhat(sigA, sigB, fs, maxDelay, { minFreqHz: 450, maxFreqHz: 1500, bandLimited });
          const estDist = (L - v_s * gcc.deltaTSeconds) / 2.0;
          const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
          if (err <= 1.5) {
            passed++;
          } else {
            failedList.push({ scen: scen.id, snr, seed, err: Number(err.toFixed(2)) });
          }
        }
      }
    }
    console.log(`bandLimited=${bandLimited}, filter=${filter}: passed=${passed}/80`);
    if (failedList.length > 0 && failedList.length <= 15) {
      console.log('Failed:', JSON.stringify(failedList));
    }
  }
}
