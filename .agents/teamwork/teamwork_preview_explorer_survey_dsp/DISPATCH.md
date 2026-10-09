## 2026-10-07T04:56:00Z
Assignment: Survey Acoustic Robustness & 6 dB SNR Gating
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp
Project root: d:\STS\hydropulse
ORIGINAL_REQUEST: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md

Task:
1. Read `core-dsp/src` (gccPhat.ts, triangulate.ts, adaptiveFilter.ts, scenarios.ts, korteweg.ts, etc.) and `core-dsp/tests` (benchmark.test.ts, dsp.test.ts).
2. Analyze the current GCC-PHAT cross-correlation and adaptive filtering pipeline.
3. Specifically investigate why large spans (Wazirabad 1200m, Rohini 620m) encounter acoustic false correlation peaks at 6 dB SNR.
4. Formulate the technical strategy for:
   - Physical travel-time boundary enforcement: |Δt| <= L / v_s (or bounds based on pipe length L and Korteweg wave speed v_s).
   - Parabolic peak verification and multi-band weighting to reject spurious noise correlation peaks.
   - Ensuring the 80-run benchmark test suite achieves >= 90% pass rate under severe 6 dB noise conditions.
5. Write your comprehensive report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp\handoff.md`.
