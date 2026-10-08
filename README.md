# 💧 HydroPulse (हाइड्रोपल्स)
### Autonomous Acoustic Water Hammer & Pipe Rupture Triangulation System

[![Track: Heat and Water](https://img.shields.io/badge/WeMakeDevs%20Hackathon-Track%2002%3A%20Heat%20%26%20Water-blue.svg)](https://www.wemakedevs.org/aws/env)
[![AWS Architecture](https://img.shields.io/badge/Cloud-AWS%20Serverless%20%2B%20IoT-orange.svg)](https://aws.amazon.com)
[![Hardware Architecture](https://img.shields.io/badge/Embedded-STM32%20%2F%20ESP32%20C%20Firmware-green.svg)](firmware/)
[![DSP Engine](https://img.shields.io/badge/DSP-GCC--PHAT%20%2B%20Wavelet%20Denoising-purple.svg)](core-dsp/)

---

## 📌 Executive Summary
Municipal water utilities across India (Delhi Jal Board, BWSSB Bengaluru) lose **35% to 50% of pumped potable water** to Non-Revenue Water (NRW)—invisible underground pipe ruptures and water hammer pressure surges. Digging up paved roads blindly costs hundreds of crores and halts urban traffic.

**HydroPulse** solves this through a multi-tier cyber-physical systems architecture:
1. **Embedded Sensor Nodes (`firmware/`):** High-speed acoustic hydrophones sampling at 10 kHz with DMA ring buffers and low-power transient wake-up interrupts.
2. **Physics & Acoustic Simulation (`physics-engine/`):** High-fidelity synthetic pipe transient generator modeling Korteweg fluid-structure wave mechanics and urban traffic noise.
3. **Core DSP Engine (`core-dsp/`):** High-performance TypeScript implementation of **GCC-PHAT** (Generalized Cross-Correlation with Phase Transform) and **Korteweg wave speed calculations** to achieve **sub-meter leak localization ($\pm 1.5$ m)**.
4. **AWS Serverless Cloud (`backend-aws/`):** Event-driven Lambda pipeline with DynamoDB state management, automated PRV valve throttling, and Amazon SNS incident dispatch.
5. **Operator SCADA Console (`web-console/`):** Next.js 15 + Tailwind CSS dashboard with Web Audio API oscilloscopes, GCC-PHAT peak visualization, interactive Delhi GIS mapping, and manual actuator overrides.

---

## 🏗️ System Architecture

```
[ Physical Water Network ]
        │ (Pipe Burst / Water Hammer Transient)
        ▼
[ Dual Hydrophone Nodes (10 kHz ADC) ] ── (Embedded C DMA Ring Buffer)
        │
        ▼ (MQTT / REST Burst Telemetry)
[ AWS IoT Core / API Gateway ]
        │
        ▼
[ AWS Lambda: Core DSP & Physics Engine ]
        ├── Korteweg Wave Speed Calculation (vs ≈ 1240 m/s)
        ├── 4th-Order Bandpass / DWT Noise Rejection
        └── GCC-PHAT Cross-Correlation (Δt extraction)
        │
        ├─────────────────────────────┬─────────────────────────────┐
        ▼                             ▼                             ▼
[ Amazon DynamoDB ]       [ Autonomous Closed-Loop ]      [ Web Console ]
- Incident Registry       - Auto-throttle PRV Valve       - Interactive Delhi GIS Map
- Pipe Telemetry Records  - Amazon SNS Dispatch Alert     - Live Audio & Spectrograms
```

---

## 📐 Mathematical Model

### 1. Korteweg Fluid-Structure Wave Speed Equation
$$v_s = \sqrt{\frac{K / \rho}{1 + \left(\frac{K}{E}\right)\left(\frac{D}{e}\right)}}$$
* $K = 2.15 \times 10^9 \text{ Pa}$ (Bulk modulus of water)
* $\rho = 1000 \text{ kg/m}^3$ (Fluid density)
* $E = 2.0 \times 10^{11} \text{ Pa}$ (Young's modulus of Ductile Iron)
* $D$ = Pipe inner diameter, $e$ = Pipe wall thickness

### 2. Time Difference of Arrival (TDOA) via GCC-PHAT
$$R_{x_1 x_2}^{\text{PHAT}}(\tau) = \mathcal{F}^{-1} \left[ \frac{X_1(\omega) X_2^*(\omega)}{|X_1(\omega) X_2^*(\omega)|} \right]$$
The Phase Transform (PHAT) whitens the cross-power spectrum, compressing reverberations and noise into a sharp Kronecker delta peak at delay $\Delta t$.

### 3. Leak Distance Pinpoint
$$x = \frac{L - v_s \cdot \Delta t}{2}$$

---

## 📁 Repository Structure
```
hydropulse/
├── docs/               # System architecture & mathematical derivations
├── firmware/           # Embedded C sensor node firmware (STM32/ESP32)
├── physics-engine/     # Synthetic acoustic wave generator (Python)
├── core-dsp/           # TypeScript GCC-PHAT & Korteweg library + unit tests
├── backend-aws/        # AWS Lambda handlers & DynamoDB integration
└── web-console/        # Next.js SCADA Operator Dashboard
```
