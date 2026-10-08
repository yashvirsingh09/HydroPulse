import { generateSyntheticBurst, computeGCCPhat, calculateKortewegWaveSpeed, DELHI_PIPE_SCENARIOS } from './dist/src/index.js';

const scen = DELHI_PIPE_SCENARIOS['DEL-WAZIRABAD-02'];
const burst = generateSyntheticBurst({ scenarioId: scen.id, snrDb: 6, seed: 202 });
const vs = calculateKortewegWaveSpeed(scen.pipeParams);
const L = scen.pipeParams.lengthM;

// Compute GCC-PHAT on [750, 950]
const gcc = computeGCCPhat(burst.node_a.samples, burst.node_b.samples, 10000, (L/vs)*1.05, { minFreqHz: 750, maxFreqHz: 950, bandLimited: true });

// Check what the correlation value is at the true lag ~ 2489
// We can compute the cross correlation directly
import { fft, nextPowerOfTwo } from './dist/src/fft.js';

const sig1 = burst.node_a.samples;
const sig2 = burst.node_b.samples;
const nRaw = Math.max(sig1.length, sig2.length);
const nFft = nextPowerOfTwo(2 * nRaw);
const r1 = new Float64Array(nFft);
const i1 = new Float64Array(nFft);
const r2 = new Float64Array(nFft);
const i2 = new Float64Array(nFft);
for (let i = 0; i < sig1.length; i++) r1[i] = sig1[i];
for (let i = 0; i < sig2.length; i++) r2[i] = sig2[i];
fft(r1, i1, false);
fft(r2, i2, false);

const crossR = new Float64Array(nFft);
const crossI = new Float64Array(nFft);
const binWidthHz = 10000 / nFft;
for (let k = 0; k < nFft; k++) {
  const freqHz = k <= nFft / 2 ? k * binWidthHz : (nFft - k) * binWidthHz;
  if (freqHz >= 750 && freqHz <= 950) {
    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + 1e-12;
    crossR[k] = realProd / mag;
    crossI[k] = imagProd / mag;
  }
}
fft(crossR, crossI, true);

// Find top 10 peaks across all lags
const peaks = [];
const maxLagSamples = Math.floor((L / vs) * 1.05 * 10000);
for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
  const val = lag >= 0 ? crossR[lag] : crossR[nFft + lag];
  peaks.push({ lag, val });
}
peaks.sort((a, b) => b.val - a.val);
console.log('Top 10 GCC peaks for Run 2:');
for (let i = 0; i < 10; i++) {
  const estDist = (L - vs * (peaks[i].lag / 10000)) / 2;
  console.log(`Rank ${i+1}: lag=${peaks[i].lag}, val=${peaks[i].val.toFixed(5)}, estDist=${estDist.toFixed(2)} (GT=450, err=${Math.abs(estDist-450).toFixed(2)})`);
}
