# Dispatch: Explorer M1-1 — STFT Spectrogram Engine for core-dsp

## Objective
Design the concrete implementation blueprint for the real-time Short-Time Fourier Transform (STFT) frequency spectrogram engine in `core-dsp/src/spectrogram.ts` and its integration with `core-dsp/src/types.ts` and `core-dsp/src/index.ts`.

## Inputs & Context
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Plan: `d:\STS\hydropulse\.agents\teamwork\orchestrator_1\PROJECT.md`
- Survey 1 Report: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md`
- Existing FFT: `core-dsp/src/fft.ts`
- Working Directory: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1`

## Scope Boundaries
- Read-only exploration. DO NOT modify source files.
- Design STFT parameters: frame size $N=128$, hop size $H=32$ (75% overlap), Hann windowing function, log-magnitude (dB) power scaling normalized to [0, 1] or dB floor.
- Define export data structure: `SpectrogramData` { timeBins: number[], freqBins: number[], powerMatrixDb: number[][] }.
- Address zero-dependency requirements (pure TypeScript, Float64Array).

## Deliverables
- Write detailed report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\report.md`
- Write handoff to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\handoff.md`
- Message the orchestrator via send_message when complete.

## 2026-10-06T19:42:50Z
Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Formulate exact implementation blueprint for core-dsp/src/spectrogram.ts (STFT engine, Hann window, log-power scaling, SpectrogramData types, export definitions).
Write your findings to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\report.md and handoff.md, then send a message to the orchestrator.
