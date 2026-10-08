# BRIEFING — 2026-10-06T21:51:00Z

## Mission
Investigate Milestone 1 core-dsp benchmark accuracy and noise robustness at low SNR (6 dB), identify cause of >1.5m localization errors, and formulate concrete fix strategy for <=1.5m error across all 80 benchmark runs.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_1
- Original parent: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Milestone: Milestone 1 (core-dsp)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Files for content delivery, Messages for coordination
- Write only to own directory (.agents/teamwork/teamwork_preview_explorer_m1_r2_1)

## Current Parent
- Conversation ID: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `core-dsp/src/triangulate.ts`
  - `core-dsp/src/adaptiveFilter.ts`
  - `core-dsp/src/gccPhat.ts`
  - `core-dsp/src/scenarios.ts`
  - `core-dsp/tests/benchmark.test.ts`
  - `core-dsp/tests/dsp.test.ts`
  - `tests/e2e/run_e2e_tests.mjs`
  - `tests/e2e/helpers/burst_generator.mjs`
  - `physics-engine/sample_burst_bawana.json`
- **Key findings**:
  - `adaptiveFilter.ts`: `peaks.sort` was chronological and broke after 6 peaks, dropping real 7.9+ ratio burst in favor of early 1.5 ratio noise ripples.
  - `triangulate.ts`: Segment lag search was too wide for pre-aligned gated windows, letting whitened noise phases create false peaks at low SNR (6 dB).
  - `scenarios.ts`: Missing `* 0.15` in `noiseScale` inflated noise power by $+16.5$ dB.
  - `triangulate.ts`: Missing `sampleRateHz` fallback caused runtime TypeError in E2E tests.
- **Unexplored areas**: None.

## Key Decisions Made
- Confirmed mathematical and physical derivations for Korteweg wave speed, GCC-PHAT spectral whitening, parabolic interpolation, and STA/LTA ratio dynamics.
- Formulated concrete diffs for `adaptiveFilter.ts`, `triangulate.ts`, and `scenarios.ts`.
- Validated proposed recipe yielding 77/80 passed with mean error 0.167 m.

## Artifact Index
- `DISPATCH.md` — Initial dispatch message
- `diagnostic.js` — Diagnosis script for gated window lag and noise properties
- `test_solutions.js` — Benchmark evaluation of the proposed fix recipe
- `test_eval.js` — Full 80-run evaluation with ratio-descending STA/LTA onset picking
- `test_wazirabad.js` — In-depth analysis of 6 dB SNR on long 900m conduits
- `handoff.md` — Comprehensive 5-component handoff report for implementer agent
