import { generateSyntheticBurst, zeroPhaseBandpass, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

function computeSTALTAImproved(samples, staSamples = 50, ltaSamples = 400) {
  const n = samples.length;
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

  // 1. Find all local peaks with refractory window of 150 samples
  const allPeaks = [];
  for (let i = ltaSamples + 1; i < n - 1; i++) {
    if (ratio[i] > ratio[i - 1] && ratio[i] > ratio[i + 1] && ratio[i] >= 1.5) {
      allPeaks.push({ index: i, ratio: ratio[i] });
    }
  }

  // Filter peaks with refractory window
  const refractory = 150;
  // Sort by ratio descending first to find strongest peaks
  allPeaks.sort((a, b) => b.ratio - a.ratio);
  const distinctPeaks = [];
  for (const p of allPeaks) {
    if (distinctPeaks.every(dp => Math.abs(dp.index - p.index) > refractory)) {
      distinctPeaks.push(p);
      if (distinctPeaks.length >= 8) break;
    }
  }

  if (distinctPeaks.length === 0) {
    return {
      ratioCurve: ratio,
      topTriggers: [],
      primaryOnsetIndex: ltaSamples
    };
  }

  // Strongest peak
  const maxPeakRatio = distinctPeaks[0].ratio;

  // Significant event peaks: peaks that are at least 40% of the max peak ratio, and at least 2.0
  const sigThreshold = Math.max(1.8, maxPeakRatio * 0.40);
  const significantPeaks = distinctPeaks.filter(p => p.ratio >= sigThreshold);

  // The first transient arrival is the earliest chronological significant peak
  significantPeaks.sort((a, b) => a.index - b.index);
  const firstArrivalPeak = significantPeaks[0];

  // Pick the onset: scan backward from firstArrivalPeak.index to find where ratio rises above background
  let onsetIndex = firstArrivalPeak.index;
  const searchStart = Math.max(ltaSamples, firstArrivalPeak.index - 100);
  const onsetThreshold = Math.max(1.5, firstArrivalPeak.ratio * 0.35);
  for (let i = firstArrivalPeak.index; i >= searchStart; i--) {
    if (ratio[i] <= onsetThreshold) {
      onsetIndex = i;
      break;
    }
  }

  // topTriggers formatted as required: top distinct triggers sorted chronologically
  distinctPeaks.sort((a, b) => a.index - b.index);

  return {
    ratioCurve: ratio,
    topTriggers: distinctPeaks.slice(0, 6),
    primaryOnsetIndex: onsetIndex
  };
}

let badCount = 0;
for (const scen of scenarios) {
  for (const snr of snrLevels) {
    for (let r = 0; r < 5; r++) {
      const seed = baseSeeds[r];
      const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
      const cleanA = zeroPhaseBandpass(burst.node_a.samples, 10000, 450, 1500);
      const cleanB = zeroPhaseBandpass(burst.node_b.samples, 10000, 450, 1500);

      const staA = computeSTALTAImproved(cleanA);
      const staB = computeSTALTAImproved(cleanB);

      const trueA = Math.round((0.05 + burst.metadata.ground_truth_leak_m / burst.metadata.wave_speed_m_s) * 10000);
      const trueB = Math.round((0.05 + (scen.pipeParams.lengthM - burst.metadata.ground_truth_leak_m) / burst.metadata.wave_speed_m_s) * 10000);

      const errA = Math.abs(staA.primaryOnsetIndex - trueA);
      const errB = Math.abs(staB.primaryOnsetIndex - trueB);

      if (errA > 100 || errB > 100) {
        badCount++;
        console.log(`POOR: ${scen.id} ${snr}dB r${r+1}: TrueA=${trueA} OnsetA=${staA.primaryOnsetIndex} (err=${errA}) | TrueB=${trueB} OnsetB=${staB.primaryOnsetIndex} (err=${errB})`);
      }
    }
  }
}
console.log(`Total poor onset picks: ${badCount} / 80`);
