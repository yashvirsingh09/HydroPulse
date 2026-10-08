import { generateSyntheticBurst, zeroPhaseBandpass, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

function getRatio(samples) {
  const rat = new Float64Array(samples.length);
  let sS = 0, lS = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] * samples[i];
    sS += v; lS += v;
    if (i >= 50) sS -= samples[i - 50] * samples[i - 50];
    if (i >= 400) lS -= samples[i - 400] * samples[i - 400];
    if (i >= 400) rat[i] = (sS / 50) / (lS / 400 + 1e-9);
  }
  return rat;
}

function pickOnset(ratio, ltaSamples = 400) {
  const n = ratio.length;
  let maxR = 0;
  for (let i = ltaSamples; i < n; i++) {
    if (ratio[i] > maxR) maxR = ratio[i];
  }
  // Adaptive threshold
  const threshold = Math.max(1.8, maxR * 0.45);
  for (let i = ltaSamples + 1; i < n - 1; i++) {
    if (ratio[i] > ratio[i - 1] && ratio[i] > ratio[i + 1] && ratio[i] >= threshold) {
      return { index: i, ratio: ratio[i], maxR, threshold };
    }
  }
  return { index: ltaSamples, ratio: 1.0, maxR, threshold };
}

let badCount = 0;
for (const scen of scenarios) {
  for (const snr of snrLevels) {
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);
      
      const oA = pickOnset(getRatio(cleanA));
      const oB = pickOnset(getRatio(cleanB));
      const trueA = Math.round((0.05 + burst.metadata.ground_truth_leak_m / burst.metadata.wave_speed_m_s) * 10000);
      const trueB = Math.round((0.05 + (scen.pipeParams.lengthM - burst.metadata.ground_truth_leak_m) / burst.metadata.wave_speed_m_s) * 10000);
      const errA = Math.abs(oA.index - (trueA + 45));
      const errB = Math.abs(oB.index - (trueB + 45));
      if (errA > 100 || errB > 100) {
        badCount++;
        console.log('POOR: ' + scen.id + ' ' + snr + 'dB r' + (r + 1) + ': TrueA=' + (trueA + 45) + ' PickA=' + oA.index + ' (err=' + errA + ') | TrueB=' + (trueB + 45) + ' PickB=' + oB.index + ' (err=' + errB + ')');
      }
    }
  }
}
console.log('Total poor onset picks: ' + badCount + ' / 80');
