# Project: HydroPulse (Generation 3 Orchestration)

## Architecture
HydroPulse is an autonomous acoustic pipe rupture triangulation and water hammer mitigation SCADA system consisting of:
1. `core-dsp`: High-precision acoustic signal processing library implementing Korteweg pressure wave speeds, STFT frequency spectrograms, 4th-order zero-phase Butterworth filtering, and band-limited GCC-PHAT cross-correlation with parabolic interpolation and physical travel-time boundary enforcement.
2. `backend-aws`: AWS Serverless event-driven ingestion pipeline (ARM64 Lambda, HTTP API v2 Gateway, DynamoDB PAY_PER_REQUEST, SNS alerts, and autonomous PRV mitigation in < 50 ms closed loop).
3. `web-console`: High-impact React 19 / Vite / Tailwind SCADA operator interface featuring live dual-channel oscilloscopes, 2D frequency spectrogram canvas (Turbo colormap), stereo Web Audio playback, interactive Delhi scenario switcher, and reactive Delhi GIS map.
4. `hardware & firmware`: Low-cost ($48) edge acoustic sensor node architecture (wet-tap PZT hydrophone, differential charge amplifier, ESP32-S3 DMA ring buffer, GPS PPS microsecond time synchronization).

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | F1: Repo Clutter Cleanup & Git Hygiene | Purge 76 scratch scripts (.mjs, temp_*.json, pycache, agent remnants) and update .gitignore with hardened rules. | M1 | DONE |
| 2 | F2: Acoustic Robustness & 6 dB SNR Gating | Enforce physical travel-time boundaries (|Δt| <= L/vs), zero-phase resonance pre-filtering [770, 930] Hz, and parabolic peak verification in core-dsp. Achieve >= 90% benchmark pass rate at 6 dB SNR. | M2 | DONE |
| 3 | F3: AWS SAM Serverless Infrastructure | Production-ready template.yaml (ARM64 Lambda Node 20, HTTP API v2 + CORS, DynamoDB PAY_PER_REQUEST, SNS Topic). | M3 | DONE |
| 4 | F4: Turnkey AWS Deployment Scripts & LocalStack | deploy-aws.bat and deploy-aws.sh supporting both live AWS and LocalStack zero-cost local cloud emulation. | M3 | DONE |
| 5 | F5: Backend Sub-50ms SLA Verification & Actuator Decoupling | actuatorService.ts for PRV valve actuation, API Gateway handler adapter, and testIntegration.ts asserting < 50.0 ms runtime. | M3 | DONE |
| 6 | F6: Hardware Sensor Node Architecture Spec | Authoritative docs/HARDWARE_ARCHITECTURE.md (wet-tap PZT hydrophone, differential charge amp, ESP32-S3 DMA ring buffer, GPS PPS sync, $48 BOM). | M4 | DONE |
| 7 | F7: Submission Polish & Documentation | Update README.md with cyber-physical architecture diagram, 80-run benchmark table, AWS quickstart, and hardware vs synthetic narrative. | M4 | DONE |
| 8 | F8: Full System Acceptance & Verification Gate | Verify all acceptance criteria: clean git tree, npm run build:all clean, test:dsp >= 90% pass rate at 6 dB, test:e2e 93/93 pass, sam validate clean, testIntegration < 50ms. | M_FINAL | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Repository Clutter Cleanup & Git Hygiene | Purge all 76 scratch/diagnostic files, update .gitignore, verify clean git status. | none | DONE |
| M2 | Acoustic Robustness & 6 dB SNR Gating | Implement travel-time boundary gating, resonance pre-filtering, and parabolic peak verification in core-dsp. | M1 | DONE |
| M3 | Turnkey AWS SAM Infrastructure & Latency | Author template.yaml, deploy scripts, actuatorService.ts, testIntegration.ts < 50ms assertion. | M1 | DONE |
| M4 | Hardware Architecture & Submission Docs | Author docs/HARDWARE_ARCHITECTURE.md and update README.md. | M1 | DONE |
| M_FINAL | System Acceptance & Victory Gate | Comprehensive review, adversarial testing, forensic audit, and final verification. | M1, M2, M3, M4 | DONE |
