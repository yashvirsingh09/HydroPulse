/**
 * @file alertService.ts
 * @brief Amazon SNS Incident Dispatch & Automated Work Order Alerting
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { IncidentRecord } from './dynamoService.js';

const region = process.env.AWS_REGION || 'ap-south-1';
const snsClient = new SNSClient({ region });
const TOPIC_ARN = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:123456789012:HydroPulse-Alerts';

export class AlertService {
  private static isAwsConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  public static async dispatchIncidentAlert(incident: IncidentRecord): Promise<void> {
    const alertMessage = 
      `🚨 [HYDROPULSE CRITICAL WATER ALERT]\n` +
      `Pipe: ${incident.pipeName}\n` +
      `Estimated Rupture: ${incident.leakDistanceM} meters from Sensor Node A\n` +
      `Coordinates: ${incident.leakCoordinates[0].toFixed(5)}, ${incident.leakCoordinates[1].toFixed(5)}\n` +
      `Wave Velocity: ${incident.waveSpeedMs} m/s | Δt: ${incident.deltaTMs} ms\n` +
      `Confidence: ${incident.confidenceScore}%\n` +
      `Autonomous Action: ${incident.actionTaken}\n` +
      `Timestamp: ${incident.timestamp}`;

    console.log('\n[ALERT DISPATCH MESSAGE]');
    console.log(alertMessage);
    console.log('------------------------\n');

    if (this.isAwsConfigured) {
      try {
        await snsClient.send(
          new PublishCommand({
            TopicArn: TOPIC_ARN,
            Subject: `🚨 Water Rupture Detected: ${incident.pipeName}`,
            Message: alertMessage
          })
        );
        console.log(`[Amazon SNS] Dispatched incident alert to topic: ${TOPIC_ARN}`);
      } catch (err) {
        console.warn(`[SNS Warning] Publish failed:`, (err as Error).message);
      }
    }
  }
}
