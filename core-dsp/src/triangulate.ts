/**
 * @file triangulate.ts
 * @brief End-to-end Acoustic TDOA Pipe Rupture Triangulation with Adaptive Noise Rejection
 */

import { PipeParameters, AcousticBurst, LocalizationResult, TriangulationOptions } from './types.js';
import { calculateKortewegWaveSpeed } from './korteweg.js';
import { computeGCCPhat } from './gccPhat.js';
import { zeroPhaseBandpass, computeSTALTA, extractGatedWindow } from './adaptiveFilter.js';

export function triangulatePipeLeak(
  params: PipeParameters,
  nodeABurst: AcousticBurst,
  nodeBBurst: AcousticBurst,
  groundTruthM?: number,
  options?: TriangulationOptions
): LocalizationResult {
  const v_s = calculateKortewegWaveSpeed(params);
  const L = params.lengthM ?? (params as any).lengthMeters ?? 500;
  const fs = nodeABurst.sampleRateHz ?? (nodeABurst as any).sampleRate ?? (nodeABurst as any).sample_rate_hz ?? 10000;

  const minHz = options?.passbandMinHz ?? 770;
  const maxHz = options?.passbandMaxHz ?? 930;
  const taperHz = options?.taperWidthHz ?? 70;
  const bandLimited = options?.bandLimited ?? true;
  const useGating = options?.useAdaptiveGating ?? false;

  // Acoustic resonance pre-filtering: 4th-order zero-phase Butterworth bandpass
  let cleanA: Float64Array | number[] = nodeABurst.samples;
  let cleanB: Float64Array | number[] = nodeBBurst.samples;
  if (nodeABurst.samples && nodeABurst.samples.length >= 16) {
    cleanA = zeroPhaseBandpass(nodeABurst.samples, fs, minHz, maxHz);
  }
  if (nodeBBurst.samples && nodeBBurst.samples.length >= 16) {
    cleanB = zeroPhaseBandpass(nodeBBurst.samples, fs, minHz, maxHz);
  }

  // Maximum feasible physical acoustic transit delay across pipe length L: |Δt| <= L / v_s
  const maxFeasibleDelaySec = L / v_s;

  let deltaTSeconds = 0.0;
  let deltaTMilliseconds = 0.0;
  let confidenceScore = 0.0;

  if (useGating) {
    // Step 2: Dual-Window STA/LTA Transient Onset Gating
    const staResA = computeSTALTA(cleanA, 50, 400);
    const staResB = computeSTALTA(cleanB, 50, 400);

    const winLen = Math.min(2048, Math.max(1024, Math.ceil((L / v_s) * fs * 1.5)));
    const gated = extractGatedWindow(
      cleanA,
      cleanB,
      staResA.primaryOnsetIndex,
      staResB.primaryOnsetIndex,
      winLen,
      256
    );

    // Step 3: Band-Limited GCC-PHAT on the gated transient frame
    const pipeLength = params.lengthM ?? (params as any).lengthMeters ?? 500;
    const maxSegmentDelaySec = Math.min(0.015, Math.max(0.005, (pipeLength / v_s) * 0.05));
    const gccGated = computeGCCPhat(
      gated.gatedA,
      gated.gatedB,
      fs,
      maxSegmentDelaySec,
      { minFreqHz: minHz, maxFreqHz: maxHz, bandLimited: true, taperWidthHz: taperHz }
    );

    // Map gated segment lag back to original full buffer delay:
    // lag_total = (startB - startA) + lag_segment
    const totalLagSamples = gated.baseOffsetSamples + gccGated.deltaTSeconds * fs;
    deltaTSeconds = totalLagSamples / fs;
    deltaTMilliseconds = deltaTSeconds * 1000.0;
    confidenceScore = gccGated.confidenceScore;

    // Sanity check physical bounds: if gated result violates physical limits, fall back to full-buffer
    if (Math.abs(deltaTSeconds) > maxFeasibleDelaySec) {
      const gccFull = computeGCCPhat(cleanA, cleanB, fs, maxFeasibleDelaySec, {
        minFreqHz: minHz,
        maxFreqHz: maxHz,
        bandLimited: bandLimited,
        taperWidthHz: taperHz
      });
      deltaTSeconds = gccFull.deltaTSeconds;
      deltaTMilliseconds = gccFull.deltaTMilliseconds;
      confidenceScore = gccFull.confidenceScore;
    }
  } else {
    // Direct Full-Buffer Band-Limited GCC-PHAT
    const gcc = computeGCCPhat(cleanA, cleanB, fs, maxFeasibleDelaySec, {
      minFreqHz: minHz,
      maxFreqHz: maxHz,
      bandLimited: bandLimited,
      taperWidthHz: taperHz
    });
    deltaTSeconds = gcc.deltaTSeconds;
    deltaTMilliseconds = gcc.deltaTMilliseconds;
    confidenceScore = gcc.confidenceScore;

    // Carrier cycle verification: resolve narrowband carrier sidelobe ambiguity
    // when a broadband acoustic shockwave is prominent in raw sensors
    if (bandLimited && nodeABurst.samples && nodeBBurst.samples && nodeABurst.samples.length >= 16) {
      const gccBroad = computeGCCPhat(nodeABurst.samples, nodeBBurst.samples, fs, maxFeasibleDelaySec, {
        bandLimited: false
      });
      if (gccBroad.peakValue > 0.038 && gcc.peakValue < 0.015) {
        const fc = (minHz + maxHz) / 2.0; // resonant center frequency
        const T = 1.0 / fc;
        const cycleDiff = (gcc.deltaTSeconds - gccBroad.deltaTSeconds) / T;
        const k = Math.round(cycleDiff);
        if (Math.abs(cycleDiff - k) < 0.35 && Math.abs(k) >= 2) {
          deltaTSeconds = gcc.deltaTSeconds - k * T;
          deltaTMilliseconds = deltaTSeconds * 1000.0;
        }
      }
    }
  }

  // Strict physical travel-time boundary enforcement: |Δt| <= L / v_s
  if (deltaTSeconds > maxFeasibleDelaySec) {
    deltaTSeconds = maxFeasibleDelaySec;
  } else if (deltaTSeconds < -maxFeasibleDelaySec) {
    deltaTSeconds = -maxFeasibleDelaySec;
  }
  deltaTMilliseconds = deltaTSeconds * 1000.0;

  // Rupture Triangulation formula:
  // If burst reaches Node A first (leak closer to Node A): t1 < t2 => delta_t = t2 - t1 > 0
  // x_from_A = (L - v_s * delta_t) / 2
  let estimatedLeakDistanceM = (L - v_s * deltaTSeconds) / 2.0;

  // Constrain within physical pipe bounds [0, L]
  estimatedLeakDistanceM = Math.max(0.0, Math.min(L, estimatedLeakDistanceM));
  const distanceFromNodeBM = L - estimatedLeakDistanceM;

  let errorM: number | undefined = undefined;
  if (groundTruthM !== undefined) {
    errorM = Number(Math.abs(estimatedLeakDistanceM - groundTruthM).toFixed(2));
  }

  return {
    estimatedLeakDistanceM: Number(estimatedLeakDistanceM.toFixed(2)),
    distanceFromNodeBM: Number(distanceFromNodeBM.toFixed(2)),
    waveSpeedMs: v_s,
    deltaTMilliseconds: Number(deltaTMilliseconds.toFixed(4)),
    confidenceScore,
    groundTruthM,
    localizationErrorM: errorM
  };
}
