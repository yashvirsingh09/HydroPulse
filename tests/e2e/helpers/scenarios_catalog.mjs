/**
 * @file scenarios_catalog.mjs
 * @brief Authoritative Delhi Pipe Scenarios & Material Property Catalog
 * @details Derived from HydroPulse Specifications in PROJECT.md & ORIGINAL_REQUEST.md
 */

export const PHYSICAL_CONSTANTS = {
  BULK_MODULUS_WATER_PA: 2.15e9,        // K (Pascals)
  WATER_DENSITY_KG_M3: 1000.0,          // rho (kg/m^3)
  YOUNGS_MODULUS_DUCTILE_IRON: 2.0e11,  // E (Pascals)
  YOUNGS_MODULUS_CAST_IRON: 1.0e11,     // E (Pascals)
  YOUNGS_MODULUS_MILD_STEEL: 2.1e11,    // E (Pascals)
  YOUNGS_MODULUS_HDPE: 1.0e9,           // E (Pascals)
};

export const DELHI_PIPE_SCENARIOS = {
  BAWANA_ROAD: {
    pipeId: 'PIPE-DEL-DTU-01',
    name: 'Main Bawana Road Trunk Line (Near DTU)',
    location: 'Shahbad Daulatpur, Bawana Rd, Delhi 110042',
    lengthM: 500.0,
    diameterM: 0.400,          // 400 mm
    wallThicknessM: 0.012,     // 12 mm
    material: 'Ductile Iron (Class K9)',
    youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_DUCTILE_IRON,
    expectedWaveSpeedMPerS: 1258.1,
    prvValveId: 'PRV-DTU-VALVE-01',
    coordinates: {
      nodeA: [28.7495, 77.1165],
      nodeB: [28.7532, 77.1198],
    },
    defaultLeakDistanceM: 185.0,
  },
  ROHINI_SECTOR_16: {
    pipeId: 'PIPE-DEL-ROHINI-04',
    name: 'Rohini Sector 16 Feeder Sub-Main',
    location: 'Sector 16, Rohini, Delhi',
    lengthM: 620.0,
    diameterM: 0.300,          // 300 mm
    wallThicknessM: 0.010,     // 10 mm
    material: 'Cast Iron',
    youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_CAST_IRON,
    expectedWaveSpeedMPerS: 1148.9,
    prvValveId: 'PRV-ROH-VALVE-04',
    coordinates: {
      nodeA: [28.7350, 77.1210],
      nodeB: [28.7390, 77.1260],
    },
    defaultLeakDistanceM: 310.0,
  },
  WAZIRABAD_TRANSMISSION: {
    pipeId: 'PIPE-DEL-WAZIRABAD-02',
    name: 'Wazirabad Water Treatment Transmission Main',
    location: 'Wazirabad Barrage to Outer Ring Road, Delhi',
    lengthM: 1200.0,
    diameterM: 0.900,          // 900 mm
    wallThicknessM: 0.014,     // 14 mm
    material: 'Mild Steel',
    youngsModulusPa: PHYSICAL_CONSTANTS.YOUNGS_MODULUS_MILD_STEEL,
    expectedWaveSpeedMPerS: 1138.7,
    prvValveId: 'PRV-WAZ-VALVE-02',
    coordinates: {
      nodeA: [28.7120, 77.2280],
      nodeB: [28.7180, 77.2390],
    },
    defaultLeakDistanceM: 850.0,
  },
};
