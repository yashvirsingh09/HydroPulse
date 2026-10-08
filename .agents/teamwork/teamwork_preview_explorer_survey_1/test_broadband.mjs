import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fft, nextPowerOfTwo } from '../../../core-dsp/dist/src/fft.js';
import { calculateKortewegWaveSpeed } from '../../../core-dsp/dist/src/korteweg.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, 'burst_6db.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
const meta = payload.metadata;

// Let's test GCC-PHAT with a high-pass / bandpass cutoff targeting rumble rejection
function testBroadbandGCC(samplesA, samplesB, meta, lowCut = 150, highCut = 3000) {
  const fs = meta.sample_rate_hz;
  const L = meta.pipe_length_m;
  const v_s = meta.wave_speed_m_s;
  const n = samplesA.length;

  const nFft = nextPowerOfTwo(2 * n);
  const r1 = new Float64Array(nFft);
  const i1 = new Float64Array(nFft);
  const r2 = new Float64Array(nFft);
  const i2 = new Float64Array(nFft);

  for (let i = 0; i < n; i++) {
    r1[i] = samplesA[i];
    r2[i] = samplesB[i];
  }

  fft(r1, i1, false);
  fft(r2, i2, false);

  const crossR = new Float64Array(nFft);
  const crossI = new Float64Array(nFft);
  const eps = 1e-12;
  const binWidth = fs / nFft;

  for (let k = 0; k < nFft; k++) {
    const f = (k <= nFft / 2) ? k * binWidth : (nFft - k) * binWidth;
    let w = 0.0;
    if (f >= lowCut && f <= highCut) {
      // Smooth taper
      const taperLow = Math.min(1.0, (f - lowCut) / 100);
      const taperHigh = Math.min(1.0, (highCut - f) / 200);
      w = taperLow * taperHigh;
    }

    const realProd = r2[k] * r1[k] + i2[k] * i1[k];
    const imagProd = i2[k] * r1[k] - r2[k] * i1[k];
    const mag = Math.sqrt(realProd * realProd + imagProd * imagProd) + eps;

    // GCC-PHAT with bandpass weighting
    crossR[k] = (realProd / mag) * w;
    crossI[k] = (imagProd / mag) * w;
  }

  fft(crossR, crossI, true);

  const maxLagSec = (L / v_s) * 1.1;
  const maxLagSamples = Math.floor(maxLagSec * fs);

  const getCorrAtLag = (lag) => {
    if (lag >= 0) return crossR[lag];
    return crossR[nFft + lag];
  };

  let bestLag = 0;
  let maxVal = -Infinity;

  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag++) {
    const val = getCorrAtLag(lag);
    if (val > maxVal) {
      maxVal = val;
      bestLag = lag;
    }
  }

  let subSample = 0.0;
  if (bestLag > -maxLagSamples && bestLag < maxLagSamples) {
    const a = getCorrAtLag(bestLag - 1);
    const b = getCorrAtLag(bestLag);
    const c = getCorrAtLag(bestLag + 1);
    const denom = 2.0 * (a - 2.0 * b + c);
    if (Math.abs(denom) > 1e-9) {
      subSample = (a - c) / denom;
    }
  }

  const refinedLag = bestLag + subSample;
  const deltaT = refinedLag / fs;
  const estimatedLeak = (L - v_s * deltaT) / 2.0;
  const error = Math.abs(estimatedLeak - meta.ground_truth_leak_m);

  return {
    bestLag,
    refinedLag,
    deltaTMs: deltaT * 1000,
    estimatedLeak: Number(estimatedLeak.toFixed(2)),
    error: Number(error.toFixed(2))
  };
}

console.log('Result on 6dB burst (lowCut=150, highCut=2500):', testBroadbandGCC(payload.node_a.samples, payload.node_b.samples, meta, 150, 2500));
console.log('Result on 6dB burst (lowCut=200, highCut=2000):', testBroadbandGCC(payload.node_a.samples, payload.node_b.samples, meta, 200, 2000));
console.log('Result on 6dB burst (lowCut=250, highCut=1500):', testBroadbandGCC(payload.node_a.samples, payload.node_b.samples, meta, 250, 1500));

// Also verify with Bawana fixture
const bawanaPayload = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../physics-engine/sample_burst_bawana.json'), 'utf-8'));
console.log('Result on 18dB Bawana fixture:', testBroadbandGCC(bawanaPayload.node_a.samples, bawanaPayload.node_b.samples, bawanaPayload.metadata, 150, 2500));
