# Handoff Report: Milestone 1 (`core-dsp`) Signal Generation vs Localization Consistency

**Working Directory**: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_r2_2`  
**Target Milestone**: Milestone 1 (`core-dsp`)  
**Investigator**: `teamwork_preview_explorer_m1_r2_2`  
**Date**: 2026-10-06  

---

## 1. Observation

### 1.1 Verbatim Benchmark Failure in `benchmark.test.ts`
When running `npm test --prefix core-dsp`, 12 tests pass and 1 fails:
```text
> node --test dist/tests/dsp.test.js dist/tests/spectrogram.test.js dist/tests/benchmark.test.js

▶ HydroPulse 80-Run Multi-Scenario Acoustic Benchmark Suite
  ✖ evaluates 80 runs across all 4 Delhi scenarios and SNRs down to 6 dB (<= 1.5m error) (27.5237ms)
✖ failing tests:
test at dist\tests\benchmark.test.js:10:5
✖ evaluates 80 runs across all 4 Delhi scenarios and SNRs down to 6 dB (<= 1.5m error) (27.5237ms)
  AssertionError [ERR_ASSERTION]: Run failed: Scenario DEL-BAWANA-01 at 24 dB (Run 1) produced error 30.6m > 1.5m
      at TestContext.<anonymous> (file:///D:/STS/hydropulse/core-dsp/dist/tests/benchmark.test.js:50:28)
```
- Benchmark Run 1 (Bawana, 24 dB SNR, seed 101):
  - Ground Truth Leak Position: `185.0 m`
  - Estimated Position: `154.4 m`
  - Localization Error: `30.6 m`
  - True $\Delta t$: `103.3304 ms`
  - Triangulation Extracted $\Delta t$: `151.982 ms` (discrepancy of `+48.65 ms`).

### 1.2 Delay Calculation and $\Delta T$ Definition in `scenarios.ts`
File: `core-dsp/src/scenarios.ts`, lines 191–197 & 314–315:
```typescript
191:   // Physical Time Delays
192:   const delaySecA = leakDistA / v_s;
193:   const delaySecB = leakDistB / v_s;
194:   const deltaTTrueSec = delaySecB - delaySecA;
195:   const shiftA = Math.round(delaySecA * fs);
196:   const shiftB = Math.round(delaySecB * fs);
...
314:   ground_truth_leak_m: Number(leakDistA.toFixed(2)),
315:   ground_truth_delta_t_ms: Number((deltaTTrueSec * 1000.0).toFixed(4)),
```
- Observation: Line 194 explicitly defines `deltaTTrueSec = delaySecB - delaySecA` ($t_b - t_a$). When the rupture is located closer to Node A ($185 \text{ m} < 315 \text{ m}$), $t_a < t_b$, so `deltaTTrueSec` is **positive** ($+103.3304 \text{ ms}$).

### 1.3 Triangulation Formula and Delay Definition in `triangulate.ts`
File: `core-dsp/src/triangulate.ts`, lines 92–98:
```typescript
92:   // Rupture Triangulation formula:
93:   // If burst reaches Node A first (leak closer to Node A): t1 < t2 => delta_t = t2 - t1 > 0
94:   // x_from_A = (L - v_s * delta_t) / 2
95:   let estimatedLeakDistanceM = (L - v_s * deltaTSeconds) / 2.0;
96: 
97:   // Constrain within physical pipe bounds
98:   estimatedLeakDistanceM = Math.max(0.0, Math.min(L, estimatedLeakDistanceM));
```
- Observation: Lines 93–95 define `delta_t = t2 - t1 > 0` ($t_b - t_a$) and apply the formula `x = (L - v_s * delta_t) / 2`.

### 1.4 GCC-PHAT Cross-Spectral Density in `gccPhat.ts`
File: `core-dsp/src/gccPhat.ts`, lines 38, 65–67, 82–88, 114–115:
```typescript
38:   // Cross-spectral density: G12(w) = X2(w) * conj(X1(w))
...
65:   // (r2 + j*i2) * (r1 - j*i1)
66:   const realProd = r2[k] * r1[k] + i2[k] * i1[k];
67:   const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
...
114:  const refinedLagSamples = bestLag + subSampleCorrection;
115:  const deltaTSeconds = refinedLagSamples / sampleRateHz;
```
- Observation: $G_{12}(\omega) = X_2(\omega) X_1^*(\omega)$. When $s_2(t) = s(t - t_b)$ and $s_1(t) = s(t - t_a)$, the phase of $G_{12}(\omega)$ is $-j\omega(t_b - t_a)$. The IFFT produces a peak at lag $\tau = t_b - t_a$. When $t_b > t_a$, the peak is located at a positive lag index (`bestLag > 0`), yielding positive `deltaTSeconds`.

### 1.5 Window Gating and Delay Mapping in `triangulate.ts`
File: `core-dsp/src/triangulate.ts`, lines 38–68:
```typescript
38:     // Step 2: Dual-Window STA/LTA Transient Onset Gating
39:     const staResA = computeSTALTA(cleanA, 50, 400);
40:     const staResB = computeSTALTA(cleanB, 50, 400);
41: 
42:     const winLen = Math.min(2048, Math.max(1024, Math.ceil((L / v_s) * fs * 1.5)));
43:     const gated = extractGatedWindow(
44:       cleanA,
45:       cleanB,
46:       staResA.primaryOnsetIndex,
47:       staResB.primaryOnsetIndex,
48:       winLen,
49:       256
50:     );
51: 
52:     // Step 3: Band-Limited GCC-PHAT on the gated transient frame
53:     const maxSegmentDelaySec = (winLen / 2) / fs;
54:     const gccGated = computeGCCPhat(
55:       gated.gatedA,
56:       gated.gatedB,
57:       fs,
58:       maxSegmentDelaySec,
59:       { minFreqHz: minHz, maxFreqHz: maxHz, bandLimited: true }
60:     );
61: 
62:     // Map gated segment lag back to original full buffer delay:
63:     // lag_total = (startB - startA) + lag_segment
64:     const totalLagSamples = gated.baseOffsetSamples + gccGated.deltaTSeconds * fs;
65:     deltaTSeconds = totalLagSamples / fs;
```
- Observation on Run 1 (Bawana, 24 dB, seed 101):
  - `staResA.primaryOnsetIndex` = 2012
  - `staResB.primaryOnsetIndex` = 3043
  - `gated.startA` = 1756, `gated.startB` = 2787
  - `gated.baseOffsetSamples` = 1031 ($= 103.1 \text{ ms}$)
  - `winLen` = 2048
  - `maxSegmentDelaySec` = $(2048 / 2) / 10000 = 0.1024 \text{ s}$ ($\pm 1024$ samples)
  - `gccGated.sampleLag` = `+488.82 samples` (peak value: `0.0421`)
  - True physical lag between onset-aligned frames: `+3.35 samples` (peak value: `0.0398`)
  - Resulting total lag: `1031 + 488.82 = 1519.82 samples` ($151.98 \text{ ms}$), creating the $30.6 \text{ m}$ error!

### 1.6 Step Discontinuity in `scenarios.ts`
File: `core-dsp/src/scenarios.ts`, lines 215–224:
```typescript
215:   for (let i = 0; i < totalSamples; i++) {
216:     const t = i / fs;
217:     if (t < t0) continue;
218: 
219:     const dt = t - t0;
220:     // Source pulse & resonant ringing for Path A
221:     const pulseA = Math.exp(-0.5 * Math.pow(dt / sigmaA, 2));
222:     const ringA = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * dampA);
223:     const transientA = (0.7 * pulseA + 0.3 * ringA) * gainA;
```
- Observation: At sample $i = 499$ ($t = 0.0499 \text{ s} < t_0$), sample is 0. At sample $i = 500$ ($t = 0.05 \text{ s} = t_0$), $dt = 0$, so `pulseA = 1.0`. The signal steps from 0 to 0.7 in a single sample ($> 20,000$ ADC counts jump), abruptly truncating the leading half of the Gaussian bell curve and producing high-frequency Gibbs precursor ringing upon filtering.

### 1.7 Global Peak Ratio Sorting in `computeSTALTA`
File: `core-dsp/src/adaptiveFilter.ts`, lines 162–176:
```typescript
162:   peaks.sort((a, b) => b.ratio - a.ratio);
...
173:   let primaryOnset = ltaSamples;
174:   if (filteredPeaks.length > 0) {
175:     primaryOnset = filteredPeaks[0].index;
176:   }
```
- Observation: Candidate triggers are sorted by ratio descending rather than chronological order. At lower SNRs (12 dB and 6 dB), random noise fluctuations occurring after the burst has passed can produce local peaks (e.g., sample 6926 with ratio 2.10) that exceed the earlier rupture onset (sample 2012 with ratio 1.81).

---

## 2. Logic Chain

1. **Convention Equivalence**:
   - Let sensor A be located at $x = 0$, sensor B at $x = L$, and the rupture at distance $x$ from sensor A.
   - Acoustic propagation times are $t_a = x / v_s$ and $t_b = (L - x) / v_s$.
   - **Convention 1 (Used in HydroPulse)**: $\Delta T \equiv t_b - t_a$.
     $$\Delta T = \frac{L - x}{v_s} - \frac{x}{v_s} = \frac{L - 2x}{v_s} \iff 2x = L - v_s \Delta T \iff x = \frac{L - v_s \Delta T}{2}$$
     - If leak is closer to sensor A ($x < L/2$): $t_a < t_b \implies \Delta T > 0$.
     - When $x = 185 \text{ m}, L = 500 \text{ m}, v_s = 1258.1 \text{ m/s}$: $\Delta T = \frac{500 - 370}{1258.1} = +0.10333 \text{ s} = +103.33 \text{ ms}$.
     - $x = \frac{500 - 1258.1 \times 0.10333}{2} = 185.0 \text{ m}$.
   - **Convention 2 (Alternative Literature Convention)**: $\Delta T' \equiv t_a - t_b = -\Delta T$.
     $$\Delta T' = \frac{2x - L}{v_s} \iff x = \frac{L + v_s \Delta T'}{2}$$
   - **Finding**: `scenarios.ts` line 194 (`deltaTTrueSec = delaySecB - delaySecA`), `gccPhat.ts` line 38 ($X_2 \cdot X_1^*$), and `triangulate.ts` line 95 (`x = (L - v_s * deltaTSeconds) / 2`) **all adhere to Convention 1**. There is no sign mismatch between `scenarios.ts` and `triangulate.ts`.

2. **Zero-Time Reference Invariance**:
   - In `scenarios.ts`, the source rupture begins at $t_0 = 0.05 \text{ s}$ (50 ms).
   - Arrival time at sensor A is $t_{arr, A} = t_0 + \text{delaySecA}$.
   - Arrival time at sensor B is $t_{arr, B} = t_0 + \text{delaySecB}$.
   - Difference of arrival times:
     $$t_{arr, B} - t_{arr, A} = (t_0 + \text{delaySecB}) - (t_0 + \text{delaySecA}) = \text{delaySecB} - \text{delaySecA} = \Delta T_{true}$$
   - The origin offset $t_0$ cancels out in differential TDOA.
   - When noise is set to zero, all 4 Delhi scenarios locate with error $\le 0.04 \text{ m}$, confirming that $t_0$ introduces zero DC bias.

3. **Mechanism of Benchmark Run 1 Failure (30.6 m Error)**:
   - In `triangulate.ts`, `extractGatedWindow` extracts windows starting at `startA = triggerA - 256` and `startB = triggerB - 256`.
   - The detected onsets are `triggerA = 2012` and `triggerB = 3043`.
   - The initial offset `baseOffsetSamples = startB - startA = 1031 samples` already captures almost the entire physical delay ($103.1 \text{ ms}$ out of $103.33 \text{ ms}$).
   - Within `gatedA` and `gatedB`, the two pulses are aligned to within $\approx 2.3$ samples ($0.23 \text{ ms}$).
   - However, `triangulate.ts` sets `maxSegmentDelaySec = (winLen / 2) / fs = 0.1024 \text{ s}$ ($\pm 1024$ samples).
   - Because the search window spans $\pm 1024$ samples, GCC-PHAT searches across regions outside the transient wave packet. At lag $+488.82$ samples, whitened cross-spectral noise produces a spurious correlation peak of $0.0421$, which marginally exceeds the true onset peak of $0.0398$ at lag $+3.35$ samples.
   - Adding $+488.82$ samples to $1031$ samples results in $1519.82$ samples ($151.98 \text{ ms}$), which yields an estimated distance of $154.4 \text{ m}$ ($30.6 \text{ m}$ error).
   - When `maxSegmentDelaySec` is restricted to $\le 0.02 \text{ s}$ (20 ms, $\pm 200$ samples), GCC-PHAT is prevented from searching into distant noise lobes, locking onto the true peak at $+3.35$ samples and reducing the error to **0.07 meters**.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with explorer rules, source code modifications were not executed in `core-dsp/src/`. All empirical findings were established via read-only inspection and non-destructive node diagnostic commands.
2. **Noise Model Realism**: At 6 dB SNR, white noise standard deviation ($0.501$) is comparable to the burst peak ($0.788$). Because the burst is narrowband (850 Hz) and short (20 ms), standard wideband GCC-PHAT over the entire 1-second buffer suffers without localized gating. Robust onset gating is mandatory for sub-meter accuracy at 6 dB SNR.

---

## 4. Conclusion

1. **Sign and Formula Consistency**:
   - $\Delta T$ is defined as $(t_b - t_a)$ across `scenarios.ts`, `gccPhat.ts`, and `triangulate.ts`.
   - The formula $x = (L - v_s \cdot \Delta T) / 2$ is mathematically exact for this convention.
   - Zero-time reference $t_0 = 50 \text{ ms}$ does not induce any position bias.
   - Korteweg wave speeds computed in `korteweg.ts` match nominal scenario specifications exactly.

2. **Primary Failure Defect**:
   - `triangulate.ts` (line 53) uses `maxSegmentDelaySec = (winLen / 2) / fs = 102.4 ms` for onset-aligned gated frames. Because the frames are already pre-aligned by `baseOffsetSamples`, the search range should only encompass the residual onset error ($\le 20 \text{ ms}$). Searching $\pm 1024$ samples causes GCC-PHAT to pick spurious sidelobes at lag 488, generating the 30.6 m error in `benchmark.test.ts`.

3. **Secondary Generator Defect**:
   - `scenarios.ts` (lines 216–217) contains an abrupt step cutoff `if (t < t0) continue;` that generates a 20,000+ ADC count step discontinuity and subsequent bandpass Gibbs ringing.

4. **Actionable Fix Recommendations**:

   **Fix A (`core-dsp/src/triangulate.ts`, Line 53)**:
   Constrain `maxSegmentDelaySec` on the gated window to $\le 0.02 \text{ s}$ (20 ms):
   ```typescript
   // BEFORE:
   const maxSegmentDelaySec = (winLen / 2) / fs;

   // AFTER:
   // Gated frames are already pre-aligned by baseOffsetSamples.
   // Constrain segment delay to residual onset uncertainty (<= 20 ms).
   const maxSegmentDelaySec = Math.min(0.02, (winLen / 4) / fs);
   ```

   **Fix B (`core-dsp/src/scenarios.ts`, Lines 215–224)**:
   Eliminate the step discontinuity by computing a smooth Gaussian pulse for all $t$:
   ```typescript
   // BEFORE:
   for (let i = 0; i < totalSamples; i++) {
     const t = i / fs;
     if (t < t0) continue;
     const dt = t - t0;
     const pulseA = Math.exp(-0.5 * Math.pow(dt / sigmaA, 2));
     const ringA = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * dampA);
     const transientA = (0.7 * pulseA + 0.3 * ringA) * gainA;
     ...

   // AFTER:
   for (let i = 0; i < totalSamples; i++) {
     const t = i / fs;
     const dt = t - t0;
     // Smooth Gaussian pulse evaluated without discontinuous cutoff
     const pulseA = Math.exp(-0.5 * Math.pow(dt / sigmaA, 2));
     const ringA = t >= t0 ? Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * dampA) : 0.0;
     const transientA = (0.7 * pulseA + 0.3 * ringA) * gainA;
     ...
   ```

   **Fix C (`core-dsp/src/adaptiveFilter.ts`, Lines 162–176)**:
   Sort candidate peaks chronologically and apply physical transit consistency ($|t_b - t_a| \le (L / v_s) \times 1.05$) to prevent selecting late noise spikes.

---

## 5. Verification Method

To independently verify this diagnosis:

1. **Reproduce Benchmark Failure**:
   ```powershell
   npm test --prefix core-dsp
   ```
   *Expected Current Result*: Fails on `Scenario DEL-BAWANA-01 at 24 dB (Run 1) produced error 30.6m > 1.5m`.

2. **Verify 20 ms Gated Delay Fix**:
   Execute the following inline Node.js verification command:
   ```powershell
   node -e "import('./core-dsp/dist/src/index.js').then(({ DELHI_PIPE_SCENARIOS, generateSyntheticBurst, calculateKortewegWaveSpeed, zeroPhaseBandpass, computeSTALTA, extractGatedWindow, computeGCCPhat }) => { const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01']; const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 24, seed: 101 }); const fs = 10000; const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200); const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200); const staA = computeSTALTA(cleanA, 50, 400); const staB = computeSTALTA(cleanB, 50, 400); const winLen = 2048; const gated = extractGatedWindow(cleanA, cleanB, staA.primaryOnsetIndex, staB.primaryOnsetIndex, winLen, 256); const gcc = computeGCCPhat(gated.gatedA, gated.gatedB, fs, 0.02, { minFreqHz: 300, maxFreqHz: 2200, bandLimited: true }); const totalLag = gated.baseOffsetSamples + gcc.deltaTSeconds * fs; const estDist = (500 - 1258.1 * (totalLag / fs)) / 2; console.log('Estimated Distance with 0.02s maxDelay:', estDist.toFixed(2), 'Error:', Math.abs(estDist - 185).toFixed(2), 'm'); })"
   ```
   *Expected Output*: `Estimated Distance with 0.02s maxDelay: 184.93 Error: 0.07 m`. Confirms sub-meter precision ($0.07 \text{ m} \ll 1.5 \text{ m}$).

3. **Invalidation Condition**:
   If restricting `maxSegmentDelaySec` to $\le 0.02 \text{ s}$ does not yield error $\le 0.1 \text{ m}$ on Run 1, this analysis is invalidated.
