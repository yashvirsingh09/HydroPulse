# BRIEFING — 2026-10-06T20:07:00Z

## Mission
Formulate exact implementation blueprint for core-dsp/src/adaptiveFilter.ts (STA/LTA transient gating, 4th-order zero-phase bandpass, band-limited GCC-PHAT in gccPhat.ts) to guarantee <= 1.5 m error at 6 dB SNR, and design the 80-run benchmark in core-dsp/tests/benchmark.test.ts.

## 🔒 My Identity
- Archetype: explorer
- Roles: signal processing architecture, acoustic noise rejection, benchmark harness designer
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3
- Original parent: 2affecc5-3f10-490f-9aea-88f44595959e
- Milestone: M1

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code files in core-dsp directly.
- Mathematical formulation must guarantee <= 1.5 m localization error down to 6 dB SNR.
- Benchmark suite must specify an 80-run automated harness across all Delhi scenarios and SNR levels (24, 18, 12, 6 dB) in core-dsp/tests/benchmark.test.ts.
- Deliverables: report.md, handoff.md, and send_message notification to orchestrator.

## Current Parent
- Conversation ID: 2affecc5-3f10-490f-9aea-88f44595959e
- Updated: 2026-10-06T19:42:50Z

## Investigation State
- **Explored paths**:
  - `core-dsp/src/gccPhat.ts`
  - `core-dsp/src/triangulate.ts`
  - `core-dsp/src/bandpassFilter.ts`
  - `core-dsp/src/types.ts`
  - `core-dsp/src/korteweg.ts`
  - `core-dsp/src/fft.ts`
  - `core-dsp/tests/dsp.test.ts`
  - `physics-engine/pipe_wave_synthesizer.py`
  - `teamwork_preview_explorer_m1_2/report.md` & `handoff.md` (scenario catalog and burst generator)
  - Survey 1 Report and test scripts (`test_stalta2.mjs`, `burst_6db.json`, `test_adaptive_6db.mjs`)
- **Key findings**:
  - Baseline GCC-PHAT fails at 6 dB SNR (85.35 m to 207 m error) due to full-spectrum whitening un-attenuating 15,000 noise bins to magnitude 1.0, 2nd-order biquad ringing at 850 Hz, and 97.5% noise buffer dominance.
  - Formulated 4-tier pipeline:
    1. 4th-order zero-phase Butterworth bandpass filter (300–2200 Hz, -24 dB/oct rolloff, zero group delay, reflection padding).
    2. Dual-window STA/LTA transient onset detector (STA 50 samples / 5ms, LTA 400 samples / 40ms) with physical delay bounds $|\tau| \le 1.05 \cdot (L/v_s)$ and 1024-sample window gating.
    3. Band-Limited GCC-PHAT cross-spectral weighting with smooth Tukey tapers zeroing out stopbands.
    4. 3-point parabolic peak interpolation with PSLR confidence scoring.
  - Formulated 80-run multi-scenario automated benchmark in `core-dsp/tests/benchmark.test.ts` (4 scenarios $\times$ 4 SNR levels $\times$ 5 seeded runs), asserting error $\le 1.5$ m and outputting ASCII metrics table.
- **Unexplored areas**: None. All mathematical formulations and source file blueprints are complete and documented.

## Key Decisions Made
- Fully specified `adaptiveFilter.ts` with `zeroPhaseBandpass`, `computeSTALTA`, and `extractGatedWindow`.
- Enhanced `gccPhat.ts` with `options?: GCCPhatOptions` for band-limited Tukey tapering while preserving 100% backwards compatibility.
- Designed `triangulatePipeLeak` in `triangulate.ts` to seamlessly integrate adaptive filtering and gating.
- Designed `benchmark.test.ts` with Node native test runner and structured ASCII table formatting.

## Artifact Index
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\DISPATCH.md` — Task dispatch instructions
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\BRIEFING.md` — Persistent situational awareness
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\progress.md` — Liveness heartbeat
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\report.md` — Complete implementation blueprint and mathematical formulation
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_3\handoff.md` — Hard handoff report (5 components)
