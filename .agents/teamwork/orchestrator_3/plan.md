# Operational Plan — HydroPulse Generation 3 Orchestration

## Objective
Fulfill all 4 core requirements and acceptance criteria for HydroPulse:
1. R1: Repository Clutter Cleanup & Code Integrity (purge all 30+ scratch scripts, clean git status, updated .gitignore)
2. R2: Acoustic Robustness & 6 dB SNR Gating Optimization (harden GCC-PHAT & travel time gating, pass rate >= 90% across 80-run benchmark matrix including 6 dB SNR)
3. R3: Turnkey AWS Free Tier Deployment (template.yaml for SAM, deploy scripts, LocalStack instructions, < 50ms closed loop)
4. R4: Hardware Sensor Node Roadmap & Submission Polish (docs/HARDWARE_ARCHITECTURE.md, README.md update)

## Phase Breakdown
- **Phase 0: Survey & Inventory**
  - Dispatch 3 parallel Explorers:
    - Explorer 1 (Repo Clutter & File Inventory): Identify all scratch/diagnostic scripts (.mjs, temp_*.json, untracked/residual files in core-dsp, physics-engine, etc.).
    - Explorer 2 (DSP Acoustic 6dB Failure Analysis): Investigate `core-dsp` current implementation, analyze why Wazirabad / Rohini 6 dB runs fail or diverge, evaluate travel time bounds and parabolic interpolation.
    - Explorer 3 (AWS SAM & Hardware Doc Specs): Investigate backend-aws Lambda/DynamoDB/SNS architecture for SAM template design and docs/HARDWARE_ARCHITECTURE.md requirements.
- **Phase 1: Implementation & Verification**
  - Milestone 1 (Cleanup): Purge scratch files, update .gitignore, verify clean git status.
  - Milestone 2 (DSP 6dB Hardening): Implement physical travel-time boundary enforcement, parabolic verification, multi-band weighting; verify 80-run benchmark pass rate >= 90%.
  - Milestone 3 (AWS SAM & Automation): Author template.yaml, deploy scripts, verify syntax/validation, verify < 50ms closed loop.
  - Milestone 4 (Hardware Docs & README Polish): Author docs/HARDWARE_ARCHITECTURE.md, update README.md.
- **Phase 2: Comprehensive Review, Adversarial Challenge, and Forensic Audit**
  - Reviewers verify code quality, interfaces, and criteria.
  - Challengers verify adversarial edge cases and performance.
  - Forensic Auditor conducts integrity forensics.
- **Phase 3: Final Acceptance Gate & Sentinel Victory Report**
  - Verify all 8 acceptance criteria.
  - Send victory report to Sentinel.
