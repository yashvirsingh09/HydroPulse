## 2026-10-07T01:35:25Z
You are teamwork_preview_worker_m1_r3.
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r3
Original Request: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md
Scope Document: d:\STS\hydropulse\.agents\teamwork\orchestrator_2\PROJECT.md
Interruption State: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r2\progress.md
Synthesis Blueprint: d:\STS\hydropulse\.agents\teamwork\orchestrator_2\M1_EXPLORATION_SYNTHESIS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context:
Your predecessor `worker_m1_r2` already implemented the core fixes (`korteweg.ts`, `types.ts`, `scenarios.ts`, `gccPhat.ts`) and achieved 76-77 / 80 benchmark passes (100% on Bawana, Rohini, Okhla down to 6 dB SNR). It was interrupted by a transient quota error while finalizing the last 3-4 boundary runs on Wazirabad at 6 dB SNR.

Tasks:
1. Read the interruption state and inspect `core-dsp/src/` and `core-dsp/tests/`.
2. Finalize `triangulate.ts` / `adaptiveFilter.ts` so that Wazirabad at 6 dB SNR passes accurately (ensure lag search on gated frames is cleanly bounded within `(L / v_s)`, e.g. +/- 10-15 ms, and onset picking captures the transient correctly).
3. Run `npm run build --prefix core-dsp` (must build cleanly with 0 TS errors).
4. Run `npm test --prefix core-dsp` (must pass 100%, including all 80 runs in `benchmark.test.ts` with error <= 1.5 m across all scenarios and noise levels down to 6 dB).
5. Run `node tests/e2e/run_e2e_tests.mjs` (must pass 93/93 tests).
6. Write your comprehensive `handoff.md` to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r3\handoff.md` detailing all test and benchmark outputs.
7. Send a message to parent with your verdict and handoff path.
