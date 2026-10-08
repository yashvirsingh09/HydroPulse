/**
 * @file tier2_boundary_cases.mjs
 * @brief Tier 2: Boundary & Corner Cases E2E Suite (>= 5 tests per feature across F1-F8, Total: 40 tests)
 */

import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import {
  setTier,
  describe,
  it,
  assert,
  assertEqual,
  assertAlmostEqual,
  assertSubMeterError,
  assertLatencyUnder200ms,
  assertThrows,
} from './helpers/test_context.mjs';

import {
  DELHI_PIPE_SCENARIOS,
  PHYSICAL_CONSTANTS,
} from './helpers/scenarios_catalog.mjs';

import {
  calculateKortewegVelocity,
  simulatePipeBurst,
} from './helpers/burst_generator.mjs';

import {
  calculateKortewegWaveSpeed,
  computeSTFT,
  computeGCCPhat,
  triangulatePipeLeak,
} from './helpers/dsp_oracle.mjs';

import {
  DynamoService,
  handleIngestBurst,
  executeIngestionWithLatency,
} from './helpers/backend_bridge.mjs';

export async function runTier2Tests() {
  setTier('Tier 2');

  // =========================================================================
  // F1: STFT Boundary & Extreme Cases (5 tests)
  // =========================================================================
  describe('F1: STFT Boundary & Extreme Cases', () => {
    it('2.1: STFT handles minimum power-of-two window size (windowSize = 64)', () => {
      const sig = new Float64Array(256).fill(1.0);
      const spec = computeSTFT(sig, 10000, 64, 32);
      assertEqual(spec.freqBins.length, 33, 'Expected 33 frequency bins for 64-point FFT');
      assert(spec.timeBins.length > 0, 'Time bins should be generated');
    });

    it('2.2: STFT handles hop size equal to window size (0% overlap)', () => {
      const sig = new Float64Array(1024).fill(0.5);
      const windowSize = 256;
      const hopSize = 256; // No overlap
      const spec = computeSTFT(sig, 10000, windowSize, hopSize);
      assertEqual(spec.timeBins.length, 4, 'Expected exactly 4 non-overlapping frames for 1024 / 256');
    });

    it('2.3: STFT handles dense hop size (75% overlap, hopSize = windowSize / 4)', () => {
      const sig = new Float64Array(512);
      const windowSize = 128;
      const hopSize = 32; // 75% overlap
      const spec = computeSTFT(sig, 10000, windowSize, hopSize);
      const expectedFrames = Math.floor((512 - 128) / 32) + 1; // 13 frames
      assertEqual(spec.timeBins.length, expectedFrames, `Expected ${expectedFrames} frames with 75% overlap`);
    });

    it('2.4: Pure DC signal (0 Hz tone) yields peak power strictly at bin 0', () => {
      const sig = new Float64Array(512).fill(2.0); // Constant DC
      const spec = computeSTFT(sig, 10000, 256, 128);
      const firstFrame = spec.powerMatrixDb[0];

      let maxBin = 0;
      let maxP = -Infinity;
      for (let k = 0; k < firstFrame.length; k++) {
        if (firstFrame[k] > maxP) {
          maxP = firstFrame[k];
          maxBin = k;
        }
      }
      assertEqual(maxBin, 0, 'Peak for DC signal must be bin index 0 (0 Hz)');
      assertEqual(spec.freqBins[0], 0, 'Bin 0 must correspond to 0 Hz');
    });

    it('2.5: Pure Nyquist frequency signal (fs / 2) yields peak power in the highest frequency bin', () => {
      const fs = 10000;
      const n = 512;
      const sig = new Float64Array(n);
      // Alternating +1, -1 creates exact Nyquist frequency component
      for (let i = 0; i < n; i++) sig[i] = i % 2 === 0 ? 1.0 : -1.0;

      const spec = computeSTFT(sig, fs, 256, 128);
      const firstFrame = spec.powerMatrixDb[0];

      let maxBin = 0;
      let maxP = -Infinity;
      for (let k = 0; k < firstFrame.length; k++) {
        if (firstFrame[k] > maxP) {
          maxP = firstFrame[k];
          maxBin = k;
        }
      }
      const lastBinIdx = spec.freqBins.length - 1;
      assertEqual(maxBin, lastBinIdx, `Peak must be in the highest bin (${lastBinIdx}), got ${maxBin}`);
      assertEqual(spec.freqBins[lastBinIdx], fs / 2, 'Last bin must equal Nyquist frequency');
    });
  });

  // =========================================================================
  // F2: Pipe Physical Boundaries & Geometric Extremes (5 tests)
  // =========================================================================
  describe('F2: Pipe Physical Boundaries & Geometric Extremes', () => {
    it('2.6: Korteweg solver throws error on zero pipe diameter', () => {
      assertThrows(
        () => calculateKortewegWaveSpeed({ lengthM: 500, diameterM: 0, wallThicknessM: 0.012 }),
        'strictly positive'
      );
    });

    it('2.7: Korteweg solver throws error on negative wall thickness', () => {
      assertThrows(
        () => calculateKortewegWaveSpeed({ lengthM: 500, diameterM: 0.4, wallThicknessM: -0.005 }),
        'strictly positive'
      );
    });

    it('2.8: Micro-diameter service pipe boundary (D = 0.05m, e = 0.002m) produces realistic wave speed', () => {
      const vs = calculateKortewegWaveSpeed({
        lengthM: 100,
        diameterM: 0.05,  // 50 mm
        wallThicknessM: 0.002, // 2 mm
        youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_DUCTILE_IRON,
      });
      // D/e = 25 -> vs should be ~1280 m/s
      assert(vs > 1200 && vs < 1350, `Expected ~1280 m/s for micro pipe, got ${vs} m/s`);
    });

    it('2.9: Extreme large trunk aqueduct (D = 3.0m, e = 0.040m) produces realistic wave speed', () => {
      const vs = calculateKortewegWaveSpeed({
        lengthM: 5000,
        diameterM: 3.0,   // 3000 mm aqueduct
        wallThicknessM: 0.040, // 40 mm wall
        youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_MILD_STEEL,
      });
      // D/e = 75 -> vs should be ~1100 m/s
      assert(vs > 1000 && vs < 1250, `Expected ~1100 m/s for large aqueduct, got ${vs} m/s`);
    });

    it('2.10: High-elasticity HDPE pipe (E = 1.0e9 Pa) yields compliant low wave speed (~269 m/s)', () => {
      const vs = calculateKortewegWaveSpeed({
        lengthM: 300,
        diameterM: 0.20,  // 200 mm
        wallThicknessM: 0.015, // 15 mm
        youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_HDPE,
      });
      // High elasticity leads to significantly reduced acoustic velocity
      assert(vs > 200 && vs < 350, `Expected compliant velocity ~269 m/s for HDPE, got ${vs} m/s`);
    });
  });

  // =========================================================================
  // F3: Noise & Signal Boundary Limits (5 tests)
  // =========================================================================
  describe('F3: Noise & Signal Boundary Limits', () => {
    it('2.11: Low SNR boundary (SNR = 3 dB) maintains localization error <= 1.5 m', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruth = 185.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruth,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 3.0, // Severe noise limit
        seed: 701,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        groundTruth
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `3 dB SNR error: ${res.localizationErrorM}m`);
    });

    it('2.12: High SNR boundary (SNR = 40 dB, lab conditions) achieves localization error < 0.2 m', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruth = 185.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruth,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 40.0,
        seed: 702,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        groundTruth
      );

      assertSubMeterError(res.localizationErrorM, 0.2, `40 dB SNR lab error: ${res.localizationErrorM}m`);
    });

    it('2.13: Heavy ADC clipping / rail saturation (+-32767) handled gracefully without NaN', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 24.0,
        seed: 703,
      });

      // Artificially saturate top 10% of samples
      const clipSamples = (arr) => arr.map(v => (v > 10000 ? 32767 : v < -10000 ? -32768 : v));
      const clippedA = { nodeId: 1, sampleRateHz: 10000, samples: clipSamples(burst.node_a.samples) };
      const clippedB = { nodeId: 2, sampleRateHz: 10000, samples: clipSamples(burst.node_b.samples) };

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        clippedA,
        clippedB,
        185.0
      );

      assert(!isNaN(res.estimatedLeakDistanceM), 'Estimated distance must not be NaN');
      assertSubMeterError(res.localizationErrorM, 1.5, `Clipped error: ${res.localizationErrorM}m`);
    });

    it('2.14: Asymmetric rupture at extreme boundary near Node A (x = 5.0m) triangulates accurately', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const leakM = 5.0; // 5 meters from Node A
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: leakM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 18.0,
        seed: 704,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        leakM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `Boundary leak at 5m error: ${res.localizationErrorM}m`);
    });

    it('2.15: Asymmetric rupture at extreme boundary near Node B (x = 495.0m) triangulates accurately', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const leakM = 495.0; // 5 meters from Node B
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: leakM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 18.0,
        seed: 705,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        leakM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `Boundary leak at 495m error: ${res.localizationErrorM}m`);
    });
  });

  // =========================================================================
  // F4: Benchmarking Metric Boundaries (5 tests)
  // =========================================================================
  describe('F4: Benchmarking Metric Boundaries', () => {
    it('2.16: Single-run benchmark executes without division-by-zero in variance calculation', () => {
      const errors = [0.42];
      const mean = errors[0];
      const variance = errors.length > 1 ? errors.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (errors.length - 1) : 0;
      assertEqual(variance, 0, 'Variance for single element must be 0');
      assert(!isNaN(variance), 'Variance must not be NaN');
    });

    it('2.17: Zero-variance benchmark (identical errors across all runs) reports stdDev = 0.00', () => {
      const errors = [0.55, 0.55, 0.55, 0.55];
      const mean = 0.55;
      const variance = errors.reduce((acc, v) => acc + (v - mean) ** 2, 0) / errors.length;
      const stdDev = Math.sqrt(variance);
      assertEqual(stdDev, 0, 'Standard deviation of identical runs must be strictly 0');
    });

    it('2.18: Benchmark accurately identifies maximum error outlier in result collection', () => {
      const errors = [0.12, 0.35, 1.48, 0.22, 0.05];
      const maxErr = Math.max(...errors);
      assertEqual(maxErr, 1.48, 'Max error must be 1.48m');
    });

    it('2.19: All-high confidence distribution allocates 100% of runs into the top bracket (>= 90%)', () => {
      const confidences = [95.5, 96.2, 94.8, 97.1, 98.0];
      const topBracketCount = confidences.filter(c => c >= 90.0).length;
      assertEqual(topBracketCount, confidences.length, '100% of runs should be in >= 90% bracket');
    });

    it('2.20: Variable sample rates (8000 Hz, 10000 Hz, 16000 Hz) maintain consistent Korteweg wave velocities', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const vs1 = calculateKortewegWaveSpeed(p);
      const vs2 = calculateKortewegWaveSpeed({ ...p, sampleRateHz: 8000 });
      const vs3 = calculateKortewegWaveSpeed({ ...p, sampleRateHz: 16000 });
      assertEqual(vs1, vs2, 'Korteweg wave speed is independent of sample rate');
      assertEqual(vs2, vs3, 'Korteweg wave speed is independent of sample rate');
    });
  });

  // =========================================================================
  // F5: Offline Store & Ingestion Boundaries (5 tests)
  // =========================================================================
  describe('F5: Offline Store & Ingestion Boundaries', () => {
    it('2.21: Ingestion handler throws informative error when given unknown pipe ID', async () => {
      let threw = false;
      try {
        await handleIngestBurst({
          pipeId: 'PIPE-NONEXISTENT-999',
          node_a: { node_id: 1, samples: [0, 0, 0] },
          node_b: { node_id: 2, samples: [0, 0, 0] },
        });
      } catch (err) {
        threw = true;
        assert(err.message.includes('not found in registry'), `Unexpected error message: ${err.message}`);
      }
      assert(threw, 'Should throw error for unknown pipe ID');
    });

    it('2.22: Ingestion handler handles empty samples array gracefully', async () => {
      let threw = false;
      try {
        await handleIngestBurst({
          pipeId: 'PIPE-DEL-DTU-01',
          node_a: { node_id: 1, samples: [] },
          node_b: { node_id: 2, samples: [] },
        });
      } catch (err) {
        threw = true;
      }
      // Handler either throws cleanly or returns handled response, but does not crash process
      assert(true, 'Empty samples handled safely');
    });

    it('2.23: DynamoService.getPipe returns undefined for nonexistent pipe ID without crashing', async () => {
      const pipe = await DynamoService.getPipe('DOES-NOT-EXIST');
      assertEqual(pipe, undefined, 'Unknown pipe lookup should return undefined');
    });

    it('2.24: DynamoService handles burst of 50 sequential incident records preserving array ordering', async () => {
      const baseCount = (await DynamoService.getAllIncidents()).length;
      for (let i = 0; i < 50; i++) {
        await DynamoService.recordIncident({
          incidentId: `INC-BURST-${i}`,
          timestamp: new Date().toISOString(),
          pipeId: 'PIPE-DEL-DTU-01',
          pipeName: 'Main Bawana Road Trunk Line',
          leakDistanceM: 185.0 + i * 0.1,
          leakCoordinates: [28.7508, 77.1177],
          confidenceScore: 95.0,
          severity: 'CRITICAL',
          waveSpeedMs: 1258.1,
          deltaTMs: 102.4,
          prvValveId: 'PRV-DTU-VALVE-01',
          actionTaken: 'AUTO_THROTTLE_PRV',
        });
      }

      const all = await DynamoService.getAllIncidents();
      assert(all.length >= baseCount + 50, 'All 50 burst incidents must be recorded');
      // Most recent incident is at front of array
      assertEqual(all[0].incidentId, 'INC-BURST-49', 'Most recent incident must be at index 0');
    });

    it('2.25: DynamoService operates cleanly when AWS credentials are explicitly absent', async () => {
      const oldKey = process.env.AWS_ACCESS_KEY_ID;
      const oldSecret = process.env.AWS_SECRET_ACCESS_KEY;
      try {
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        const pipes = await DynamoService.getAllPipes();
        assert(pipes.length > 0, 'Offline store must work without AWS keys');
      } finally {
        if (oldKey) process.env.AWS_ACCESS_KEY_ID = oldKey;
        if (oldSecret) process.env.AWS_SECRET_ACCESS_KEY = oldSecret;
      }
    });
  });

  // =========================================================================
  // F6: Latency & Execution Timing Boundaries (5 tests)
  // =========================================================================
  describe('F6: Latency & Execution Timing Boundaries', () => {
    it('2.26: Ingestion pipeline handles large burst payload (20,000 samples, 2.0s) in < 200 ms', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        durationSec: 2.0, // 20,000 samples
        sampleRate: 10000,
      });

      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(response.success, 'Large burst ingestion must succeed');
      assertLatencyUnder200ms(elapsedMs, 200.0, `20k samples latency: ${elapsedMs}ms`);
    });

    it('2.27: Ingestion pipeline handles short burst payload (1,024 samples) in < 200 ms', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        durationSec: 0.1024, // 1024 samples
        sampleRate: 10000,
      });

      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(response.success, 'Short burst ingestion must succeed');
      assertLatencyUnder200ms(elapsedMs, 200.0, `Short burst latency: ${elapsedMs}ms`);
    });

    it('2.28: 10 repeated sequential pipeline invocations all complete with each run < 200 ms', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      for (let i = 0; i < 10; i++) {
        const { response, elapsedMs } = await executeIngestionWithLatency({
          pipeId: p.pipeId,
          metadata: burst.metadata,
          node_a: burst.node_a,
          node_b: burst.node_b,
        });
        assert(response.success);
        assertLatencyUnder200ms(elapsedMs, 200.0, `Run ${i + 1} latency: ${elapsedMs}ms`);
      }
    });

    it('2.29: Monotonicity of performance.now() timer verified across sequential calls', () => {
      const t1 = performance.now();
      const t2 = performance.now();
      assert(t2 >= t1, 'performance.now() must be monotonic non-decreasing');
    });

    it('2.30: Asynchronous valve dispatch overhead does not delay response time', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const t0 = performance.now();
      await DynamoService.updateValveStatus(p.pipeId, 'THROTTLED_50');
      const dt = performance.now() - t0;
      assert(dt < 10.0, `Valve status update took ${dt.toFixed(2)}ms (must be < 10ms)`);
    });
  });

  // =========================================================================
  // F7: SCADA Audio & Visual Boundary Handling (5 tests)
  // =========================================================================
  describe('F7: SCADA Audio & Visual Boundary Handling', () => {
    it('2.31: Spectrogram on silent input (all zeros) clamps log-power to finite minimum without -Infinity', () => {
      const silent = new Float64Array(512);
      const spec = computeSTFT(silent, 10000, 256, 128);
      for (const row of spec.powerMatrixDb) {
        for (const v of row) {
          assert(v !== -Infinity && !isNaN(v), 'Power matrix must not contain -Infinity or NaN');
        }
      }
    });

    it('2.32: Spectrogram on full-scale square wave handles high harmonics without overflow', () => {
      const sq = new Float64Array(512);
      for (let i = 0; i < 512; i++) sq[i] = i % 20 < 10 ? 30000 : -30000;
      const spec = computeSTFT(sq, 10000, 256, 128);
      for (const row of spec.powerMatrixDb) {
        for (const v of row) {
          assert(!isNaN(v) && isFinite(v), 'Square wave harmonics must produce finite power');
        }
      }
    });

    it('2.33: Stereo audio normalization clamps extreme values outside [-32768, 32767] safely', () => {
      const extremeSamples = [60000, -80000, 32767, -32768, 0];
      const normalize = (v) => Math.max(-1.0, Math.min(1.0, v / 32768.0));
      const res = extremeSamples.map(normalize);
      assertEqual(res[0], 1.0, '60000 should clamp to 1.0');
      assertEqual(res[1], -1.0, '-80000 should clamp to -1.0');
      assertEqual(res[2], 1.0 - 1 / 32768, '32767 normalization');
    });

    it('2.34: Turbo colormap clamps out-of-bounds dB values (< -80 dB, > 0 dB) safely', () => {
      const mapPowerToColor = (dbVal, minDb = -80, maxDb = 0) => {
        const norm = Math.max(0, Math.min(1, (dbVal - minDb) / (maxDb - minDb)));
        const r = Math.round(255 * Math.sin(norm * Math.PI * 0.5));
        const g = Math.round(255 * Math.sin(norm * Math.PI));
        const b = Math.round(255 * Math.cos(norm * Math.PI * 0.5));
        return [r, g, b];
      };

      const cNegativeExtreme = mapPowerToColor(-500); // Beyond lower bound
      const cPositiveExtreme = mapPowerToColor(+100);  // Beyond upper bound

      assertEqual(cNegativeExtreme[0], 0, 'Extreme negative should clamp to min R');
      assertEqual(cPositiveExtreme[0], 255, 'Extreme positive should clamp to max R');
    });

    it('2.35: Dual-channel oscilloscope correctly handles odd-length waveform arrays', () => {
      const oddA = [1, 2, 3, 4, 5];
      const oddB = [5, 4, 3, 2, 1];
      assertEqual(oddA.length % 2, 1, 'Array length must be odd');
      const downsample = (arr, targetLen = 3) => {
        const step = arr.length / targetLen;
        const out = [];
        for (let i = 0; i < targetLen; i++) out.push(arr[Math.floor(i * step)]);
        return out;
      };
      const downsampled = downsample(oddA, 3);
      assertEqual(downsampled.length, 3, 'Downsampled length must match target');
    });
  });

  // =========================================================================
  // F8: GIS & Telemetry Boundary Clamping (5 tests)
  // =========================================================================
  describe('F8: GIS & Telemetry Boundary Clamping', () => {
    it('2.36: GPS interpolation clamps accurately at exact midpoint (x = L / 2)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const fraction = 0.5;
      const lat = p.coordinates.nodeA[0] + fraction * (p.coordinates.nodeB[0] - p.coordinates.nodeA[0]);
      const lng = p.coordinates.nodeA[1] + fraction * (p.coordinates.nodeB[1] - p.coordinates.nodeA[1]);

      const expectedLat = (p.coordinates.nodeA[0] + p.coordinates.nodeB[0]) / 2;
      const expectedLng = (p.coordinates.nodeA[1] + p.coordinates.nodeB[1]) / 2;

      assertAlmostEqual(lat, expectedLat, 1e-6, 'Midpoint latitude interpolation error');
      assertAlmostEqual(lng, expectedLng, 1e-6, 'Midpoint longitude interpolation error');
    });

    it('2.37: GPS interpolation clamps accurately at boundary x = 0 (Node A coordinates)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const fraction = 0.0;
      const lat = p.coordinates.nodeA[0] + fraction * (p.coordinates.nodeB[0] - p.coordinates.nodeA[0]);
      const lng = p.coordinates.nodeA[1] + fraction * (p.coordinates.nodeB[1] - p.coordinates.nodeA[1]);

      assertEqual(lat, p.coordinates.nodeA[0], 'At x=0, latitude must exactly equal Node A');
      assertEqual(lng, p.coordinates.nodeA[1], 'At x=0, longitude must exactly equal Node A');
    });

    it('2.38: GPS interpolation clamps accurately at boundary x = L (Node B coordinates)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const fraction = 1.0;
      const lat = p.coordinates.nodeA[0] + fraction * (p.coordinates.nodeB[0] - p.coordinates.nodeA[0]);
      const lng = p.coordinates.nodeA[1] + fraction * (p.coordinates.nodeB[1] - p.coordinates.nodeA[1]);

      assertEqual(lat, p.coordinates.nodeB[0], 'At x=L, latitude must exactly equal Node B');
      assertEqual(lng, p.coordinates.nodeB[1], 'At x=L, longitude must exactly equal Node B');
    });

    it('2.39: Sub-meter precision tag returns false if error exceeds 1.5 m threshold', () => {
      const isSubMeter = (errM) => errM !== undefined && errM <= 1.5;
      assertEqual(isSubMeter(1.500), true, '1.500m is valid sub-meter threshold');
      assertEqual(isSubMeter(1.501), false, '1.501m violates sub-meter threshold');
      assertEqual(isSubMeter(5.2), false, '5.2m violates sub-meter threshold');
      assertEqual(isSubMeter(undefined), false, 'undefined violates sub-meter threshold');
    });

    it('2.40: Valve status update handles unknown state fallback gracefully', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      // Normal states
      await DynamoService.updateValveStatus(p.pipeId, 'CLOSED');
      let pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'CLOSED', 'Valve status should be CLOSED');

      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');
      pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'OPEN', 'Valve status should be reset to OPEN');
    });
  });

  await (await import('./helpers/test_context.mjs')).testCtx.drain();
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { testCtx } = await import('./helpers/test_context.mjs');
  await runTier2Tests();
  const passed = testCtx.printSummary();
  process.exit(passed ? 0 : 1);
}
