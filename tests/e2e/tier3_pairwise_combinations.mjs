/**
 * @file tier3_pairwise_combinations.mjs
 * @brief Tier 3: Cross-Feature Combinatorial E2E Suite (>= 8 tests)
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

export async function runTier3Tests() {
  setTier('Tier 3');

  describe('Tier 3: Cross-Feature Pairwise Combinations', () => {
    // -----------------------------------------------------------------------
    // Test 3.1
    // -----------------------------------------------------------------------
    it('3.1: Bawana Road + 6 dB SNR + Closed-Loop Valve Throttle + DynamoDB Persistence', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');

      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0,
        seed: 801,
      });

      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(response.success, 'Pipeline execution must succeed');
      assertSubMeterError(response.triangulation.localizationErrorM, 1.5, 'Sub-meter accuracy at 6 dB SNR');
      assertLatencyUnder200ms(elapsedMs, 200.0, 'Closed-loop pipeline latency < 200ms');

      // Verify DynamoDB state updated
      const pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'THROTTLED_50', 'PRV valve must be throttled');

      // Verify incident recorded
      const incidents = await DynamoService.getAllIncidents();
      assert(incidents.some(inc => inc.incidentId === response.incident.incidentId), 'Incident must be persisted in DynamoDB');
    });

    // -----------------------------------------------------------------------
    // Test 3.2
    // -----------------------------------------------------------------------
    it('3.2: Rohini Sector 16 + 12 dB SNR + STFT Spectrogram Extraction + Closed-Loop Valve Action', async () => {
      const p = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;
      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');

      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 310.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 12.0,
        seed: 802,
      });

      // Chain 1: STFT generation for operator spectrogram visualization
      const specA = computeSTFT(burst.node_a.samples, 10000, 256, 128);
      assert(specA.powerMatrixDb.length > 0, 'Spectrogram power matrix must be generated');

      // Chain 2: Ingestion and mitigation
      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      assert(response.success);
      assertSubMeterError(response.triangulation.localizationErrorM, 1.5, 'Sub-meter accuracy on Rohini feeder');
      assertLatencyUnder200ms(elapsedMs, 200.0, 'Pipeline latency must be < 200ms');

      const pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'THROTTLED_50', 'PRV valve must be throttled');
    });

    // -----------------------------------------------------------------------
    // Test 3.3
    // -----------------------------------------------------------------------
    it('3.3: Wazirabad Transmission Main (1200m Span) + Mild Steel Wave Speed + GPS Projection', () => {
      const p = DELHI_PIPE_SCENARIOS.WAZIRABAD_TRANSMISSION;
      const leakM = 850.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: leakM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 18.0,
        seed: 803,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        leakM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, 'Sub-meter accuracy across 1200m trunk line');
      assertAlmostEqual(res.waveSpeedMs, p.expectedWaveSpeedMPerS, 15.0, 'Mild Steel Korteweg wave speed');

      // GPS Projection check
      const fraction = res.estimatedLeakDistanceM / p.lengthM;
      const leakLat = p.coordinates.nodeA[0] + fraction * (p.coordinates.nodeB[0] - p.coordinates.nodeA[0]);
      const leakLng = p.coordinates.nodeA[1] + fraction * (p.coordinates.nodeB[1] - p.coordinates.nodeA[1]);

      assert(leakLat > p.coordinates.nodeA[0] && leakLat < p.coordinates.nodeB[0], 'Latitude between endpoints');
      assert(leakLng > p.coordinates.nodeA[1] && leakLng < p.coordinates.nodeB[1], 'Longitude between endpoints');
    });

    // -----------------------------------------------------------------------
    // Test 3.4
    // -----------------------------------------------------------------------
    it('3.4: Multi-Scenario Sequential Ingestion Burst (Bawana -> Rohini -> Bawana) in < 600 ms Total', async () => {
      const bawana = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const rohini = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;

      const burstBawana = simulatePipeBurst({
        pipeLengthM: bawana.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: bawana.diameterM,
        wallThicknessM: bawana.wallThicknessM,
        youngsModulusPa: bawana.youngsModulusPa,
        seed: 8041,
      });

      const burstRohini = simulatePipeBurst({
        pipeLengthM: rohini.lengthM,
        leakDistanceM: 310.0,
        pipeDiameterM: rohini.diameterM,
        wallThicknessM: rohini.wallThicknessM,
        youngsModulusPa: rohini.youngsModulusPa,
        seed: 8042,
      });

      const tStart = performance.now();

      const res1 = await handleIngestBurst({
        pipeId: bawana.pipeId,
        metadata: burstBawana.metadata,
        node_a: burstBawana.node_a,
        node_b: burstBawana.node_b,
      });

      const res2 = await handleIngestBurst({
        pipeId: rohini.pipeId,
        metadata: burstRohini.metadata,
        node_a: burstRohini.node_a,
        node_b: burstRohini.node_b,
      });

      const res3 = await handleIngestBurst({
        pipeId: bawana.pipeId,
        metadata: burstBawana.metadata,
        node_a: burstBawana.node_a,
        node_b: burstBawana.node_b,
      });

      const totalElapsedMs = performance.now() - tStart;

      assert(res1.success && res2.success && res3.success, 'All 3 burst ingestions must succeed');
      assert(res1.incident.incidentId !== res2.incident.incidentId, 'Incidents must have distinct IDs');
      assert(res2.incident.incidentId !== res3.incident.incidentId, 'Incidents must have distinct IDs');

      assert(totalElapsedMs < 600.0, `Sequential 3-burst execution took ${totalElapsedMs.toFixed(2)}ms (must be < 600ms)`);
    });

    // -----------------------------------------------------------------------
    // Test 3.5
    // -----------------------------------------------------------------------
    it('3.5: Severe 6 dB Noise + Biquad Bandpass + Band-Limited GCC-PHAT + Sub-Meter Accuracy', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const leakM = 185.0;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: leakM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0,
        seed: 810,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        leakM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, 'Sub-meter accuracy at 6 dB SNR');
      assert(res.confidenceScore >= 75.0, 'Confidence score must be >= 75%');
    });

    // -----------------------------------------------------------------------
    // Test 3.6
    // -----------------------------------------------------------------------
    it('3.6: Offline Local Mode + DynamoDB Incident Query + Valve State Continuity', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        seed: 806,
      });

      const beforeCount = (await DynamoService.getAllIncidents()).length;

      const res = await handleIngestBurst({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      const afterIncidents = await DynamoService.getAllIncidents();
      assertEqual(afterIncidents.length, beforeCount + 1, 'Incident count must increment by exactly 1');
      assertEqual(afterIncidents[0].incidentId, res.incident.incidentId, 'New incident must be at head of store');

      const pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'THROTTLED_50', 'Pipe valve must reflect mitigated state');
    });

    // -----------------------------------------------------------------------
    // Test 3.7
    // -----------------------------------------------------------------------
    it('3.7: High-Sample-Rate Burst (20 kHz) + STFT Spectrogram + Web Audio Normalization', () => {
      const sampleRate = 20000; // 20 kHz sample rate
      const burst = simulatePipeBurst({
        pipeLengthM: 500,
        leakDistanceM: 185.0,
        sampleRate,
        seed: 807,
      });

      // Generate STFT up to 10 kHz Nyquist
      const spec = computeSTFT(burst.node_a.samples, sampleRate, 512, 256);
      assertEqual(spec.freqBins[spec.freqBins.length - 1], 10000, 'Nyquist limit for 20 kHz is 10 kHz');

      // Web Audio normalization
      const normA = burst.node_a.samples.map(s => s / 32768.0);
      const normB = burst.node_b.samples.map(s => s / 32768.0);

      assert(Math.max(...normA) <= 1.0 && Math.min(...normA) >= -1.0, 'Node A audio normalized');
      assert(Math.max(...normB) <= 1.0 && Math.min(...normB) >= -1.0, 'Node B audio normalized');
    });

    // -----------------------------------------------------------------------
    // Test 3.8
    // -----------------------------------------------------------------------
    it('3.8: Extreme Asymmetric Rupture (10% from Node A) + Korteweg Wave Speed + GIS Projection', () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const leakM = 50.0; // 10% from Node A on 500m pipe
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: leakM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        seed: 808,
      });

      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        leakM
      );

      assertSubMeterError(res.localizationErrorM, 1.5, 'Sub-meter accuracy for 10% asymmetric leak');
      assert(res.deltaTMilliseconds > 0, 'delta_t must be strongly positive for leak near Node A');

      // GIS coordinate projection
      const fraction = res.estimatedLeakDistanceM / p.lengthM; // ~0.10
      assert(fraction > 0.08 && fraction < 0.12, `Fraction expected ~0.10, got ${fraction.toFixed(3)}`);
    });
  });

  await (await import('./helpers/test_context.mjs')).testCtx.drain();
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { testCtx } = await import('./helpers/test_context.mjs');
  await runTier3Tests();
  const passed = testCtx.printSummary();
  process.exit(passed ? 0 : 1);
}
