# Original User Request

## 2026-10-06T19:23:25Z

Conduct a comprehensive review and improvement of HydroPulse—an autonomous acoustic pipe rupture triangulation and water hammer mitigation system—to maximize technical depth, demo impact, and reliability for the WeMakeDevs Bharat Builds Environmental Hacks hackathon.

Working directory: d:\STS\hydropulse
Integrity mode: development

## Requirements

### R1. DSP Depth & Acoustic Robustness
- Extend the signal processing engine to compute and export real-time Short-Time Fourier Transform (STFT) frequency spectrograms alongside raw time-domain waveforms.
- Enhance acoustic simulation with multiple real-world Delhi pipe network scenarios (e.g., Main Bawana Road, Rohini Sector 16 Feeder, and Wazirabad Transmission Main) across different diameters and pipe materials.
- Implement adaptive noise rejection capable of isolating rupture transients in high-noise environments (SNR down to 6 dB).

### R2. SCADA Operator UI Polish & Visual Impact
- Enhance the operator console with a live 2D frequency spectrogram canvas visualizer synchronized with Web Audio playback.
- Add an interactive scenario switcher allowing operators to inject and evaluate distinct pipe rupture incidents on the fly.
- Polish real-time radar telemetry indicators, sub-meter accuracy badges, and automated valve throttle animations for optimal clarity during a 3-minute video recording.

### R3. Automated Multi-Scenario Benchmarking & Test Coverage
- Implement an automated benchmarking test suite that runs localization across all scenario profiles and noise levels.
- Output structured accuracy metrics (mean localization error, maximum error, standard deviation, and confidence score distribution).

### R4. Zero-Dependency Resilience & Cloud Parity
- Ensure all services (DSP, Lambda handlers, SCADA web console) build and run 100% reliably in local offline demo mode while maintaining full parity with live AWS Lambda and DynamoDB services.

## Acceptance Criteria

### Verification & Accuracy
- [ ] `npm run build:all` completes cleanly with 0 TypeScript or build errors across `core-dsp`, `backend-aws`, and `web-console`.
- [ ] `npm test --prefix core-dsp` passes all test cases, proving sub-meter localization error (<= 1.5 m) across all benchmark scenarios.
- [ ] `node backend-aws/dist/testIntegration.js` verifies the complete closed-loop pipeline: burst ingestion -> TDOA triangulation -> DynamoDB persistence -> automated PRV valve throttle in < 200 ms.

### User Interface & Demo Experience
- [ ] Operator console displays live dual-channel waveforms, frequency spectrograms, and sharp GCC-PHAT peak visualization.
- [ ] Web Audio API playback produces audible transient bursts through system speakers without UI stutter or clipping.
- [ ] Delhi GIS map cleanly updates marker positions, highlights pipe vector paths, and displays sub-meter precision tags.


## 2026-10-07T04:50:45Z

Comprehensive engineering refinement of HydroPulse (autonomous acoustic water hammer triangulation SCADA) targeting top-tier submission quality for WeMakeDevs Bharat Builds Environmental Hacks: clean up repository clutter, harden 6 dB SNR acoustic noise rejection, add turnkey AWS SAM Free Tier deployment infrastructure, and document the physical sensor hardware architecture.

Working directory: d:\STS\hydropulse
Integrity mode: development

## Requirements

### R1. Repository Clutter Cleanup & Code Integrity
- Purge all 30+ temporary scratch and diagnostic scripts (core-dsp/*.mjs, core-dsp/tests/*.mjs, physics-engine/temp_*.json, .agents/ remnants) from the repository.
- Ensure only authoritative, tested source modules and official test suites (dsp.test.ts, spectrogram.test.ts, benchmark.test.ts, and tests/e2e/) remain.
- Update .gitignore to prevent any build caches, debug fixtures, or temporary scripts from contaminating the repository tree.

### R2. Acoustic Robustness & 6 dB SNR Gating Optimization
- Harden the GCC-PHAT and adaptive filtering pipeline against severe noise (6 dB SNR) where large spans (Wazirabad 1200m, Rohini 620m) encounter acoustic false peaks.
- Implement physical travel-time boundary enforcement (|Δt| <= L / v_s), parabolic peak verification, or multi-band weighting to reject spurious noise correlation peaks.
- Improve the 80-run benchmark accuracy at 6 dB SNR so high-noise pass rates exceed 90% without rogue multi-meter deviations.

### R3. Turnkey AWS Free Tier Deployment (SAM / CloudFormation)
- Add a production-ready AWS Serverless Application Model (SAM) template (template.yaml) provisioning:
  - AWS Lambda function (ARM64 / Node.js 20) bundling the DSP triangulation engine.
  - Amazon API Gateway HTTP API with CORS support for SCADA console ingestion.
  - Amazon DynamoDB table with PAY_PER_REQUEST on-demand billing (100% Free Tier).
  - Amazon SNS Topic for emergency leak alert dispatch.
- Provide automated deployment scripts (deploy-aws.bat / deploy-aws.sh) and LocalStack compatibility instructions so judges can verify live cloud deployment or run locally with zero cost.

### R4. Hardware Sensor Node Roadmap & Submission Polish
- Author an authoritative Hardware & AFE specification document (docs/HARDWARE_ARCHITECTURE.md) detailing:
  - Piezoelectric hydrophone transducer specifications (differential charge amplifier, 10 Hz–10 kHz bandwidth).
  - Microcontroller selection (ESP32-S3 / STM32 with high-speed ADC DMA ring buffering).
  - Bill of Materials (BOM) with realistic component costs for municipal scaling.
- Update README.md and pitch documentation with transparent distinctions between physical hardware roadmaps and Korteweg synthetic acoustic verification, presenting a mature, investor-ready engineering narrative.

## Acceptance Criteria

### Repository Cleanliness & Build Verification
- [ ] Repository tree contains zero loose scratch scripts (test_*.mjs, diagnose.mjs, inspect_*.mjs); git status reflects a clean, professional monorepo.
- [ ] npm run build:all executes with 0 TypeScript or bundler errors across core-dsp, backend-aws, and web-console.

### DSP Accuracy & Benchmarks
- [ ] npm run test:dsp passes all test suites, achieving >= 90% pass rate across the 80-run benchmark matrix including severe 6 dB noise conditions.
- [ ] npm run test:e2e executes cleanly with 93/93 tests passing.

### AWS Deployment & Cloud Parity
- [ ] sam validate (or syntax check) validates template.yaml with 0 specification errors.
- [ ] node backend-aws/dist/testIntegration.js verifies closed-loop ingestion to PRV actuation in < 50 ms.

### Documentation & Hardware Specification
- [ ] docs/HARDWARE_ARCHITECTURE.md exists with complete sensor node schematic breakdown, BOM, and signal conditioning details.
- [ ] README.md includes an updated architecture diagram, benchmark summary table, and AWS deployment quickstart.
