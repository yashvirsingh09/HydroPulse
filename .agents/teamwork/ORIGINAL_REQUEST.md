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
