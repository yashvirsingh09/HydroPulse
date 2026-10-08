# Dispatch: Explorer Survey 1 — core-dsp & Acoustic Robustness

## Objective
Thoroughly explore the `core-dsp` module in `d:\STS\hydropulse\core-dsp`, existing signal processing implementations, current test cases, pipe scenarios, STFT/spectrogram capability, noise rejection, and benchmarking to map requirements R1 and R3.

## Relevant Files & Context
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Working directory for your report: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1`
- Project root: `d:\STS\hydropulse`
- Target area: `core-dsp/`

## Scope Boundaries
- Read-only investigation. DO NOT modify any source code files.
- DO NOT run any destructive commands.
- Focus on `core-dsp` architecture, current state vs requirements R1 & R3, acceptance criteria:
  - STFT frequency spectrogram computation & export alongside time-domain waveforms
  - Delhi pipe network scenarios: Main Bawana Road, Rohini Sector 16 Feeder, Wazirabad Transmission Main (different diameters, materials, wave speeds)
  - Adaptive noise rejection (SNR down to 6 dB isolating rupture transients)
  - Sub-meter localization error (<= 1.5 m)
  - Benchmark test suite and structured accuracy metrics (mean, max, std dev, confidence score distribution)
  - `npm test --prefix core-dsp` and build status

## Output Requirements
- Write your comprehensive report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md`
- Write your handoff summary to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\handoff.md`
- Message the orchestrator via send_message when complete.


## 2026-10-06T19:25:36Z
Sender: 2affecc5-3f10-490f-9aea-88f44595959e
Content: Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Investigate the core-dsp module in d:\STS\hydropulse\core-dsp. Analyze current code, DSP algorithms, test cases, benchmarks, Delhi pipe scenarios, STFT/spectrogram capability, noise rejection, localization error.
Write your full findings to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md and handoff.md, then send a message to the orchestrator.
