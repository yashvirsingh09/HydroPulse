# Handoff Report: Explorer M1-1 (STFT Spectrogram Engine Blueprint)

**Agent**: `teamwork_preview_explorer_m1_1`  
**Milestone**: M1 (DSP Depth & Acoustic Robustness)  
**Parent Orchestrator**: `2affecc5-3f10-490f-9aea-88f44595959e`  
**Handoff Type**: Hard (Task Complete)  
**Timestamp**: 2026-10-06T19:48:00Z  

---

## 1. Observation

1. **Missing STFT Capability in `core-dsp`**:
   - `core-dsp/src/index.ts` lines 6–11 exports:
     ```typescript
     export * from './types.js';
     export * from './korteweg.js';
     export * from './fft.js';
     export * from './bandpassFilter.js';
     export * from './gccPhat.js';
     export * from './triangulate.js';
     ```
     There is currently no windowing function (Hann/Hamming), no sliding frame mechanism, and no spectrogram module.
   - `core-dsp/src/types.ts` defines `PipeParameters`, `AcousticBurst`, `GCCPhatResult`, and `LocalizationResult`, but does not declare `SpectrogramData` or `STFTOptions`.

2. **Existing FFT Infrastructure**:
   - `core-dsp/src/fft.ts` lines 8–12, 17–23, 55–59 exports:
     - `export interface ComplexArray { real: Float64Array; imag: Float64Array; size: number; }`
     - `export function nextPowerOfTwo(n: number): number`
     - `export function fft(real: Float64Array, imag: Float64Array, inverse: boolean = false): void`
     - In-place Radix-2 Cooley-Tukey FFT with butterfly twiddles. It strictly requires power-of-two length (`(n & (n - 1)) !== 0` throws error).

3. **Baseline Build & Test Status**:
   - Command `npm test --prefix core-dsp` output:
     ```
     > @hydropulse/core-dsp@1.0.0 test
     > node --test dist/tests/dsp.test.js

     --- HydroPulse Verification Results ---
     Ground Truth Leak Position : 185 m
     Estimated Leak Position    : 185.57 m
     Wave Speed                 : 1258.1 m/s
     Extracted Time Delay Δt    : 102.4193 ms
     Localization Error         : 0.57 m
     Confidence Score           : 95.7%
     ---------------------------------------

     ✔ HydroPulse DSP Core Engine Verification (18.887ms)
     ℹ tests 3, suites 1, pass 3, fail 0
     ```

4. **Interface Contract Specifications**:
   - In `orchestrator_1/PROJECT.md` lines 40–41:
     - `SpectrogramData`: `{ timeBins: number[], freqBins: number[], powerMatrixDb: number[][] }`
     - `computeSTFT(samples: Float64Array | number[], sampleRateHz: number, windowSize?: number, hopSize?: number): SpectrogramData`
   - In `teamwork_preview_explorer_m1_1/DISPATCH.md` lines 14–17:
     - "Design STFT parameters: frame size $N=128$, hop size $H=32$ (75% overlap), Hann windowing function, log-magnitude (dB) power scaling normalized to [0, 1] or dB floor."
     - "Define export data structure: `SpectrogramData` { timeBins: number[], freqBins: number[], powerMatrixDb: number[][] }."
     - "Address zero-dependency requirements (pure TypeScript, Float64Array)."

5. **Empirical Prototype Benchmarking**:
   - Prototype tested on Node.js v24.16.0 with a 1.0 s burst signal (10,000 samples, $f_s = 10,000\text{ Hz}$):
     - Frames generated: 309 frames.
     - Number of frequency bins: 65 bins ($0\text{ to } 5000\text{ Hz}$).
     - Injected $850\text{ Hz}$ rupture tone was isolated at frequency bin 11 ($859.38\text{ Hz}$).
     - Peak transient arrival timestamp identified at $0.0352\text{ s}$ (injected at $0.0350\text{ s}$).
     - Execution time measured across 10 iterations: **1.80 ms average per 1-second record** ($555\times$ faster than real-time).
     - Buffer allocation: Reusable `realBuf` and `imagBuf` yielded zero intermediate GC allocations.

---

## 2. Logic Chain

1. **Window Size Selection ($N=128$)**:
   - From Observation 4, DISPATCH specifies $N=128$.
   - At $f_s = 10,000\text{ Hz}$, window duration is $T_w = 128 / 10000 = 12.8\text{ ms}$.
   - The primary rupture resonance is centered at $\approx 850\text{ Hz}$ (period $\tau \approx 1.18\text{ ms}$). A $12.8\text{ ms}$ window contains $\approx 10.8$ complete oscillation cycles, providing adequate frequency resolution ($\Delta f = 78.125\text{ Hz}$) to separate the $850\text{ Hz}$ peak from low-frequency traffic noise ($< 60\text{ Hz}$).
   - Furthermore, $N=128 = 2^7$ satisfies Observation 2's power-of-two requirement for `core-dsp/src/fft.ts`.

2. **Hop Size & Overlap Selection ($H=32$)**:
   - From Observation 4, DISPATCH specifies $H=32$ (75% overlap).
   - Stride interval is $\Delta t_{hop} = 32 / 10000 = 3.2\text{ ms}$ ($312.5\text{ fps}$).
   - Rapid pipe rupture transients have wavefront rise times of $3 - 5\text{ ms}$. A $3.2\text{ ms}$ hop guarantees that transient arrival timestamps are detected within $\pm 3.2\text{ ms}$ of arrival, as validated in Observation 5.

3. **Windowing Function (Hann)**:
   - Rectangular framing causes high spectral leakage (side-lobe $-13.3\text{ dB}$).
   - Precomputing symmetric Hann coefficients $w[n] = 0.5 (1 - \cos(2\pi n / (N - 1)))$ reduces side-lobes to $-31.5\text{ dB}$ with $-18\text{ dB/octave}$ roll-off.
   - Preallocating `Float64Array(N)` avoids redundant trigonometric calls in the sliding frame loop.

4. **Matrix Dimensions & Orientation**:
   - For a real signal of length $N$, conjugate symmetry produces $(N / 2) + 1 = 65$ unique frequency bins ($0\text{ Hz}$ DC to $5000\text{ Hz}$ Nyquist).
   - Organizing `powerMatrixDb` as `[timeIndex][freqBinIndex]` (size $K \times 65$) aligns directly with HTML5 Canvas visualizer rendering (`SpectrogramViewer.tsx` in M3), where each horizontal pixel column accesses one frame array.

5. **Log-Magnitude Decibel Scaling**:
   - Acoustic transient energy spans multiple orders of magnitude.
   - Calculating $P_{dB} = 10 \log_{10}(|X|^2 + \epsilon)$ prevents dynamic range crushing.
   - Optional normalization via `normalizePowerMatrix` maps $[P_{max} - 80\text{ dB}, P_{max}]$ to $[0.0, 1.0]$, providing instant Turbo colormap indexing for the SCADA canvas.

---

## 3. Caveats

1. **Downsampling & Oversized Windows**:
   - If an operator requests an arbitrary window size (e.g., $N=100$), `nextPowerOfTwo(N)` automatically rounds up to $128$.
2. **Short Audio Signals ($L < 128$)**:
   - If input length is less than $N=128$, the blueprint zero-pads to 128 samples to output a valid single frame rather than throwing an exception. Empty signals ($L = 0$) return empty arrays.
3. **Web Audio Colormap in Browser**:
   - This blueprint governs the core DSP computation in `core-dsp`. The visualizer component in `web-console` (`SpectrogramViewer.tsx`) will be implemented in Milestone M3 (Feature F7), consuming the `SpectrogramData` produced by this engine.

---

## 4. Conclusion

The STFT spectrogram engine blueprint is completely specified, mathematically verified, empirically benchmarked, and ready for immediate drop-in implementation by the implementer agent.

**Core Artifacts Produced**:
- Full blueprint and specification report: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_1\report.md`
- Target implementation files:
  1. `core-dsp/src/spectrogram.ts` (New module containing `computeSTFT`, `computeSpectrogram`, `createHannWindow`, `calculateFrequencyBins`, `normalizePowerMatrix`)
  2. `core-dsp/src/types.ts` (Adding `SpectrogramData` and `STFTOptions`)
  3. `core-dsp/src/index.ts` (Exporting `spectrogram.js`)
  4. `core-dsp/tests/dsp.test.ts` or `spectrogram.test.ts` (Adding unit tests)

---

## 5. Verification Method

To verify the implementation once applied:
1. **Compilation Check**:
   ```powershell
   npm run build --prefix core-dsp
   ```
   Must exit with code 0 and generate `dist/src/spectrogram.js` and `dist/src/spectrogram.d.ts`.
2. **Automated Unit Tests**:
   ```powershell
   npm test --prefix core-dsp
   ```
   Must pass all tests, verifying:
   - Hann window symmetry and boundary zeroes.
   - Frequency bin step ($78.13\text{ Hz}$, $0\text{ to } 5000\text{ Hz}$).
   - Dominant frequency extraction on 850 Hz test burst (extracting $859.38\text{ Hz}$).
   - Decibel normalization ($[0.0, 1.0]$ bounds).
3. **End-to-End Build**:
   ```powershell
   npm run build:all
   ```
   Must build cleanly across all packages without TypeScript or bundling errors.
