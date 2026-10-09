/**
 * @file actuatorService.ts
 * @brief Autonomous Closed-Loop PRV Valve Actuation & Pressure Mitigation Service
 */

import { performance } from 'node:perf_hooks';
import { DynamoService, PipeRecord } from './dynamoService.js';

export interface ActuationResult {
  success: boolean;
  pipeId: string;
  valveId: string;
  previousState: 'OPEN' | 'THROTTLED_50' | 'CLOSED';
  newState: 'OPEN' | 'THROTTLED_50' | 'CLOSED';
  actionTaken: string;
  latencyMs: number;
  timestamp: string;
  telemetryAck: boolean;
}

export class ActuatorService {
  /**
   * Execute autonomous closed-loop throttle on upstream PRV (Pressure Reducing Valve)
   * to arrest catastrophic water hammer pressure pulses and prevent pipe blowout.
   */
  public static async executeMitigation(
    pipe: PipeRecord,
    confidenceScore: number
  ): Promise<ActuationResult> {
    const startTime = performance.now();
    const previousState = pipe.valveStatus;

    let newState: 'OPEN' | 'THROTTLED_50' | 'CLOSED' = previousState;
    let actionTaken = 'MONITORING_ONLY';

    // Closed-loop mitigation: If confidence >= 75%, trigger emergency PRV throttle
    if (confidenceScore >= 75.0) {
      newState = 'THROTTLED_50';
      await DynamoService.updateValveStatus(pipe.pipeId, newState);
      actionTaken = `AUTO_THROTTLE_PRV: ${pipe.prvValveId} reduced to 50% flow to mitigate blowout`;
    }

    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    return {
      success: true,
      pipeId: pipe.pipeId,
      valveId: pipe.prvValveId,
      previousState,
      newState,
      actionTaken,
      latencyMs,
      timestamp: new Date().toISOString(),
      telemetryAck: true
    };
  }

  /**
   * Manual SCADA operator valve override
   */
  public static async manualOverride(
    pipeId: string,
    status: 'OPEN' | 'THROTTLED_50' | 'CLOSED'
  ): Promise<PipeRecord | undefined> {
    return DynamoService.updateValveStatus(pipeId, status);
  }
}
