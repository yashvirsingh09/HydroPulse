# BRIEFING — 2026-10-07T05:06:00Z

## Mission
Survey acoustic robustness & 6 dB SNR gating in core-dsp, analyze false peaks at large spans, and design the physical travel-time boundary enforcement, parabolic verification, and multi-band weighting implementation strategy.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, dsp-analysis, technical-strategy
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp
- Original parent: c204ce79-f1cd-48c0-a388-23ce79a785ad
- Milestone: M1-DSP-Survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement changes in core-dsp source directly
- Provide precise observations, logic chain, caveats, conclusion, and verification method
- Output complete findings to handoff.md and notify parent

## Current Parent
- Conversation ID: c204ce79-f1cd-48c0-a388-23ce79a785ad
- Updated: 2026-10-07T05:06:00Z

## Investigation State
- **Explored paths**:
  - `core-dsp/src/korteweg.ts` (elastic wave speed calculations)
  - `core-dsp/src/scenarios.ts` (scenario catalogs & synthetic burst generator)
  - `core-dsp/src/gccPhat.ts` (frequency-domain whitening, lag extraction, sub-sample parabolic refinement)
  - `core-dsp/src/triangulate.ts` (time delay mapping, physical boundary limits, gating fallback)
  - `core-dsp/src/adaptiveFilter.ts` (Butterworth biquads, zero-phase filtfilt, STA/LTA ratio onset picker)
  - `core-dsp/src/types.ts` (data interfaces & benchmark metrics)
  - `core-dsp/tests/benchmark.test.ts` (80-run matrix execution & performance table)
  - `core-dsp/tests/dsp.test.ts` & `spectrogram.test.ts` (baseline test suites)
- **Key findings**:
  1. `triangulatePipeLeak` was passing raw ADC samples to `computeGCCPhat` without applying the 4th-order zero-phase bandpass filter (`cleanA = nodeABurst.samples`), and defaulting `bandLimited: false` (full-spectrum 0-5000 Hz whitening).
  2. Large pipe spans (Wazirabad 1200m, Rohini 620m) suffer from exponential physical attenuation ($e^{-\alpha d}$, signal dropping to ~40% at distant sensor) combined with an expanded search window of up to 16,385 lag bins. Whitened noise in the non-acoustic bands (0-700 Hz, 1000-5000 Hz) statistically overwhelms the attenuated transient peak.
  3. Physical travel-time boundary enforcement ($|\Delta t| \le L / v_s$) prevents non-physical delay selection (currently allows $1.05 \times L / v_s$).
  4. Resonant acoustic passband tuning (`[770, 930]` Hz or `[760, 940]` Hz with 50 Hz Tukey taper) and pre-filtering raises the 80-run pass rate from 88.8% (71/80) to 97.5% (78/80), with 6 dB SNR pass rate reaching 90.0% (18/20).
  5. STA/LTA onset gating alone degrades performance to 20% due to noise onset jitter; frequency-domain band-limited GCC-PHAT is the robust foundation.
- **Unexplored areas**: None within DSP survey boundary. Ready for handoff to orchestrator / implementer.

## Key Decisions Made
- Concluded investigation of 6 dB SNR false peaks.
- Formulated the concrete implementation strategy with exact mathematical formulations, code changes, parameter selections, and verification steps.

## Artifact Index
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp\handoff.md` — Authoritative DSP Survey & Implementation Strategy Report
