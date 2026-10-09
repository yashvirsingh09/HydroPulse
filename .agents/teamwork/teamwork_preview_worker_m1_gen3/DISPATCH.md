## 2026-10-07T05:15:00Z
Assignment: Milestone 1 — Repository Clutter Cleanup & Git Hygiene (R1)
Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_gen3
Project root: d:\STS\hydropulse
ORIGINAL_REQUEST: d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md
Survey Handoff: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_clutter\handoff.md

Scope & Tasks:
1. Read the survey handoff at `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_clutter\handoff.md`.
2. Purge the 76 identified scratch and diagnostic files:
   - 13 files in `core-dsp/`: `diagnose.mjs`, `eval_gcc_params.mjs`, `inspect_run2_peaks.mjs`, `inspect_waz_gcc.mjs`, `test_all_onsets.mjs`, `test_burst_peak.mjs`, `test_freq_sweep.mjs`, `test_improved_stalta.mjs`, `test_onset_strategy.mjs`, `test_stalta.mjs`, `test_template_gating.mjs`, `test_true_gating.mjs`, `test_waz_window.mjs`.
   - 34 files in `core-dsp/tests/`: all 34 `.mjs` scratch scripts listed in section 1.2 B of handoff.md.
   - 2 files in `physics-engine/`: `temp_burst.json` and `__pycache__/pipe_wave_synthesizer.cpython-312.pyc`.
   - 27 scratch script/data remnants in `.agents/teamwork/`:
     - 4 in `.agents/teamwork/teamwork_preview_explorer_m1_r2_1/`: `diagnostic.js`, `test_eval.js`, `test_solutions.js`, `test_wazirabad.js`.
     - 23 in `.agents/teamwork/teamwork_preview_explorer_survey_1/`: all `.mjs`, `.py`, and `.json` files listed in section 1.2 D of handoff.md.
   - CRITICAL: DO NOT DELETE `tests/e2e/` (it is the official 93-test acceptance suite) or `physics-engine/sample_burst_bawana.json` (authoritative test fixture).
3. Update `d:\STS\hydropulse\.gitignore` with the hardened rules from section 4.2 of handoff.md.
4. Stage all deletions and updates in git (`git add -u` and `git status`).
5. Run verification commands:
   - `npm run build:all` (must succeed with 0 errors)
   - `npm run test:dsp` (must succeed with 13/13 tests passing)
   - `npm run test:e2e` (must pass 93/93 tests)
   - `npm run test:backend` (must pass)
6. Write your comprehensive completion report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_worker_m1_gen3\handoff.md` and notify parent.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
