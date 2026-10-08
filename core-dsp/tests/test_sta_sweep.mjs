import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const fs = 10000;

console.log('Testing STA/LTA with different STA and LTA window sizes...');

for (const staLen of [30, 50, 80, 100]) {
  for (const ltaLen of [300, 500, 800, 1200]) {
    let goodDetections = 0;
    let totalDetections = 0;

    for (const scen of scenarios) {
      for (const snr of [24, 18, 12, 6]) {
        for (const seed of [101, 202, 303, 404, 505]) {
          totalDetections += 2; // both A and B
          const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
          const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 500, 1500);
          const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 500, 1500);

          // Find true arrival of burst
          let truePeakA = 0, maxA = 0;
          let truePeakB = 0, maxB = 0;
          for (let i = 0; i < burst.cleanSignalA.length; i++) {
            if (Math.abs(burst.cleanSignalA[i]) > maxA) { maxA = Math.abs(burst.cleanSignalA[i]); truePeakA = i; }
            if (Math.abs(burst.cleanSignalB[i]) > maxB) { maxB = Math.abs(burst.cleanSignalB[i]); truePeakB = i; }
          }

          // Custom STA/LTA
          function findOnset(x) {
            let staSum = 0, ltaSum = 0;
            let maxRatio = -1, maxIdx = -1;
            for (let i = 0; i < x.length; i++) {
              const sq = x[i] * x[i];
              staSum += sq;
              ltaSum += sq;
              if (i >= staLen) staSum -= x[i - staLen] * x[i - staLen];
              if (i >= ltaLen) ltaSum -= x[i - ltaLen] * x[i - ltaLen];
              if (i >= ltaLen) {
                const ratio = (staSum / staLen) / (ltaSum / ltaLen + 1e-9);
                if (ratio > maxRatio) {
                  maxRatio = ratio;
                  maxIdx = i;
                }
              }
            }
            return maxIdx;
          }

          const onA = findOnset(cleanA);
          const onB = findOnset(cleanB);

          if (Math.abs(onA - truePeakA) < 150) goodDetections++;
          if (Math.abs(onB - truePeakB) < 150) goodDetections++;
        }
      }
    }
    const pct = ((goodDetections / totalDetections) * 100).toFixed(1);
    console.log(`sta=${staLen}, lta=${ltaLen}: good=${goodDetections}/${totalDetections} (${pct}%)`);
  }
}
