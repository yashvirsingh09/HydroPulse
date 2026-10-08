# E2E Test Infra: HydroPulse

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md` and user-facing contracts, independent of internal implementation details.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing across Tiers 1–4.

## Feature Inventory & Test Coverage Matrix
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Real-World) |
|---|---------|----------------------|:-----------------:|:-----------------:|:-----------------:|:-------------------:|
| F1 | STFT Frequency Spectrograms | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Delhi Pipe Network Scenarios | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | Adaptive Noise Rejection (SNR down to 6 dB) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F4 | Automated Multi-Scenario Benchmarking | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F5 | Zero-Dependency & Cloud Parity | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F6 | Closed-Loop Latency < 200 ms | ORIGINAL_REQUEST §Acceptance Criteria | 5 | 5 | ✓ | ✓ |
| F7 | SCADA 2D Spectrogram Canvas & Web Audio | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F8 | Scenario Switcher & GIS Telemetry | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **E2E Test Runner**: Dedicated runner script `tests/e2e/run_e2e_tests.mjs` executing via Node.js native test runner or direct process verification.
- **Pass/Fail Semantics**: All test tiers must exit with status code 0. Any assertion failure, localization error > 1.5 m, build error, or latency >= 200 ms fails the test run.
- **Execution**: Run with standard command `npm run test:e2e` or `node tests/e2e/run_e2e_tests.mjs`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Main Bawana Road Heavy Industrial Rupture (400mm Ductile Iron, SNR 6 dB traffic rumble) | F1, F2, F3, F4, F5, F6 | High |
| 2 | Rohini Sector 16 Feeder Urban Residential Burst (300mm Cast Iron, SNR 12 dB) | F1, F2, F3, F5, F6, F7 | Medium |
| 3 | Wazirabad Transmission Main High-Volume Trunk Rupture (900mm Mild Steel, 1200m span, SNR 6 dB) | F1, F2, F3, F4, F5, F6, F8 | High |
| 4 | Rapid Multi-Incident Burst Ingestion (Sequential bursts across all 3 Delhi pipes in < 600 ms total) | F2, F5, F6 | High |
| 5 | Zero-Cloud Local Offline Fallback (End-to-end ingestion and triangulation with zero AWS credentials) | F2, F5, F6, F7, F8 | Medium |

## Coverage Thresholds
- Tier 1: ≥ 40 tests (5 per feature across 8 features)
- Tier 2: ≥ 40 boundary/edge tests (extreme SNRs, pipe limits, clipping thresholds, zero signals)
- Tier 3: ≥ 8 pairwise interaction tests
- Tier 4: ≥ 5 realistic end-to-end scenario runs
- **Total Suite Target**: ≥ 93 test validations
