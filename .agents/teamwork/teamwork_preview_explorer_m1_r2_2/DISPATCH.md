## 2026-10-06T21:16:18Z
You are teamwork_preview_explorer_m1_r2_2.
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_2
Original Request: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: d:\STS\hydropulse\.agents\teamwork\orchestrator_2\PROJECT.md

Investigation Scope:
Milestone 1 (`core-dsp`) signal generation vs localization consistency.
Your task:
1. Read `ORIGINAL_REQUEST.md`, `PROJECT.md`, `core-dsp/src/scenarios.ts`, `core-dsp/src/triangulate.ts`, `core-dsp/src/korteweg.ts`, and `core-dsp/tests/benchmark.test.ts`.
2. Inspect how synthetic bursts are generated in `scenarios.ts` (delay formula: `t_a = leakDistance / waveSpeed`, `t_b = (length - leakDistance) / waveSpeed`, Delta T = `t_a - t_b`).
3. Check the convention used for Delta T and leak distance in `triangulate.ts`:
   Is Delta T defined as (t_a - t_b) or (t_b - t_a)?
   Formula: `x = (L + v * deltaT) / 2` or `x = (L - v * deltaT) / 2`?
4. Verify if sign conventions, zero-time references, or sample indexing match between synthetic generation and TDOA triangulation.
5. Formulate a concrete fix recommendation to ensure perfect alignment between signal generation, Korteweg wave speeds, and TDOA distance estimation.
6. Write your comprehensive report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_2\handoff.md`.
7. Send a message to parent with your findings.
