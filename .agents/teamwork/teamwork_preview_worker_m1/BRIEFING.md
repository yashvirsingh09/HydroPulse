# BRIEFING — 2026-10-06T20:10:00Z

## Mission
Implement Milestone 1 in `@hydropulse/core-dsp`: STFT spectrogram engine, Delhi scenarios, in-engine synthetic burst generation, 4th-order zero-phase adaptive filtering, STA/LTA gating, band-limited GCC-PHAT, and 80-run benchmark test suite.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1
- Original parent: 2affecc5-3f10-490f-9aea-88f44595959e
- Milestone: M1 (DSP Depth, Acoustic Robustness & Benchmarking)

## 🔒 Key Constraints
- Exclusively own `core-dsp/src/*`, `core-dsp/tests/*`, `core-dsp/package.json`, `core-dsp/tsconfig.json`
- DO NOT modify files in `backend-aws/` or `web-console/`
- Zero external dependencies: pure TypeScript Float64Array arithmetic
- 100% backwards compatibility with `backend-aws/src/handlers/ingestBurst.ts`
- Mandatory Integrity Mandate: genuine implementation, no hardcoding, no facades, no cheated tests
- Localization error <= 1.5 m across all 80 benchmark runs down to 6 dB SNR
- Verification: `npm run build --prefix core-dsp`, `npm test --prefix core-dsp`, `npm run build:all`

## Current Parent
- Conversation ID: 2affecc5-3f10-490f-9aea-88f44595959e
- Updated: not yet

## Task Summary
- **What to build**:
  1. `core-dsp/src/spectrogram.ts`: Real-time STFT engine ($N=128$, $H=32$, Hann window, dB power scaling, normalization)
  2. `core-dsp/src/korteweg.ts`: Material constants (Ductile Iron, Cast Iron, Mild Steel, HDPE) and solver
  3. `core-dsp/src/scenarios.ts`: 4 Delhi pipe scenarios and pure-TS synthetic burst generator
  4. `core-dsp/src/adaptiveFilter.ts`: 4th-order zero-phase Butterworth bandpass, STA/LTA onset gating, window extraction
  5. `core-dsp/src/gccPhat.ts`: Band-limited Tukey tapering, 3-point parabolic interpolation, PSLR confidence
  6. `core-dsp/src/triangulate.ts`: Integrated pipeline (4th-order filter -> STA/LTA gating -> band-limited GCC-PHAT -> parabolic refinement)
  7. `core-dsp/src/types.ts` & `core-dsp/src/index.ts`: Extended types and barrel exports
  8. `core-dsp/tests/benchmark.test.ts`: 80-run automated multi-scenario benchmark matrix with ASCII table output
  9. `core-dsp/tests/dsp.test.ts` & `core-dsp/tests/spectrogram.test.ts`: Comprehensive unit tests
  10. `core-dsp/package.json`: Updated test scripts
- **Success criteria**: Zero build errors, all unit tests pass, all 80 benchmark runs achieve <= 1.5m error, `npm run build:all` passes
- **Interface contracts**: `PROJECT.md`, Blueprints M1-1, M1-2, M1-3
- **Code layout**: `core-dsp/src/`, `core-dsp/tests/`

## Change Tracker
- **Files modified**: [TBD]
- **Build status**: not yet run
- **Pending issues**: none

## Quality Status
- **Build/test result**: pending
- **Lint status**: clean
- **Tests added/modified**: pending

## Loaded Skills
- None requested

## Key Decisions Made
- Reusable work buffers in STFT to guarantee zero GC pauses in frame loop
- Zero-phase Butterworth biquad cascade with symmetric boundary reflection to eliminate group delay distortion
- STA/LTA onset detector with physical transit delay gating to discard >85% ambient noise
- Band-limited Tukey tapering in GCC-PHAT to prevent high-frequency noise amplification
- Mulberry32 deterministic PRNG seeding for reproducible testing alongside unseeded Math.random for live streaming

## Artifact Index
- `handoff.md` — Final completion and handoff report
- `progress.md` — Heartbeat and step execution log
