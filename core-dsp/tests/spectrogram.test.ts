/**
 * @file spectrogram.test.ts
 * @brief Automated Test Suite for STFT Spectrogram Engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeSTFT,
  computeSpectrogram,
  createHannWindow,
  calculateFrequencyBins,
  normalizePowerMatrix
} from '../src/index.js';

describe('Spectrogram Engine Verification', () => {
  it('generates symmetric Hann window with zero boundaries', () => {
    const N = 128;
    const win = createHannWindow(N);
    assert.strictEqual(win.length, N);
    assert.strictEqual(win[0], 0.0);
    assert.strictEqual(win[N - 1], 0.0);
    // Peak at center
    assert.ok(Math.abs(win[64] - 1.0) < 0.01);
    // Symmetry check
    for (let i = 0; i < N / 2; i++) {
      assert.ok(Math.abs(win[i] - win[N - 1 - i]) < 1e-12);
    }
  });

  it('calculates correct frequency bins from DC to Nyquist', () => {
    const bins = calculateFrequencyBins(128, 10000);
    assert.strictEqual(bins.length, 65);
    assert.strictEqual(bins[0], 0);
    assert.strictEqual(bins[64], 5000);
    assert.strictEqual(bins[1], 78.13); // 78.125 rounded to 2 decimals
  });

  it('isolates 850 Hz acoustic rupture frequency in synthetic signal', () => {
    const fs = 10000;
    const samples = new Float64Array(1000);
    for (let i = 0; i < 1000; i++) {
      const t = i / fs;
      samples[i] = Math.sin(2 * Math.PI * 850 * t);
    }

    const result = computeSTFT(samples, fs, 128, 32);
    assert.strictEqual(result.dominantFrequencyHz, 859.38);
    assert.ok(result.powerMatrixDb.length > 0);
    assert.strictEqual(result.powerMatrixDb[0].length, 65);
    assert.ok(result.maxPowerDb !== undefined && result.maxPowerDb > 0);
  });

  it('normalizes power matrix to [0.0, 1.0] intensity range', () => {
    const matrix = [
      [-20, -50, -80],
      [-10, 0, -40]
    ];
    const normalized = normalizePowerMatrix(matrix, 60);
    assert.strictEqual(normalized[1][1], 1.0); // Peak (0 dB) maps to 1.0
    assert.strictEqual(normalized[0][2], 0.0); // Floor (-80 dB < -60 dB) maps to 0.0
    for (const row of normalized) {
      for (const val of row) {
        assert.ok(val >= 0.0 && val <= 1.0);
      }
    }
  });

  it('handles empty input without throwing exception', () => {
    const result = computeSTFT([], 10000);
    assert.strictEqual(result.timeBins.length, 0);
    assert.strictEqual(result.powerMatrixDb.length, 0);
  });
});
