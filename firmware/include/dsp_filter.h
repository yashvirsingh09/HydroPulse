/**
 * @file dsp_filter.h
 * @brief Edge Digital Signal Processing Filter for Acoustic Hydrophones
 * @note Rejects low-frequency traffic rumble (< 150 Hz) and high-frequency RF noise (> 2500 Hz)
 */

#ifndef DSP_FILTER_H
#define DSP_FILTER_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    float b0, b1, b2;
    float a1, a2;
    float w1, w2; /* State variables for Direct Form II Transposed */
} BiquadFilter_t;

/**
 * @brief Initialize 2nd-order Direct Form II Transposed Bandpass Filter
 * @param filter Pointer to filter struct
 * @param sample_rate Sampling rate in Hz (e.g. 10000)
 * @param center_freq Center frequency in Hz (e.g. 800 Hz)
 * @param q_factor Q factor of the bandpass
 */
void Biquad_InitBandpass(BiquadFilter_t *filter, float sample_rate, float center_freq, float q_factor);

/**
 * @brief Process single sample through biquad stage
 */
float Biquad_Process(BiquadFilter_t *filter, float input);

#ifdef __cplusplus
}
#endif

#endif /* DSP_FILTER_H */
