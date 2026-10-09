## 2026-10-07T05:30:00Z
Assignment: Milestone 3 — Turnkey AWS Free Tier Deployment (SAM / CloudFormation) & Latency Verification (R3)
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m3_gen3
Project root: d:\STS\hydropulse
ORIGINAL_REQUEST: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md
Survey Handoff: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_aws_hw\handoff.md

Objectives & Tasks:
1. Read the survey handoff at `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_aws_hw\handoff.md`.
2. Implement `backend-aws/src/services/actuatorService.ts` according to Section 3.1 of the handoff report.
3. Update `backend-aws/src/handlers/ingestBurst.ts` according to Section 3.2 of the handoff report:
   - Integrate `ActuatorService.executeMitigation`.
   - Export standard AWS Lambda handlers (`lambdaHandler` and `handler`) supporting both direct invocations and API Gateway HTTP API v2 events with CORS headers.
4. Update `backend-aws/src/testIntegration.ts` according to Section 3.3 of the handoff report:
   - Use `performance.now()` wall-clock timer.
   - Assert `totalLatencyMs < 50.0` ms strict SLA.
5. Create production-ready AWS SAM `template.yaml` at project root according to Section 3.4 of the handoff report:
   - AWS Lambda function (ARM64 architecture, Node.js 20 runtime) bundling the DSP triangulation engine.
   - Amazon API Gateway HTTP API v2 with CORS support for SCADA console ingestion.
   - Amazon DynamoDB table with `PAY_PER_REQUEST` on-demand billing (100% Free Tier compliant, $0 idle cost).
   - Amazon SNS Topic for emergency leak alert dispatch.
6. Create turnkey automated deployment scripts at project root according to Section 3.5 of the handoff report:
   - `deploy-aws.bat` (Windows script with `--localstack` support).
   - `deploy-aws.sh` (Linux/macOS script with `--localstack` support).
7. Run verification commands:
   - Validate `template.yaml` syntax / structure (e.g. check YAML parser / schema).
   - Run `npm run build --prefix backend-aws`.
   - Run `node backend-aws/dist/testIntegration.js` and verify closed loop executes in < 50 ms.
8. Write your comprehensive completion report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m3_gen3\handoff.md` and notify parent.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
