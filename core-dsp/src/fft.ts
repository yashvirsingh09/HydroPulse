/**
 * @file fft.ts
 * @brief In-place Radix-2 Cooley-Tukey Fast Fourier Transform (FFT / IFFT)
 * @details Implemented with butterfly stages and twiddle factor lookup,
 * mimicking hardware DSP / ASIC pipeline architectures.
 */

export interface ComplexArray {
  real: Float64Array;
  imag: Float64Array;
  size: number;
}

/**
 * Returns the next power of two >= n
 */
export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

/**
 * In-place Bit-Reversal Permutation
 */
function bitReverse(real: Float64Array, imag: Float64Array, n: number): void {
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
}

/**
 * Performs Forward or Inverse Fast Fourier Transform
 * @param real Real component buffer
 * @param imag Imaginary component buffer
 * @param inverse True for IFFT, False for FFT
 */
export function fft(real: Float64Array, imag: Float64Array, inverse: boolean = false): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error('FFT length must be an exact power of two.');
  }

  bitReverse(real, imag, n);

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (inverse ? 2.0 : -2.0) * Math.PI / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;

      for (let j = 0; j < halfLen; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];

        const vR = real[i + j + halfLen] * wR - imag[i + j + halfLen] * wI;
        const vI = real[i + j + halfLen] * wI + imag[i + j + halfLen] * wR;

        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;

        real[i + j + halfLen] = uR - vR;
        imag[i + j + halfLen] = uI - vI;

        // Twiddle update
        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Scale down for Inverse FFT
  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}
