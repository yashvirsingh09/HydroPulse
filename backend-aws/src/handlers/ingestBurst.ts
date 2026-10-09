/**
 * @file ingestBurst.ts
 * @brief Lambda Handler for Acoustic Burst Ingestion & Real-Time Triangulation
 */

import { triangulatePipeLeak, computeGCCPhat } from '@hydropulse/core-dsp';
import { DynamoService, IncidentRecord } from '../services/dynamoService.js';
import { AlertService } from '../services/alertService.js';
import { ActuatorService } from '../services/actuatorService.js';

export interface BurstIngestPayload {
  pipeId: string;
  metadata?: {
    ground_truth_leak_m?: number;
  };
  node_a: {
    node_id: number;
    samples: number[];
  };
  node_b: {
    node_id: number;
    samples: number[];
  };
}

export async function handleIngestBurst(payload: BurstIngestPayload) {
  const pipe = await DynamoService.getPipe(payload.pipeId);
  if (!pipe) {
    throw new Error(`Pipe segment with ID ${payload.pipeId} not found in registry.`);
  }

  const sampleRateHz = 10000;
  const groundTruth = payload.metadata?.ground_truth_leak_m;

  // Execute Core DSP Triangulation
  const result = triangulatePipeLeak(
    {
      lengthM: pipe.lengthM,
      diameterM: pipe.diameterM,
      wallThicknessM: pipe.wallThicknessM
    },
    {
      nodeId: payload.node_a.node_id,
      sampleRateHz,
      samples: payload.node_a.samples
    },
    {
      nodeId: payload.node_b.node_id,
      sampleRateHz,
      samples: payload.node_b.samples
    },
    groundTruth
  );

  // Compute GPS coordinates along linear pipe vector
  const fraction = Math.max(0, Math.min(1, result.estimatedLeakDistanceM / pipe.lengthM));
  const leakLat = pipe.coordinates.nodeA[0] + fraction * (pipe.coordinates.nodeB[0] - pipe.coordinates.nodeA[0]);
  const leakLng = pipe.coordinates.nodeA[1] + fraction * (pipe.coordinates.nodeB[1] - pipe.coordinates.nodeA[1]);

  // Autonomous closed-loop valve mitigation
  const mitigation = await ActuatorService.executeMitigation(pipe, result.confidenceScore);

  const incident: IncidentRecord = {
    incidentId: `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    pipeId: pipe.pipeId,
    pipeName: pipe.name,
    leakDistanceM: result.estimatedLeakDistanceM,
    leakCoordinates: [Number(leakLat.toFixed(6)), Number(leakLng.toFixed(6))],
    confidenceScore: result.confidenceScore,
    severity: result.confidenceScore > 85.0 ? 'CRITICAL' : 'WARNING',
    waveSpeedMs: result.waveSpeedMs,
    deltaTMs: result.deltaTMilliseconds,
    prvValveId: pipe.prvValveId,
    actionTaken: mitigation.actionTaken
  };

  // Record incident and dispatch SNS alert
  await DynamoService.recordIncident(incident);
  await AlertService.dispatchIncidentAlert(incident);

  // Compact correlation curve for SCADA UI visualizer
  const gcc = computeGCCPhat(payload.node_a.samples, payload.node_b.samples, sampleRateHz);

  return {
    success: true,
    incident,
    triangulation: result,
    pipeStatus: await DynamoService.getPipe(pipe.pipeId),
    actuation: mitigation,
    visualization: {
      correlationCurve: gcc.correlationCurve,
      lagIndices: gcc.lagIndices,
      sampleLag: gcc.sampleLag,
      peakValue: gcc.peakValue
    }
  };
}

/**
 * AWS Lambda HTTP API Proxy Entrypoint
 */
export async function lambdaHandler(event: any) {
  try {
    let payload: BurstIngestPayload;
    if (event.body) {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      payload = event;
    }

    const result = await handleIngestBurst(payload);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      },
      body: JSON.stringify(result)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
}

export const handler = lambdaHandler;
