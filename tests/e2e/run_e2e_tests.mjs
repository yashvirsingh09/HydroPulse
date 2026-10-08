#!/usr/bin/env node
/**
 * @file run_e2e_tests.mjs
 * @brief Master E2E Test Harness & Test Runner for HydroPulse
 * @details Executes comprehensive opaque-box test suites across Tiers 1 to 4 per TEST_INFRA.md.
 *          Validates build status, DSP algorithms, closed-loop pipeline latency,
 *          sub-meter localization accuracy (<= 1.5 m), and SCADA console contracts.
 */

import { performance } from 'node:perf_hooks';
import { testCtx, COLORS } from './helpers/test_context.mjs';

import { runTier1Tests } from './tier1_feature_coverage.mjs';
import { runTier2Tests } from './tier2_boundary_cases.mjs';
import { runTier3Tests } from './tier3_pairwise_combinations.mjs';
import { runTier4Tests } from './tier4_real_world_scenarios.mjs';

function parseCliArgs() {
  const args = process.argv.slice(2);
  let selectedTier = null;

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      selectedTier = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--all') {
      selectedTier = null;
    }
  }

  return { selectedTier };
}

async function main() {
  const { selectedTier } = parseCliArgs();

  console.log('\n' + '='.repeat(74));
  console.log(`${COLORS.BOLD}${COLORS.CYAN}  HYDROPULSE — AUTONOMOUS ACOUSTIC PIPE RUPTURE TRIANGULATION SYSTEM${COLORS.RESET}`);
  console.log(`${COLORS.BOLD}  Opaque-Box E2E Requirements Verification Harness (Tiers 1–4)${COLORS.RESET}`);
  console.log('='.repeat(74));
  console.log(`  Environment  : Node.js ${process.version} (${process.platform})`);
  console.log(`  Working Dir  : ${process.cwd()}`);
  console.log(`  Active Scope : ${selectedTier ? `Tier ${selectedTier} Only` : 'All Tiers (Tiers 1 to 4)'}`);
  console.log('='.repeat(74));

  const suiteStartTime = performance.now();

  try {
    if (!selectedTier || selectedTier === 1) {
      await runTier1Tests();
    }

    if (!selectedTier || selectedTier === 2) {
      await runTier2Tests();
    }

    if (!selectedTier || selectedTier === 3) {
      await runTier3Tests();
    }

    if (!selectedTier || selectedTier === 4) {
      await runTier4Tests();
    }

    await testCtx.drain();
  } catch (err) {
    console.error(`\n${COLORS.RED}FATAL ERROR during test execution:${COLORS.RESET}`, err);
    process.exit(1);
  }

  const passed = testCtx.printSummary();
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Unhandled fatal error in run_e2e_tests.mjs:', err);
  process.exit(1);
});
