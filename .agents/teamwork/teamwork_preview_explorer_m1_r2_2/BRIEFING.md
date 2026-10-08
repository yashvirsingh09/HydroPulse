# BRIEFING — 2026-10-06T21:30:00Z

## Mission
Investigate Milestone 1 (core-dsp) signal generation vs localization consistency (Delta T definitions, Korteweg speed, triangulation formula, zero-time references).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_2
- Original parent: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Milestone: Milestone 1 (core-dsp)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Investigation scope: Milestone 1 (core-dsp) signal generation vs localization consistency

## Current Parent
- Conversation ID: e3f3b750-9111-4327-b2ba-453ca90a75a3
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `core-dsp/src/scenarios.ts`: Burst synthesis, delays, and Delta T calculation
  - `core-dsp/src/triangulate.ts`: Triangulation pipeline, gating, and formula
  - `core-dsp/src/gccPhat.ts`: Cross-spectral density, lag extraction, and PHAT weighting
  - `core-dsp/src/adaptiveFilter.ts`: 4th-order biquad filter and STA/LTA onset picking
  - `core-dsp/src/korteweg.ts`: Fluid-elastic Korteweg wave speed solver
  - `core-dsp/tests/benchmark.test.ts`: Automated 80-run benchmark test suite
  - `physics-engine/pipe_wave_synthesizer.py` & `sample_burst_bawana.json`
- **Key findings**:
  - Convention: Both `scenarios.ts` and `triangulate.ts` define Delta T as `(t_b - t_a)` where `t_a < t_b` yields positive Delta T. Triangulation formula `x = (L - v * deltaT) / 2` is mathematically exact for this convention.
  - Zero-time reference `t_0 = 0.05s` cancels out in differential TDOA and matches physically.
  - Korteweg wave speeds calculated in `korteweg.ts` match nominal scenario specifications exactly.
  - Root cause of benchmark 30.6m failure on Run 1: `triangulate.ts` line 53 sets `maxSegmentDelaySec = (winLen / 2) / fs = 102.4 ms` for onset-aligned gated frames, allowing GCC-PHAT to pick spurious side lobes at lag 488 samples instead of true lag 3.35 samples.
  - Secondary issue: `scenarios.ts` has a step discontinuity at `t < t0` (`if (t < t0) continue;`) causing Gibbs oscillations.
  - Tertiary issue: `computeSTALTA` sorts peaks by ratio descending, picking late noise spikes over first chronological onsets at lower SNRs.
- **Unexplored areas**: None. Complete evidence chain established.

## Key Decisions Made
- Formulated concrete fix recommendations for `triangulate.ts`, `scenarios.ts`, and `adaptiveFilter.ts`.
- Compiling complete 5-section handoff report in `handoff.md`.

## Artifact Index
- DISPATCH.md — Dispatch log
- BRIEFING.md — Persistent context & situational awareness
- progress.md — Liveness heartbeat
- handoff.md — Final investigation report
