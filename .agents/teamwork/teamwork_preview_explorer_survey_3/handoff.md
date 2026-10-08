# Handoff Report — Explorer Survey 3 (web-console SCADA Operator UI)

**Date**: 2026-10-06T19:38:00Z  
**Agent**: `teamwork_preview_explorer_survey_3`  
**Handoff Type**: Hard (Survey Complete)  
**Target Milestone**: Milestone 3 — SCADA Operator UI Polish & Visualizer  
**Recipient**: Orchestrator (`2affecc5-3f10-490f-9aea-88f44595959e`)

---

## 1. Observation

1. **Build System & Dependencies**:
   - `d:\STS\hydropulse\web-console\package.json` contains dependencies: `leaflet: ^1.9.4`, `lucide-react: ^1.16.0`, `react: ^19.0.0`, `react-dom: ^19.0.0`. DevDependencies: `tailwindcss: ^3.4.17`, `typescript: ^5.8.0`, `vite: ^6.2.0`.
   - Running `npm run build --prefix web-console` exited with code 0 in 5.80s: `✓ 1917 modules transformed`, generating `dist/assets/index-CAbJ1Xn7.css (16.03 kB)` and `dist/assets/index-KKN7TSK2.js (407.93 kB)`.
   - Running monorepo command `npm run build:all` exited with code 0 in 5.74s across `core-dsp`, `backend-aws`, and `web-console`.

2. **Spectrogram & Oscilloscope**:
   - In `d:\STS\hydropulse\web-console\src\components\WaveformViewer.tsx:17-87`, the canvas only draws 2D time-domain waveforms (Channel A cyan at $y = 0.28H$, Channel B purple at $y = 0.72H$).
   - Search across the entire repository for pattern `spectrogram` returned 0 matches outside of markdown documentation. There is no STFT calculation or 2D frequency spectrogram canvas visualizer anywhere in `web-console`.

3. **Web Audio Implementation**:
   - In `d:\STS\hydropulse\web-console\src\components\WaveformViewer.tsx:89-107`:
     ```ts
     const playAcousticTransient = () => {
       try {
         const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
         const audioCtx = new AudioContextClass();
         const buffer = audioCtx.createBuffer(1, samplesA.length, sampleRate);
         const channelData = buffer.getChannelData(0);
         for (let i = 0; i < samplesA.length; i++) {
           channelData[i] = (samplesA[i] || 0) / 32768.0;
         }
         const source = audioCtx.createBufferSource();
         source.buffer = buffer;
         source.connect(audioCtx.destination);
         source.start();
       } catch (e) {
         console.warn('Web Audio playback error:', e);
       }
     };
     ```
   - Only `samplesA` is played (`createBuffer(1, ...)`). Channel B (`samplesB`) is discarded.
   - A new `AudioContext` is instantiated on every click without caching or closing previous contexts.
   - No gain ramping, limiter, or dynamics compressor is attached.
   - No `requestAnimationFrame` loop or playhead state is emitted to synchronize canvas drawing with playback.

4. **Scenario Switcher & State**:
   - In `d:\STS\hydropulse\web-console\src\App.tsx:10-21`, a single scenario `DEFAULT_PIPE` (Main Bawana Road Trunk Line near DTU, 500m, 400mm diameter) is hardcoded.
   - In `d:\STS\hydropulse\web-console\src\components\ActuatorPanel.tsx:86`, the trigger button text is hardcoded: `Inject Rupture Transient (Bawana Rd)`.
   - In `App.tsx:123-143`, fallback values are hardcoded exclusively to Bawana Road (`leakDistanceM = 185.53`, `leakCoords = [28.75087, 77.11772]`, `deltaTMs = 102.49`).
   - Neither Rohini Sector 16 Feeder nor Wazirabad Transmission Main are selectable in the UI.

5. **Valve Throttle Animation**:
   - In `d:\STS\hydropulse\web-console\src\components\ActuatorPanel.tsx:24`, the throttle state only applies a CSS class `animate-pulse` to a static text badge: `<div className={...}>{getStatusText()}</div>`.
   - There is no animated mechanical valve representation, orifice constriction graphic, fluid stream particles, or sub-200ms latency execution timeline.

6. **Leaflet GIS Map Reactivity Bug**:
   - In `d:\STS\hydropulse\web-console\src\components\PipeMap.tsx:27-79`, the creation of `L.polyline([nodeACoords, nodeBCoords])`, Node A `L.circleMarker`, and Node B `L.circleMarker` is nested inside `if (!mapInstanceRef.current)`.
   - When props `nodeACoords` and `nodeBCoords` change, `mapInstanceRef.current` is truthy, so the entire block is bypassed. Markers and pipe polylines never update to new scenario coordinates.

7. **Radar Telemetry & CSS Keyframes**:
   - In `d:\STS\hydropulse\web-console\src\index.css:13-30`, keyframe `@keyframes radar-pulse` and class `.radar-ping` are declared.
   - Ripgrep search for `radar-ping` across `web-console\src` confirmed `.radar-ping` is **never referenced** in any JSX/TSX component.

---

## 2. Logic Chain

1. **From Observation 1**: The build environment is healthy, modern, and has 0 compile errors. Any new components (canvas visualizers, SVG animations, audio engines) can be authored in React 19 + TypeScript with standard DOM / Canvas / Web Audio APIs without requiring third-party library additions.
2. **From Observation 2 & Requirement R2**: Requirement R2 mandates a "live 2D frequency spectrogram canvas visualizer synchronized with Web Audio playback." Because no STFT engine or spectrogram canvas exists in `WaveformViewer.tsx` or any other file, an in-browser STFT calculator ($N=128$, Hann window, log-dB magnitude) and a dedicated canvas visualizer component (`SpectrogramViewer.tsx`) must be introduced.
3. **From Observation 3 & UI Acceptance Criteria**: UI acceptance criteria require Web Audio transient playback without stutter or clipping. Because `WaveformViewer.tsx` re-creates `AudioContext` on every click, omits master gain compression, drops Channel B, and emits no progress callbacks, an audio manager utility (`audioPlayer.ts`) with a singleton AudioContext, stereo spatialization (Left=Node A, Right=Node B), soft-attack gain ramp, and a 60 FPS playhead emitter must be implemented.
4. **From Observation 4 & Requirement R2**: Requirement R2 requires an interactive scenario switcher across multiple Delhi pipe networks (Bawana, Rohini, Wazirabad). Because `App.tsx` has no scenario selection state and hardcodes Bawana Road, a scenario registry (`scenarios.ts`) and a selector bar component (`ScenarioSwitcher.tsx`) must be introduced to drive scenario state, dynamic Korteweg velocity calculations, and map coordinate shifts.
5. **From Observation 5 & Requirement R2**: The 3-minute video presentation requires optimal visual clarity of the automated valve throttle. A pulsing text `<div>` lacks visual impact. An animated SVG/Canvas PRV valve (`ValveActuator.tsx`) showing physical disc movement, fluid flow restriction ($1200 \rightarrow 600 \rightarrow 0\text{ m}^3/\text{h}$), and a sub-200ms closed-loop timing ticker directly fulfills this criterion.
6. **From Observation 6 & UI Acceptance Criteria**: Acceptance criteria require the Delhi GIS map to cleanly update marker positions and highlight pipe vector paths. Because lines 27–79 of `PipeMap.tsx` only execute on initial mount, switching scenarios fails to move the pipe polyline. Updating `PipeMap.tsx` to maintain mutable layer refs, call `map.flyTo()`, highlight the ruptured sub-segment in glowing danger crimson, and use an `L.divIcon` with `.radar-ping` fixes the bug and meets the requirement.
7. **From Observation 7**: Activating `.radar-ping` on the map leak marker and adding a circular 360-degree radar HUD sweep widget (`RadarHUD.tsx`) transforms static header text into an active SCADA telemetry interface.

---

## 3. Caveats

1. **Backend Integration Parity**: The web console can run either connected to `http://localhost:5000` (AWS Lambda local server) or in standalone preview mode. The client-side scenario switcher must maintain 100% realistic offline simulation fallback so that full interactivity and sub-meter triangulation can be demonstrated even when the backend process is not started.
2. **Browser Audio Autoplay Policy**: Web Audio `AudioContext` requires user gesture before playing audio. Triggering audio via the explicit "Play Acoustic Burst" button satisfies browser autoplay policies.

---

## 4. Conclusion

The `web-console` module requires a targeted visual polish and feature upgrade to fulfill Requirement R2 and hackathon acceptance criteria. The work is organized into 6 concrete components and utilities:
1. `src/utils/spectrogram.ts` & `src/components/SpectrogramViewer.tsx`: In-browser STFT (128-point FFT, Hann window, Turbo colormap) with synchronized playhead laser line.
2. `src/utils/audioPlayer.ts`: Singleton Web Audio manager with stereo spatialization (Node A left, Node B right), anti-clipping limiter, and progress emitter.
3. `src/data/scenarios.ts` & `src/components/ScenarioSwitcher.tsx`: Delhi pipe scenario switcher (Bawana 500m / 400mm, Rohini 620m / 300mm, Wazirabad 1200m / 900mm) with dynamic Korteweg wave speeds and burst generation.
4. `src/components/ValveActuator.tsx`: Animated mechanical PRV valve with dynamic sliding wedge, fluid stream restriction, and sub-200ms latency execution ticker.
5. `src/components/PipeMap.tsx` refactor: Fixes marker lifecycle reactivity, adds `map.flyTo`, highlights ruptured pipe vector in red, and adds a floating sub-meter accuracy tag with animated `.radar-ping` sonar ripple.
6. `src/components/RadarHUD.tsx`: 360-degree radar sweep telemetry indicator displaying live 10 kHz ADC lock, SNR dB, and Korteweg velocity.

All technical specifications, mathematics, and file blueprints are completely documented in `d:\STS\hydropulse\.agents\teamwork\teamwork_preview_explorer_survey_3\report.md`.

---

## 5. Verification Method

To independently verify these findings:
1. **Build Verification**:
   ```bash
   npm run build --prefix web-console
   npm run build:all
   ```
   Both commands must exit with code 0 and 0 TypeScript errors.
2. **Inspect Identified File Locations**:
   - Spectrogram absence: Verify `WaveformViewer.tsx` has no STFT or frequency canvas.
   - Audio single-channel: Verify `WaveformViewer.tsx:93` uses `audioCtx.createBuffer(1, ...)`.
   - Hardcoded pipe: Verify `App.tsx:10-21` and `ActuatorPanel.tsx:86`.
   - Map reactivity bug: Verify `PipeMap.tsx:27-79` wraps marker/polyline creation inside `if (!mapInstanceRef.current)`.
   - Orphaned CSS: Grep for `radar-ping` in `web-console/src` (only found in `index.css:28`).
3. **Invalidation Conditions**:
   - If `WaveformViewer.tsx` already contains a 2D STFT spectrogram canvas visualizer, finding 2 is invalidated.
   - If `PipeMap.tsx` already re-renders polylines upon scenario changes, finding 6 is invalidated.
