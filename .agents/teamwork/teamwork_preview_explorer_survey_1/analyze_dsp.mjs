// Scratch analysis script to test current core-dsp algorithms across SNR and scenarios
import { calculateKortewegWaveSpeed, triangulatePipeLeak, computeGCCPhat } from '../../../core-dsp/dist/src/index.js';

console.log('--- Testing Wave Speed across Materials ---');

// Ductile Iron: E = 2.0e11
const vs_di = calculateKortewegWaveSpeed({
  lengthM: 500,
  diameterM: 0.4,
  wallThicknessM: 0.012,
  youngsModulusPa: 2.0e11
});
console.log(`Ductile Iron (Bawana 400mm): vs = ${vs_di} m/s`);

// Mild Steel: E = 2.1e11
const vs_steel = calculateKortewegWaveSpeed({
  lengthM: 1000,
  diameterM: 0.9,
  wallThicknessM: 0.014,
  youngsModulusPa: 2.1e11
});
console.log(`Mild Steel (Wazirabad 900mm): vs = ${vs_steel} m/s`);

// Cast Iron: E = 1.2e11
const vs_ci = calculateKortewegWaveSpeed({
  lengthM: 620,
  diameterM: 0.3,
  wallThicknessM: 0.010,
  youngsModulusPa: 1.2e11
});
console.log(`Cast Iron (Rohini 300mm): vs = ${vs_ci} m/s`);

// HDPE: E = 1.0e9
const vs_hdpe = calculateKortewegWaveSpeed({
  lengthM: 300,
  diameterM: 0.16,
  wallThicknessM: 0.014,
  youngsModulusPa: 1.0e9
});
console.log(`HDPE (Distribution 160mm): vs = ${vs_hdpe} m/s`);

// Let's test synthetic burst generator with current GCC-PHAT at different SNRs
function generatePulse(sampleRate, durationSec, centerFreq = 850) {
  const n = Math.floor(sampleRate * durationSec);
  const arr = new Float64Array(n);
  const t0 = 0.05;
  const sigma = 0.004;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const pulse = Math.exp(-0.5 * Math.pow((t - t0) / sigma, 2));
    const ringing = t >= t0 ? Math.sin(2 * Math.PI * centerFreq * (t - t0)) * Math.exp(-(t - t0) * 150) : 0;
    arr[i] = 0.7 * pulse + 0.3 * ringing;
  }
  return arr;
}

// Pseudo-random Gaussian noise
function gaussianRandom(mean = 0, stdev = 1) {
  const u1 = 1 - Math.random();
  const u2 = 1 - Math.random();
  return mean + stdev * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function simulateScenario(pipeLength, leakDist, diameter, wallThick, youngs, snrDb) {
  const sampleRate = 10000;
  const v_s = calculateKortewegWaveSpeed({
    lengthM: pipeLength,
    diameterM: diameter,
    wallThicknessM: wallThick,
    youngsModulusPa: youngs
  });

  const distA = leakDist;
  const distB = pipeLength - leakDist;
  const delayA = distA / v_s;
  const delayB = distB / v_s;
  const shiftA = Math.round(delayA * sampleRate);
  const shiftB = Math.round(delayB * sampleRate);

  const durationSec = 1.0;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pulse = generatePulse(sampleRate, durationSec, 850);

  const sigA = new Float64Array(totalSamples);
  const sigB = new Float64Array(totalSamples);
  const gainA = Math.exp(-0.0012 * distA);
  const gainB = Math.exp(-0.0012 * distB);

  for (let i = 0; i < totalSamples - shiftA; i++) sigA[shiftA + i] = pulse[i] * gainA;
  for (let i = 0; i < totalSamples - shiftB; i++) sigB[shiftB + i] = pulse[i] * gainB;

  const noiseSigma = Math.pow(10, -snrDb / 20);

  const finalA = new Array(totalSamples);
  const finalB = new Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // traffic rumble 38Hz and 54Hz
    const trafA = 0.06 * Math.sin(2 * Math.PI * 38 * t) + gaussianRandom(0, 0.04);
    const trafB = 0.06 * Math.sin(2 * Math.PI * 54 * t) + gaussianRandom(0, 0.04);
    finalA[i] = Math.round((sigA[i] + trafA + gaussianRandom(0, noiseSigma)) * 30000);
    finalB[i] = Math.round((sigB[i] + trafB + gaussianRandom(0, noiseSigma)) * 30000);
  }

  const res = triangulatePipeLeak(
    { lengthM: pipeLength, diameterM: diameter, wallThicknessM: wallThick, youngsModulusPa: youngs },
    { nodeId: 1, sampleRateHz: sampleRate, samples: finalA },
    { nodeId: 2, sampleRateHz: sampleRate, samples: finalB },
    leakDist
  );

  return res;
}

console.log('\n--- Testing Bawana Road at Different SNRs ---');
const snrs = [24, 18, 12, 6];
for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 10; run++) {
    const r = simulateScenario(500, 185, 0.4, 0.012, 2.0e11, snr);
    errors.push(r.localizationErrorM);
    confidences.push(r.confidenceScore);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}

console.log('\n--- Testing Rohini Sector 16 (L=620m, D=0.3m, leak=250m) at Different SNRs ---');
for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 10; run++) {
    const r = simulateScenario(620, 250, 0.3, 0.010, 2.0e11, snr);
    errors.push(r.localizationErrorM);
    confidences.push(r.confidenceScore);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}

console.log('\n--- Testing Wazirabad Main (L=1000m, D=0.9m, leak=350m, Steel) at Different SNRs ---');
for (const snr of snrs) {
  let errors = [];
  let confidences = [];
  for (let run = 0; run < 10; run++) {
    const r = simulateScenario(1000, 350, 0.9, 0.014, 2.1e11, snr);
    errors.push(r.localizationErrorM);
    confidences.push(r.confidenceScore);
  }
  const meanErr = (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3);
  const maxErr = Math.max(...errors).toFixed(3);
  const meanConf = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
  console.log(`SNR = ${snr} dB: Mean Error = ${meanErr} m, Max Error = ${maxErr} m, Mean Confidence = ${meanConf}%`);
}
