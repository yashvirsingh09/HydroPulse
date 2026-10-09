/**
 * @file testIntegration.ts
 * @brief Integration Test verifying Burst Ingestion -> Triangulation -> DynamoDB -> PRV Throttle in < 50 ms
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { handleIngestBurst } from './handlers/ingestBurst.js';
import { DynamoService } from './services/dynamoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runIntegration() {
  const fixturePath = path.resolve(__dirname, '../../physics-engine/sample_burst_bawana.json');
  const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  const ingestReq = {
    pipeId: 'PIPE-DEL-DTU-01',
    metadata: payload.metadata,
    node_a: payload.node_a,
    node_b: payload.node_b
  };

  console.log('========================================================================');
  console.log('🌊 HydroPulse AWS Closed-Loop Triangulation & Actuation Verification');
  console.log('========================================================================');
  console.log('Dispatching 10 kHz acoustic burst to ingestion pipeline...');

  // Start microsecond-precision wall-clock timer
  const startTime = performance.now();
  const res = await handleIngestBurst(ingestReq);
  const totalLatencyMs = performance.now() - startTime;

  console.log('\n✅ Closed-Loop Pipeline Execution Succeeded:');
  console.log('Incident ID          :', res.incident.incidentId);
  console.log('Pipe Name            :', res.incident.pipeName);
  console.log('Localized Leak Dist  :', res.incident.leakDistanceM, 'm from Node A');
  console.log('GPS Coordinates      :', res.incident.leakCoordinates);
  console.log('Confidence Score     :', res.incident.confidenceScore, '%');
  console.log('Severity             :', res.incident.severity);
  console.log('Autonomous Action    :', res.incident.actionTaken);
  console.log('Updated Valve State  :', res.pipeStatus?.valveStatus);
  console.log('------------------------------------------------------------------------');
  console.log(`⏱️ Closed-Loop Runtime: ${totalLatencyMs.toFixed(2)} ms (SLA Target: < 50.0 ms)`);

  const incidents = await DynamoService.getAllIncidents();
  console.log('Total Incidents in DynamoDB Store:', incidents.length);
  console.log('========================================================================');

  // Hard SLA Verification
  if (totalLatencyMs >= 50.0) {
    console.error(`\n❌ SLA BREACH: Closed-loop runtime was ${totalLatencyMs.toFixed(2)} ms (exceeded 50.0 ms limit)`);
    process.exit(1);
  }

  console.log('🎉 SLA PASSED: Full closed-loop cycle executed strictly under 50 ms!\n');
}

runIntegration().catch((err) => {
  console.error('Fatal Integration Test Error:', err);
  process.exit(1);
});
