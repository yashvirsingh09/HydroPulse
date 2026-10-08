/**
 * @file backend_bridge.mjs
 * @brief Dynamic Interface to HydroPulse AWS Lambda Backend & In-Memory DynamoDB
 */

import { performance } from 'node:perf_hooks';

let ingestBurstModule = null;
let dynamoServiceModule = null;

try {
  ingestBurstModule = await import('../../../backend-aws/dist/handlers/ingestBurst.js');
} catch (err) {
  console.warn('[backend_bridge] Failed to import ingestBurst.js:', err.message);
}

try {
  dynamoServiceModule = await import('../../../backend-aws/dist/services/dynamoService.js');
} catch (err) {
  console.warn('[backend_bridge] Failed to import dynamoService.js:', err.message);
}

export const DynamoService = dynamoServiceModule?.DynamoService;
export const handleIngestBurst = ingestBurstModule?.handleIngestBurst;

/**
 * Execute ingestion handler while measuring precise wall-clock latency via performance.now()
 */
export async function executeIngestionWithLatency(payload) {
  if (!handleIngestBurst) {
    throw new Error('backend-aws ingestBurst handler is not built or available.');
  }

  const start = performance.now();
  const response = await handleIngestBurst(payload);
  const elapsedMs = performance.now() - start;

  return {
    response,
    elapsedMs: Number(elapsedMs.toFixed(2)),
  };
}
