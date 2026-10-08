/**
 * @file tier4_real_world_scenarios.mjs
 * @brief Tier 4: Real-World Delhi Pipeline Rupture Simulations (5 Scenarios per TEST_INFRA.md)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

export async function runTier4Tests() {
  setTier('Tier 4');

  describe('Tier 4: Real-World Delhi Pipeline Rupture Scenarios', () => {
    // -----------------------------------------------------------------------
    // Scenario 1: Main Bawana Road Heavy Industrial Rupture
    // -----------------------------------------------------------------------
    it('4.1: Scenario 1 — Main Bawana Road Heavy Industrial Rupture (400mm Ductile Iron, SNR 6 dB)', async () => {
      const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const groundTruthM = 185.0;

      // Reset valve state
      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');

      // 1. Synthesize 6 dB SNR rupture with heavy urban traffic noise
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0,
        seed: 901,
      });

      // 2. STFT Spectrogram generation
      const spec = computeSTFT(burst.node_a.samples, 10000, 256, 128);
      assert(spec.timeBins.length > 0 && spec.freqBins.length > 0, 'Spectrogram must be generated');

      // 3. Closed-loop AWS ingestion pipeline execution
      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      // 4. Verify acceptance criteria
      assert(response.success, 'Pipeline must succeed');
      assertAlmostEqual(response.triangulation.waveSpeedMs, p.expectedWaveSpeedMPerS, 10.0, 'Korteweg wave speed ~1258 m/s');
      assertSubMeterError(response.triangulation.localizationErrorM, 1.5, 'Sub-meter accuracy at 6 dB SNR');
      assert(response.incident.confidenceScore >= 75.0, 'Confidence score must be >= 75%');
      assertLatencyUnder200ms(elapsedMs, 200.0, `Closed-loop latency was ${elapsedMs}ms (must be < 200ms)`);

      // 5. Verify autonomous PRV valve actuation
      const pipe = await DynamoService.getPipe(p.pipeId);
      assertEqual(pipe?.valveStatus, 'THROTTLED_50', 'PRV-DTU-VALVE-01 must be THROTTLED_50');
      assertEqual(response.incident.severity, 'CRITICAL', 'Severity must be CRITICAL');

      console.log(`      [Scenario 1 Results] Est Leak: ${response.triangulation.estimatedLeakDistanceM}m (Error: ${response.triangulation.localizationErrorM}m) | Conf: ${response.incident.confidenceScore}% | Latency: ${elapsedMs}ms`);
    });

    // -----------------------------------------------------------------------
    // Scenario 2: Rohini Sector 16 Feeder Urban Residential Burst
    // -----------------------------------------------------------------------
    it('4.2: Scenario 2 — Rohini Sector 16 Feeder Urban Residential Burst (300mm Cast Iron, SNR 12 dB)', async () => {
      const p = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;
      const groundTruthM = 310.0; // Exact midpoint of 620m pipe

      await DynamoService.updateValveStatus(p.pipeId, 'OPEN');

      // 1. Synthesize symmetric midpoint rupture
      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 12.0,
        seed: 902,
      });

      // 2. Closed-loop ingestion
      const { response, elapsedMs } = await executeIngestionWithLatency({
        pipeId: p.pipeId,
        metadata: burst.metadata,
        node_a: burst.node_a,
        node_b: burst.node_b,
      });

      // 3. Acceptance verification
      assert(response.success, 'Pipeline must succeed');
      assertSubMeterError(response.triangulation.localizationErrorM, 1.5, 'Sub-meter accuracy on Rohini feeder');
      // Midpoint symmetry: deltaT should be very close to 0 ms
      assert(Math.abs(response.triangulation.deltaTMilliseconds) < 1.0, `Midpoint delta_t was ${response.triangulation.deltaTMilliseconds}ms (expected ~0ms)`);
      assert(response.incident.confidenceScore >= 85.0, 'Confidence score >= 85%');
      assertLatencyUnder200ms(elapsedMs, 200.0, 'Closed-loop latency < 200ms');

      // GPS coordinates at midpoint
      const midLat = (p.coordinates.nodeA[0] + p.coordinates.nodeB[0]) / 2;
      const midLng = (p.coordinates.nodeA[1] + p.coordinates.nodeB[1]) / 2;
      assertAlmostEqual(response.incident.leakCoordinates[0], midLat, 0.001, 'GPS latitude near midpoint');
      assertAlmostEqual(response.incident.leakCoordinates[1], midLng, 0.001, 'GPS longitude near midpoint');

      console.log(`      [Scenario 2 Results] Est Leak: ${response.triangulation.estimatedLeakDistanceM}m (Error: ${response.triangulation.localizationErrorM}m) | Delta t: ${response.triangulation.deltaTMilliseconds}ms | Latency: ${elapsedMs}ms`);
    });

    // -----------------------------------------------------------------------
    // Scenario 3: Wazirabad Transmission Main High-Volume Trunk Rupture
    // -----------------------------------------------------------------------
    it('4.3: Scenario 3 — Wazirabad Transmission Main High-Volume Trunk Rupture (900mm Mild Steel, 1200m span, SNR 6 dB)', () => {
      const p = DELHI_PIPE_SCENARIOS.WAZIRABAD_TRANSMISSION;
      const groundTruthM = 850.0; // 850m from Node A (closer to Node B on 1200m line)

      const burst = simulatePipeBurst({
        pipeLengthM: p.lengthM,
        leakDistanceM: groundTruthM,
        pipeDiameterM: p.diameterM,
        wallThicknessM: p.wallThicknessM,
        youngsModulusPa: p.youngsModulusPa,
        snrDb: 6.0,
        seed: 901,
      });

      const t0 = performance.now();
      const res = triangulatePipeLeak(
        { lengthM: p.lengthM, diameterM: p.diameterM, wallThicknessM: p.wallThicknessM, youngsModulusPa: p.youngsModulusPa },
        burst.node_a,
        burst.node_b,
        groundTruthM
      );
      const elapsedMs = performance.now() - t0;

      assertSubMeterError(res.localizationErrorM, 1.5, 'Sub-meter accuracy on 1200m Mild Steel trunk');
      assertAlmostEqual(res.waveSpeedMs, p.expectedWaveSpeedMPerS, 15.0, 'Wave speed for Mild Steel ~1138.7 m/s');
      assert(res.deltaTMilliseconds < 0, 'Negative delta_t because rupture is closer to Node B');
      assert(res.confidenceScore >= 80.0, 'Confidence score >= 80%');
      assert(elapsedMs < 100.0, 'Triangulation alone took < 100ms');

      console.log(`      [Scenario 3 Results] Est Leak: ${res.estimatedLeakDistanceM}m (Error: ${res.localizationErrorM}m) | Wave Speed: ${res.waveSpeedMs} m/s | Delta t: ${res.deltaTMilliseconds}ms`);
    });

    // -----------------------------------------------------------------------
    // Scenario 4: Rapid Multi-Incident Burst Ingestion
    // -----------------------------------------------------------------------
    it('4.4: Scenario 4 — Rapid Multi-Incident Burst Ingestion (Sequential bursts in < 600 ms total)', async () => {
      const bawana = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
      const rohini = DELHI_PIPE_SCENARIOS.ROHINI_SECTOR_16;

      const burst1 = simulatePipeBurst({
        pipeLengthM: bawana.lengthM,
        leakDistanceM: 185.0,
        pipeDiameterM: bawana.diameterM,
        wallThicknessM: bawana.wallThicknessM,
        youngsModulusPa: bawana.youngsModulusPa,
        seed: 9041,
      });

      const burst2 = simulatePipeBurst({
        pipeLengthM: rohini.lengthM,
        leakDistanceM: 310.0,
        pipeDiameterM: rohini.diameterM,
        wallThicknessM: rohini.wallThicknessM,
        youngsModulusPa: rohini.youngsModulusPa,
        seed: 9042,
      });

      const burst3 = simulatePipeBurst({
        pipeLengthM: bawana.lengthM,
        leakDistanceM: 375.0, // Secondary blowout
        pipeDiameterM: bawana.diameterM,
        wallThicknessM: bawana.wallThicknessM,
        youngsModulusPa: bawana.youngsModulusPa,
        seed: 9043,
      });

      const tStart = performance.now();

      const r1 = await handleIngestBurst({ pipeId: bawana.pipeId, metadata: burst1.metadata, node_a: burst1.node_a, node_b: burst1.node_b });
      const r2 = await handleIngestBurst({ pipeId: rohini.pipeId, metadata: burst2.metadata, node_a: burst2.node_a, node_b: burst2.node_b });
      const r3 = await handleIngestBurst({ pipeId: bawana.pipeId, metadata: burst3.metadata, node_a: burst3.node_a, node_b: burst3.node_b });

      const totalElapsedMs = performance.now() - tStart;

      assert(r1.success && r2.success && r3.success, 'All 3 bursts must succeed');
      assertLatencyUnder200ms(totalElapsedMs / 3, 200.0, 'Average latency per incident < 200ms');
      assert(totalElapsedMs < 600.0, `Total batch latency ${totalElapsedMs.toFixed(2)}ms must be < 600ms`);

      // Verify distinct incident IDs
      const ids = new Set([r1.incident.incidentId, r2.incident.incidentId, r3.incident.incidentId]);
      assertEqual(ids.size, 3, 'All 3 incidents must have unique incident IDs');

      // Check sub-meter accuracy across all 3
      assertSubMeterError(r1.triangulation.localizationErrorM, 1.5, 'Incident 1 sub-meter accuracy');
      assertSubMeterError(r2.triangulation.localizationErrorM, 1.5, 'Incident 2 sub-meter accuracy');
      assertSubMeterError(r3.triangulation.localizationErrorM, 1.5, 'Incident 3 sub-meter accuracy');

      console.log(`      [Scenario 4 Results] 3 Burst Incidents Ingested in ${totalElapsedMs.toFixed(2)}ms (Avg: ${(totalElapsedMs / 3).toFixed(2)}ms / incident)`);
    });

    // -----------------------------------------------------------------------
    // Scenario 5: Zero-Cloud Local Offline Fallback
    // -----------------------------------------------------------------------
    it('4.5: Scenario 5 — Zero-Cloud Local Offline Fallback (End-to-end with zero AWS credentials)', async () => {
      // Temporarily delete all AWS environment variables
      const envKeys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_REGION'];
      const stashed = {};
      for (const k of envKeys) {
        stashed[k] = process.env[k];
        delete process.env[k];
      }

      try {
        const p = DELHI_PIPE_SCENARIOS.BAWANA_ROAD;
        const burst = simulatePipeBurst({
          pipeLengthM: p.lengthM,
          leakDistanceM: 185.0,
          pipeDiameterM: p.diameterM,
          wallThicknessM: p.wallThicknessM,
          youngsModulusPa: p.youngsModulusPa,
          snrDb: 18.0,
          seed: 905,
        });

        const { response, elapsedMs } = await executeIngestionWithLatency({
          pipeId: p.pipeId,
          metadata: burst.metadata,
          node_a: burst.node_a,
          node_b: burst.node_b,
        });

        assert(response.success, 'Pipeline must succeed 100% in local offline mode');
        assertSubMeterError(response.triangulation.localizationErrorM, 1.5, 'Sub-meter accuracy in offline mode');
        assertLatencyUnder200ms(elapsedMs, 200.0, 'Offline latency < 200ms');

        // Verify local in-memory store contains pipes and incidents
        const pipes = await DynamoService.getAllPipes();
        assert(pipes.length >= 2, 'Local store must contain registered pipes');

        const incidents = await DynamoService.getAllIncidents();
        assert(incidents.length > 0, 'Local store must contain incidents');

        // Verify local static frontend assets exist
        const indexHtml = path.resolve(REPO_ROOT, 'web-console/dist/index.html');
        assert(fs.existsSync(indexHtml), 'Local SCADA build artifacts must exist');

        console.log(`      [Scenario 5 Results] Zero-cloud local offline run succeeded in ${elapsedMs}ms | Incidents stored: ${incidents.length}`);
      } finally {
        // Restore environment variables
        for (const [k, v] of Object.entries(stashed)) {
          if (v !== undefined) process.env[k] = v;
        }
      }
    });
  });

  await (await import('./helpers/test_context.mjs')).testCtx.drain();
}

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { testCtx } = await import('./helpers/test_context.mjs');
  await runTier4Tests();
  const passed = testCtx.printSummary();
  process.exit(passed ? 0 : 1);
}
