import {
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst,
  computeGCCPhat,
  computeSTALTA,
  extractGatedWindow,
  zeroPhaseBandpass,
  calculateKortewegWaveSpeed,
  triangulatePipeLeak
} from '../dist/src/index.js';

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const seeds = [101, 202, 303, 404, 505];
const fs = 10000;

console.log('Testing different methods on all 80 runs...');

// Test 1: Full-buffer GCC-PHAT (ungated)
{
  let passed = 0;
  let total = 0;
  let errors = [];
  for (const scen of scenarios) {
    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const res = triangulatePipeLeak(
          scen.pipeParams,
          { nodeId: 1, sampleRateHz: fs, samples: burst.node_a.samples },
          { nodeId: 2, sampleRateHz: fs, samples: burst.node_b.samples },
          burst.metadata.ground_truth_leak_m,
          { useAdaptiveGating: false }
        );
        const err = res.localizationErrorM ?? 999;
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }
  console.log(`Direct Full-Buffer GCC-PHAT: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m, meanErr=${(errors.reduce((a,b)=>a+b,0)/total).toFixed(3)}m`);
}

// Test 2: Gated with different maxLag settings
for (const maxGatedLagSamples of [30, 50, 80, 100, 150, 200]) {
  let passed = 0;
  let total = 0;
  let errors = [];

  for (const scen of scenarios) {
    const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
    const L = scen.pipeParams.lengthM;

    for (const snr of snrLevels) {
      for (const seed of seeds) {
        total++;
        const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
        const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
        const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

        const staA = computeSTALTA(cleanA, 50, 400);
        const staB = computeSTALTA(cleanB, 50, 400);

        const winLen = 1024;
        const gated = extractGatedWindow(cleanA, cleanB, staA.primaryOnsetIndex, staB.primaryOnsetIndex, winLen, 256);
        const maxLagSec = maxGatedLagSamples / fs;
        const gccGated = computeGCCPhat(gated.gatedA, gated.gatedB, fs, maxLagSec, { minFreqHz: 300, maxFreqHz: 2200, bandLimited: true });

        const totalLagSamples = gated.baseOffsetSamples + gccGated.sampleLag;
        const deltaTSec = totalLagSamples / fs;
        const estDist = (L - v_s * deltaTSec) / 2.0;
        const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
        errors.push(err);
        if (err <= 1.5) passed++;
      }
    }
  }
  console.log(`Gated maxLag=${maxGatedLagSamples}: passed=${passed}/${total} (${((passed/total)*100).toFixed(1)}%), maxErr=${Math.max(...errors).toFixed(2)}m, meanErr=${(errors.reduce((a,b)=>a+b,0)/total).toFixed(3)}m`);
}
