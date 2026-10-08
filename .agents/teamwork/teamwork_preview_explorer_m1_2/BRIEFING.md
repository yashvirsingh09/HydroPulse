# BRIEFING — 2026-10-06T19:45:00Z

## Mission
Formulate the exact implementation blueprint for Delhi pipe network scenarios and in-engine pure TypeScript synthetic burst generation in `core-dsp/src/scenarios.ts` and `core-dsp/src/korteweg.ts`.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigator, architecture designer, technical synthesizer
- Working directory: d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2
- Original parent: 2affecc5-3f10-490f-9aea-88f44595959e
- Milestone: M1 (DSP Depth & Acoustic Robustness — Scenarios & Synthesis Blueprint)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify source code files in repository.
- Specify material properties:
  - Ductile Iron: $E = 2.0 \times 10^{11}$ Pa
  - Cast Iron: $E = 1.0 \times 10^{11}$ Pa
  - Mild Steel: $E = 2.1 \times 10^{11}$ Pa
  - HDPE: $E = 1.0 \times 10^9$ Pa
- Specify Delhi pipe scenario catalog:
  - Main Bawana Road (500m, 400mm, Ductile Iron, $v \approx 1258$ m/s)
  - Rohini Sector 16 Feeder (620m, 300mm, Cast Iron, $v \approx 1114$ m/s)
  - Wazirabad Transmission Main (1200m, 900mm, Mild Steel, $v \approx 1205$ m/s)
- Design in-engine TypeScript synthetic burst generator generating dual-channel acoustic bursts with true TDOA, exponential decay, fluid dispersion, and realistic noise (traffic rumble + Gaussian).
- Deliverables: `report.md`, `handoff.md`, notify orchestrator via `send_message`.

## Current Parent
- Conversation ID: 2affecc5-3f10-490f-9aea-88f44595959e
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `core-dsp/src/korteweg.ts`: current wave speed solver, only ductile iron constant.
  - `core-dsp/src/types.ts`: current data types, lacks material enum and scenario specs.
  - `core-dsp/src/gccPhat.ts`: cross correlation and peak interpolation.
  - `core-dsp/src/triangulate.ts`: current end-to-end pipeline.
  - `physics-engine/pipe_wave_synthesizer.py`: reference Python implementation of burst synthesis.
  - `backend-aws/src/services/dynamoService.ts`: mock pipes registry (`PIPE-DEL-DTU-01`, `PIPE-DEL-ROHINI-04`).
  - `web-console/src/App.tsx`: current client-side simulated waveforms.
- **Key findings**:
  - Analytically verified exact wall thicknesses yielding specified Korteweg speeds: Bawana ($e = 12$mm $\implies 1258.10$ m/s), Rohini ($e = 8.8$mm $\implies 1113.85$ m/s), Wazirabad ($e = 19.2$mm $\implies 1205.32$ m/s), Okhla HDPE ($e = 14.4$mm $\implies 293.91$ m/s).
  - Designed pure TypeScript in-engine synthesis architecture replacing Python dependency with 100% parity: causal wavefront, 850 Hz resonance ring-down, fluid dispersion ($\sigma(d)$ broadening), exponential spatial attenuation ($\alpha = 0.0012 \text{ m}^{-1}$), dual-frequency decorrelated traffic rumble (38 Hz & 54 Hz), Gaussian noise via Box-Muller, seeded PRNG (Mulberry32) for deterministic reproducible testing.
  - Full code blueprints for `scenarios.ts`, `korteweg.ts`, and `types.ts` drafted in `report.md`.
- **Unexplored areas**: None for M1-2 scope. Investigation complete.

## Key Decisions Made
- Use exact IS municipal pipe standards for wall thicknesses matching Korteweg wave velocities: Bawana Class K9 DI (12mm), Rohini IS 1536 CI (8.8mm), Wazirabad IS 3589 MS (19.2mm).
- Support optional deterministic PRNG seed in synthetic generator to ensure rock-solid unit and benchmark testing.
- Structure `scenarios.ts` with complete type definitions, scenario registry, and generator functions ready for zero-friction implementation.

## Artifact Index
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\report.md` — Complete technical blueprint and specification for `scenarios.ts` and `korteweg.ts`
- `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\handoff.md` — Standard 5-component handoff report for implementer and orchestrator

