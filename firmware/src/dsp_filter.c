/**
 * @file dsp_filter.c
 * @brief Direct Form II Transposed Biquad Filter Implementation
 */

#include "../include/dsp_filter.h"
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846f
#endif

void Biquad_InitBandpass(BiquadFilter_t *filter, float sample_rate, float center_freq, float q_factor) {
    float omega = 2.0f * (float)M_PI * center_freq / sample_rate;
    float alpha = sinf(omega) / (2.0f * q_factor);

    float b0 = alpha;
    float b1 = 0.0f;
    float b2 = -alpha;
    float a0 = 1.0f + alpha;
    float a1 = -2.0f * cosf(omega);
    float a2 = 1.0f - alpha;

    /* Normalize by a0 */
    filter->b0 = b0 / a0;
    filter->b1 = b1 / a0;
    filter->b2 = b2 / a0;
    filter->a1 = a1 / a0;
    filter->a2 = a2 / a0;

    filter->w1 = 0.0f;
    filter->w2 = 0.0f;
}

float Biquad_Process(BiquadFilter_t *filter, float input) {
    /* Direct Form II Transposed structure */
    float output = filter->b0 * input + filter->w1;
    filter->w1 = filter->b1 * input - filter->a1 * output + filter->w2;
    filter->w2 = filter->b2 * input - filter->a2 * output;
    return output;
}
