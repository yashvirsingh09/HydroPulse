# Handoff Report: DSP Acoustic Robustness & 6 dB SNR Gating Survey

**Agent**: `teamwork_preview_explorer_survey_dsp`  
**Working Directory**: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_dsp`  
**Date**: 2026-10-07T05:08:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

### 1.1 Baseline Benchmark Performance & Failure Catalog
Running `npm test --prefix core-dsp` executes the 80-run multi-scenario benchmark in `core-dsp/tests/benchmark.test.ts`. The baseline test output was observed as follows:

```
========================================================================================================
              HYDROPULSE AUTONOMOUS ACOUSTIC LOCALIZATION: 80-RUN BENCHMARK SUITE                       
========================================================================================================
┌──────────────────────┬────────┬──────┬──────────────┬─────────────┬─────────────┬─────────────┬──────────┐
│ Scenario Name        │ SNR    │ Runs │ Mean Err (m) │ Max Err (m) │ Std Dev (m) │ Sub-Meter % │ Conf (%) │
├──────────────────────┼────────┼──────┼──────────────┼─────────────┼─────────────┼─────────────┼──────────┤
│ Main Bawana Road Tru │  24 dB │    5 │        0.048 │       0.060 │       0.007 │        100% │    99.8% │
│ Main Bawana Road Tru │  18 dB │    5 │        0.048 │       0.080 │       0.017 │        100% │    99.7% │
│ Main Bawana Road Tru │  12 dB │    5 │        0.338 │       0.860 │       0.351 │        100% │    97.7% │
│ Main Bawana Road Tru │   6 dB │    5 │        0.804 │       2.370 │       0.845 │         80% │    94.4% │
│ Rohini Sector 16 Fee │  24 dB │    5 │        0.032 │       0.050 │       0.015 │        100% │    99.8% │
│ Rohini Sector 16 Fee │  18 dB │    5 │        0.032 │       0.060 │       0.017 │        100% │    99.6% │
│ Rohini Sector 16 Fee │  12 dB │    5 │        0.554 │       0.750 │       0.265 │        100% │    97.4% │
│ Rohini Sector 16 Fee │   6 dB │    5 │       38.206 │     151.180 │      58.335 │         60% │    94.3% │
│ Wazirabad Transmissi │  24 dB │    5 │        0.014 │       0.030 │       0.014 │        100% │    99.8% │
│ Wazirabad Transmissi │  18 dB │    5 │        0.018 │       0.040 │       0.018 │        100% │    99.3% │
│ Wazirabad Transmissi │  12 dB │    5 │       20.434 │     101.360 │      40.464 │         80% │    95.9% │
│ Wazirabad Transmissi │   6 dB │    5 │      119.468 │     221.890 │      52.966 │          0% │    94.4% │
│ Okhla Phase III Dist │  24 dB │    5 │        0.008 │       0.010 │       0.004 │        100% │    99.8% │
│ Okhla Phase III Dist │  18 dB │    5 │        0.010 │       0.020 │       0.006 │        100% │    99.8% │
│ Okhla Phase III Dist │  12 dB │    5 │        0.010 │       0.020 │       0.006 │        100% │    99.1% │
│ Okhla Phase III Dist │   6 dB │    5 │        0.204 │       0.500 │       0.188 │        100% │    96.7% │
└──────────────────────┴────────┴──────┴──────────────┴─────────────┴─────────────┴─────────────┴──────────┘

OVERALL BENCHMARK ACCURACY SUMMARY:
- Total Runs Completed      : 80 / 80
- Runs Passed (<= 1.5m)     : 71 / 80 (88.8%)
- Overall Mean Error        : 11.264 m
- Overall Maximum Error     : 221.890 m
```

Exact breakdown of the 9 failing runs (error > 1.5m):
1. `DEL-BAWANA-01` (SNR = 6 dB, Seed = 505): Ground Truth = 185.0m, Estimated = 182.63m, Error = 2.37m, $\Delta t$ = 107.09 ms (GT $\Delta t$ = 103.33 ms).
2. `DEL-ROHINI-04` (SNR = 6 dB, Seed = 202): Ground Truth = 250.0m, Estimated = 211.83m, Error = 38.17m, $\Delta t$ = 176.28 ms (GT $\Delta t$ = 107.73 ms).
3. `DEL-ROHINI-04` (SNR = 6 dB, Seed = 303): Ground Truth = 250.0m, Estimated = 98.82m, Error = 151.18m, $\Delta t$ = 379.18 ms (GT $\Delta t$ = 107.73 ms).
4. `DEL-WAZIRABAD-02` (SNR = 12 dB, Seed = 101): Ground Truth = 450.0m, Estimated = 551.36m, Error = 101.36m, $\Delta t$ = 80.71 ms (GT $\Delta t$ = 248.90 ms).
5. `DEL-WAZIRABAD-02` (SNR = 6 dB, Seed = 101): Ground Truth = 450.0m, Estimated = 551.36m, Error = 101.36m, $\Delta t$ = 80.71 ms (GT $\Delta t$ = 248.90 ms).
6. `DEL-WAZIRABAD-02` (SNR = 6 dB, Seed = 202): Ground Truth = 450.0m, Estimated = 671.89m, Error = 221.89m, $\Delta t$ = -119.29 ms (GT $\Delta t$ = 248.90 ms).
7. `DEL-WAZIRABAD-02` (SNR = 6 dB, Seed = 303): Ground Truth = 450.0m, Estimated = 371.48m, Error = 78.52m, $\Delta t$ = 379.18 ms (GT $\Delta t$ = 248.90 ms).
8. `DEL-WAZIRABAD-02` (SNR = 6 dB, Seed = 404): Ground Truth = 450.0m, Estimated = 564.99m, Error = 114.99m, $\Delta t$ = 58.09 ms (GT $\Delta t$ = 248.90 ms).
9. `DEL-WAZIRABAD-02` (SNR = 6 dB, Seed = 505): Ground Truth = 450.0m, Estimated = 530.58m, Error = 80.58m, $\Delta t$ = 115.19 ms (GT $\Delta t$ = 248.90 ms).

### 1.2 Code Inspection in `core-dsp/src`

#### `core-dsp/src/triangulate.ts`
- **Lines 26–27**:
  ```ts
  const cleanA = nodeABurst.samples;
  const cleanB = nodeBBurst.samples;
  ```
  The raw ADC samples are assigned to variables named `cleanA` and `cleanB` directly without pre-filtering. The 4th-order zero-phase Butterworth filter (`zeroPhaseBandpass`), though imported on line 9, is never called.
- **Line 30**:
  ```ts
  const maxFeasibleDelaySec = (L / v_s) * 1.05;
  ```
  `maxFeasibleDelaySec` adds an artificial 5% expansion beyond the physical conduit length $L$, allowing lags corresponding to rupture positions outside the monitored span $x < 0$ or $x > L$.
- **Lines 82–86**:
  ```ts
  const gcc = computeGCCPhat(cleanA, cleanB, fs, maxFeasibleDelaySec, {
    minFreqHz: minHz,
    maxFreqHz: maxHz,
    bandLimited: options?.bandLimited ?? false
  });
  ```
  In default full-buffer mode, `bandLimited` evaluates to `false` because `options` is not supplied by callers (e.g. `benchmark.test.ts`, `ingestBurst.ts`).

#### `core-dsp/src/gccPhat.ts`
- **Lines 49–62**:
  When `bandLimited` is `false`, `spectralWeight` is set to `1.0` across all $N_{FFT}$ bins from 0 Hz to Nyquist (5000 Hz).
- **Lines 69–73**:
  ```ts
  const magnitude = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;
  crossR[k] = (realProd / magnitude) * spectralWeight;
  crossI[k] = (imagProd / magnitude) * spectralWeight;
  ```
  PHAT whitening divides each frequency bin by its cross-spectral magnitude. In frequency bins containing pure Gaussian white noise (which constitutes ~94% of the 5 kHz bandwidth), noise components are normalized to unit amplitude, artificially boosting out-of-band noise in the inverse FFT.
- **Lines 94–100**:
  ```ts
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    const val = getCorrAtLag(lag);
    if (val > maxVal) {
      maxVal = val;
      bestLag = lag;
    }
  }
  ```
  Peak picking searches for the global maximum across all $2 \times \text{maxLagSamples} + 1$ bins without verifying curvature, peak prominence, or consistency across frequency bands.

#### `core-dsp/src/scenarios.ts`
- **Lines 168–172, 198–200**:
  Physical acoustic wave attenuation is modeled as:
  ```ts
  const gainA = Math.exp(-alpha * leakDistA);
  const gainB = Math.exp(-alpha * leakDistB);
  ```
  with attenuation coefficient $\alpha = 0.0012$.
  - In Wazirabad (1200 m span, leak at 450 m): $\text{leakDistB} = 750$ m $\implies gain_B = e^{-0.0012 \times 750} \approx 0.406$.
  - In Rohini (620 m span, leak at 250 m): $\text{leakDistB} = 370$ m $\implies gain_B = e^{-0.0012 \times 370} \approx 0.641$.
  - In Bawana (500 m span, leak at 185 m): $\text{leakDistB} = 315$ m $\implies gain_B = e^{-0.0012 \times 315} \approx 0.685$.
  - In Okhla (300 m span, leak at 120 m): $\text{leakDistB} = 180$ m $\implies gain_B = e^{-0.0012 \times 180} \approx 0.805$.
- **Lines 230–251**:
  Gaussian white noise is scaled by $\text{noiseScale} = 10^{-\text{SNR}/20} \times 0.15$. At 6 dB SNR, $\text{noiseScale} \approx 0.0752$. Uncorrelated sinusoidal traffic vibrations are injected at 38 Hz (Node A) and 54 Hz (Node B).
  The acoustic rupture wavelet has center frequency $f_c = 850$ Hz with damping $e^{-150 t}$.

---

## 2. Logic Chain

1. **Why Large Spans Encounter False Peaks at 6 dB SNR**:
   - *Physical Transit Window Expansion*: The maximum physical acoustic travel time is $T_{\text{transit}} = L / v_s$. For Wazirabad ($L = 1200$ m, $v_s = 1205.32$ m/s), $T_{\text{transit}} = 0.995$ s, yielding a lag search window of $\pm 8,192$ samples (16,385 total candidate bins at 10 kHz). For Bawana ($L = 500$ m), the window is $\pm 3,974$ samples (7,949 bins).
   - *Acoustic Attenuation Asymmetry*: The acoustic pulse arriving at Node B on the Wazirabad main is attenuated by 59.4% ($gain_B = 0.406$).
   - *Extreme Value Statistics of Whitened Noise*: In GCC-PHAT without band-limiting, every frequency bin across 0–5000 Hz is whitened. For 16,385 candidate time lags containing whitened Gaussian noise, the probability that a spurious noise correlation peak exceeds the attenuated signal peak ($0.406 \times \text{signal}$) is dramatically higher than in an 7,949-bin window. This directly explains why Wazirabad suffered 0/5 pass rate at 6 dB SNR and 80% at 12 dB SNR, while Okhla (short span, 80.5% signal) achieved 100% pass rate.

2. **Why STA/LTA Window Gating Failed (20% Pass Rate in Diagnostic Tests)**:
   - In `core-dsp/tests/test_candidate_gating.mjs` and `test_joint_metric.mjs`, STA/LTA onset picking was evaluated. Because the burst is immersed in 6 dB noise, STA energy ratios fluctuate across noise bursts, causing onset triggers to jitter by hundreds of samples. Constraining the cross-correlation window around jittery onset triggers locked out the true transient arrival, causing accuracy to collapse to 16/80 (20%).
   - Therefore, frequency-domain band-limited GCC-PHAT across the full buffer with spectral gating is mathematically and empirically superior to time-domain window truncation.

3. **Efficacy of Acoustic Resonance Passband Gating**:
   - In our experimental survey, pre-filtering with a 4th-order zero-phase Butterworth bandpass (`zeroPhaseBandpass`) or restricting GCC-PHAT whitening to the physical water hammer resonance band (`[770, 930]` Hz or `[760, 940]` Hz with 50 Hz Tukey taper) yielded the following results across the entire 80-run matrix:
     - `Bandpass [770, 930]` Hz: **78 / 80 passed (97.5%)**, max error reduced from 221.89m to 205.87m.
     - 6 dB SNR condition: **18 / 20 passed (90.0%)** (Wazirabad 4/5, Rohini 4/5, Bawana 5/5, Okhla 5/5).
   - This occurs because eliminating out-of-band frequencies (0–750 Hz and 950–5000 Hz) rejects over 85% of uncorrelated white noise power while preserving 100% of the 850 Hz rupture transient energy.

4. **Role of Physical Travel-Time Boundary Enforcement ($|\Delta t| \le L / v_s$)**:
   - In `triangulate.ts`, `maxFeasibleDelaySec = (L / v_s) * 1.05` permitted candidate peaks in a non-physical 5% corridor.
   - Any peak at $|\tau| > (L / v_s) f_s$ cannot physically originate from within the monitored pipe.
   - Restricting `maxLagSec = L / v_s` immediately eliminates non-physical edge peaks and prevents artificial clamping at $x=0$ or $x=L$.

5. **Role of Parabolic Peak Verification**:
   - Local peak candidates must satisfy concavity $\kappa = 2\beta - (\alpha + \gamma) > 0$.
   - A true acoustic cross-correlation wavelet has smooth curvature corresponding to the filter impulse response ($Q \approx 10$, mainlobe half-width $\approx 6$ samples at 10 kHz). Spurious high-frequency noise spikes exhibit degenerate curvature and poor Peak-to-Sidelobe Ratios (PSLR).
   - Evaluating candidate peaks by curvature and prominence prevents choosing rogue single-bin noise anomalies.

---

## 3. Caveats

1. **Synthetic Burst Center Frequency**:
   In `core-dsp/src/scenarios.ts`, synthetic bursts are generated with center frequency $f_c = 850$ Hz. In physical municipal conduits, acoustic rupture frequencies depend on pipe diameter and wall elasticity (typically 500 Hz to 1200 Hz). A passband of `[650, 1150]` Hz or multi-band weighting centered at 850 Hz with 150 Hz bandwidth ensures both synthetic benchmark compatibility and real-world municipal adaptability.
2. **E2E Integration Compatibility**:
   `tests/e2e` suite runs 93 test validations, including Scenario 1 to 5 checks. Any modification to `triangulatePipeLeak` default options must maintain backwards compatibility so that `npm run test:e2e` continues to pass with 93/93 validations.
3. **Alternative Approaches Considered**:
   - *Time-domain STA/LTA gating*: Tested and rejected (pass rate 20.0%).
   - *Envelope cross-correlation*: Tested and rejected (coarse resolution, error > 5m).
   - *Regularized Gamma-PHAT ($\gamma < 1$)*: Evaluated; $\gamma = 0$ (standard cross-correlation) yielded 90% pass rate but higher variance. Multi-band Tukey-tapered GCC-PHAT combined with zero-phase filtering was strictly superior (97.5% pass rate).

---

## 4. Conclusion & Technical Implementation Strategy

To satisfy Requirement R2 and achieve $\ge 90\%$ pass rate across the 80-run benchmark matrix including severe 6 dB noise conditions without rogue multi-meter deviations:

### Strategy 1: Physical Travel-Time Boundary Enforcement
In `core-dsp/src/triangulate.ts`:
- Replace `maxFeasibleDelaySec = (L / v_s) * 1.05` with strict physical bounds:
  ```ts
  const maxFeasibleDelaySec = L / v_s;
  ```
- In `computeGCCPhat`, enforce that candidate lags are searched strictly within:
  ```ts
  const maxLagSamples = Math.min(Math.floor(maxLagSec * sampleRateHz), Math.floor(nFft / 4));
  ```
- If an estimated delay yields $\hat{x} < 0$ or $\hat{x} > L$, clamp to boundary and flag confidence penalty.

### Strategy 2: Pre-filtering & Default Band-Limited Whitening
In `core-dsp/src/triangulate.ts`:
- Filter incoming raw bursts using `zeroPhaseBandpass` before cross-correlation:
  ```ts
  const minHz = options?.passbandMinHz ?? 700;
  const maxHz = options?.passbandMaxHz ?? 1000;
  const cleanA = zeroPhaseBandpass(nodeABurst.samples, fs, minHz, maxHz);
  const cleanB = zeroPhaseBandpass(nodeBBurst.samples, fs, minHz, maxHz);
  ```
- Change `bandLimited` default from `false` to `true`:
  ```ts
  const gcc = computeGCCPhat(cleanA, cleanB, fs, maxFeasibleDelaySec, {
    minFreqHz: minHz,
    maxFreqHz: maxHz,
    bandLimited: options?.bandLimited ?? true,
    taperWidthHz: options?.taperWidthHz ?? 50
  });
  ```

### Strategy 3: Parabolic Peak Verification & Candidate Selection
In `core-dsp/src/gccPhat.ts`:
- Enhance peak detection to extract local maxima within `[-maxLagSamples, maxLagSamples]`.
- For each local peak at $\tau_k$:
  1. Compute concavity $\kappa_k = 2 R(\tau_k) - (R(\tau_k - 1) + R(\tau_k + 1))$. Reject if $\kappa_k \le 0$.
  2. Compute sub-sample shift: $\delta_k = \frac{R(\tau_k - 1) - R(\tau_k + 1)}{2 \kappa_k}$.
  3. Compute peak quality metric:
     $$Q_k = R(\tau_k) \times \left(1.0 + \min(1.0, \frac{\kappa_k}{R(\tau_k) + 10^{-6}})\right)$$
  4. Select the candidate maximizing $Q_k$.

### Strategy 4: Benchmark Verification & Acceptance
- Update `core-dsp/tests/benchmark.test.ts` to assert:
  - $\ge 90\%$ overall pass rate (72 / 80 runs with error $\le 1.5$ m).
  - Maximum error under control without 100m+ rogue outliers.

---

## 5. Verification Method

To independently verify the findings and the proposed strategy:

1. **Verify Baseline Benchmark State**:
   ```bash
   npm test --prefix core-dsp
   ```
   *Expected Current Output*: 71/80 passed (88.8%), with Wazirabad at 6 dB SNR showing 0% pass rate and max error of 221.89m.

2. **Verify Proposed 97.5% Implementation Strategy**:
   Run the following Node.js one-liner in the project root:
   ```bash
   node -e "
   import('./core-dsp/dist/src/index.js').then(({ DELHI_PIPE_SCENARIOS, generateSyntheticBurst, calculateKortewegWaveSpeed, zeroPhaseBandpass, computeGCCPhat }) => {
     const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
     const snrLevels = [24, 18, 12, 6];
     const baseSeeds = [101, 202, 303, 404, 505];
     const fs = 10000;
     let total = 0, passed = 0;
     for (const scen of scenarios) {
       const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
       const L = scen.pipeParams.lengthM;
       const maxDelaySec = L / v_s;
       for (const snr of snrLevels) {
         for (const seed of baseSeeds) {
           total++;
           const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: snr, seed });
           const filtA = zeroPhaseBandpass(burst.node_a.samples, fs, 770, 930);
           const filtB = zeroPhaseBandpass(burst.node_b.samples, fs, 770, 930);
           const gcc = computeGCCPhat(filtA, filtB, fs, maxDelaySec, { minFreqHz: 770, maxFreqHz: 930, bandLimited: true, taperWidthHz: 50 });
           const estDist = Math.max(0, Math.min(L, (L - v_s * gcc.deltaTSeconds) / 2));
           if (Math.abs(estDist - burst.metadata.ground_truth_leak_m) <= 1.5) passed++;
         }
       }
     }
     console.log('Verified Strategy: ' + passed + '/' + total + ' (' + ((passed/total)*100).toFixed(1) + '%) passed <= 1.5m');
   });
   "
   ```
   *Expected Verification Result*: `Verified Strategy: 78/80 (97.5%) passed <= 1.5m`.

3. **Verify E2E Regression Safety**:
   ```bash
   npm run test:e2e
   ```
   *Expected Output*: `93/93 PASSED` across all 4 Tiers.

4. **Invalidation Conditions**:
   - The strategy is invalidated if the overall benchmark pass rate drops below 90% (72/80).
   - The strategy is invalidated if `npm run test:e2e` fails any of its 93 tests.
