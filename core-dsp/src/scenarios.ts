/**
 * @file scenarios.ts
 * @brief Real-world Delhi Municipal Pipe Scenarios and Pure TypeScript Synthetic Burst Generator
 * @details Models Delhi Jal Board (DJB) pipelines and simulates high-fidelity dual-channel acoustic transients.
 */

import {
  PipeParameters,
  ScenarioId,
  DelhiScenarioSpec,
  SyntheticBurstOptions,
  SyntheticBurstPayload,
  AcousticBurst
} from './types.js';
import {
  calculateKortewegWaveSpeed,
  YOUNGS_MODULUS_DUCTILE_IRON,
  YOUNGS_MODULUS_CAST_IRON,
  YOUNGS_MODULUS_MILD_STEEL,
  YOUNGS_MODULUS_HDPE
} from './korteweg.js';

// ============================================================================
// 1. Delhi Pipe Network Scenario Catalog
// ============================================================================

export const DELHI_PIPE_SCENARIOS: Record<ScenarioId, DelhiScenarioSpec> = {
  'DEL-BAWANA-01': {
    id: 'DEL-BAWANA-01',
    pipeId: 'PIPE-DEL-DTU-01',
    name: 'Main Bawana Road Trunk Line (Near DTU)',
    location: 'Shahbad Daulatpur, Bawana Rd, Delhi 110042',
    pipeParams: {
      lengthM: 500.0,
      diameterM: 0.400,
      wallThicknessM: 0.012,
      material: 'DUCTILE_IRON',
      youngsModulusPa: YOUNGS_MODULUS_DUCTILE_IRON
    },
    coordinates: {
      nodeA: [28.7495, 77.1165],
      nodeB: [28.7532, 77.1198]
    },
    material: 'DUCTILE_IRON',
    prvValveId: 'PRV-DTU-VALVE-01',
    nominalWaveSpeedMs: 1258.10,
    defaultRuptureDistanceM: 185.0,
    defaultSnrDb: 18.0,
    description: 'Heavy industrial ductile iron trunk conduit running along Bawana Industrial Area road.'
  },

  'DEL-ROHINI-04': {
    id: 'DEL-ROHINI-04',
    pipeId: 'PIPE-DEL-ROHINI-04',
    name: 'Rohini Sector 16 Feeder Sub-Main',
    location: 'Sector 16, Rohini, Delhi 110089',
    pipeParams: {
      lengthM: 620.0,
      diameterM: 0.300,
      wallThicknessM: 0.0088,
      material: 'CAST_IRON',
      youngsModulusPa: YOUNGS_MODULUS_CAST_IRON
    },
    coordinates: {
      nodeA: [28.7350, 77.1210],
      nodeB: [28.7390, 77.1260]
    },
    material: 'CAST_IRON',
    prvValveId: 'PRV-ROH-VALVE-04',
    nominalWaveSpeedMs: 1113.85,
    defaultRuptureDistanceM: 250.0,
    defaultSnrDb: 18.0,
    description: 'High-density urban residential distribution feeder constructed from centrifugal cast iron.'
  },

  'DEL-WAZIRABAD-02': {
    id: 'DEL-WAZIRABAD-02',
    pipeId: 'PIPE-DEL-WAZIRABAD-02',
    name: 'Wazirabad Transmission Main (Outer Ring Rd)',
    location: 'Wazirabad WTP to Burari Junction, Outer Ring Rd, Delhi 110054',
    pipeParams: {
      lengthM: 1200.0,
      diameterM: 0.900,
      wallThicknessM: 0.0192,
      material: 'MILD_STEEL',
      youngsModulusPa: YOUNGS_MODULUS_MILD_STEEL
    },
    coordinates: {
      nodeA: [28.7120, 77.2150],
      nodeB: [28.7210, 77.2080]
    },
    material: 'MILD_STEEL',
    prvValveId: 'PRV-WAZ-VALVE-02',
    nominalWaveSpeedMs: 1205.32,
    defaultRuptureDistanceM: 450.0,
    defaultSnrDb: 18.0,
    description: 'Bulk raw & treated water conveyance mild steel trunk pipeline running parallel to Yamuna river.'
  },

  'DEL-OKHLA-03': {
    id: 'DEL-OKHLA-03',
    pipeId: 'PIPE-DEL-OKHLA-03',
    name: 'Okhla Phase III Distribution Line',
    location: 'Okhla Industrial Area Phase III, New Delhi 110020',
    pipeParams: {
      lengthM: 300.0,
      diameterM: 0.160,
      wallThicknessM: 0.0144,
      material: 'HDPE',
      youngsModulusPa: YOUNGS_MODULUS_HDPE
    },
    coordinates: {
      nodeA: [28.5350, 77.2710],
      nodeB: [28.5380, 77.2735]
    },
    material: 'HDPE',
    prvValveId: 'PRV-OKH-VALVE-03',
    nominalWaveSpeedMs: 293.91,
    defaultRuptureDistanceM: 120.0,
    defaultSnrDb: 18.0,
    description: 'Modern flexible trenchless polyethylene distribution pipe with high viscoelastic wave damping.'
  }
};

export function getScenario(id: ScenarioId | string): DelhiScenarioSpec | undefined {
  if (id in DELHI_PIPE_SCENARIOS) {
    return DELHI_PIPE_SCENARIOS[id as ScenarioId];
  }
  return Object.values(DELHI_PIPE_SCENARIOS).find(
    (s) => s.pipeId === id || s.id === id || s.name.toLowerCase().includes(id.toLowerCase())
  );
}

export function getAllScenarios(): DelhiScenarioSpec[] {
  return Object.values(DELHI_PIPE_SCENARIOS);
}

// ============================================================================
// 2. Pure TypeScript In-Engine Synthetic Burst Generator
// ============================================================================

/**
 * Minimal fast Mulberry32 PRNG for deterministic, reproducible testing.
 */
function createMulberry32(seed: number) {
  let state = seed | 0;
  return function (): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * In-engine acoustic burst generator simulating dual-hydrophone recordings.
 */
export function generateSyntheticBurst(options: SyntheticBurstOptions = {}): SyntheticBurstPayload {
  const scenario = options.scenarioId ? getScenario(options.scenarioId) : undefined;

  const pipeParams: PipeParameters = options.pipeParams ?? scenario?.pipeParams ?? {
    lengthM: 500.0,
    diameterM: 0.400,
    wallThicknessM: 0.012,
    youngsModulusPa: YOUNGS_MODULUS_DUCTILE_IRON
  };

  const v_s = calculateKortewegWaveSpeed(pipeParams);
  const L = pipeParams.lengthM;
  const leakDistA = options.leakDistanceM ?? scenario?.defaultRuptureDistanceM ?? (L * 0.37);
  const leakDistB = L - leakDistA;

  const fs = options.sampleRateHz ?? 10000;
  const durationSec = options.durationSec ?? 1.0;
  const totalSamples = Math.floor(fs * durationSec);
  const snrDb = options.snrDb ?? scenario?.defaultSnrDb ?? 18.0;
  const centerFreq = options.centerFreqHz ?? 850.0;
  const alpha = options.attenuationAlpha ?? 0.0012;
  const includeTraffic = options.includeTrafficRumble ?? true;

  // PRNG Setup (deterministic if seed provided, otherwise Math.random)
  const rng = options.seed !== undefined ? createMulberry32(options.seed) : Math.random;

  function nextGaussian(): number {
    let u1 = rng();
    let u2 = rng();
    while (u1 <= 1e-15) u1 = rng();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  // Physical Time Delays
  const delaySecA = leakDistA / v_s;
  const delaySecB = leakDistB / v_s;
  const deltaTTrueSec = delaySecB - delaySecA;
  const shiftA = Math.round(delaySecA * fs);
  const shiftB = Math.round(delaySecB * fs);

  // Attenuation factors
  const gainA = Math.exp(-alpha * leakDistA);
  const gainB = Math.exp(-alpha * leakDistB);

  const t0 = 0.05; // Burst originates at 50ms in source reference time

  const cleanA = new Float64Array(totalSamples);
  const cleanB = new Float64Array(totalSamples);

  // Synthesize transient wave packets matching E2E generator
  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;
    const dt = t - t0;
    const gaussian = Math.exp(-0.5 * Math.pow(dt / 0.004, 2));
    let ringing = 0.0;
    if (t >= t0) {
      ringing = Math.sin(2.0 * Math.PI * centerFreq * dt) * Math.exp(-dt * 150.0);
    }
    const pulse = 0.7 * gaussian + 0.3 * ringing;

    const targetIdxA = i + shiftA;
    if (targetIdxA < totalSamples) {
      cleanA[targetIdxA] += pulse * gainA;
    }

    const targetIdxB = i + shiftB;
    if (targetIdxB < totalSamples) {
      cleanB[targetIdxB] += pulse * gainB;
    }
  }

  // Noise Generation (Traffic Rumble + Gaussian White Noise)
  const noiseScale = Math.pow(10.0, -snrDb / 20.0) * 0.15;
  const rawA = new Float64Array(totalSamples);
  const rawB = new Float64Array(totalSamples);
  let peakMagnitude = 1e-6;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / fs;

    // Uncorrelated traffic vibrations
    let trafficA = 0.0;
    let trafficB = 0.0;
    if (includeTraffic) {
      trafficA = 0.05 * Math.sin(2.0 * Math.PI * 38.0 * t);
      trafficB = 0.05 * Math.sin(2.0 * Math.PI * 54.0 * t);
    }

    // AFE White Noise
    const whiteNoiseA = nextGaussian() * noiseScale;
    const whiteNoiseB = nextGaussian() * noiseScale;

    const valA = cleanA[i] + trafficA + whiteNoiseA;
    const valB = cleanB[i] + trafficB + whiteNoiseB;

    rawA[i] = valA;
    rawB[i] = valB;

    const absA = Math.abs(valA);
    const absB = Math.abs(valB);
    if (absA > peakMagnitude) peakMagnitude = absA;
    if (absB > peakMagnitude) peakMagnitude = absB;
  }

  // Scale to 16-bit ADC scale (-32768 to 32767)
  const scale = 30000.0 / peakMagnitude;
  const adcA: number[] = new Array(totalSamples);
  const adcB: number[] = new Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    adcA[i] = Math.max(-32768, Math.min(32767, Math.round(rawA[i] * scale)));
    adcB[i] = Math.max(-32768, Math.min(32767, Math.round(rawB[i] * scale)));
  }

  // Interpolate leak GPS coordinates along pipe vector
  let leakCoordinates: [number, number] | undefined = undefined;
  if (scenario) {
    const frac = Math.max(0, Math.min(1, leakDistA / L));
    const lat = scenario.coordinates.nodeA[0] + frac * (scenario.coordinates.nodeB[0] - scenario.coordinates.nodeA[0]);
    const lng = scenario.coordinates.nodeA[1] + frac * (scenario.coordinates.nodeB[1] - scenario.coordinates.nodeA[1]);
    leakCoordinates = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
  }

  const nodeA: AcousticBurst = {
    nodeId: 1,
    sampleRateHz: fs,
    samples: adcA
  };

  const nodeB: AcousticBurst = {
    nodeId: 2,
    sampleRateHz: fs,
    samples: adcB
  };

  return {
    metadata: {
      scenarioId: scenario?.id,
      pipe_length_m: L,
      pipe_diameter_m: pipeParams.diameterM ?? pipeParams.innerDiameterM ?? 0.4,
      wall_thickness_m: pipeParams.wallThicknessM,
      material: String(pipeParams.material ?? 'DUCTILE_IRON'),
      wave_speed_m_s: v_s,
      sample_rate_hz: fs,
      ground_truth_leak_m: Number(leakDistA.toFixed(2)),
      ground_truth_delta_t_ms: Number((deltaTTrueSec * 1000.0).toFixed(4)),
      snr_db: snrDb,
      leak_coordinates: leakCoordinates
    },
    node_a: nodeA,
    node_b: nodeB,
    cleanSignalA: Array.from(cleanA),
    cleanSignalB: Array.from(cleanB)
  };
}

/**
 * Convenience helper to generate synthetic burst for a named scenario.
 */
export function generateScenarioBurst(
  scenarioId: ScenarioId,
  overrideOptions: Partial<SyntheticBurstOptions> = {}
): SyntheticBurstPayload {
  return generateSyntheticBurst({
    scenarioId,
    ...overrideOptions
  });
}
