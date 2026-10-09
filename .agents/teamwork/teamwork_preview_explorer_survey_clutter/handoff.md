# Handoff Report: Repository Clutter & File Inventory Survey

**Agent**: `teamwork_preview_explorer_survey_clutter`  
**Working Directory**: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_clutter`  
**Date**: 2026-10-07  
**Mission**: Survey repository clutter, catalog all files, identify scratch/diagnostic scripts for purge under R1, delineate authoritative source/test suites, and specify `.gitignore` hardening rules.

---

## 1. Observation

### 1.1 Repository Structure & Module File Counts
An exhaustive directory survey of `d:\STS\hydropulse` revealed the following inventory across modules:

| Subdirectory | Total Files | Purpose / Category | Status |
| :--- | :---: | :--- | :--- |
| `root` | 5 | Configuration, metadata, scripts (`package.json`, `README.md`, `TEST_READY.md`, `start.bat`, `.gitignore`) | Authoritative |
| `core-dsp/src/` | 10 | TypeScript DSP algorithms (`fft.ts`, `korteweg.ts`, `spectrogram.ts`, `gccPhat.ts`, etc.) | Authoritative |
| `core-dsp/` (root) | 16 | Monorepo package config + **13 loose `.mjs` scratch scripts** | Cluttered (13 scratch scripts) |
| `core-dsp/tests/` | 37 | 3 official TypeScript test suites + **34 `.mjs` scratch scripts** | Cluttered (34 scratch scripts) |
| `physics-engine/` | 4 | Python wave synthesizer + 1 test fixture + **1 temp JSON** + **1 `.pyc` cache** | Cluttered (2 purge targets) |
| `backend-aws/src/` | 5 | AWS Lambda burst ingestion handler, DynamoDB store, alert service, server, integration test | Authoritative (Clean) |
| `web-console/src/` | 9 | React SCADA UI components, canvases, and views | Authoritative (Clean) |
| `tests/e2e/` | 10 | Authoritative 93-test multi-tier E2E acceptance suite (runner, 4 tiers, 5 helpers) | Authoritative (Must Keep) |
| `firmware/` | 5 | C reference headers and source for embedded acoustic node | Authoritative (Clean) |
| `docs/` | 2 | AWS deployment guide and Korteweg mathematical derivation docs | Authoritative (Clean) |
| `.agents/teamwork/` | 84+ | Agent collaboration metadata + **27 script/data remnants from prior runs** | Cluttered (27 scratch remnants) |

---

### 1.2 Identified Scratch & Diagnostic Files for Purge (Total: 76 Files)

All files listed below are currently tracked in git or present on the filesystem and qualify for purge under R1:

#### A. Core DSP Root Scratch Scripts (13 files in `core-dsp/`):
```text
core-dsp/diagnose.mjs
core-dsp/eval_gcc_params.mjs
core-dsp/inspect_run2_peaks.mjs
core-dsp/inspect_waz_gcc.mjs
core-dsp/test_all_onsets.mjs
core-dsp/test_burst_peak.mjs
core-dsp/test_freq_sweep.mjs
core-dsp/test_improved_stalta.mjs
core-dsp/test_onset_strategy.mjs
core-dsp/test_stalta.mjs
core-dsp/test_template_gating.mjs
core-dsp/test_true_gating.mjs
core-dsp/test_waz_window.mjs
```

#### B. Core DSP Tests Scratch Scripts (34 files in `core-dsp/tests/`):
```text
core-dsp/tests/check_ratio_time.mjs
core-dsp/tests/eval_strategies.mjs
core-dsp/tests/experiment.mjs
core-dsp/tests/inspect_conservation.mjs
core-dsp/tests/inspect_stft.mjs
core-dsp/tests/print_peaks.mjs
core-dsp/tests/test_acoustic_burst.mjs
core-dsp/tests/test_bench_debug.mjs
core-dsp/tests/test_bounded_xcorr.mjs
core-dsp/tests/test_candidate_gating.mjs
core-dsp/tests/test_candidate_xcorr.mjs
core-dsp/tests/test_common_window.mjs
core-dsp/tests/test_compare_fixture.mjs
core-dsp/tests/test_conservation.mjs
core-dsp/tests/test_energy_detect.mjs
core-dsp/tests/test_envelope_corr.mjs
core-dsp/tests/test_full_gcc.mjs
core-dsp/tests/test_gamma_phat.mjs
core-dsp/tests/test_inspect_onsets.mjs
core-dsp/tests/test_joint_metric.mjs
core-dsp/tests/test_kurtosis.mjs
core-dsp/tests/test_low_cutoff.mjs
core-dsp/tests/test_matched_loc.mjs
core-dsp/tests/test_max_seg_sweep.mjs
core-dsp/tests/test_narrow_passband.mjs
core-dsp/tests/test_peaks.mjs
core-dsp/tests/test_resonance.mjs
core-dsp/tests/test_resonant_sta.mjs
core-dsp/tests/test_rms.mjs
core-dsp/tests/test_spec_sub.mjs
core-dsp/tests/test_sta_sweep.mjs
core-dsp/tests/test_std_cc.mjs
core-dsp/tests/test_stft_peak.mjs
core-dsp/tests/test_windowed_xcorr.mjs
```

#### C. Physics Engine Temporary & Bytecode Files (2 files in `physics-engine/`):
```text
physics-engine/temp_burst.json
physics-engine/__pycache__/pipe_wave_synthesizer.cpython-312.pyc
```

#### D. Agent Scratch & Simulation Remnants (27 files in `.agents/teamwork/`):
```text
.agents/teamwork/teamwork_preview_explorer_m1_r2_1/diagnostic.js
.agents/teamwork/teamwork_preview_explorer_m1_r2_1/test_eval.js
.agents/teamwork/teamwork_preview_explorer_m1_r2_1/test_solutions.js
.agents/teamwork/teamwork_preview_explorer_m1_r2_1/test_wazirabad.js
.agents/teamwork/teamwork_preview_explorer_survey_1/analyze_dsp.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/burst_6db.json
.agents/teamwork/teamwork_preview_explorer_survey_1/check_6db.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/check_energy_windows.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/check_fixture.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/check_stats.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/find_all_peaks.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/generate_6db.py
.agents/teamwork/teamwork_preview_explorer_survey_1/inspect_gcc6.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/inspect_peaks.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/inspect_sim.py
.agents/teamwork/teamwork_preview_explorer_survey_1/test_adaptive_6db.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_adaptive_pipeline.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_bandpass_gcc.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_broadband.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_fft_filter.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_gated_gcc.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_gcc_alpha.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_numpy_corr.py
.agents/teamwork/teamwork_preview_explorer_survey_1/test_resonant_bandpass.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_scipy_butter.py
.agents/teamwork/teamwork_preview_explorer_survey_1/test_stalta.mjs
.agents/teamwork/teamwork_preview_explorer_survey_1/test_stalta2.mjs
```

---

### 1.3 Authoritative Source Modules and Official Test Suites (Must Be Kept)

1. **Official Monorepo Configuration & Scripts**:
   - `package.json`: Monorepo root runner (`build:all`, `test:dsp`, `test:backend`, `test:e2e`).
   - `start.bat`: SCADA demo launcher.
   - `README.md`: Submission documentation.
   - `TEST_READY.md`: Test matrix documentation.

2. **Official Core DSP Engine** (`core-dsp/`):
   - Config: `package.json`, `package-lock.json`, `tsconfig.json`
   - Source (`src/`):
     - `core-dsp/src/adaptiveFilter.ts`: LMS adaptive noise filter.
     - `core-dsp/src/bandpassFilter.ts`: 4th-order biquad IIR bandpass filter.
     - `core-dsp/src/fft.ts`: Radix-2 Cooley-Tukey butterfly FFT/IFFT.
     - `core-dsp/src/gccPhat.ts`: Generalized Cross-Correlation with Phase Transform.
     - `core-dsp/src/index.ts`: Package exports.
     - `core-dsp/src/korteweg.ts`: Korteweg acoustic wave speed solver.
     - `core-dsp/src/scenarios.ts`: 4 Delhi pipe profiles (Bawana, Rohini, Wazirabad, Okhla).
     - `core-dsp/src/spectrogram.ts`: STFT 2D frequency spectrogram engine with Hann window.
     - `core-dsp/src/triangulate.ts`: TDOA acoustic pipe rupture localization engine.
     - `core-dsp/src/types.ts`: Type definitions.
   - Official Test Suites (`core-dsp/tests/`):
     - `core-dsp/tests/dsp.test.ts`: 7 unit tests (Korteweg, synthetic bursts, FFT, STA/LTA, triangulation).
     - `core-dsp/tests/spectrogram.test.ts`: 5 unit tests (Hann window, Nyquist bins, rupture frequency isolation, power normalization).
     - `core-dsp/tests/benchmark.test.ts`: 80-run multi-scenario accuracy benchmark suite.

3. **Official Physics Engine & Fixtures** (`physics-engine/`):
   - `physics-engine/pipe_wave_synthesizer.py`: Synthetic pressure wave burst generator based on Joukowsky & Korteweg physics.
   - `physics-engine/sample_burst_bawana.json`: **Crucial authoritative test fixture** imported by `backend-aws/src/testIntegration.ts:16` and `core-dsp/tests/dsp.test.ts:124`.

4. **Official Backend AWS Service** (`backend-aws/`):
   - Config: `package.json`, `package-lock.json`, `tsconfig.json`
   - Source (`src/`):
     - `backend-aws/src/handlers/ingestBurst.ts`: Acoustic burst ingestion Lambda handler.
     - `backend-aws/src/services/alertService.ts`: SNS/alert dispatch service.
     - `backend-aws/src/services/dynamoService.ts`: In-memory and DynamoDB incident store.
     - `backend-aws/src/server.ts`: Local SCADA HTTP API backend server.
     - `backend-aws/src/testIntegration.ts`: Closed-loop verification test (`npm run test:backend`).

5. **Official Web SCADA Console** (`web-console/`):
   - Config: `index.html`, `package.json`, `package-lock.json`, `postcss.config.js`, `tailwind.config.js`, `tsconfig.json`, `vite.config.ts`
   - Source (`src/`):
     - `web-console/src/App.tsx`: Master SCADA dashboard.
     - `web-console/src/index.css`: Tailwind styling.
     - `web-console/src/main.tsx`: Entry point.
     - `web-console/src/components/ActuatorPanel.tsx`: Autonomous PRV valve throttle UI.
     - `web-console/src/components/CorrelationChart.tsx`: Real-time GCC-PHAT peak visualizer.
     - `web-console/src/components/IncidentHistory.tsx`: DynamoDB incident history log.
     - `web-console/src/components/PipeMap.tsx`: Delhi GIS pipe vector map.
     - `web-console/src/components/SpectrogramViewer.tsx`: STFT 2D frequency spectrogram canvas.
     - `web-console/src/components/WaveformViewer.tsx`: Dual-channel acoustic hydrophone waveform canvas.

6. **Official E2E Acceptance Test Suite** (`tests/e2e/`):
   - `tests/e2e/run_e2e_tests.mjs`: Test runner harness.
   - `tests/e2e/tier1_feature_coverage.mjs`: 40 functional feature tests (F1–F8).
   - `tests/e2e/tier2_boundary_cases.mjs`: 40 boundary value analysis tests.
   - `tests/e2e/tier3_pairwise_combinations.mjs`: 8 cross-feature combinatorial workflow tests.
   - `tests/e2e/tier4_real_world_scenarios.mjs`: 5 full Delhi rupture incident simulations.
   - Helpers: `helpers/backend_bridge.mjs`, `helpers/burst_generator.mjs`, `helpers/dsp_oracle.mjs`, `helpers/scenarios_catalog.mjs`, `helpers/test_context.mjs`.

7. **Official Embedded Firmware Reference** (`firmware/`):
   - `firmware/README.md`, `firmware/include/dsp_filter.h`, `firmware/include/sensor_node.h`, `firmware/src/dsp_filter.c`, `firmware/src/sensor_node.c`.

8. **Official Architecture Documentation** (`docs/`):
   - `docs/AWS_DEPLOYMENT.md`, `docs/MATHEMATICAL_MODEL.md`.

---

### 1.4 Current `.gitignore` Audit
Current content of `d:\STS\hydropulse\.gitignore` (14 lines):
```gitignore
# Node & build artifacts
node_modules/
dist/
build/
*.log

# Environment variables
.env
.env.local

# OS files
Thumbs.db
.DS_Store
```

Missing rules identified:
1. Python bytecode & virtual environments: `__pycache__/`, `*.py[cod]`, `.venv/`
2. AWS SAM deployment & local build artifacts: `.aws-sam/`, `samconfig.toml.local`
3. Test scratch fixtures & temp dumps: `temp_*.json`, `*.tmp`, `*.temp`, `temp/`, `tmp/`
4. Code coverage & test caches: `coverage/`, `*.lcov`, `.nyc_output/`
5. Tool / bundler caches: `.vite/`, `.eslintcache`, `*.tsbuildinfo`

---

## 2. Logic Chain

1. **Distinction between Scratch Scripts and Official Tests**:
   - `core-dsp/package.json` line 11 specifies: `"test": "node --test dist/tests/dsp.test.js dist/tests/spectrogram.test.js dist/tests/benchmark.test.js"`.
   - None of the 47 `.mjs` scripts in `core-dsp/` or `core-dsp/tests/` are invoked by any npm script or imported by any source module (confirmed via grep search).
   - Conversely, `package.json` line 9 specifies `"test:e2e": "node tests/e2e/run_e2e_tests.mjs"`. `tests/e2e/` is an official, structured test harness containing 93 active tests. Therefore, `tests/e2e/` must be retained while `core-dsp/*.mjs` and `core-dsp/tests/*.mjs` must be purged.

2. **Distinction between Test Fixtures and Temporary Dumps**:
   - `grep_search` for `sample_burst_bawana.json` showed direct imports in `backend-aws/src/testIntegration.ts:16` and `core-dsp/tests/dsp.test.ts:124`. Deleting this file would immediately break both test suites.
   - `grep_search` for `temp_burst.json` revealed 0 references across the entire codebase. It was generated as an ad-hoc synthesis output. Under R1 ("physics-engine/temp_*.json"), it must be purged.

3. **Bytecode and Scratch Leakage in Git**:
   - `git ls-files` showed `physics-engine/__pycache__/pipe_wave_synthesizer.cpython-312.pyc` is actively tracked in git. Python bytecode should never be committed to source control.
   - 27 scratch `.js`, `.mjs`, `.py`, and `.json` files in `.agents/teamwork/` were committed during exploratory cycles, violating the teamwork rule that `.agents/teamwork` should only hold metadata (`*.md`).

4. **Repository Integrity Verification**:
   - Executed `npm run build:all`: Completed with 0 errors across `core-dsp`, `backend-aws`, and `web-console`.
   - Executed `npm run test:e2e`: Passed 93/93 tests in 716 ms.
   - Executed `npm run test:dsp`: Passed 13/13 tests across all 3 suites.
   - Executed `npm run test:backend`: Passed closed-loop integration test in < 50 ms.
   - Purging the 76 scratch files will have zero negative effect on any build or test pipeline.

---

## 3. Caveats

1. **Preservation of `tests/e2e/*.mjs`**: Even though these files share the `.mjs` extension with the scratch scripts in `core-dsp`, they constitute the core 93-test acceptance suite. The cleanup worker must NOT run blanket wildcards like `rm -rf **/*.mjs`.
2. **Preservation of `sample_burst_bawana.json`**: Only `temp_burst.json` (and any other `temp_*.json`) should be removed from `physics-engine/`.
3. **Agent Metadata Preservation**: While scratch scripts (`*.js`, `*.mjs`, `*.py`, `*.json`) in `.agents/teamwork/` should be purged, agent markdown files (`BRIEFING.md`, `progress.md`, `handoff.md`, `DISPATCH.md`, `ORIGINAL_REQUEST.md`) must be preserved.

---

## 4. Conclusion & Actionable Cleanup Recommendations

### 4.1 Action Items for Cleanup Worker

1. **Delete all 47 loose scratch `.mjs` scripts in `core-dsp`**:
   - 13 files in `core-dsp/`
   - 34 files in `core-dsp/tests/`
2. **Delete scratch fixture and compiled cache in `physics-engine`**:
   - `physics-engine/temp_burst.json`
   - `physics-engine/__pycache__/pipe_wave_synthesizer.cpython-312.pyc`
3. **Delete 27 scratch script/data remnants in `.agents/teamwork`**:
   - 4 files in `.agents/teamwork/teamwork_preview_explorer_m1_r2_1/`
   - 23 files in `.agents/teamwork/teamwork_preview_explorer_survey_1/`
4. **Update `.gitignore`** with the hardened rule set below.
5. **Stage git removals** (`git rm` or `git add -u`) to reflect clean monorepo status.

### 4.2 Proposed `.gitignore` Content
```gitignore
# Node & build artifacts
node_modules/
dist/
build/
*.log

# Environment variables
.env
.env.local

# OS files
Thumbs.db
.DS_Store

# Python bytecode & virtual environments
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
env/

# AWS SAM & Serverless build artifacts
.aws-sam/
samconfig.toml.local

# Temporary / Scratch test fixtures & data
temp_*.json
*.tmp
*.temp
temp/
tmp/

# Coverage & testing caches
coverage/
*.lcov
.nyc_output/

# Bundler & tool caches
.vite/
.eslintcache
*.tsbuildinfo
```

---

## 5. Verification Method

To independently verify the cleanliness and integrity after executing the cleanup:

1. **Verify No Scratch Files Remain**:
   ```bash
   git ls-files "core-dsp/*.mjs" "core-dsp/tests/*.mjs" "physics-engine/temp_*.json"
   ```
   *Expected Output*: Empty (0 lines).

2. **Verify No Tracked Bytecode Remains**:
   ```bash
   git ls-files "*__pycache__*" "*.pyc"
   ```
   *Expected Output*: Empty (0 lines).

3. **Verify Build System**:
   ```bash
   npm run build:all
   ```
   *Expected Output*: 0 TypeScript errors, bundle completed in `core-dsp`, `backend-aws`, and `web-console`.

4. **Verify DSP Test Suites**:
   ```bash
   npm run test:dsp
   ```
   *Expected Output*: 13 tests passing across `dsp.test.ts`, `spectrogram.test.ts`, and `benchmark.test.ts`.

5. **Verify AWS Backend Integration**:
   ```bash
   npm run test:backend
   ```
   *Expected Output*: Closed-loop burst ingestion and PRV actuation succeed in < 50 ms.

6. **Verify E2E Acceptance Suite**:
   ```bash
   npm run test:e2e
   ```
   *Expected Output*: 93/93 validations pass across all 4 tiers.
