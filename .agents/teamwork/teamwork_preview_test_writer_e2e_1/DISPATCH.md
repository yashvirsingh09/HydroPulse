# Dispatch: E2E Test Writer — Requirements-Driven E2E Test Suite (Tiers 1-4)

## Objective
Author the comprehensive opaque-box E2E test harness and test runner in `tests/e2e/run_e2e_tests.mjs` verifying all user requirements and acceptance criteria across Tiers 1 to 4 as specified in `TEST_INFRA.md`. Upon completion, publish `TEST_READY.md`.

## Inputs & Context
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Plan: `d:\STS\hydropulse\.agents\teamwork\orchestrator_1\PROJECT.md`
- Test Infrastructure Spec: `d:\STS\hydropulse\.agents\teamwork\orchestrator_1\TEST_INFRA.md`
- Working Directory: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_test_writer_e2e_1`

## Scope Boundaries
- You own test authoring in `tests/e2e/`. DO NOT modify core application source code (`core-dsp/src`, `backend-aws/src`, `web-console/src`).
- Derived strictly from user requirements and public contracts (opaque-box).
- Implement:
  - **Tier 1 (Feature Coverage, >=5 per feature)**: Build verification, DSP Korteweg solver, STFT computation, Delhi scenario resolution, 6 dB noise tolerance, closed-loop pipeline latency, DynamoDB offline store, and SCADA console build artifacts.
  - **Tier 2 (Boundary & Corner Cases, >=5 per feature)**: Zero/extreme pipe diameters, low/high SNRs, Nyquist boundary sample rates, empty bursts, clipping limits.
  - **Tier 3 (Cross-Feature Combinations)**: Multi-scenario burst ingestion chained to PRV valve actuation and DynamoDB state persistence.
  - **Tier 4 (Real-World Scenarios)**: 5 end-to-end Delhi pipeline rupture simulations (Bawana, Rohini, Wazirabad, Rapid multi-burst, Zero-cloud offline).
- When test suite is authored, run it to verify runner mechanics, and publish `d:\STS\hydropulse\TEST_READY.md` containing runner command and tier counts.

## Deliverables
- Test suite files in `tests/e2e/`
- `d:\STS\hydropulse\TEST_READY.md`
- Handoff report in `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_test_writer_e2e_1\handoff.md`
- Message the orchestrator via send_message when complete.


## 2026-10-06T19:42:50Z
Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_test_writer_e2e_1\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Author the comprehensive opaque-box E2E test harness and test runner in tests/e2e/run_e2e_tests.mjs covering Tiers 1 to 4 per TEST_INFRA.md. Upon completion, publish d:\STS\hydropulse\TEST_READY.md and write your handoff report to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_test_writer_e2e_1\handoff.md, then send a message to the orchestrator.
