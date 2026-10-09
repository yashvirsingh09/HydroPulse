## 2026-10-07T04:56:00Z
Assignment: Survey AWS SAM Infrastructure & Hardware Architecture Specs
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_aws_hw
Project root: d:\STS\hydropulse
ORIGINAL_REQUEST: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
1. Review `backend-aws/` (src/handlers/ingestBurst.ts, src/services/dynamoService.ts, src/services/actuatorService.ts, src/testIntegration.ts).
2. Detail the exact specification needed for AWS SAM `template.yaml`:
   - AWS Lambda function (ARM64 architecture, Node.js 20 runtime) bundling the DSP triangulation engine.
   - Amazon API Gateway HTTP API with CORS support for SCADA console ingestion.
   - Amazon DynamoDB table with PAY_PER_REQUEST on-demand billing (100% Free Tier).
   - Amazon SNS Topic for emergency leak alert dispatch.
   - Automated deployment scripts (deploy-aws.bat / deploy-aws.sh) and LocalStack compatibility instructions.
3. Review `testIntegration.ts` latency performance: requirements state < 50 ms closed-loop ingestion to PRV actuation.
4. Detail the required structure and content for `docs/HARDWARE_ARCHITECTURE.md`:
   - Piezoelectric hydrophone transducer specifications (differential charge amplifier, 10 Hz–10 kHz bandwidth).
   - Microcontroller selection (ESP32-S3 / STM32 with high-speed ADC DMA ring buffering).
   - Bill of Materials (BOM) with realistic component costs for municipal scaling.
   - Sensor node schematic breakdown and signal conditioning details.
5. Review `README.md` updates needed (architecture diagram, benchmark summary table, AWS deployment quickstart, investor-ready engineering narrative).
6. Write your comprehensive report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_aws_hw\handoff.md`.
