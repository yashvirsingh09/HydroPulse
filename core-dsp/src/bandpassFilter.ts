/**
 * @file bandpassFilter.ts
 * @brief Digital 2nd-Order Biquad Bandpass Filter
 * @note Removes urban traffic rumbling (< 150 Hz) and high-frequency EMI noise (> 2500 Hz)
 */

export class BiquadBandpass {
  private b0: number = 0;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;
  private w1: number = 0;
  private w2: number = 0;

  constructor(sampleRateHz: number = 10000, centerFreqHz: number = 800, qFactor: number = 2.0) {
    const omega = (2.0 * Math.PI * centerFreqHz) / sampleRateHz;
    const alpha = Math.sin(omega) / (2.0 * qFactor);

    const b0 = alpha;
    const b1 = 0.0;
    const b2 = -alpha;
    const a0 = 1.0 + alpha;
    const a1 = -2.0 * Math.cos(omega);
    const a2 = 1.0 - alpha;

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  public process(input: number): number {
    const output = this.b0 * input + this.w1;
    this.w1 = this.b1 * input - this.a1 * output + this.w2;
    this.w2 = this.b2 * input - this.a2 * output;
    return output;
  }

  public filterArray(samples: number[]): number[] {
    const result = new Array<number>(samples.length);
    for (let i = 0; i < samples.length; i++) {
      result[i] = this.process(samples[i]);
    }
    return result;
  }

  public reset(): void {
    this.w1 = 0;
    this.w2 = 0;
  }
}
