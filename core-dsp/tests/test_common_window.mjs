import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeGCCPhat,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Testing Common Window GCC-PHAT across all 80 runs...');

for (const winSec of [0.4, 0.5, 0.6, 0.8, 1.0]) {
  let passed = 0;
  let total = 0;
  let errors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;
    const maxLagSec = (L / v_s) * 1.05;

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

        // Find highest energy region (transient) using envelope of channel A or sum of energies
        // Moving window energy
        const envLen = Math.floor(winSec * fs);
        let bestStart = 0;
        let maxEnergy = -1;
        const step = 50;
        for (let s = 0; s <= cleanA.length - envLen; s += step) {
          let energy = 0;
          for (let i = s; i < s + envLen; i += 4) {
            energy += cleanA[i] * cleanA[i] + cleanB[i] * cleanB[i];
          }
          if (energy > maxEnergy) {
            maxEnergy = energy;
            bestStart = s;
          }
        }

        const subA = cleanA.slice(bestStart, bestStart + envLen);
        const subB = cleanB.slice(bestStart, bestStart + envLen);

        const res = computeGCCPhat(subA, subB, fs, maxLagSec, { minFreqHz: 300, maxFreqHz: 2200, bandLimited: true });
        const estDist = (L - v_s * res.deltaTSeconds) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }
  console.log(`winSec=${winSec}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m, meanErr=${(errors.reduce((a,b)=>a+b,0)/total).toFixed(3)}m`);
}
