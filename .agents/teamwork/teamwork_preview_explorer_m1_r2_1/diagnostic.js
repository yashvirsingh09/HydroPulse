import { nextPowerOfTwo, fft } from '../../../core-dsp/dist/src/fft.js';
import { DELHI_PIPE_SCENARIOS, generateSyntheticBurst, zeroPhaseBandpass } from '../../../core-dsp/dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-BAWANA-01'];
const fs = 10000;
const L = scen.pipeParams.lengthM;
const v_s = scen.nominalWaveSpeedMs;
const tau_max = L / v_s; // 0.397s = 3974 samples
const maxLagSamples = Math.floor(tau_max * fs);

for (const seed of [101, 202, 303, 404, 505]) {
  const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed });
  const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, 300, 2200);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, 300, 2200);

  // We want to evaluate sliding frames of length winLen
  // To allow lags up to tau_max (3974 samples), the FFT size must be at least 2 * (winLen + maxLag)
  // Let's test full-buffer with sliding window weighting, OR
  // sliding STFT / short-time cross-correlation:
  // For each frame start from 0 to 10000 - winLen:
  // Wait! If sig1 is from [start, start + winLen], and sig2 is from [start, start + winLen + maxLag]!
  const winLen = 1500;
  const hop = 250;
  
  let bestOverallScore = -Infinity;
  let bestOverallLag = 0;
  let bestOverallFrame = 0;

  for (let start = 0; start <= 10000 - winLen; start += hop) {
    // Channel A frame: [start, start + winLen]
    // Channel B frame: [start, start + winLen]
    const subA = cleanA.slice(start, start + winLen);
    const subB = cleanB.slice(start, start + winLen);
    
    // Compute cross-correlation of subA and subB
    const nFft = nextPowerOfTwo(2 * winLen);
    const r1 = new Float64Array(nFft), i1 = new Float64Array(nFft);
    const r2 = new Float64Array(nFft), i2 = new Float64Array(nFft);
    for (let i = 0; i < winLen; i++) {
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (winLen - 1)));
      r1[i] = subA[i] * w;
      r2[i] = subB[i] * w;
    }
    fft(r1, i1, false); fft(r2, i2, false);
    const crossR = new Float64Array(nFft);
    for (let k = 0; k < nFft; k++) {
      const f = k <= nFft/2 ? k*(fs/nFft) : (nFft-k)*(fs/nFft);
      const w = (f >= 500 && f <= 1500) ? 1 : 0;
      const rp = r2[k]*r1[k] + i2[k]*i1[k];
      const ip = i2[k]*r1[k] - r2[k]*i1[k];
      const mag = Math.hypot(rp, ip) + 1e-12;
      crossR[k] = (rp / Math.pow(mag, 0.7)) * w;
    }
    fft(crossR, new Float64Array(nFft), true);

    // Limit lag search to [-winLen/2, winLen/2]
    const maxLag = Math.floor(winLen / 2);
    let frameMax = -Infinity, frameLag = 0;
    let baselineSum = 0, count = 0;
    for (let l = -maxLag; l <= maxLag; l++) {
      const val = l >= 0 ? crossR[l] : crossR[nFft + l];
      if (val > frameMax) { frameMax = val; frameLag = l; }
      baselineSum += Math.abs(val);
      count++;
    }
    const meanBase = baselineSum / count;
    const pslr = frameMax / (meanBase + 1e-9);

    if (pslr > bestOverallScore) {
      bestOverallScore = pslr;
      bestOverallLag = frameLag;
      bestOverallFrame = start;
    }
  }

  const estDist = (L - v_s * (bestOverallLag / fs)) / 2;
  const err = Math.abs(estDist - burst.metadata.ground_truth_leak_m);
  console.log(`Seed ${seed}: bestLag=${bestOverallLag}, frameStart=${bestOverallFrame}, pslr=${bestOverallScore.toFixed(2)}, err=${err.toFixed(2)}m (truth lag: 1033.3)`);
}
