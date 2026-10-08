/**
 * @file korteweg.ts
 * @brief Fluid-Structure Acoustic Wave Velocity Solver (Korteweg Equation)
 * @details Computes precise acoustic wave propagation speed in elastic municipal conduits.
 */

import { PipeParameters, PipeMaterialKey, PipeMaterialSpec } from './types.js';

export const BULK_MODULUS_WATER_PA = 2.15e9;       // K (Pascals)
export const WATER_DENSITY_KG_M3 = 1000.0;         // rho (kg/m^3)

// Standard Young's Moduli (Pa)
export const YOUNGS_MODULUS_DUCTILE_IRON = 2.0e11; // E = 200 GPa (Class K9)
export const YOUNGS_MODULUS_CAST_IRON = 1.0e11;    // E = 100 GPa (Centrifugal Cast Iron)
export const YOUNGS_MODULUS_MILD_STEEL = 2.1e11;   // E = 210 GPa (Fe 410)
export const YOUNGS_MODULUS_HDPE = 1.0e9;          // E = 1.0 GPa (PE-100)

export const DELHI_PIPE_MATERIALS: Record<PipeMaterialKey, PipeMaterialSpec> = {
  DUCTILE_IRON: {
    key: 'DUCTILE_IRON',
    name: 'Ductile Iron (Class K9)',
    youngsModulusPa: YOUNGS_MODULUS_DUCTILE_IRON,
    poissonsRatio: 0.28,
    densityKgM3: 7100,
    standardCode: 'IS 8329',
    description: 'High-pressure municipal trunk distribution main'
  },
  CAST_IRON: {
    key: 'CAST_IRON',
    name: 'Centrifugally Cast Iron',
    youngsModulusPa: YOUNGS_MODULUS_CAST_IRON,
    poissonsRatio: 0.26,
    densityKgM3: 7200,
    standardCode: 'IS 1536',
    description: 'Urban feeder sub-main distribution network'
  },
  MILD_STEEL: {
    key: 'MILD_STEEL',
    name: 'Mild Steel (Fe 410)',
    youngsModulusPa: YOUNGS_MODULUS_MILD_STEEL,
    poissonsRatio: 0.30,
    densityKgM3: 7850,
    standardCode: 'IS 3589',
    description: 'High-pressure bulk water transmission main'
  },
  HDPE: {
    key: 'HDPE',
    name: 'High-Density Polyethylene (PE-100)',
    youngsModulusPa: YOUNGS_MODULUS_HDPE,
    poissonsRatio: 0.45,
    densityKgM3: 950,
    standardCode: 'IS 4984',
    description: 'Viscoelastic trenchless distribution piping'
  }
};

/**
 * Resolves Young's modulus from material string key or numeric override.
 */
export function resolveYoungsModulus(material?: PipeMaterialKey | string, explicitE?: number): number {
  if (explicitE !== undefined && explicitE > 0) return explicitE;
  if (material) {
    const key = material.toUpperCase().replace(/[\s-]/g, '_') as PipeMaterialKey;
    if (DELHI_PIPE_MATERIALS[key]) {
      return DELHI_PIPE_MATERIALS[key].youngsModulusPa;
    }
  }
  return YOUNGS_MODULUS_DUCTILE_IRON;
}

/**
 * Computes acoustic wave propagation speed (vs) in an elastic pipe via Korteweg formula.
 * Formula: vs = sqrt( (K / rho) / (1 + (K/E)*(D/e)) )
 * 
 * @param params Pipe physical dimensions and material constants
 * @returns Acoustic wave speed in meters per second (m/s)
 */
export function calculateKortewegWaveSpeed(params: PipeParameters): number {
  const K = params.bulkModulusPa ?? BULK_MODULUS_WATER_PA;
  const rho = params.fluidDensityKgM3 ?? WATER_DENSITY_KG_M3;
  const E = resolveYoungsModulus(params.material, params.youngsModulusPa);
  const D = params.innerDiameterM ?? (params as any).diameterM ?? 0.4;
  const e = params.wallThicknessM;

  if (e <= 0 || D <= 0) {
    throw new Error('Pipe diameter and wall thickness must be strictly positive.');
  }

  const elasticityFactor = (K / E) * (D / e);
  const denominator = 1.0 + elasticityFactor;
  const v_s = Math.sqrt((K / rho) / denominator);

  return Number(v_s.toFixed(2));
}
