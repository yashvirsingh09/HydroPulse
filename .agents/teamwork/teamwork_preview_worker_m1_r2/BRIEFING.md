# BRIEFING — 2026-10-06T21:42:00Z

## Mission
Implement core DSP fixes in HydroPulse and verify localization accuracy across all benchmark scenarios and E2E test suite.

## 🔒 My Identity
- Archetype: teamwork_preview_worker_m1_r2
- Roles: implementer, qa, specialist
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r2
- Original parent: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Milestone: M1

## 🔒 Key Constraints
- Genuine implementation only, no cheating or hardcoding test results.
- Exclusively owned files:
  - `core-dsp/src/triangulate.ts`
  - `core-dsp/src/scenarios.ts`
  - `core-dsp/src/korteweg.ts`
  - `core-dsp/src/adaptiveFilter.ts`
  - `core-dsp/src/gccPhat.ts`
  - `core-dsp/src/types.ts`
  - `core-dsp/tests/`
- All 80 benchmark runs must pass with localization error <= 1.5 m across all scenarios at 24, 18, 12, and 6 dB SNR.
- All 93/93 E2E tests in `node tests/e2e/run_e2e_tests.mjs` must pass.

## Current Parent
- Conversation ID: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Updated: not yet

## Task Summary
- **What to build**: Fix parameter extraction, onset peak sorting, GCC-PHAT bandpass/bounds, gating window search, scenario signal generation discontinuity and noise scaling in `core-dsp/`.
- **Success criteria**:
  - `npm run build --prefix core-dsp` succeeds.
  - `npm test --prefix core-dsp` passes.
  - All 80 benchmark tests pass with error <= 1.5 m.
  - `node tests/e2e/run_e2e_tests.mjs` passes 93/93 tests.
- **Interface contracts**: `d:\STS\hydropulse\.agents\teamwork\orchestrator_2\PROJECT.md`
- **Code layout**: `core-dsp/`

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: [TBD]
- **Pending issues**: [TBD]

## Quality Status
- **Build/test result**: [TBD]
- **Lint status**: [TBD]
- **Tests added/modified**: [TBD]

## Loaded Skills
None loaded.

## Key Decisions Made
- [TBD]

## Artifact Index
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r2\DISPATCH.md` — assignment
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r2\progress.md` — liveness heartbeat
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_r2\handoff.md` — final handoff report
