# Dispatch: Explorer M1-3 — Adaptive Noise Rejection & 80-Run Benchmark Suite

## Objective
Design the concrete implementation blueprint for STA/LTA transient onset gating, 4th-order zero-phase bandpass filtering, band-limited GCC-PHAT cross-correlation in `core-dsp/src/adaptiveFilter.ts` & `gccPhat.ts`, and the 80-run automated multi-scenario benchmark in `core-dsp/tests/benchmark.test.ts`.

## Inputs & Context
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Plan: `d:\STS\hydropulse\.agents\teamwork\orchestrator_1\PROJECT.md`
- Survey 1 Report: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md`
- Existing GCC-PHAT & Triangulation: `core-dsp/src/gccPhat.ts`, `core-dsp/src/triangulate.ts`
- Working Directory: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3`

## Scope Boundaries
- Read-only exploration. DO NOT modify source files.
- Mathematically formulate the fix for the 6 dB SNR failure mode (85.35 m error) to guarantee sub-meter localization error ($\le 1.5$ m):
  1. 4th-order zero-phase biquad bandpass filter (300 Hz – 2200 Hz).
  2. STA/LTA (Short-Term Average / Long-Term Average) transient detector isolating the rupture arrival window.
  3. Band-limited GCC-PHAT cross-spectral weighting suppressing out-of-band whitening noise.
  4. 3-point parabolic interpolation for sub-sample TDOA estimation.
- Design `core-dsp/tests/benchmark.test.ts`:
  - 80 runs across all scenarios and noise levels (24, 18, 12, 6 dB SNR).
  - Output structured accuracy metrics table: Scenario, SNR, Runs, Mean Error (m), Max Error (m), Std Dev (m), Mean Confidence (%).
  - Assert localization error $\le 1.5$ m across all test cases.

## Deliverables
- Write detailed report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\report.md`
- Write handoff to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\handoff.md`
- Message the orchestrator via send_message when complete.

## 2026-10-06T19:42:50Z
Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Formulate exact implementation blueprint for core-dsp/src/adaptiveFilter.ts (STA/LTA transient gating, 4th-order zero-phase bandpass, band-limited GCC-PHAT in gccPhat.ts) to guarantee <= 1.5 m error at 6 dB SNR, and design the 80-run benchmark in core-dsp/tests/benchmark.test.ts.
Write your findings to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\report.md and handoff.md, then send a message to the orchestrator.
