import { generateSyntheticBurst, computeGCCPhat, zeroPhaseBandpass, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const fs = 10000;
const v_s = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;

for (let r = 0; r < 5; r++) {
  const seed = [101, 202, 303, 404, 505][r];
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed });
  const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 450, 1500);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 450, 1500);

  // Find reference arrival in A (since A is closer to leak)
  // STA/LTA on cleanA
  const n = cleanA.length;
  const rat = new Float64Array(n);
  let sS = 0, lS = 0;
  for (let i = 0; i < n; i++) {
    const v = cleanA[i] * cleanA[i];
    sS += v; lS += v;
    if (i >= 50) sS -= cleanA[i - 50] * cleanA[i - 50];
    if (i >= 400) lS -= cleanA[i - 400] * cleanA[i - 400];
    if (i >= 400) rat[i] = (sS / 50) / (lS / 400 + 1e-9);
  }

  let maxR = 0, peakA = 400;
  for (let i = 400; i < n; i++) {
    if (rat[i] > maxR) { maxR = rat[i]; peakA = i; }
  }

  // Arrival in A is around peakA - 45
  const tA = Math.max(0, peakA - 45);

  // Now, Node B's arrival is within [tA - L/v_s, tA + L/v_s]
  // In Wazirabad, L/v_s = 0.995 s ~ 9956 samples.
  // If we take a window around tA in A:
  // Say winLen = 2048, centered on tA: startA = tA - 256
  const winLen = 2048;
  const startA = Math.max(0, Math.min(n - winLen, tA - 256));
  const segA = cleanA.slice(startA, startA + winLen);

  // For Node B, what if we extract candidate windows or sliding GCC?
  // Or what if we use the full buffer with a delay range centered around the transit time?
  console.log(`Run ${r+1}: peakA=${peakA}, tA=${tA}, maxR=${maxR.toFixed(1)}`);
}
