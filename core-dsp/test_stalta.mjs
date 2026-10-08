import { generateSyntheticBurst, zeroPhaseBandpass, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

function getStats(samples) {
  const n = samples.length;
  const staSamples = 50;
  const ltaSamples = 400;
  const ratio = new Float64Array(n);
  let staSum = 0.0;
  let ltaSum = 0.0;

  for (let i = 0; i < n; i++) {
    const valSq = samples[i] * samples[i];
    staSum += valSq;
    ltaSum += valSq;
    if (i >= staSamples) staSum -= samples[i - staSamples] * samples[i - staSamples];
    if (i >= ltaSamples) ltaSum -= samples[i - ltaSamples] * samples[i - ltaSamples];
    if (i >= ltaSamples) {
      const sta = staSum / staSamples;
      const lta = ltaSum / ltaSamples + 1e-9;
      ratio[i] = sta / lta;
    }
  }

  let maxR = 0, maxIdx = 0;
  let sum = 0, sumSq = 0, count = 0;
  for (let i = ltaSamples; i < n; i++) {
    const r = ratio[i];
    sum += r;
    sumSq += r * r;
    count++;
    if (r > maxR) {
      maxR = r;
      maxIdx = i;
    }
  }
  const mean = sum / count;
  const std = Math.sqrt(sumSq / count - mean * mean);
  return { maxR, maxIdx, mean, std, ratio };
}

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

for (const scen of scenarios) {
  for (const snr of [12, 6]) {
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);
      const statsA = getStats(cleanA);
      const statsB = getStats(cleanB);
      const trueA = Math.round((0.05 + burst.metadata.ground_truth_leak_m / burst.metadata.wave_speed_m_s) * 10000);
      const trueB = Math.round((0.05 + (scen.pipeParams.lengthM - burst.metadata.ground_truth_leak_m) / burst.metadata.wave_speed_m_s) * 10000);
      console.log(`${scen.id} ${snr}dB r${r+1}: TrueA=${trueA} MaxA=${statsA.maxIdx}(${statsA.maxR.toFixed(1)}) | TrueB=${trueB} MaxB=${statsB.maxIdx}(${statsB.maxR.toFixed(1)})`);
    }
  }
}
