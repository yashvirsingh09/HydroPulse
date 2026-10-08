import { DELHI_PIPE_SCENARIOS, calculateKortewegWaveSpeed } from '../../../core-dsp/dist/src/index.js';
import { zeroPhaseBandpass, computeSTALTA, extractGatedWindow } from '../../../core-dsp/dist/src/adaptiveFilter.js';
import { computeGCCPhat } from '../../../core-dsp/dist/src/gccPhat.js';

function createMulberry32(seed) {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateAlignedBurst({ scenarioId, snrDb, seed }) {
  const scen = DELHI_PIPE_SCENARIOS[scenarioId];
  const pipeParams = scen.pipeParams;
  const v_s = calculateKortewegWaveSpeed(pipeParams);
  const L = pipeParams.lengthM;
  const leakDistA = scen.defaultRuptureDistanceM;
  const leakDistB = L - leakDistA;
  const fs = 10000;
  const totalSamples = 10000;
  const centerFreq = 850.0;

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

  const gainA = Math.exp(-0.0012 * leakDistA);
  const gainB = Math.exp(-0.0012 * leakDistB);

  const t0 = 0.05;
  const cleanA = new Float64Array(totalSamples);
  const cleanB = new Float64Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;
    const gaussian = Math.exp(-0.5 * Math.pow((t - t0) / 0.004, 2));
    let ringing = 0.0;
    if (t >= t0) {
      const dt = t - t0;
      ringing = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * 150.0);
    }
    const pulse = 0.7 * gaussian + 0.3 * ringing;

    const targetIdxA = i + shiftA;
    if (targetIdxA < totalSamples) cleanA[targetIdxA] += pulse * gainA;

    const targetIdxB = i + shiftB;
    if (targetIdxB < totalSamples) cleanB[targetIdxB] += pulse * gainB;
  }

  const noiseStd = Math.pow(10.0, -snrDb / 20.0) * 0.15;
  const rawA = new Float64Array(totalSamples);
  const rawB = new Float64Array(totalSamples);
  let peakMag = 1e-6;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;
    const trafficA = 0.05 * Math.sin(2.0 * Math.PI * 38.0 * t);
    const trafficB = 0.05 * Math.sin(2.0 * Math.PI * 54.0 * t);

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

  return {
    metadata: {
      ground_truth_leak_m: leakDistA,
      ground_truth_delta_t_ms: (delaySecB - delaySecA) * 1000.0,
      sample_rate_hz: fs
    },
    node_a: { nodeId: 1, sampleRateHz: fs, samples: adcA },
    node_b: { nodeId: 2, sampleRateHz: fs, samples: adcB }
  };
}

function triangulateProposed(scen, burst) {
  const params = scen.pipeParams;
  const v_s = calculateKortewegWaveSpeed(params);
  const L = params.lengthM;
  const fs = burst.node_a.sampleRateHz ?? 10000;
  const minHz = 450, maxHz = 1500;

  const cleanA = zeroPhaseBandpass(burst.node_a.samples, fs, minHz, maxHz);
  const cleanB = zeroPhaseBandpass(burst.node_b.samples, fs, minHz, maxHz);

  const maxFeasibleDelaySec = (L / v_s) * 1.05;

  const staResA = computeSTALTA(cleanA, 60, 500);
  const staResB = computeSTALTA(cleanB, 60, 500);

  const winLen = Math.min(2048, Math.max(1024, Math.ceil((L / v_s) * fs * 1.5)));
  const gated = extractGatedWindow(
    cleanA,
    cleanB,
    staResA.primaryOnsetIndex,
    staResB.primaryOnsetIndex,
    winLen,
    256
  );

  // Narrow segment search (4 ms = 40 samples):
  const maxSegmentDelaySec = 0.0035;
  const gccGated = computeGCCPhat(
    gated.gatedA,
    gated.gatedB,
    fs,
    maxSegmentDelaySec,
    { minFreqHz: minHz, maxFreqHz: maxHz, bandLimited: true }
  );

  const totalLagSamples = gated.baseOffsetSamples + gccGated.deltaTSeconds * fs;
  let deltaTSeconds = totalLagSamples / fs;

  if (Math.abs(deltaTSeconds) > maxFeasibleDelaySec) {
    const gccFull = computeGCCPhat(cleanA, cleanB, fs, maxFeasibleDelaySec, {
      minFreqHz: minHz,
      maxFreqHz: maxHz,
      bandLimited: true
    });
    deltaTSeconds = gccFull.deltaTSeconds;
  }

  let estDist = (L - v_s * deltaTSeconds) / 2.0;
  estDist = Math.max(0, Math.min(L, estDist));
  return estDist;
}

const scenarios = Object.values(DELHI_PIPE_SCENARIOS);
const snrLevels = [24, 18, 12, 6];
const baseSeeds = [101, 202, 303, 404, 505];

let total = 0, passed = 0;
const failures = [];
let allErrors = [];

for (const scen of scenarios) {
  for (const snr of snrLevels) {
    for (let r = 0; r < 5; r++) {
      total++;
      const burst = generateAlignedBurst({
        scenarioId: scen.id,
        snrDb: snr,
        seed: baseSeeds[r]
      });

      const est = triangulateProposed(scen, burst);
      const truth = burst.metadata.ground_truth_leak_m;
      const err = Math.abs(est - truth);
      allErrors.push(err);

      if (err <= 1.5) {
        passed++;
      } else {
        failures.push({
          scen: scen.id,
          snr,
          run: r + 1,
          seed: baseSeeds[r],
          err: Number(err.toFixed(3)),
          est: Number(est.toFixed(2)),
          truth
        });
      }
    }
  }
}

const meanErr = allErrors.reduce((a,b) => a+b, 0) / allErrors.length;
const maxErr = Math.max(...allErrors);

console.log(`\n======================================================`);
console.log(`PROPOSED RECIPE BENCHMARK EVALUATION (maxSegmentDelaySec = 0.0035):`);
console.log(`- Passed: ${passed} / ${total} (${(passed / total * 100).toFixed(1)}%)`);
console.log(`- Mean Error: ${meanErr.toFixed(3)} m`);
console.log(`- Max Error: ${maxErr.toFixed(3)} m`);
console.log(`======================================================`);

if (failures.length > 0) {
  console.log('FAILURES:');
  console.table(failures);
}
