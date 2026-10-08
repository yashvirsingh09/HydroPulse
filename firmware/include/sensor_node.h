/**
 * @file sensor_node.h
 * @brief HydroPulse Edge Sensor Node Firmware Header
 * @target STM32F4 / ESP32 with external ADC (e.g. ADS1256 or internal ADC + DMA)
 * @author HydroPulse Systems Team (ECE E-Track)
 */

#ifndef SENSOR_NODE_H
#define SENSOR_NODE_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define SAMPLING_RATE_HZ       10000      /* 10 kHz acoustic hydrophone sampling */
#define BUFFER_DURATION_SEC    1          /* 1 second window */
#define RING_BUFFER_SIZE       (SAMPLING_RATE_HZ * BUFFER_DURATION_SEC)
#define TRANSIENT_THRESHOLD    1800       /* ADC threshold above baseline to trigger burst */
#define PRE_TRIGGER_SAMPLES    2000       /* 200 ms of pre-trigger buffer */

/**
 * @brief Sensor telemetry frame structure transmitted to AWS IoT Core
 */
typedef struct __attribute__((packed)) {
    uint32_t node_id;                     /* Unique sensor node identifier */
    uint64_t timestamp_us;               /* Microsecond-synchronized GPS / PTP timestamp */
    uint32_t sample_rate;                /* Sample frequency in Hz */
    uint16_t sample_count;               /* Number of samples in burst */
    float    peak_amplitude_pa;          /* Estimated peak pressure in Pascals */
    float    ambient_temp_c;             /* Ambient soil/water temperature */
    int16_t  samples[RING_BUFFER_SIZE];  /* Raw acoustic ADC readings (16-bit) */
} AcousticBurstFrame_t;

/**
 * @brief Circular Ring Buffer for DMA continuous ADC sampling
 */
typedef struct {
    int16_t  buffer[RING_BUFFER_SIZE];
    volatile uint32_t head;
    volatile uint32_t tail;
    volatile bool     is_full;
} CircularBuffer_t;

/* Public API */
void SensorNode_Init(uint32_t node_id);
void SensorNode_ProcessADCSample(int16_t raw_adc_value);
bool SensorNode_IsTransientDetected(void);
bool SensorNode_CaptureBurst(AcousticBurstFrame_t *out_frame);

#ifdef __cplusplus
}
#endif

#endif /* SENSOR_NODE_H */
