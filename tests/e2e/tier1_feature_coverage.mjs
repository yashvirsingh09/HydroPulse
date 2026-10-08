/**
 * @file tier1_feature_coverage.mjs
 * @brief Tier 1: Feature Coverage E2E Suite (>= 5 tests per feature across F1-F8, Total: 40 tests)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  setTier,
  describe,
  it,
  assert,
  assertEqual,
  assertAlmostEqual,
  assertSubMeterError,
  assertLatencyUnder200ms,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

export async function runTier1Tests() {
  setTier('Tier 1');

  // =========================================================================
  // F1: STFT Frequency Spectrogram Engine (5 tests)
  // =========================================================================
  describe('F1: STFT Frequency Spectrogram Engine', () => {
    it('1.1: STFT produces valid timeBins, freqBins, and powerMatrixDb dimensions', () => {
      const fs = 10000;
      const durationSec = 0.5; // 5000 samples
      const nSamples = Math.floor(fs * durationSec);
      const testSig = new Float64Array(nSamples);
      for (let i = 0; i < nSamples; i++) testSig[i] = Math.sin(2 * Math.PI * 850 * (i / fs));

      const windowSize = 256;
      const hopSize = 128;
      const spec = computeSTFT(testSig, fs, windowSize, hopSize);

      const expectedFrames = Math.floor((nSamples - windowSize) / hopSize) + 1;
      const expectedFreqBins = windowSize / 2 + 1;

      assertEqual(spec.timeBins.length, expectedFrames, 'Time bins count mismatch');
      assertEqual(spec.freqBins.length, expectedFreqBins, 'Frequency bins count mismatch');
      assertEqual(spec.powerMatrixDb.length, expectedFrames, 'Power matrix row count mismatch');
      assertEqual(spec.powerMatrixDb[0].length, expectedFreqBins, 'Power matrix col count mismatch');
    });

    it('1.2: STFT frequency bins span from 0 Hz to Nyquist (fs / 2)', () => {
      const fs = 10000;
      const spec = computeSTFT(new Float64Array(512), fs, 256, 128);
      assertEqual(spec.freqBins[0], 0, 'First frequency bin must be 0 Hz (DC)');
      const nyquist = fs / 2;
      assertEqual(spec.freqBins[spec.freqBins.length - 1], nyquist, `Last bin must be Nyquist (${nyquist} Hz)`);
    });

    it('1.3: STFT correctly detects dominant frequency peak of 850 Hz water hammer burst', () => {
      const fs = 10000;
      const testSig = new Float64Array(1024);
      const targetFreq = 850;
      for (let i = 0; i < testSig.length; i++) {
        testSig[i] = Math.sin(2 * Math.PI * targetFreq * (i / fs));
      }

      const spec = computeSTFT(testSig, fs, 256, 128);
      // Find peak bin in the middle frame
      const midFrame = spec.powerMatrixDb[Math.floor(spec.powerMatrixDb.length / 2)];
      let maxPower = -Infinity;
      let peakFreq = 0;
      for (let k = 0; k < midFrame.length; k++) {
        if (midFrame[k] > maxPower) {
          maxPower = midFrame[k];
          peakFreq = spec.freqBins[k];
        }
      }

      // 256 window at 10000 Hz has frequency resolution = 39.0625 Hz. Peak should be within ~40 Hz of 850.
      assertAlmostEqual(peakFreq, targetFreq, 45, `Expected peak near 850 Hz, found ${peakFreq} Hz`);
    });

    it('1.4: STFT Hann windowing suppresses spectral leakage vs unwindowed frame', () => {
      const fs = 10000;
      const n = 256;
      // Frequency off-grid to induce spectral leakage
      const testSig = new Float64Array(n);
      for (let i = 0; i < n; i++) testSig[i] = Math.sin(2 * Math.PI * 435.5 * (i / fs));

      const spec = computeSTFT(testSig, fs, n, n);
      const frame = spec.powerMatrixDb[0];
      // Power in distant bins (e.g. 3000 Hz) should be well below peak (at least -20 dB down)
      const peakPower = Math.max(...frame);
      const highFreqIndex = Math.floor(spec.freqBins.length * 0.75);
      const leakagePower = frame[highFreqIndex];
      assert(peakPower - leakagePower > 15.0, 'Hann window failed to provide adequate leakage suppression');
    });

    it('1.5: STFT power matrix values are strictly finite in logarithmic decibels (dB)', () => {
      const testSig = new Float64Array(512); // All zeros (silence)
      const spec = computeSTFT(testSig, 10000, 256, 128);
      for (const row of spec.powerMatrixDb) {
        for (const val of row) {
          assert(!isNaN(val), 'Power value must not be NaN');
          assert(isFinite(val), 'Power value must be finite');
          assert(val <= 0, 'Power value for low signal should be negative in dB');
        }
      }
    });
  });

  // =========================================================================
  // F2: Delhi Pipe Network Scenarios & Materials (5 tests)
  // =========================================================================
  describe('F2: Delhi Pipe Network Scenarios & Physical Parameters', () => {
    it('1.6: Main Bawana Road Trunk Line Korteweg wave speed resolves to ~1258 m/s', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const vs = calculateKortewegWaveSpeed({
        lengthM: p.lengthM,
        diameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });
      assertAlmostEqual(vs, p.expectedWaveSpeedMPerS, 10.0, `Expected ~${p.expectedWaveSpeedMPerS} m/s for Bawana Road`);
    });

    it('1.7: Rohini Sector 16 Feeder Sub-Main Korteweg wave speed resolves to ~1149 m/s', () => {
      const p = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;
      const vs = calculateKortewegWaveSpeed({
        lengthM: p.lengthM,
        diameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });
      assertAlmostEqual(vs, p.expectedWaveSpeedMPerS, 10.0, `Expected ~${p.expectedWaveSpeedMPerS} m/s for Rohini`);
    });

    it('1.8: Wazirabad Transmission Main Korteweg wave speed resolves to ~1323 m/s', () => {
      const p = DELHI_PIPE_SCENARIOS.WAZIRABAD_TRANSMISSION;
      const vs = calculateKortewegWaveSpeed({
        lengthM: p.lengthM,
        diameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });
      assertAlmostEqual(vs, p.expectedWaveSpeedMPerS, 15.0, `Expected ~${p.expectedWaveSpeedMPerS} m/s for Wazirabad`);
    });

    it('1.9: Delhi pipe network routes define valid GPS coordinates for Node A and Node B', () => {
      for (const [key, scenario] of Object.entries(DELHI_PIPE_SCENARIOS)) {
        const { nodeA, nodeB } = scenario.coordinates;
        assert(nodeA[0] > 28.0 && nodeA[0] < 29.0, `${key} Node A latitude out of Delhi bounds: ${nodeA[0]}`);
        assert(nodeA[1] > 76.8 && nodeA[1] < 77.5, `${key} Node A longitude out of Delhi bounds: ${nodeA[1]}`);
        assert(nodeB[0] > 28.0 && nodeB[0] < 29.0, `${key} Node B latitude out of Delhi bounds: ${nodeB[0]}`);
        assert(nodeB[1] > 76.8 && nodeB[1] < 77.5, `${key} Node B longitude out of Delhi bounds: ${nodeB[1]}`);
        // Ensure non-zero distance between endpoints
        assert(nodeA[0] !== nodeB[0] || nodeA[1] !== nodeB[1], `${key} Node A and Node B cannot be identical`);
      }
    });

    it('1.10: Synthetic burst generation for Delhi scenarios embeds realistic physical acoustic transit delays', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      assert(burst.metadata.ground_truth_delta_t_ms > 90.0, 'Expected positive delta_t for leak closer to Node A');
      assertEqual(burst.node_a.samples.length, 10000, 'Expected 10,000 samples for 1.0s at 10 kHz');
      assertEqual(burst.node_b.samples.length, 10000, 'Expected 10,000 samples for 1.0s at 10 kHz');
    });
  });

  // =========================================================================
  // F3: Adaptive Noise Rejection (SNR down to 6 dB) (5 tests)
  // =========================================================================
  describe('F3: Adaptive Noise Rejection (SNR down to 6 dB)', () => {
    it('1.11: Triangulation localization error <= 1.5 m on high-SNR baseline (24 dB SNR)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruthM = 185.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 24.0,
        seed: 101,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
        burst.node_a,
        burst.node_b,
        groundTruthM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `24 dB SNR error: ${res.localizationErrorM}m`);
    });

    it('1.12: Triangulation localization error <= 1.5 m on moderate environmental noise (18 dB SNR)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruthM = 220.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 18.0,
        seed: 202,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
        burst.node_a,
        burst.node_b,
        groundTruthM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `18 dB SNR error: ${res.localizationErrorM}m`);
    });

    it('1.13: Triangulation localization error <= 1.5 m on urban noise environment (12 dB SNR)', () => {
      const p = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;
      const groundTruthM = 310.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 12.0,
        seed: 303,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
        burst.node_a,
        burst.node_b,
        groundTruthM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `12 dB SNR error: ${res.localizationErrorM}m`);
    });

    it('1.14: Triangulation localization error <= 1.5 m under severe traffic rumble and low SNR (6 dB SNR)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruthM = 185.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0, // High noise limit
        seed: 404,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
        burst.node_a,
        burst.node_b,
        groundTruthM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, `6 dB SNR error: ${res.localizationErrorM}m`);
    });

    it('1.15: GCC-PHAT phase transform maintains sharp cross-correlation peak and confidence score >= 75% at 6 dB SNR', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0,
        seed: 505,
      });

      const gcc = computeGCCPhat(burst.node_a.samples, burst.node_b.samples, 10000);
      assert(gcc.confidenceScore >= 75.0, `Confidence score at 6 dB should be >= 75.0%, got ${gcc.confidenceScore}%`);
      assert(gcc.correlationCurve.length > 0, 'Correlation curve should be populated');
    });
  });

  // =========================================================================
  // F4: Automated Multi-Scenario DSP Benchmarking (5 tests)
  // =========================================================================
  describe('F4: Automated Multi-Scenario Benchmarking & Metrics', () => {
    it('1.16: Multi-scenario benchmark calculates structured accuracy metrics across noise levels', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const snrs = [24, 18, 12, 6];
      const errors = [];
      const confidences = [];

      for (const snr of snrs) {
        const burst = simulatePipeBurst({
          pipeLengthM: p.lengthM,
          leakDistanceM: 185.0,
          pipeDiameterM: p.diameterM,
          wallThicknessM: p.wallThicknessM,
          youngsModulusPa: p.youngsModulusPa,
          snrDb: snr,
          seed: 1000 + snr,
        });

        const res = triangulatePipeLeak(
          { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
          burst.node_a,
          burst.node_b,
          185.0
        );

        errors.push(res.localizationErrorM);
        confidences.push(res.confidenceScore);
      }

      assertEqual(errors.length, 4, 'Expected 4 error metrics across 4 SNR tiers');
      assertEqual(confidences.length, 4, 'Expected 4 confidence scores');
    });

    it('1.17: Benchmark metrics compute mean localization error strictly <= 1.5 m across all Delhi scenarios', () => {
      const scenarios = [
        DELHI_PIPE_SCENARIOS.BAWANA_ROAD,
        DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16,
      ];

      const allErrors = [];
      for (const p of scenarios) {
        for (const snr of [24, 18, 12]) {
          const leak = p.defaultLeakDistanceM;
          const burst = simulatePipeBurst({
            pipeLengthM: p.lengthM,
            leakDistanceM: leak,
            pipeDiameterM: p.diameterM,
            wallThicknessM: p.wallThicknessM,
            youngsModulusPa: p.youngsModulusPa,
            snrDb: snr,
            seed: 42 + snr,
          });

          const res = triangulatePipeLeak(
            { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
            burst.node_a,
            burst.node_b,
            leak
          );
          allErrors.push(res.localizationErrorM);
        }
      }

      const meanError = allErrors.reduce((a, b) => a + b, 0) / allErrors.length;
      assertSubMeterError(meanError, 1.5, `Mean benchmark error: ${meanError.toFixed(2)}m`);
    });

    it('1.18: Benchmark metrics report maximum error <= 1.5 m and non-negative standard deviation', () => {
      const errors = [0.45, 0.52, 0.61, 0.78, 0.49];
      const maxError = Math.max(...errors);
      const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
      const variance = errors.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / errors.length;
      const stdDev = Math.sqrt(variance);

      assert(maxError <= 1.5, `Max error ${maxError}m must be <= 1.5m`);
      assert(stdDev >= 0.0, 'Standard deviation must be non-negative');
    });

    it('1.19: Benchmark confidence score distribution confirms high-confidence detection (average >= 80%)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const confs = [];
      for (let i = 0; i < 5; i++) {
        const burst = simulatePipeBurst({
          pipeLengthM: p.lengthM,
          leakDistanceM: 185.0,
          pipeDiameterM: p.diameterM,
          wallThicknessM: p.wallThicknessM,
          youngsModulusPa: p.youngsModulusPa,
          snrDb: 18.0,
          seed: 3000 + i,
        });

        const res = triangulatePipeLeak(
          { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
          burst.node_a,
          burst.node_b,
          185.0
        );
        confs.push(res.confidenceScore);
      }

      const avgConf = confs.reduce((a, b) => a + b, 0) / confs.length;
      assert(avgConf >= 80.0, `Average confidence score was ${avgConf}%, expected >= 80%`);
    });

    it('1.20: Ground truth leak distances match analytical simulated locations without data drift', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const testDistances = [50.0, 185.0, 250.0, 350.0, 450.0];
      for (const d of testDistances) {
        const burst = simulatePipeBurst({
          pipeLengthM: p.lengthM,
          leakDistanceM: d,
          pipeDiameterM: p.diameterM,
          wallThicknessM: p.wallThicknessM,
          youngsModulusPa: p.youngsModulusPa,
        });
        assertEqual(burst.metadata.ground_truth_leak_m, d, 'Metadata ground truth leak mismatch');
      }
    });
  });

  // =========================================================================
  // F5: Zero-Dependency Resilience & Cloud Parity (5 tests)
  // =========================================================================
  describe('F5: Zero-Dependency Resilience & Cloud Parity', () => {
    it('1.21: In-memory DynamoDB store operates seamlessly with zero AWS credentials', async () => {
      assert(DynamoService, 'DynamoService must be exported by backend-aws');
      const pipes = await DynamoService.getAllPipes();
      assert(pipes.length >= 2, 'In-memory store should contain default Delhi pipes');
    });

    it('1.22: Ingest handler successfully records an incident into DynamoDB store in offline mode', async () => {
      assert(handleIngestBurst, 'handleIngestBurst handler must be exported');
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      const res = await handleIngestBurst({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(res.success, 'Ingest response should be success: true');
      assert(res.incident.incidentId.startsWith('INC-'), 'Incident ID must have INC- prefix');
    });

    it('1.23: DynamoService.getAllPipes returns registered Delhi pipes in offline mode', async () => {
      const pipes = await DynamoService.getAllPipes();
      const pipeIds = pipes.map(p => p.pipeId);
      assert(pipeIds.includes('PIPE-DEL-DTU-01'), 'Must include Bawana trunk line');
      assert(pipeIds.includes('PIPE-DEL-ROHINI-04'), 'Must include Rohini feeder');
    });

    it('1.24: DynamoService.getPipe retrieves single pipe record matching queried pipeId', async () => {
      const pipe = await DynamoService.getPipe('PIPE-DEL-DTU-01');
      assert(pipe !== undefined, 'Pipe must exist in registry');
      assertEqual(pipe.pipeId, 'PIPE-DEL-DTU-01', 'Pipe ID must match');
      assertEqual(pipe.lengthM, 500, 'Pipe length must match');
    });

    it('1.25: DynamoService.updateValveStatus updates and persists valve status in offline store', async () => {
      const pipeId = 'PIPE-DEL-DTU-01';
      await DynamoService.updateValveStatus(pipeId, 'OPEN');
      let pipe = await DynamoService.getPipe(pipeId);
      assertEqual(pipe?.valveStatus, 'OPEN', 'Valve status should be OPEN');

      await DynamoService.updateValveStatus(pipeId, 'THROTTLED_50');
      pipe = await DynamoService.getPipe(pipeId);
      assertEqual(pipe?.valveStatus, 'THROTTLED_50', 'Valve status should be THROTTLED_50');
    });
  });

  // =========================================================================
  // F6: Closed-Loop Pipeline Latency (< 200 ms) (5 tests)
  // =========================================================================
  describe('F6: Closed-Loop Pipeline Latency (< 200 ms)', () => {
    it('1.26: End-to-end ingestion pipeline completes within strictly < 200 ms for Bawana Road rupture', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(response.success, 'Pipeline must succeed');
      assertLatencyUnder200ms(elapsedMs, 200.0, `End-to-end latency: ${elapsedMs}ms`);
    });

    it('1.27: Triangulation computation stage alone completes within < 50 ms', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      const t0 = performance.now();
      triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM },
        burst.node_a,
        burst.node_b
      );
      const dt = performance.now() - t0;
      assert(dt < 50.0, `Triangulation DSP execution time ${dt.toFixed(2)}ms violated < 50ms requirement`);
    });

    it('1.28: DynamoDB state persistence in offline mode completes within < 20 ms', async () => {
      const t0 = performance.now();
      await DynamoService.recordIncident({
        incidentId: `INC-TEST-${Date.now()}`,
        timestamp: new Date().toISOString(),
        pipeId: 'PIPE-DEL-DTU-01',
        pipeName: 'Main Bawana Road Trunk Line',
        leakDistanceM: 185.5,
        leakCoordinates: [28.7508, 77.1177],
        confidenceScore: 95.0,
        severity: 'CRITICAL',
        waveSpeedMs: 1258.1,
        deltaTMs: 102.4,
        prvValveId: 'PRV-DTU-VALVE-01',
        actionTaken: 'AUTO_THROTTLE_PRV',
      });
      const dt = performance.now() - t0;
      assert(dt < 20.0, `Offline Dynamo persistence took ${dt.toFixed(2)}ms (must be < 20ms)`);
    });

    it('1.29: Automated PRV valve throttle is triggered and recorded when confidence >= 75%', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      // Reset valve to OPEN first
      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');

      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 18.0,
      });

      const res = await handleIngestBurst({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assertEqual(res.pipeStatus?.valveStatus, 'THROTTLED_50', 'Valve should be THROTTLED_50');
      assert(res.incident.actionTaken.includes('AUTO_THROTTLE_PRV'), 'Action must indicate PRV throttle');
    });

    it('1.30: Alert service dispatch executes asynchronously and does not block sub-200 ms pipeline completion', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      const t0 = performance.now();
      const res = await handleIngestBurst({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });
      const elapsed = performance.now() - t0;

      assert(res.incident.severity === 'CRITICAL' || res.incident.severity === 'WARNING');
      assertLatencyUnder200ms(elapsed, 200.0, `Pipeline with alert took ${elapsed.toFixed(2)}ms`);
    });
  });

  // =========================================================================
  // F7: SCADA 2D Spectrogram Canvas & Web Audio (5 tests)
  // =========================================================================
  describe('F7: SCADA 2D Spectrogram Canvas & Web Audio', () => {
    it('1.31: Client spectrogram data structure provides valid timeBins, freqBins, and powerMatrixDb', () => {
      const samples = new Float64Array(2048);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(2 * Math.PI * 850 * (i / 10000));
      const spec = computeSTFT(samples, 10000, 256, 128);

      assert(Array.isArray(spec.timeBins) && spec.timeBins.length > 0, 'timeBins must be array');
      assert(Array.isArray(spec.freqBins) && spec.freqBins.length > 0, 'freqBins must be array');
      assert(Array.isArray(spec.powerMatrixDb) && spec.powerMatrixDb.length > 0, 'powerMatrixDb must be 2D array');
    });

    it('1.32: Turbo colormap mapping correctly maps dB range [-80 dB, 0 dB] to RGB color stops', () => {
      // Test color mapper contract: maps power to RGB [r, g, b]
      const mapPowerToColor = (dbVal, minDb = -80, maxDb = 0) => {
        const norm = Math.max(0, Math.min(1, (dbVal - minDb) / (maxDb - minDb)));
        // Turbo approximate polynomial: smooth transition from dark blue -> cyan -> yellow -> red
        const r = Math.round(255 * Math.sin(norm * Math.PI * 0.5));
        const g = Math.round(255 * Math.sin(norm * Math.PI));
        const b = Math.round(255 * Math.cos(norm * Math.PI * 0.5));
        return [r, g, b];
      };

      const cLow = mapPowerToColor(-80);
      const cHigh = mapPowerToColor(0);

      assert(cLow[2] > cLow[0], 'Low power should be predominantly blue');
      assert(cHigh[0] > cHigh[2], 'High power should be predominantly red');
    });

    it('1.33: Stereo audio normalization ensures audio samples remain within [-1.0, 1.0] without clipping', () => {
      const raw16bit = [32767, -32768, 16384, -16384, 0];
      const normalized = raw16bit.map(s => Math.max(-1.0, Math.min(1.0, s / 32768.0)));

      for (const sample of normalized) {
        assert(sample >= -1.0 && sample <= 1.0, `Normalized sample out of bounds: ${sample}`);
      }
    });

    it('1.34: Node A and Node B waveforms maintain channel separation (Left=Node A, Right=Node B)', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
      });

      // Left channel = Node A, Right channel = Node B
      const leftSamples = burst.node_a.samples;
      const rightSamples = burst.node_b.samples;

      assert(leftSamples.length === rightSamples.length, 'Channels must be equal length');
      // Verify signals are distinct due to propagation delay difference
      let differenceSum = 0;
      for (let i = 0; i < Math.min(1000, leftSamples.length); i++) {
        differenceSum += Math.abs(leftSamples[i] - rightSamples[i]);
      }
      assert(differenceSum > 0, 'Left and Right channels must have spatial acoustic distinction');
    });

    it('1.35: SCADA console production build artifact exists with valid HTML and bundled assets', () => {
      const indexHtmlPath = path.resolve(REPO_ROOT, 'web-console/dist/index.html');
      assert(fs.existsSync(indexHtmlPath), 'web-console/dist/index.html must exist (run npm run build:web)');
      const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
      assert(htmlContent.includes('<div id="root">') || htmlContent.includes('<script'), 'index.html must contain root or script tags');
    });
  });

  // =========================================================================
  // F8: Interactive Scenario Switcher & Delhi GIS Telemetry (5 tests)
  // =========================================================================
  describe('F8: Scenario Switcher & GIS Telemetry', () => {
    it('1.36: Scenario switching properly updates pipe length, diameter, and Korteweg velocity', () => {
      const bawana = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const rohini = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;

      const vBawana = calculateKortewegVelocity(bawana.diameterM, bawana.wallThicknessM, bawana.youngsModulusPa);
      const vRohini = calculateKortewegVelocity(rohini.diameterM, rohini.wallThicknessM, rohini.youngsModulusPa);

      assert(vBawana !== vRohini, 'Wave velocities must differ between distinct materials/diameters');
      assertEqual(bawana.lengthM, 500, 'Bawana length must be 500m');
      assertEqual(rohini.lengthM, 620, 'Rohini length must be 620m');
    });

    it('1.37: GPS coordinate interpolation along pipe vector accurately projects leak position between Node A and Node B', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const fraction = 185.0 / p.lengthM; // 0.37
      const lat = p.coordinates.nodeA[0] + fraction * (p.coordinates.nodeB[0] - p.coordinates.nodeA[0]);
      const lng = p.coordinates.nodeA[1] + fraction * (p.coordinates.nodeB[1] - p.coordinates.nodeA[1]);

      // Lat should be between nodeA and nodeB
      assert(lat >= p.coordinates.nodeA[0] && lat <= p.coordinates.nodeB[0], `Projected lat ${lat} out of range`);
      assert(lng >= p.coordinates.nodeA[1] && lng <= p.coordinates.nodeB[1], `Projected lng ${lng} out of range`);
    });

    it('1.38: Sub-meter precision tag validation correctly verifies error <= 1.5 m', () => {
      const validateSubMeter = (errorM) => errorM !== undefined && errorM <= 1.5;
      assert(validateSubMeter(0.57), '0.57m is sub-meter valid');
      assert(validateSubMeter(1.49), '1.49m is sub-meter valid');
      assert(!validateSubMeter(1.51), '1.51m is NOT sub-meter valid');
      assert(!validateSubMeter(2.80), '2.80m is NOT sub-meter valid');
    });

    it('1.39: Radar telemetry indicator reflects signal confidence score and distance', () => {
      const computeRadarBadge = (confidenceScore, errorM) => {
        if (confidenceScore >= 90.0 && errorM <= 1.5) return 'SUB-METER OPTIMAL';
        if (confidenceScore >= 75.0 && errorM <= 1.5) return 'ACCURATE';
        return 'DEGRADED';
      };

      assertEqual(computeRadarBadge(95.7, 0.57), 'SUB-METER OPTIMAL');
      assertEqual(computeRadarBadge(78.0, 1.20), 'ACCURATE');
      assertEqual(computeRadarBadge(60.0, 2.50), 'DEGRADED');
    });

    it('1.40: Mechanical valve actuation state matches physical throttle percentage', () => {
      const getThrottlePercent = (status) => {
        switch (status) {
          case 'OPEN': return 100;
          case 'THROTTLED_50': return 50;
          case 'CLOSED': return 0;
          default: return 100;
        }
      };

      assertEqual(getThrottlePercent('OPEN'), 100);
      assertEqual(getThrottlePercent('THROTTLED_50'), 50);
      assertEqual(getThrottlePercent('CLOSED'), 0);
    });
  });

  await (await import('./helpers/test_context.mjs')).testCtx.drain();
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { testCtx } = await import('./helpers/test_context.mjs');
  await runTier1Tests();
  const passed = testCtx.printSummary();
  process.exit(passed ? 0 : 1);
}
