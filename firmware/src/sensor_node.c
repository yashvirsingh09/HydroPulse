/**
 * @file sensor_node.c
 * @brief HydroPulse Edge Node Ring Buffer & Transient Detection
 */

#include "../include/sensor_node.h"
#include "../include/dsp_filter.h"
#include <string.h>
#include <stdlib.h>

static uint32_t s_node_id = 1;
static CircularBuffer_t s_dma_ring_buffer;
static BiquadFilter_t s_bandpass_filter;
static bool s_transient_active = false;
static uint32_t s_samples_after_trigger = 0;

void SensorNode_Init(uint32_t node_id) {
    s_node_id = node_id;
    memset(&s_dma_ring_buffer, 0, sizeof(CircularBuffer_t));
    s_dma_ring_buffer.head = 0;
    s_dma_ring_buffer.tail = 0;
    s_dma_ring_buffer.is_full = false;
    s_transient_active = false;
    s_samples_after_trigger = 0;

    /* Initialize bandpass filter: center 800 Hz, Q = 2.0 at 10 kHz sample rate */
    Biquad_InitBandpass(&s_bandpass_filter, (float)SAMPLING_RATE_HZ, 800.0f, 2.0f);
}

void SensorNode_ProcessADCSample(int16_t raw_adc_value) {
    /* Write to circular buffer */
    s_dma_ring_buffer.buffer[s_dma_ring_buffer.head] = raw_adc_value;
    s_dma_ring_buffer.head = (s_dma_ring_buffer.head + 1) % RING_BUFFER_SIZE;

    /* Apply DSP filter to test energy envelope */
    float filtered = Biquad_Process(&s_bandpass_filter, (float)raw_adc_value);

    /* Absolute energy thresholding */
    if (!s_transient_active) {
        if (fabsf(filtered) > (float)TRANSIENT_THRESHOLD) {
            s_transient_active = true;
            s_samples_after_trigger = 0;
        }
    } else {
        s_samples_after_trigger++;
    }
}

bool SensorNode_IsTransientDetected(void) {
    return s_transient_active;
}

bool SensorNode_CaptureBurst(AcousticBurstFrame_t *out_frame) {
    if (!s_transient_active || s_samples_after_trigger < (RING_BUFFER_SIZE - PRE_TRIGGER_SAMPLES)) {
        return false; /* Still collecting remaining post-trigger window */
    }

    out_frame->node_id = s_node_id;
    out_frame->timestamp_us = 1728345600000000ULL; /* Synthetic or hardware GPS clock */
    out_frame->sample_rate = SAMPLING_RATE_HZ;
    out_frame->sample_count = RING_BUFFER_SIZE;
    out_frame->peak_amplitude_pa = 4250.0f; /* Approx ~0.04 bar acoustic shock */
    out_frame->ambient_temp_c = 28.5f;

    /* Unroll circular buffer linearly into frame */
    uint32_t start_idx = (s_dma_ring_buffer.head + RING_BUFFER_SIZE - RING_BUFFER_SIZE) % RING_BUFFER_SIZE;
    for (uint32_t i = 0; i < RING_BUFFER_SIZE; i++) {
        out_frame->samples[i] = s_dma_ring_buffer.buffer[(start_idx + i) % RING_BUFFER_SIZE];
    }

    /* Reset transient state for next event */
    s_transient_active = false;
    s_samples_after_trigger = 0;
    return true;
}
