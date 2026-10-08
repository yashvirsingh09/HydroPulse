# BRIEFING — 2026-10-06T21:30:00Z

## Mission
Investigate core-dsp test harness, benchmark tolerances, parameter mismatches between core-dsp/src and tests/e2e/helpers, and formulate the exact alignment recipe.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigation, parameter comparison, recipe formulation
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_3
- Original parent: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Milestone: milestone_1_core_dsp

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigation Scope: Milestone 1 (`core-dsp`) test harness and benchmark tolerances
- Write handoff report to handoff.md in working directory
- Send findings back to parent via send_message

## Current Parent
- Conversation ID: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Updated: 2026-10-06T21:30:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_READY.md`
  - `core-dsp/tests/dsp.test.ts`, `core-dsp/tests/benchmark.test.ts`
  - `core-dsp/src/triangulate.ts`, `core-dsp/src/adaptiveFilter.ts`, `core-dsp/src/gccPhat.ts`, `core-dsp/src/scenarios.ts`, `core-dsp/src/korteweg.ts`, `core-dsp/src/types.ts`
  - `tests/e2e/run_e2e_tests.mjs`, `tests/e2e/tier1_feature_coverage.mjs`, `tests/e2e/tier2_boundary_cases.mjs`, `tests/e2e/tier3_pairwise_combinations.mjs`, `tests/e2e/tier4_real_world_scenarios.mjs`
  - `tests/e2e/helpers/dsp_oracle.mjs`, `tests/e2e/helpers/burst_generator.mjs`, `tests/e2e/helpers/scenarios_catalog.mjs`, `tests/e2e/helpers/backend_bridge.mjs`
  - Prior explorer & worker reports (`m1_1`, `m1_2`, `m1_3`, `test_writer_e2e_1`, `m1_r2_1`, `m1_r2_2`)
- **Key findings**:
  1. E2E test failures (17 failures): 16 caused by missing `sampleRateHz` on `burst.node_a` leading to `NaN` and `TypeError: Cannot read properties of undefined (reading 'toFixed')` at `gccPhat.js:116`. 1 failure (Tier 4 Test 4.1) caused by over-wide gated search delay (102.4 ms) jumping to a harmonic side-lobe.
  2. `benchmark.test.ts` failure in `core-dsp`: `generateSyntheticBurst` in `scenarios.ts` omitted the `* 0.15` noise scaling factor present in `burst_generator.mjs`, creating $6.67\times$ louder noise ($+16.5\text{ dB}$ noise floor shift). Truncated leading edge pulse and asymmetric viscoelastic broadening degraded waveform coherence.
  3. DSP algorithms in `dsp_oracle.mjs`: Band-limited GCC-PHAT $[450\text{ Hz}, 1500\text{ Hz}]$, parabolic 3-point peak interpolation, physical lag limits $(L/v_s)\times 1.1$.
  4. Alignment recipe formulated: default `sampleRateHz` to 10000; align `scenarios.ts` noise scaling and pulse generation with `burst_generator.mjs`; constrain onset-gated search delay in `triangulate.ts` to $\pm 20-30\text{ samples}$ ($\pm 2-3\text{ ms}$); guard `gccPhat.ts` buffer bounds.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Fully documented all 5 parameter/architectural mismatches and verified solutions in empirical isolated Node.js test runs.
- Formulated complete code-level replacement recipes for `core-dsp/src/`.

## Artifact Index
- DISPATCH.md — Incoming task dispatch
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive investigation report
