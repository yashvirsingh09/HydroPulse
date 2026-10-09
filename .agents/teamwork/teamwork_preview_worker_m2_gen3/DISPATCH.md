## 2026-10-07T05:28:00Z
Assignment: Milestone 2 — Acoustic Robustness & 6 dB SNR Gating Optimization (R2)
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m2_gen3
Project root: d:\STS\hydropulse
ORIGINAL_REQUEST: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md
Survey Handoff: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp\handoff.md

Objectives & Tasks:
1. Read the survey handoff at `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp\handoff.md`.
2. Implement physical travel-time boundary enforcement in `core-dsp/src/triangulate.ts`:
   - Enforce `const maxFeasibleDelaySec = L / v_s;` (replace `(L / v_s) * 1.05`).
   - Clamp candidate delay search strictly within physical bounds `[-maxFeasibleDelaySec, maxFeasibleDelaySec]`.
   - Prevent rogue non-physical deviations where $\hat{x} < 0$ or $\hat{x} > L$.
3. Implement acoustic resonance pre-filtering and band-limited GCC-PHAT in `core-dsp/src/triangulate.ts`:
   - Pre-filter raw bursts with `zeroPhaseBandpass` using the water hammer resonance passband (default `[770, 930]` Hz or options-specified).
   - Set `bandLimited` default to `true` with Tukey taper so that 0-750 Hz and 950-5000 Hz out-of-band Gaussian noise is suppressed before IFFT.
4. Implement parabolic peak verification and quality scoring in `core-dsp/src/gccPhat.ts`:
   - Extract local maxima within the feasible lag window.
   - Enforce local peak concavity $\kappa_k = 2 R(\tau_k) - (R(\tau_k - 1) + R(\tau_k + 1)) > 0$.
   - Calculate parabolic sub-sample shift $\delta_k$.
   - Evaluate peak quality $Q_k$ combining amplitude and curvature to reject spurious high-frequency noise spikes.
5. In `core-dsp/tests/benchmark.test.ts`:
   - Verify that the 80-run benchmark test suite executes cleanly and achieves >= 90% overall pass rate (target: >= 72/80 runs with error <= 1.5m), and 6 dB SNR pass rate >= 90% (18/20 runs).
6. Run all verification commands:
   - `npm run build --prefix core-dsp` (must succeed with 0 errors)
   - `npm run test --prefix core-dsp` (all suites pass, >= 90% benchmark pass rate)
   - `npm run test:e2e` (must still pass 93/93 validations)
7. Write your comprehensive completion report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m2_gen3\handoff.md` and notify parent.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
