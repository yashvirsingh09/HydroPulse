# Project: HydroPulse

## Architecture
HydroPulse is an autonomous acoustic pipe rupture triangulation and water hammer mitigation system consisting of three tightly integrated modules:
1. `core-dsp`: High-precision acoustic signal processing library. Calculates Korteweg pressure wave speeds in fluid-filled elastic pipes, executes Short-Time Fourier Transforms (STFT), applies adaptive STA/LTA onset gating with 4th-order zero-phase bandpass filtering, and performs band-limited GCC-PHAT cross-correlation with parabolic interpolation for sub-meter localization error (<= 1.5 m) down to 6 dB SNR. Provides synthetic Delhi pipe burst generation across multiple diameters and materials.
2. `backend-aws`: AWS Lambda ingestion pipeline with DynamoDB state persistence and automated PRV valve actuation dispatch (< 200 ms closed loop). Supports both live AWS cloud mode and 100% offline local development/demo mode with zero external dependencies.
3. `web-console`: High-impact SCADA operator interface built on React 19, TailwindCSS, and Leaflet. Features live dual-channel oscilloscopes, live 2D frequency spectrogram visualizer (Hann window, Turbo colormap), stereo Web Audio transient playback (Left=Node A, Right=Node B), interactive Delhi scenario switcher (Bawana, Rohini, Wazirabad), mechanical PRV valve animation with fluid constriction and closed-loop latency ticker, and reactive Delhi GIS map with radar sonar ripples.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1: STFT Spectrogram Engine | Real-time Short-Time Fourier Transform engine in `core-dsp` with Hann windowing, sliding frames, log-power scaling, and exportable `SpectrogramData` structures. | M1 | ORIGINAL_REQUEST §R1 |
| 2 | F2: Delhi Pipe Scenarios & Material Catalog | Real-world Delhi pipe network scenario definitions (Main Bawana Road, Rohini Sector 16 Feeder, Wazirabad Transmission Main) and pipe materials (Ductile Iron, Cast Iron, Mild Steel, HDPE) with pure TS burst synthesis. | M1 | ORIGINAL_REQUEST §R1 |
| 3 | F3: Adaptive Noise Rejection (STA/LTA & Band-Limited GCC-PHAT) | Multi-stage adaptive filtering combining STA/LTA transient onset gating, 4th-order zero-phase biquad filtering, and band-limited cross-spectral weighting to ensure <= 1.5 m localization error at 6 dB SNR. | M1 | ORIGINAL_REQUEST §R1 |
| 4 | F4: Automated Multi-Scenario DSP Benchmarking | Automated 80-run benchmark test suite in `core-dsp` across all scenario profiles and noise levels (24, 18, 12, 6 dB) producing structured accuracy metrics (mean error, max error, std dev, confidence score distribution). | M1 | ORIGINAL_REQUEST §R3 |
| 5 | F5: Backend Cloud Parity & Wazirabad Scenario Support | Update `dynamoService.ts` to include Wazirabad Transmission Main (`PIPE-DEL-WAZIRABAD-02`), add standard API Gateway Lambda handler export in `ingestBurst.ts`, and maintain 100% offline/cloud parity. | M2 | ORIGINAL_REQUEST §R4 |
| 6 | F6: Closed-Loop Pipeline Latency Verification (< 200 ms) | Update `testIntegration.ts` with strict programmatic assertions (`assert`, `performance.now()`) verifying burst ingestion -> TDOA triangulation -> DynamoDB persistence -> automated PRV throttle in < 200 ms. | M2 | ORIGINAL_REQUEST §Acceptance Criteria |
| 7 | F7: SCADA 2D Frequency Spectrogram Canvas Visualizer | Dedicated 2D canvas visualizer component (`SpectrogramViewer.tsx`) with Turbo colormap and synchronized playback scrubber line in `web-console`. | M3 | ORIGINAL_REQUEST §R2 |
| 8 | F8: Stereo Web Audio Transient Playback | Singleton audio manager (`audioPlayer.ts`) with stereo spatialization (Left=Node A, Right=Node B), anti-clipping dynamics compression, and 60 FPS playhead emitter. | M3 | ORIGINAL_REQUEST §R2 |
| 9 | F9: Interactive Delhi Scenario Switcher | SCADA scenario selector bar (`ScenarioSwitcher.tsx`) allowing operators to inject and evaluate Bawana, Rohini, and Wazirabad pipe ruptures on the fly with dynamic Korteweg velocities. | M3 | ORIGINAL_REQUEST §R2 |
| 10 | F10: Animated Mechanical PRV Actuator & Closed-Loop Ticker | Mechanical valve actuator component (`ValveActuator.tsx`) with animated sliding wedge, fluid stream restriction graphic (1200 -> 600 -> 0 m3/h), and sub-200ms latency execution ticker. | M3 | ORIGINAL_REQUEST §R2 |
| 11 | F11: Delhi GIS Map Reactivity & Sonar Radar HUD | Reactive Leaflet map with `map.flyTo`, danger crimson rupture highlighting, sub-meter accuracy tags, animated `.radar-ping` sonar ripple, and circular 360-degree radar HUD sweep widget (`RadarHUD.tsx`). | M3 | ORIGINAL_REQUEST §R2 |
| 12 | F12: Dual-Track E2E Test Suite (Tiers 1-4) | Requirements-driven opaque-box E2E test harness and test runner validating all features and criteria, publishing `TEST_READY.md`. | E2E | ORIGINAL_REQUEST §Acceptance Criteria |
| 13 | F13: Final E2E Test Pass & Adversarial Coverage Hardening | 100% pass of E2E test suite (Tiers 1-4) followed by Tier 5 white-box adversarial coverage hardening. | M_FINAL | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | DSP Depth & Acoustic Robustness | Verify STFT engine, Delhi scenarios, STA/LTA adaptive noise rejection, and 80-run benchmark test suite in `core-dsp`. | none | IN_PROGRESS |
| M2 | Backend Cloud Parity & Integration Assertions | Extend `backend-aws` with Wazirabad scenario, API Gateway handler adapter, and `< 200 ms` closed-loop latency assertions in `testIntegration.ts`. | M1 | PLANNED |
| M3 | SCADA Operator UI Polish & Visualizers | Implement 2D spectrogram visualizer, stereo Web Audio playback, scenario switcher, animated valve actuator, radar HUD, and fix Leaflet reactivity in `web-console`. | M1 | PLANNED |
| E2E | E2E Testing Track | Design and build opaque-box multi-tier test suite across build, DSP, backend closed-loop, and console contracts; publish `TEST_READY.md`. | none | DONE |
| M_FINAL | Final E2E Verification & Adversarial Hardening | Phase 1: 100% E2E test pass across Tiers 1-4. Phase 2: Tier 5 adversarial coverage hardening. | M1, M2, M3, E2E | PLANNED |

## Interface Contracts
### core-dsp ↔ backend-aws
- `triangulatePipeLeak(nodeABurst: AcousticBurst, nodeBBurst: AcousticBurst, pipeParams: PipeParameters, options?: TriangulationOptions): TriangulationResult`
- `PipeParameters`: `{ lengthMeters: number, innerDiameterM: number, wallThicknessM: number, pipeMaterial?: string, youngsModulusPa?: number, bulkModulusPa?: number, densityKgM3?: number }`
- `TriangulationResult`: `{ estimatedLeakDistanceM: number, deltaTMs: number, confidenceScore: number, waveSpeedMPerS: number, crossCorrelationPeak: number, estimatedLeakCoords?: [number, number] }`
- `SpectrogramData`: `{ timeBins: number[], freqBins: number[], powerMatrixDb: number[][] }`
- `computeSTFT(samples: Float64Array | number[], sampleRateHz: number, windowSize?: number, hopSize?: number): SpectrogramData`

### backend-aws ↔ web-console
- `handleIngestBurst(payload: BurstIngestPayload): Promise<BurstIngestResponse>`
- `BurstIngestPayload`: `{ pipeId: string, metadata: BurstMetadata, node_a: NodeBurstData, node_b: NodeBurstData }`
- `BurstIngestResponse`: `{ success: boolean, incidentId: string, pipeStatus: PipeRecord, leakDistanceM: number, deltaTMs: number, confidenceScore: number, executionTimeMs: number }`

### core-dsp ↔ web-console
- `scenarios.ts` in `web-console` mirrors or imports scenario specifications from `core-dsp`:
  - Bawana Road: 500m length, 0.400m diameter, 0.0095m wall thickness, Ductile Iron
  - Rohini Sector 16: 620m length, 0.300m diameter, 0.0080m wall thickness, Cast Iron
  - Wazirabad Transmission: 1200m length, 0.900m diameter, 0.0140m wall thickness, Mild Steel

## Code Layout
- `core-dsp/src/`:
  - `index.ts`: Barrel exports
  - `types.ts`: Acoustic burst, pipe params, triangulation result types
  - `korteweg.ts`: Korteweg pressure wave speed solver and material modulus catalog
  - `fft.ts`: Radix-2 Cooley-Tukey FFT & IFFT with power-of-two padding
  - `bandpassFilter.ts`: 2nd and 4th-order biquad IIR bandpass filters
  - `spectrogram.ts`: STFT engine with Hann window and log-power scaling (NEW)
  - `adaptiveFilter.ts`: STA/LTA transient onset gating and adaptive noise thresholding (NEW)
  - `scenarios.ts`: Delhi pipe scenario registry and TS synthetic burst generator (NEW)
  - `gccPhat.ts`: Band-limited GCC-PHAT cross-correlation with parabolic interpolation
  - `triangulate.ts`: High-level triangulation pipeline
- `core-dsp/tests/`:
  - `dsp.test.ts`: Existing unit test suite
  - `spectrogram.test.ts`: STFT engine unit tests
  - `benchmark.test.ts`: Multi-scenario 80-run benchmark test suite (NEW)
- `backend-aws/src/`:
  - `handlers/ingestBurst.ts`: API Gateway Lambda handler and ingestion pipeline
  - `services/dynamoService.ts`: DynamoDB / mock in-memory state store with all Delhi pipes
  - `services/actuatorService.ts`: PRV valve throttle dispatcher
  - `testIntegration.ts`: End-to-end integration script with latency and assertion verification
- `web-console/src/`:
  - `App.tsx`: Main SCADA operator dashboard
  - `components/WaveformViewer.tsx`: Oscilloscope dual-channel viewer
  - `components/SpectrogramViewer.tsx`: 2D frequency spectrogram canvas visualizer (NEW)
  - `components/ScenarioSwitcher.tsx`: Delhi pipe scenario switcher bar (NEW)
  - `components/ValveActuator.tsx`: Animated mechanical PRV valve with closed-loop ticker (NEW)
  - `components/RadarHUD.tsx`: 360-degree radar sweep telemetry widget (NEW)
  - `components/PipeMap.tsx`: Reactive Leaflet GIS map with flyTo and sonar ripples
  - `components/ActuatorPanel.tsx`: Incident status and manual/autonomous actuator control
  - `utils/audioPlayer.ts`: Stereo Web Audio manager with anti-clipping limiter (NEW)
  - `utils/spectrogram.ts`: Client-side spectrogram calculator (NEW)
  - `data/scenarios.ts`: Delhi scenarios data and burst generator for offline demo (NEW)
