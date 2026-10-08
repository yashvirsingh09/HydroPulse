import {
  DELHI_PIPE_SCENARIOS,
  calculateKortewegWaveSpeed,
  YOUNGS_MODULUS_DUCTILE_IRON
} from '../dist/src/index.js';

function createMulberry32(seed) {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function testGenerate(scen, snrDb, seed) {
  const pipeParams = scen.pipeParams;
  const v_s = calculateKortewegWaveSpeed(pipeParams);
  const L = pipeParams.lengthM;
  const leakDistA = scen.defaultRuptureDistanceM;
  const leakDistB = L - leakDistA;
  const fs = 10000;
  const totalSamples = 10000;
  const centerFreq = 850.0;
  const alpha = 0.0012;
  const beta = 1.8e-8;

  const rng = createMulberry32(seed);
  function nextGaussian() {
    let u1 = rng(), u2 = rng();
    while (u1 <= 1e-15) u1 = rng();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  const delaySecA = leakDistA / v_s;
  const delaySecB = leakDistB / v_s;
  const shiftA = Math.round(delaySecA * fs);
  const shiftB = Math.round(delaySecB * fs);

  const gainA = Math.exp(-alpha * leakDistA);
  const gainB = Math.exp(-alpha * leakDistB);

  const sigmaA = Math.sqrt(0.004 * 0.004 + beta * leakDistA);
  const sigmaB = Math.sqrt(0.004 * 0.004 + beta * leakDistB);
  const dampA = 150.0 + 0.05 * leakDistA;
  const dampB = 150.0 + 0.05 * leakDistB;
  const t0 = 0.05;

  const cleanA = new Float64Array(totalSamples);
  const cleanB = new Float64Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;
    if (t < t0) continue;
    const dt = t - t0;

    const pulseA = Math.cos(2.0 * Math.PI * centerFreq * dt) * Math.exp(-0.5 * Math.pow(dt / sigmaA, 2));
    const ringA = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * dampA);
    const transientA = (0.7 * pulseA + 0.3 * ringA) * gainA;

    const pulseB = Math.cos(2.0 * Math.PI * centerFreq * dt) * Math.exp(-0.5 * Math.pow(dt / sigmaB, 2));
    const ringB = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * dampB);
    const transientB = (0.7 * pulseB + 0.3 * ringB) * gainB;

    if (i + shiftA < totalSamples) cleanA[i + shiftA] += transientA;
    if (i + shiftB < totalSamples) cleanB[i + shiftB] += transientB;
  }

  const noiseStd = Math.pow(10.0, -snrDb / 20.0);
  const rawA = new Float64Array(totalSamples);
  const rawB = new Float64Array(totalSamples);
  let peakMag = 1e-6;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;
    const trafficA = 0.06 * Math.sin(2.0 * Math.PI * 38.0 * t) + nextGaussian() * 0.04;
    const trafficB = 0.06 * Math.sin(2.0 * Math.PI * 54.0 * t) + nextGaussian() * 0.04;
    const valA = cleanA[i] + trafficA + nextGaussian() * noiseStd;
    const valB = cleanB[i] + trafficB + nextGaussian() * noiseStd;
    rawA[i] = valA;
    rawB[i] = valB;
    if (Math.abs(valA) > peakMag) peakMag = Math.abs(valA);
    if (Math.abs(valB) > peakMag) peakMag = Math.abs(valB);
  }

  const scale = 30000.0 / peakMag;
  const adcA = new Array(totalSamples);
  const adcB = new Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    adcA[i] = Math.max(-32768, Math.min(32767, Math.round(rawA[i] * scale)));
    adcB[i] = Math.max(-32768, Math.min(32767, Math.round(rawB[i] * scale)));
  }

  return { adcA, adcB, groundTruthM: leakDistA, deltaTTrueSec: delaySecB - delaySecA };
}

console.log('Script written.');
