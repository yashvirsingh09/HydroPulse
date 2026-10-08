/**
 * @file types.ts
 * @brief Core Type Definitions for HydroPulse DSP, Spectrogram & Acoustic Triangulation
 */

export type PipeMaterialKey = 'DUCTILE_IRON' | 'CAST_IRON' | 'MILD_STEEL' | 'HDPE';

export interface PipeMaterialSpec {
  key: PipeMaterialKey;
  name: string;
  youngsModulusPa: number;
  poissonsRatio: number;
  densityKgM3: number;
  standardCode: string;
  description: string;
}

export interface PipeParameters {
  lengthM: number;            // Distance between Sensor 1 and Sensor 2 (m)
  lengthMeters?: number;      // Optional alias
  diameterM?: number;         // Internal pipe diameter (m)
  innerDiameterM?: number;    // Optional alias
  wallThicknessM: number;     // Pipe wall thickness (m)
  material?: PipeMaterialKey | string; // Optional material key
  youngsModulusPa?: number;   // Material elasticity (default: looked up from material or 2.0e11 Pa)
  bulkModulusPa?: number;     // Fluid bulk modulus (default: 2.15e9 Pa for water)
  fluidDensityKgM3?: number;  // Fluid density (default: 1000 kg/m^3)
}

export interface AcousticBurst {
  nodeId: number;
  sampleRateHz?: number;
  samples: number[];
  timestampUs?: number;
}

export interface GCCPhatResult {
  deltaTSeconds: number;
  deltaTMilliseconds: number;
  sampleLag: number;
  peakValue: number;
  confidenceScore: number;     // 0.0 to 100.0 %
  correlationCurve: number[];  // Whitened cross-correlation values around peak
  lagIndices: number[];        // Corresponding lag indices
}

export interface LocalizationResult {
  estimatedLeakDistanceM: number; // Distance from Node 1 (m)
  distanceFromNodeBM: number;     // Distance from Node 2 (m)
  waveSpeedMs: number;            // Korteweg wave speed (m/s)
  deltaTMilliseconds: number;     // Time difference of arrival (ms)
  confidenceScore: number;        // Percentage based on GCC peak sharpness
  groundTruthM?: number;          // Ground truth for validation
  localizationErrorM?: number;    // Absolute error |estimated - ground_truth|
}

/**
 * Output data structure representing a Short-Time Fourier Transform (STFT) spectrogram.
 */
export interface SpectrogramData {
  /** Array of frame timestamps in seconds [t_0, t_1, ... t_{K-1}] */
  timeBins: number[];
  /** Array of frequency bin center frequencies in Hz [f_0, f_1, ... f_{F-1}] */
  freqBins: number[];
  /** 2D power matrix indexed by [timeIndex][freqBinIndex] (size K x F) */
  powerMatrixDb: number[][];
  /** Sampling frequency utilized for computation (e.g. 10000 Hz) */
  sampleRateHz?: number;
  /** FFT frame window size in samples (e.g. 128) */
  windowSize?: number;
  /** Frame hop stride in samples (e.g. 32) */
  hopSize?: number;
  /** Minimum power value or floor in dB */
  minPowerDb?: number;
  /** Maximum power value in dB */
  maxPowerDb?: number;
  /** Frequency bin in Hz exhibiting global peak energy */
  dominantFrequencyHz?: number;
  /** Timestamp in seconds where peak transient impact occurred */
  peakEnergyTimeSec?: number;
}

/**
 * Configuration options for STFT spectrogram generation.
 */
export interface STFTOptions {
  /** STFT frame size N (default: 128, rounded up to next power of two) */
  windowSize?: number;
  /** Frame hop stride H (default: 32, representing 75% overlap) */
  hopSize?: number;
  /** Whether to normalize powerMatrixDb values into [0.0, 1.0] range (default: false) */
  normalize?: boolean;
  /** Dynamic range floor below peak in dB (default: 80 dB) */
  dynamicRangeDb?: number;
}

export type ScenarioId = 'DEL-BAWANA-01' | 'DEL-ROHINI-04' | 'DEL-WAZIRABAD-02' | 'DEL-OKHLA-03';

export interface DelhiScenarioSpec {
  id: ScenarioId;
  pipeId: string;
  name: string;
  location: string;
  pipeParams: PipeParameters;
  coordinates: {
    nodeA: [number, number]; // [lat, lng]
    nodeB: [number, number];
  };
  material: PipeMaterialKey;
  prvValveId: string;
  nominalWaveSpeedMs: number;
  defaultRuptureDistanceM: number;
  defaultSnrDb: number;
  description: string;
}

export interface SyntheticBurstOptions {
  scenarioId?: ScenarioId;
  pipeParams?: PipeParameters;
  leakDistanceM?: number;
  snrDb?: number;
  sampleRateHz?: number;
  durationSec?: number;
  centerFreqHz?: number;
  attenuationAlpha?: number;
  includeTrafficRumble?: boolean;
  seed?: number; // Optional seed for deterministic reproducibility
}

export interface SyntheticBurstPayload {
  metadata: {
    scenarioId?: string;
    pipe_length_m: number;
    pipe_diameter_m: number;
    wall_thickness_m: number;
    material: string;
    wave_speed_m_s: number;
    sample_rate_hz: number;
    ground_truth_leak_m: number;
    ground_truth_delta_t_ms: number;
    snr_db: number;
    leak_coordinates?: [number, number];
  };
  node_a: AcousticBurst;
  node_b: AcousticBurst;
  cleanSignalA?: number[];
  cleanSignalB?: number[];
}

export interface GCCPhatOptions {
  minFreqHz?: number;         // Lower passband cutoff (default: 300 Hz)
  maxFreqHz?: number;         // Upper passband cutoff (default: 2200 Hz)
  bandLimited?: boolean;      // Enable band-limited Tukey tapering (default: true)
  taperWidthHz?: number;      // Taper transition width in Hz (default: 100 Hz)
}

export interface TriangulationOptions {
  useAdaptiveGating?: boolean; // Enable STA/LTA transient window gating (default: true)
  passbandMinHz?: number;      // Lower bandpass cutoff (default: 300 Hz)
  passbandMaxHz?: number;      // Upper bandpass cutoff (default: 2200 Hz)
  bandLimited?: boolean;       // Enable band-limited cross-spectral weighting (default: false)
}

export interface ScenarioBenchmarkMetric {
  scenarioId: string;
  scenarioName: string;
  pipeMaterial: string;
  pipeLengthM: number;
  snrDb: number;
  totalRuns: number;
  meanErrorM: number;
  maxErrorM: number;
  stdDevM: number;
  subMeterPassRatePct: number;    // % of runs with error <= 1.5 m (Target: 100%)
  meanConfidencePct: number;
  meanExecutionTimeMs: number;
}

export interface FullBenchmarkSuiteResult {
  timestamp: string;
  totalRuns: number;
  overallPassedRuns: number;
  overallPassRatePct: number;
  overallMeanErrorM: number;
  overallMaxErrorM: number;
  overallStdDevM: number;
  scenarioMetrics: ScenarioBenchmarkMetric[];
}
