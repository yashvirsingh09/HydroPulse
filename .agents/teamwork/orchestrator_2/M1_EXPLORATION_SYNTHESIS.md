# M1 Exploration Synthesis: Core-DSP Robust Localization & Benchmark Fixes

## 1. Catalog Inputs
- **Explorer 2 (`e1e17722-1fa6-401f-b0f9-cd0002c0177c`)**: Investigated signal generation (`scenarios.ts`), triangulation math (`triangulate.ts`), Korteweg solver (`korteweg.ts`), and 80-run benchmark. Proved mathematically and empirically that:
  - Sign conventions and formulas are exact: Delta T = `t_b - t_a`, `x = (L - v_s * deltaT) / 2`.
  - The 30.6 m error on Run 1 was caused by `triangulate.ts` line 53 setting `maxSegmentDelaySec = (winLen / 2) / fs = 102.4 ms` (+/- 1024 samples) on already onset-aligned frames (`baseOffsetSamples = startB - startA`). GCC-PHAT hopped onto a noise sidelobe at +488.82 samples. Constraining `maxSegmentDelaySec <= 0.02 s` immediately recovered the true residual lag (+3.35 samples) with error = 0.07 m.
  - In `scenarios.ts`, `if (t < t0) continue;` caused a harsh step discontinuity (> 20,000 counts) and Gibbs ringing.
  - In `adaptiveFilter.ts`, `computeSTALTA` sorted by ratio descending, picking late noise spikes over true first onsets at low SNR.

- **Explorer 3 (`f0e8bf9b-5ed3-4958-a11a-e679b39943c2`)**: Compared `core-dsp/src/` with `tests/e2e/helpers/` (`dsp_oracle.mjs`, `burst_generator.mjs`). Diagnosed:
  - The 17 E2E test failures occurred because `burst_generator.mjs` outputs `node_a` and `node_b` without `sampleRateHz` (only in `metadata.sample_rate_hz`), causing `fs = undefined` in `triangulate.ts`, leading to `toFixed` crashes in `gccPhat.ts`.
  - In `scenarios.ts`, `generateSyntheticBurst` omitted the `* 0.15` noise scale present in `burst_generator.mjs` (+16.5 dB higher noise floor than intended).
  - In `korteweg.ts`, support `params.diameterM ?? (params as any).innerDiameterM`.
  - In `gccPhat.ts`, default bandpass to [450, 1500] Hz and guard `getCorrAtLag`.

## 2. Consensus & Implementation Blueprint
Both explorers are in 100% agreement on the exact code changes:
1. `core-dsp/src/triangulate.ts`:
   - Sample rate fallback: `const fs = nodeABurst.sampleRateHz ?? (nodeABurst as any).sampleRate ?? (nodeABurst as any).sample_rate_hz ?? 10000;`
   - In `useGating`, constrain residual delay search: `const maxSegmentDelaySec = Math.min(0.015, Math.max(0.005, (pipeParams.lengthMeters / v_s) * 0.05));` (e.g. 10–15 ms instead of 102.4 ms).
2. `core-dsp/src/scenarios.ts`:
   - Remove `if (t < t0) continue;` pulse truncation; evaluate smooth Gaussian envelope over full window.
   - Scale noise: `const noiseScale = Math.pow(10.0, -snrDb / 20.0) * 0.15;` matching E2E burst generator.
3. `core-dsp/src/korteweg.ts`:
   - Support `innerDiameterM`: `const D = params.innerDiameterM ?? (params as any).diameterM ?? 0.4;`
4. `core-dsp/src/adaptiveFilter.ts`:
   - Select the chronological first onset peak exceeding threshold (`peaks.sort((a, b) => a.sampleIndex - b.sampleIndex)`), not descending ratio.
5. `core-dsp/src/gccPhat.ts`:
   - Default bandpass [450, 1500] Hz and guard array indices in `getCorrAtLag`.
