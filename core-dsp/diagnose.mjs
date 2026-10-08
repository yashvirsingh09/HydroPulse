import { generateSyntheticBurst, triangulatePipeLeak, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

let totalFailed = 0;
for (const scen of scenarios) {
  for (const snr of snrLevels) {
    let failed = [];
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const res = triangulatePipeLeak(scen.pipeParams, burst.node_a, burst.node_b, burst.metadata.ground_truth_leak_m);
      const err = res.localizationErrorM ?? 999;
      if (err > 1.5) {
        failed.push({ run: r + 1, seed, err, dist: res.estimatedLeakDistanceM, gt: burst.metadata.ground_truth_leak_m });
      }
    }
    if (failed.length > 0) {
      console.log(scen.id + ' @ ' + snr + ' dB: ' + failed.length + ' FAILED:', JSON.stringify(failed));
      totalFailed += failed.length;
    } else {
      console.log(scen.id + ' @ ' + snr + ' dB: 5/5 PASSED');
    }
  }
}
console.log('Total failed: ' + totalFailed + ' / 80');
