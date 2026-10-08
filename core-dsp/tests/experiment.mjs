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

for (const passband of [[500, 1500], [600, 1200], [700, 1000]]) {
  let passed = 0;
  let total = 0;
  let allErrors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxDelaySec = (L / v_s) * 1.05;
    const maxLag = Math.floor(maxDelaySec * fs);

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, passband[0], passband[1]);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, passband[0], passband[1]);

        // Standard time-domain cross correlation
        let bestLag = 0;
        let maxVal = -Infinity;

        for (let lag = -maxLag; lag <= maxLag; lag++) {
          let sum = 0;
          const start = Math.max(0, -lag);
          const end = Math.min(cleanA.length, cleanB.length - lag);
          for (let i = start; i < end; i += 2) {
            sum += cleanA[i] * cleanB[i + lag];
          }
          if (sum > maxVal) {
            maxVal = sum;
            bestLag = lag;
          }
        }

        const deltaT = bestLag / fs;
        const estDist = (L - v_s * deltaT) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        allErrors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }

  console.log(`Passband ${passband[0]}-${passband[1]}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...allErrors).toFixed(2)}m`);
}
