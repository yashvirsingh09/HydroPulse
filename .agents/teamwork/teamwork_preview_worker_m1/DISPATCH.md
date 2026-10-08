# Dispatch: Worker M1 — Implement DSP Depth, Acoustic Robustness & Benchmarking

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone 1 in `core-dsp` according to the blueprints provided by Explorers M1-1, M1-2, and M1-3:
1. `core-dsp/src/spectrogram.ts`: Real-time STFT frequency spectrogram engine ($N=128$, $H=32$, Hann window, log-magnitude dB power scaling, `SpectrogramData`).
2. `core-dsp/src/korteweg.ts`: Add material moduli (Cast Iron, Mild Steel, HDPE) and analytical wave speeds.
3. `core-dsp/src/scenarios.ts`: Delhi pipe scenario registry (Bawana, Rohini, Wazirabad, Okhla) and in-engine pure-TypeScript synthetic burst generator (`generateScenarioBurst`, causal wavefront, dispersion, attenuation, traffic rumble, Gaussian noise).
4. `core-dsp/src/adaptiveFilter.ts`: 4th-order zero-phase bandpass filter, STA/LTA transient onset gating, physical feasibility delay bounds, and window extraction.
5. `core-dsp/src/gccPhat.ts`: Band-limited cross-spectral weighting with smooth Tukey tapers and 3-point parabolic peak interpolation.
6. `core-dsp/src/triangulate.ts`: Integrated adaptive triangulation pipeline (4th-order filter -> STA/LTA gating -> band-limited GCC-PHAT -> parabolic interpolation) guaranteeing localization error <= 1.5 m down to 6 dB SNR, maintaining 100% backwards compatibility with `backend-aws/src/handlers/ingestBurst.ts`.
7. `core-dsp/src/types.ts` & `core-dsp/src/index.ts`: Update types and barrel exports.
8. `core-dsp/tests/benchmark.test.ts`: 80-run automated benchmark suite across all scenarios and SNR levels (24, 18, 12, 6 dB) outputting structured ASCII accuracy metrics table (Scenario, SNR, Runs, Mean Error, Max Error, Std Dev, Mean Conf %) and asserting error <= 1.5 m.
9. `core-dsp/package.json`: Configure `npm test` script to build and execute all tests.

## File Boundaries & Ownership
You exclusively own:
- `core-dsp/src/*`
- `core-dsp/tests/*`
- `core-dsp/package.json`
- `core-dsp/tsconfig.json`

DO NOT modify files in `backend-aws/` or `web-console/`.

## Input References
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Blueprint M1-1: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\report.md`
- Blueprint M1-2: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\report.md`
- Blueprint M1-3: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\report.md`
- Working Directory: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1`

## Verification Requirements
You MUST run:
1. `npm run build --prefix core-dsp` -> Verify 0 TypeScript errors.
2. `npm test --prefix core-dsp` -> Verify all tests pass including existing unit tests and the new 80-run benchmark.
3. `npm run build:all` from project root -> Verify clean build across all packages.

## Output
- Write your completion and handoff report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1\handoff.md`.
- Message the orchestrator via send_message when complete.


## 2026-10-06T20:06:57Z
Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Follow the implementation blueprints in:
- d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\report.md (STFT spectrogram engine)
- d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\report.md (Delhi scenarios & in-engine TS burst synthesis)
- d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\report.md (Adaptive noise rejection, 4th-order zero-phase filter, STA/LTA gating, band-limited GCC-PHAT, and 80-run benchmark test suite)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement the code in core-dsp, run builds and tests (npm run build --prefix core-dsp, npm test --prefix core-dsp, and npm run build:all), write your handoff to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1\handoff.md, and message the orchestrator when complete.
