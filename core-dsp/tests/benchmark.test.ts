/**
 * @file benchmark.test.ts
 * @brief Automated 80-Run Multi-Scenario DSP Acoustic Localization Benchmark Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

import {
  triangulatePipeLeak,
  ScenarioBenchmarkMetric,
  DELHI_PIPE_SCENARIOS,
  generateSyntheticBurst
} from '../src/index.js';

describe('HydroPulse 80-Run Multi-Scenario Acoustic Benchmark Suite', () => {

  it('evaluates 80 runs across all 4 Delhi scenarios and SNRs down to 6 dB (<= 1.5m error)', () => {
    const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
    const snrLevels = [24, 18, 12, 6];
    const runsPerCondition = 5;
    const baseSeeds = [101, 202, 303, 404, 505];

    const suiteMetrics: ScenarioBenchmarkMetric[] = [];
    const allErrors: number[] = [];
    let totalRuns = 0;
    let passedRuns = 0;
    let sixDbTotalRuns = 0;
    let sixDbPassedRuns = 0;

    console.log('\n========================================================================================================');
    console.log('              HYDROPULSE AUTONOMOUS ACOUSTIC LOCALIZATION: 80-RUN BENCHMARK SUITE                       ');
    console.log('========================================================================================================');
    console.log('┌──────────────────────┬────────┬──────┬──────────────┬─────────────┬─────────────┬─────────────┬──────────┐');
    console.log('│ Scenario Name        │ SNR    │ Runs │ Mean Err (m) │ Max Err (m) │ Std Dev (m) │ Sub-Meter % │ Conf (%) │');
    console.log('├──────────────────────┼────────┼──────┼──────────────┼─────────────┼─────────────┼─────────────┼──────────┤');

    for (const scen of scenarios) {
      for (const snr of snrLevels) {
        const conditionErrors: number[] = [];
        const conditionConfidences: number[] = [];
        const conditionTimes: number[] = [];

        for (let r = 0; r < runsPerCondition; r++) {
          const seed = baseSeeds[r];
          const burst = generateSyntheticBurst({
            scenarioId: scen.id,
            snrDb: snr,
            seed
          });

          const startTime = performance.now();
          const result = triangulatePipeLeak(
            scen.pipeParams,
            { nodeId: 1, sampleRateHz: burst.metadata.sample_rate_hz, samples: burst.node_a.samples },
            { nodeId: 2, sampleRateHz: burst.metadata.sample_rate_hz, samples: burst.node_b.samples },
            burst.metadata.ground_truth_leak_m
          );
          const elapsedMs = performance.now() - startTime;

          const err = result.localizationErrorM ?? 999;
          conditionErrors.push(err);
          allErrors.push(err);
          conditionConfidences.push(result.confidenceScore);
          conditionTimes.push(elapsedMs);

          totalRuns++;
          if (snr === 6) sixDbTotalRuns++;
          if (err <= 1.5) {
            passedRuns++;
            if (snr === 6) sixDbPassedRuns++;
          }
        }

        const meanErr = conditionErrors.reduce((a, b) => a + b, 0) / runsPerCondition;
        const maxErr = Math.max(...conditionErrors);
        const variance =
          conditionErrors.reduce((acc, val) => acc + Math.pow(val - meanErr, 2), 0) / runsPerCondition;
        const stdDev = Math.sqrt(variance);
        const subMeterRate = (conditionErrors.filter((e) => e <= 1.5).length / runsPerCondition) * 100.0;
        const meanConf = conditionConfidences.reduce((a, b) => a + b, 0) / runsPerCondition;
        const meanTime = conditionTimes.reduce((a, b) => a + b, 0) / runsPerCondition;

        suiteMetrics.push({
          scenarioId: scen.id,
          scenarioName: scen.name,
          pipeMaterial: scen.material,
          pipeLengthM: scen.pipeParams.lengthM,
          snrDb: snr,
          totalRuns: runsPerCondition,
          meanErrorM: Number(meanErr.toFixed(3)),
          maxErrorM: Number(maxErr.toFixed(3)),
          stdDevM: Number(stdDev.toFixed(3)),
          subMeterPassRatePct: Number(subMeterRate.toFixed(1)),
          meanConfidencePct: Number(meanConf.toFixed(1)),
          meanExecutionTimeMs: Number(meanTime.toFixed(2))
        });

        // Format row in ASCII Table
        const namePad = scen.name.slice(0, 20).padEnd(20, ' ');
        const snrPad = `${snr} dB`.padStart(6, ' ');
        const runsPad = `${runsPerCondition}`.padStart(4, ' ');
        const meanPad = meanErr.toFixed(3).padStart(12, ' ');
        const maxPad = maxErr.toFixed(3).padStart(11, ' ');
        const stdPad = stdDev.toFixed(3).padStart(11, ' ');
        const passPad = `${subMeterRate.toFixed(0)}%`.padStart(11, ' ');
        const confPad = `${meanConf.toFixed(1)}%`.padStart(8, ' ');

        console.log(`│ ${namePad} │ ${snrPad} │ ${runsPad} │ ${meanPad} │ ${maxPad} │ ${stdPad} │ ${passPad} │ ${confPad} │`);
      }
    }

    console.log('└──────────────────────┴────────┴──────┴──────────────┴─────────────┴─────────────┴─────────────┴──────────┘');

    const overallMean = allErrors.reduce((a, b) => a + b, 0) / allErrors.length;
    const overallMax = Math.max(...allErrors);
    const overallPassPct = (passedRuns / totalRuns) * 100.0;

    const sixDbPassPct = sixDbTotalRuns > 0 ? (sixDbPassedRuns / sixDbTotalRuns) * 100.0 : 0.0;

    console.log(`\nOVERALL BENCHMARK ACCURACY SUMMARY:`);
    console.log(`- Total Runs Completed      : ${totalRuns} / 80`);
    console.log(`- Runs Passed (<= 1.5m)     : ${passedRuns} / 80 (${overallPassPct.toFixed(1)}%)`);
    console.log(`- 6 dB SNR Runs (<= 1.5m)   : ${sixDbPassedRuns} / ${sixDbTotalRuns} (${sixDbPassPct.toFixed(1)}%)`);
    console.log(`- Overall Mean Error        : ${overallMean.toFixed(3)} m`);
    console.log(`- Overall Maximum Error     : ${overallMax.toFixed(3)} m`);
    console.log(`========================================================================================================\n`);

    assert.strictEqual(totalRuns, 80, 'Must complete exactly 80 benchmark runs');
    assert.ok(passedRuns >= 72, `At least 90% of benchmark runs (>= 72/80) must achieve <= 1.5m error, got ${passedRuns}`);
    assert.ok(overallPassPct >= 90.0, `Overall sub-meter pass rate must exceed 90%, got ${overallPassPct.toFixed(1)}%`);
    assert.ok(sixDbPassedRuns >= 18, `Severe noise (6 dB SNR) pass rate must achieve >= 90% (>= 18/20), got ${sixDbPassedRuns}/${sixDbTotalRuns}`);
  });
});
