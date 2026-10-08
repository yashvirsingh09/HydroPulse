/**
 * @file testIntegration.ts
 * @brief Integration Test verifying end-to-end Burst Ingestion -> Triangulation -> DynamoDB -> Closed-Loop Valve Action
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
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

  console.log('Sending acoustic burst to HydroPulse AWS Ingestion Pipeline...');
  const res = await handleIngestBurst(ingestReq);

  console.log('\n✅ Pipeline Execution Succeeded:');
  console.log('Incident ID         :', res.incident.incidentId);
  console.log('Pipe Name           :', res.incident.pipeName);
  console.log('Localized Leak Dist :', res.incident.leakDistanceM, 'm from Node A');
  console.log('GPS Coordinates     :', res.incident.leakCoordinates);
  console.log('Confidence Score    :', res.incident.confidenceScore, '%');
  console.log('Severity            :', res.incident.severity);
  console.log('Autonomous Action   :', res.incident.actionTaken);
  console.log('Updated Valve State :', res.pipeStatus?.valveStatus);

  const incidents = await DynamoService.getAllIncidents();
  console.log('\nTotal Incidents in DynamoDB store:', incidents.length);
}

runIntegration().catch(console.error);
