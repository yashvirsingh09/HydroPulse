# Dispatch: Explorer M1-2 — Delhi Pipe Scenarios & In-Engine Synthesis

## Objective
Design the concrete implementation blueprint for Delhi pipe network scenarios and pure TypeScript synthetic burst generation in `core-dsp/src/scenarios.ts` and `core-dsp/src/korteweg.ts`.

## Inputs & Context
- Original Request: `d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Plan: `d:\STS\hydropulse\.agents\teamwork\orchestrator_1\PROJECT.md`
- Survey 1 Report: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_1\report.md`
- Existing Korteweg: `core-dsp/src/korteweg.ts`
- Python Synthesizer reference: `physics-engine/pipe_wave_synthesizer.py`
- Working Directory: `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2`

## Scope Boundaries
- Read-only exploration. DO NOT modify source files.
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

## Deliverables
- Write detailed report to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\report.md`
- Write handoff to `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\handoff.md`
- Message the orchestrator via send_message when complete.

## 2026-10-06T19:42:50Z
Read instructions in d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\DISPATCH.md and d:\STS\hydropulse\.agents\teamwork\ORIGINAL_REQUEST.md.
Formulate exact implementation blueprint for core-dsp/src/scenarios.ts (Bawana, Rohini, Wazirabad, pipe materials Ductile Iron/Cast Iron/Mild Steel/HDPE, and in-engine TypeScript synthetic burst generator).
Write your findings to d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_m1_2\report.md and handoff.md, then send a message to the orchestrator.

