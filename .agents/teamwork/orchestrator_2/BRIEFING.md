# BRIEFING — 2026-10-06T20:35:00Z

## Mission
Orchestrate HydroPulse Generation 2: verify Milestone 1 (core-dsp), execute Milestone 2 (backend-aws), execute Milestone 3 (web-console), and verify 100% acceptance criteria across all tiers.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:\STS\hydropulse\.agents\teamwork\orchestrator_2
- Original parent: parent
- Original parent conversation ID: 7d122209-75a5-47a6-9372-865b2f64d0e6

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: d:\STS\hydropulse\.agents\teamwork\orchestrator_2\PROJECT.md
1. **Decompose**: Retain HydroPulse modular architecture (`core-dsp`, `backend-aws`, `web-console`, and E2E verification).
2. **Dispatch & Execute**:
   - M1: Verify `core-dsp` build, tests, and benchmark performance via Worker/Reviewer/Challenger/Auditor.
   - M2: Implement `backend-aws` cloud parity, Wazirabad scenario, API Gateway handler, and `< 200 ms` closed-loop latency assertions.
   - M3: Implement `web-console` SCADA Operator UI enhancements (spectrogram viewer, scenario switcher, valve actuator, radar HUD, audio player).
   - Gate & Acceptance Verification: Run `npm run build:all`, `npm test --prefix core-dsp`, `node backend-aws/dist/testIntegration.js`, and E2E suite.
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
4. **Succession**: At 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. M1: DSP Depth, Acoustic Robustness & Benchmarks [in-progress]
  2. M2: Backend Cloud Parity & Integration Latency [pending]
  3. M3: SCADA Operator UI Polish & Visualizers [pending]
  4. Final System Verification & Acceptance Gate [pending]
- **Current phase**: 2 (Dispatch & Execute)
- **Current focus**: Milestone 1 verification & gate

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore code directly — dispatch Explorers/Workers.
- File-editing tools only for metadata/state files (.md) in .agents/teamwork/.
- Forensic audit is a BINARY VETO — violation means failure, no exceptions.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 7d122209-75a5-47a6-9372-865b2f64d0e6
- Updated: not yet

## Key Decisions Made
- Inherit architectural specs and test readiness from orchestrator_1 (E2E suite 93/93 passing).
- Core-dsp code exists from worker_m1; dispatch worker to verify build/tests and finalize M1 handoff.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| worker_m1_verify | teamwork_preview_worker | M1 DSP Build & Benchmark Verification | killed (hung) | ded73a99-e951-4f9c-992d-a615fbafd8b3 |
| explorer_m1_r2_1 | teamwork_preview_explorer | M1 DSP Math & Peak Search Investigation | completed | c27d1be3-4b6f-44bc-b3ae-d9317f65af4e |
| explorer_m1_r2_2 | teamwork_preview_explorer | M1 Delta T & Sign Convention Investigation | completed | e1e17722-1fa6-401f-b0f9-cd0002c0177c |
| explorer_m1_r2_3 | teamwork_preview_explorer | M1 E2E Oracle & Parameter Parity Investigation | completed | f0e8bf9b-5ed3-4958-a11a-e679b39943c2 |
| worker_m1_r2 | teamwork_preview_worker | M1 Core-DSP Fixes & Benchmark Pass | errored (429 quota) | 03833063-b71b-421a-bccc-d9d188ca18e2 |
| worker_m1_r3 | teamwork_preview_worker | M1 Finalize Wazirabad 6dB & 80/80 Pass | in-progress | d633015f-5a58-4a5f-9767-15a76dfe3206 |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: d633015f-5a58-4a5f-9767-15a76dfe3206
- Predecessor: orchestrator_1
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: e3f3b750-9111-4327-b2ba-453ca90a75a3/task-38
- Safety timer: none

## Artifact Index
- d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- d:\STS\hydropulse\.agents\teamwork\orchestrator_1\PROJECT.md — Inherited project blueprint
- d:\STS\hydropulse\TEST_READY.md — E2E test suite readiness report
