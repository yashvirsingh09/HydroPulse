## 2026-10-07T04:52:21Z
You are the Project Orchestrator (Generation 3) for the HydroPulse project.

Your assigned working directory is:
d:\STS\hydropulse\.agents\teamwork\orchestrator_3

The project root is:
d:\STS\hydropulse

The authoritative user request is recorded in:
d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request under ## 2026-10-07T04:50:45Z).

Key Objectives & Requirements:
R1. Repository Clutter Cleanup & Code Integrity:
- Purge all 30+ temporary scratch and diagnostic scripts (core-dsp/*.mjs, core-dsp/tests/*.mjs, physics-engine/temp_*.json, .agents/ remnants) from the repository.
- Ensure only authoritative, tested source modules and official test suites (dsp.test.ts, spectrogram.test.ts, benchmark.test.ts, and tests/e2e/) remain.
- Update .gitignore to prevent build caches, debug fixtures, or temporary scripts from contaminating the repository tree.

R2. Acoustic Robustness & 6 dB SNR Gating Optimization:
- Harden GCC-PHAT and adaptive filtering pipeline against severe noise (6 dB SNR) where large spans (Wazirabad 1200m, Rohini 620m) encounter acoustic false peaks.
- Implement physical travel-time boundary enforcement (|Δt| <= L / v_s), parabolic peak verification, or multi-band weighting to reject spurious noise correlation peaks.
- Improve the 80-run benchmark accuracy at 6 dB SNR so high-noise pass rates exceed 90% without rogue multi-meter deviations.

R3. Turnkey AWS Free Tier Deployment (SAM / CloudFormation):
- Add production-ready AWS Serverless Application Model (SAM) template (template.yaml) provisioning Lambda (ARM64 / Node.js 20), API Gateway HTTP API with CORS, DynamoDB table PAY_PER_REQUEST, and SNS Topic.
- Provide automated deployment scripts (deploy-aws.bat / deploy-aws.sh) and LocalStack compatibility instructions for zero cost local verification.

R4. Hardware Sensor Node Roadmap & Submission Polish:
- Author authoritative Hardware & AFE specification document (docs/HARDWARE_ARCHITECTURE.md) detailing piezo hydrophone transducer, AFE differential charge amplifier, ESP32-S3 / STM32 selection, and realistic BOM.
- Update README.md and pitch documentation with transparent distinctions between physical hardware roadmaps and Korteweg synthetic acoustic verification.

Acceptance Criteria:
- Repository tree contains zero loose scratch scripts; git status clean.
- npm run build:all executes with 0 TypeScript or bundler errors across core-dsp, backend-aws, and web-console.
- npm run test:dsp passes all test suites, achieving >= 90% pass rate across the 80-run benchmark matrix including severe 6 dB noise conditions.
- npm run test:e2e executes cleanly with 93/93 tests passing.
- sam validate (or syntax check) validates template.yaml with 0 specification errors.
- node backend-aws/dist/testIntegration.js verifies closed-loop ingestion to PRV actuation in < 50 ms.
- docs/HARDWARE_ARCHITECTURE.md exists with complete sensor node schematic breakdown, BOM, and signal conditioning details.
- README.md includes updated architecture diagram, benchmark summary table, and AWS deployment quickstart.

Operational Instructions:
- Maintain your plan.md, progress.md, and briefing in your working directory (d:\STS\hydropulse\.agents\teamwork\orchestrator_3).
- Dispatch specialists/workers into their own respective directories under .agents/teamwork/.
- Rigorously test and verify all acceptance criteria before claiming victory.
- When all requirements and acceptance criteria are fully met, report your victory/completion to the Sentinel.
