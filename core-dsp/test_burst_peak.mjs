import { generateSyntheticBurst, zeroPhaseBandpass, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

function getRatio(samples, staSamples = 50, ltaSamples = 400) {
  const n = samples.length;
  const rat = new Float64Array(n);
  let sS = 0, lS = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i] * samples[i];
    sS += v; lS += v;
    if (i >= staSamples) sS -= samples[i - staSamples] * samples[i - staSamples];
    if (i >= ltaSamples) lS -= samples[i - ltaSamples] * samples[i - ltaSamples];
    if (i >= ltaSamples) rat[i] = (sS / staSamples) / (lS / ltaSamples + 1e-9);
  }
  return rat;
}

for (const scen of scenarios) {
  for (const snr of [18, 6]) {
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);

      const ratA = getRatio(cleanA);
      const ratB = getRatio(cleanB);

      const trueA = Math.round((0.05 + burst.metadata.ground_truth_leak_m / burst.metadata.wave_speed_m_s) * 10000);
      const trueB = Math.round((0.05 + (scen.pipeParams.lengthM - burst.metadata.ground_truth_leak_m) / burst.metadata.wave_speed_m_s) * 10000);

      // Find local peaks of ratio
      function findPeaks(rat) {
        const p = [];
        for (let i = 401; i < rat.length - 1; i++) {
          if (rat[i] > rat[i - 1] && rat[i] > rat[i + 1] && rat[i] > 1.5) {
            p.push({ index: i, ratio: rat[i] });
          }
        }
        return p;
      }

      const pA = findPeaks(ratA);
      const pB = findPeaks(ratB);

      pA.sort((a, b) => b.ratio - a.ratio);
      pB.sort((a, b) => b.ratio - a.ratio);

      const bestA = pA[0];
      // For B, find peak in pB whose arrival is within physical delay from bestA
      const maxDelaySamples = (scen.pipeParams.lengthM / burst.metadata.wave_speed_m_s) * 10000;
      const validB = pB.filter(b => Math.abs(b.index - bestA.index) <= maxDelaySamples + 100);

      const bestB = validB.length > 0 ? validB[0] : pB[0];

      const errA = bestA.index - (trueA + 45);
      const errB = bestB.index - (trueB + 45);

      if (Math.abs(errA) > 30 || Math.abs(errB) > 30) {
        console.log(`${scen.id} ${snr}dB r${r+1}: errA=${errA} (idx=${bestA.index}), errB=${errB} (idx=${bestB.index})`);
      }
    }
  }
}
console.log('Peak matching test completed.');
