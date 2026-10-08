# 📟 HydroPulse Edge Sensor Firmware Architecture

## Hardware Target
* **Microcontroller:** STM32F401RE / ESP32-WROOM-32
* **Analog Front-End (AFE):** Piezoelectric Hydrophone transducer conditioned via low-noise operational amplifier (TLV2772) + high-speed 16-bit ADC (ADS1256 or internal SAR ADC).
* **Clock Synchronization:** PTP (IEEE 1588) or PPS from GPS module for sub-microsecond timestamp alignment across distributed nodes.

## Firmware Features
1. **DMA Double-Buffering (Circular Buffer):** 
   Continuous 10,000 samples/sec (10 kHz) sampling without CPU blocking.
2. **Wake-on-Transient Event Detection:**
   The sensor remains in low-power listening mode. When an acoustic shock wave (water hammer pressure pulse) exceeds the energy threshold, the pre-trigger and post-trigger windows (1.0 second total) are frozen into a packet.
3. **Hardware Biquad Bandpass Filter:**
   Direct Form II Transposed 2nd-order IIR bandpass ($Q=2.0, f_c=800\text{ Hz}$) stripping 50 Hz AC hum and $<150\text{ Hz}$ surface traffic vibration before threshold evaluation.
4. **AWS IoT Ingestion Protocol:**
   Frames are serialized to JSON / Protocol Buffers and dispatched over cellular/NB-IoT or Wi-Fi to **AWS IoT Core**.
