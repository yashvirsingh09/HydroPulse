import { generateSyntheticBurst, zeroPhaseBandpass, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

function pickOnset(clean, factor = 0.65) {
  const n = clean.length;
  const rat = new Float64Array(n);
  let sS = 0, lS = 0;
  for (let i = 0; i < n; i++) {
    const v = clean[i] * clean[i];
    sS += v; lS += v;
    if (i >= 50) sS -= clean[i - 50] * clean[i - 50];
    if (i >= 400) lS -= clean[i - 400] * clean[i - 400];
    if (i >= 400) rat[i] = (sS / 50) / (lS / 400 + 1e-9);
  }

  let maxR = 0, maxI = 400;
  for (let i = 400; i < n; i++) {
    if (rat[i] > maxR) {
      maxR = rat[i];
      maxI = i;
    }
  }

  const thresh = Math.max(2.2, maxR * factor);
  let peakIdx = maxI;
  for (let i = 401; i < n - 1; i++) {
    if (rat[i] > rat[i - 1] && rat[i] > rat[i + 1] && rat[i] >= thresh) {
      peakIdx = i;
      break;
    }
  }

  // Scan backwards from peakIdx for onset
  let onsetIdx = peakIdx;
  const searchStart = Math.max(400, peakIdx - 100);
  const onsetThresh = Math.max(1.5, rat[peakIdx] * 0.4);
  for (let i = peakIdx; i >= searchStart; i--) {
    if (rat[i] <= onsetThresh) {
      onsetIdx = i;
      break;
    }
  }

  return { peakIdx, onsetIdx, maxR };
}

for (const scen of scenarios) {
  for (const snr of [18, 6]) {
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);

      const oA = pickOnset(cleanA);
      const oB = pickOnset(cleanB);

      const trueA = Math.round((0.05 + burst.metadata.ground_truth_leak_m / burst.metadata.wave_speed_m_s) * 10000);
      const trueB = Math.round((0.05 + (scen.pipeParams.lengthM - burst.metadata.ground_truth_leak_m) / burst.metadata.wave_speed_m_s) * 10000);

      const errA = Math.abs(oA.peakIdx - (trueA + 45));
      const errB = Math.abs(oB.peakIdx - (trueB + 45));

      if (errA > 50 || errB > 50) {
        console.log(`${scen.id} ${snr}dB r${r+1}: TrueA=${trueA+45} PickA=${oA.peakIdx} (err=${errA}) | TrueB=${trueB+45} PickB=${oB.peakIdx} (err=${errB})`);
      }
    }
  }
}
console.log('Test completed.');
