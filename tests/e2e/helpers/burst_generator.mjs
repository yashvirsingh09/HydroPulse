/**
 * @file burst_generator.mjs
 * @brief High-Fidelity Synthetic Acoustic Burst Generator for E2E Tests
 * @details Pure JavaScript implementation matching HydroPulse physics-engine
 */

import { PHYSICAL_CONSTANTS } from './scenarios_catalog.mjs';

/**
 * Seedable pseudo-random number generator (Mulberry32)
 */
export function createRng(seed = 123456789) {
  let s = seed >>> 0;
  return function nextFloat() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Standard Normal Random Variable via Box-Muller transform
 */
export function normalRandom(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Calculate fluid-structure Korteweg wave propagation velocity
 */
export function calculateKortewegVelocity(diameterM, wallThicknessM, youngsModulusPa = PHYSICAL_CONSTANTS.YOUNGS_MODULUS_DUCTILE_IRON) {
  const K = PHYSICAL_CONSTANTS.BULK_MODULUS_WATER_PA;
  const rho = PHYSICAL_CONSTANTS.WATER_DENSITY_KG_M3;
  const e = wallThicknessM;
  const D = diameterM;

  if (e <= 0 || D <= 0) {
    throw new Error('Pipe diameter and wall thickness must be strictly positive.');
  }

  const denominator = 1.0 + (K / youngsModulusPa) * (D / e);
  const vs = Math.sqrt((K / rho) / denominator);
  return Number(vs.toFixed(2));
}

/**
 * Generates an acoustic transient pulse:
 * Causal wavefront with resonant ringing (e.g., 850 Hz water hammer)
 */
export function generateTransientPulse(sampleRate = 10000, durationSec = 1.0, centerFreq = 850.0) {
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pulse = new Float64Array(totalSamples);
  const t0 = 0.05; // 50 ms delay in source frame
  const sigma = 0.004;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const gaussian = Math.exp(-0.5 * Math.pow((t - t0) / sigma, 2));

    let ringing = 0;
    if (t >= t0) {
      const dt = t - t0;
      ringing = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * 150.0);
    }

    pulse[i] = 0.7 * gaussian + 0.3 * ringing;
  }

  return pulse;
}

/**
 * Simulates synchronized dual hydrophone recordings of a pipe rupture
 */
export function simulatePipeBurst({
  pipeLengthM = 500.0,
  leakDistanceM = 185.0,
  pipeDiameterM = 0.400,
  wallThicknessM = 0.012,
  youngsModulusPa = PHYSICAL_CONSTANTS.YOUNGS_MODULUS_DUCTILE_IRON,
  sampleRate = 10000,
  snrDb = 18.0,
  durationSec = 1.0,
  centerFreq = 850.0,
  seed = 42,
}) {
  const rng = createRng(seed);
  const v_s = calculateKortewegVelocity(pipeDiameterM, wallThicknessM, youngsModulusPa);

  const distA = leakDistanceM;
  const distB = pipeLengthM - leakDistanceM;

  const timeDelayA = distA / v_s;
  const timeDelayB = distB / v_s;
  const deltaTTrue = timeDelayB - timeDelayA; // t2 - t1

  const totalSamples = Math.floor(sampleRate * durationSec);
  const cleanPulse = generateTransientPulse(sampleRate, durationSec, centerFreq);

  const shiftA = Math.round(timeDelayA * sampleRate);
  const shiftB = Math.round(timeDelayB * sampleRate);

  const sigA = new Float64Array(totalSamples);
  const sigB = new Float64Array(totalSamples);

  // Attenuation model: A(d) = A0 * exp(-alpha * d)
  const alpha = 0.0012;
  const gainA = Math.exp(-alpha * distA);
  const gainB = Math.exp(-alpha * distB);

  for (let i = shiftA; i < totalSamples; i++) {
    sigA[i] = cleanPulse[i - shiftA] * gainA;
  }
  for (let i = shiftB; i < totalSamples; i++) {
    sigB[i] = cleanPulse[i - shiftB] * gainB;
  }

  // Noise components: traffic rumble (uncorrelated 38 Hz vs 54 Hz) + hydrophone white noise
  const noiseScale = Math.pow(10.0, -snrDb / 20.0) * 0.15;
  const finalA = new Float64Array(totalSamples);
  const finalB = new Float64Array(totalSamples);

  let maxVal = 1e-6;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const trafficA = 0.05 * Math.sin(2 * Math.PI * 38.0 * t);
    const trafficB = 0.05 * Math.sin(2 * Math.PI * 54.0 * t);

    const noiseA = normalRandom(rng) * noiseScale;
    const noiseB = normalRandom(rng) * noiseScale;

    finalA[i] = sigA[i] + trafficA + noiseA;
    finalB[i] = sigB[i] + trafficB + noiseB;

    const absA = Math.abs(finalA[i]);
    const absB = Math.abs(finalB[i]);
    if (absA > maxVal) maxVal = absA;
    if (absB > maxVal) maxVal = absB;
  }

  // Scale and quantize to 16-bit ADC scale (-32768 to 32767)
  const scale = 30000.0 / maxVal;
  const adcA = new Int16Array(totalSamples);
  const adcB = new Int16Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    adcA[i] = Math.max(-32768, Math.min(32767, Math.round(finalA[i] * scale)));
    adcB[i] = Math.max(-32768, Math.min(32767, Math.round(finalB[i] * scale)));
  }

  return {
    metadata: {
      pipe_length_m: pipeLengthM,
      pipe_diameter_m: pipeDiameterM,
      wall_thickness_m: wallThicknessM,
      wave_speed_m_s: v_s,
      sample_rate_hz: sampleRate,
      ground_truth_leak_m: leakDistanceM,
      ground_truth_delta_t_ms: Number((deltaTTrue * 1000.0).toFixed(4)),
      snr_db: snrDb,
    },
    node_a: {
      node_id: 1,
      samples: Array.from(adcA),
    },
    node_b: {
      node_id: 2,
      samples: Array.from(adcB),
    },
  };
}
