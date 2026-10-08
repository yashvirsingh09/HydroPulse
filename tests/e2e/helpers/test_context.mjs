/**
 * @file test_context.mjs
 * @brief Self-Contained E2E Test Runner Context, Assertion Library & SCADA Reporter
 */

import { performance } from 'node:perf_hooks';

// ANSI terminal colors
export const COLORS = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  MAGENTA: '\x1b[35m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m',
};

class TestContext {
  constructor() {
    this.currentSuite = 'Default Suite';
    this.currentTier = 'Tier 1';
    this.results = [];
    this.failures = [];
    this.startTime = performance.now();
    this.queue = Promise.resolve();
  }

  setTier(tierName) {
    this.currentTier = tierName;
  }

  suite(name) {
    this.currentSuite = name;
  }

  test(name, fn) {
    const tier = this.currentTier;
    const suite = this.currentSuite;
    this.queue = this.queue.then(async () => {
      const start = performance.now();
      try {
        await fn();
        const duration = performance.now() - start;
        const result = {
          name,
          suite,
          tier,
          passed: true,
          durationMs: Number(duration.toFixed(2)),
        };
        this.results.push(result);
        console.log(`    ${COLORS.GREEN}✔${COLORS.RESET} ${COLORS.DIM}[${result.tier}]${COLORS.RESET} ${name} ${COLORS.GRAY}(${result.durationMs}ms)${COLORS.RESET}`);
        return result;
      } catch (err) {
        const duration = performance.now() - start;
        const result = {
          name,
          suite,
          tier,
          passed: false,
          durationMs: Number(duration.toFixed(2)),
          error: err,
        };
        this.results.push(result);
        this.failures.push(result);
        console.log(`    ${COLORS.RED}✖${COLORS.RESET} ${COLORS.DIM}[${result.tier}]${COLORS.RESET} ${name} ${COLORS.RED}FAILED${COLORS.RESET}`);
        console.log(`      ${COLORS.RED}Error: ${err.message}${COLORS.RESET}`);
        if (process.env.DEBUG_TESTS) {
          console.log(`      ${COLORS.GRAY}${err.stack}${COLORS.RESET}`);
        }
        return result;
      }
    });
    return this.queue;
  }

  async drain() {
    await this.queue;
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.failures.length;
    const duration = performance.now() - this.startTime;

    const byTier = {};
    for (const r of this.results) {
      if (!byTier[r.tier]) {
        byTier[r.tier] = { total: 0, passed: 0, failed: 0 };
      }
      byTier[r.tier].total++;
      if (r.passed) byTier[r.tier].passed++;
      else byTier[r.tier].failed++;
    }

    return {
      total,
      passed,
      failed,
      durationMs: Number(duration.toFixed(2)),
      byTier,
      failures: this.failures,
    };
  }

  printSummary() {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(70));
    console.log(`${COLORS.BOLD}${COLORS.CYAN}  HYDROPULSE E2E TEST RUNNER — ACCEPTANCE RESULTS SUMMARY${COLORS.RESET}`);
    console.log('='.repeat(70));

    for (const [tier, counts] of Object.entries(summary.byTier)) {
      const color = counts.failed === 0 ? COLORS.GREEN : COLORS.RED;
      const status = counts.failed === 0 ? 'PASSED' : 'FAILED';
      console.log(`  ${COLORS.BOLD}${tier.padEnd(28)}:${COLORS.RESET} ${color}${counts.passed}/${counts.total} ${status}${COLORS.RESET}`);
    }

    console.log('-'.repeat(70));
    console.log(`  ${COLORS.BOLD}Total Test Validations       :${COLORS.RESET} ${summary.total}`);
    console.log(`  ${COLORS.BOLD}Passed Validations           :${COLORS.RESET} ${COLORS.GREEN}${summary.passed}${COLORS.RESET}`);
    console.log(`  ${COLORS.BOLD}Failed Validations           :${COLORS.RESET} ${summary.failed > 0 ? COLORS.RED : COLORS.GREEN}${summary.failed}${COLORS.RESET}`);
    console.log(`  ${COLORS.BOLD}Total Suite Execution Time   :${COLORS.RESET} ${summary.durationMs} ms`);
    console.log('='.repeat(70) + '\n');

    if (summary.failed > 0) {
      console.log(`${COLORS.RED}${COLORS.BOLD}Failures Summary (${summary.failed}):${COLORS.RESET}`);
      summary.failures.forEach((f, idx) => {
        console.log(`  ${idx + 1}. [${f.tier}] ${f.name}: ${f.error.message}`);
      });
      console.log('');
    }

    return summary.failed === 0;
  }
}

// Global default context
export const testCtx = new TestContext();

export function setTier(tierName) {
  testCtx.setTier(tierName);
}

export function describe(name, fn) {
  testCtx.suite(name);
  console.log(`\n${COLORS.CYAN}▶ ${COLORS.BOLD}${name}${COLORS.RESET}`);
  return fn();
}

export function it(name, fn) {
  return testCtx.test(name, fn);
}

// Strict assertion primitives
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, received ${actual}`);
  }
}

export function assertAlmostEqual(actual, expected, tolerance = 0.05, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(message || `Expected ${actual} to be within ${tolerance} of ${expected} (diff: ${diff.toFixed(4)})`);
  }
}

export function assertSubMeterError(errorM, thresholdM = 1.5, message) {
  if (errorM === undefined || errorM === null || isNaN(errorM)) {
    throw new Error(`Localization error is undefined or NaN`);
  }
  if (errorM > thresholdM) {
    throw new Error(message || `Localization error ${errorM}m exceeds sub-meter threshold <= ${thresholdM}m`);
  }
}

export function assertLatencyUnder200ms(latencyMs, thresholdMs = 200.0, message) {
  if (latencyMs >= thresholdMs) {
    throw new Error(message || `Pipeline latency ${latencyMs.toFixed(2)}ms violated requirement: must be strictly < ${thresholdMs}ms`);
  }
}

export function assertThrows(fn, expectedSubstring) {
  let threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
    if (expectedSubstring && !err.message.includes(expectedSubstring)) {
      throw new Error(`Expected error containing "${expectedSubstring}", got "${err.message}"`);
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw, but it succeeded.`);
  }
}
