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

console.log('Testing STA/LTA with 650-1050 Hz bandpass filter across all 80 runs...');

for (const passband of [[650, 1050], [700, 1000], [600, 1100]]) {
  let goodA = 0, goodB = 0, total = 0;

  for (const scen of scenarios) {
    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, passband[0], passband[1]);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, passband[0], passband[1]);

        // Find true peaks
        let maxA = 0, idxA = 0;
        let maxB = 0, idxB = 0;
        for (let i = 0; i < burst.cleanSignalA.length; i++) {
          if (Math.abs(burst.cleanSignalA[i]) > maxA) { maxA = Math.abs(burst.cleanSignalA[i]); idxA = i; }
          if (Math.abs(burst.cleanSignalB[i]) > maxB) { maxB = Math.abs(burst.cleanSignalB[i]); idxB = i; }
        }

        // STA/LTA with sta=60, lta=800
        function getOnset(x) {
          let sSum = 0, lSum = 0;
          let maxR = -1, maxI = -1;
          for (let i = 0; i < x.length; i++) {
            const sq = x[i] * x[i];
            sSum += sq;
            lSum += sq;
            if (i >= 60) sSum -= x[i - 60] * x[i - 60];
            if (i >= 600) lSum -= x[i - 600] * x[i - 600];
            if (i >= 600) {
              const r = (sSum / 60) / (lSum / 600 + 1e-9);
              if (r > maxR) { maxR = r; maxI = i; }
            }
          }
          return maxI;
        }

        const onA = getOnset(cleanA);
        const onB = getOnset(cleanB);

        if (Math.abs(onA - idxA) < 150) goodA++;
        if (Math.abs(onB - idxB) < 150) goodB++;
      }
    }
  }

  console.log(`Passband ${passband[0]}-${passband[1]}: goodA=${goodA}/${total} (${((goodA/total)*100).toFixed(1)}%), goodB=${goodB}/${total} (${((goodB/total)*100).toFixed(1)}%)`);
}
