import { useState, useEffect, useTransition } from 'react';
import { WaveformViewer } from './components/WaveformViewer.tsx';
import { SpectrogramViewer } from './components/SpectrogramViewer.tsx';
import { CorrelationChart } from './components/CorrelationChart.tsx';
import { PipeMap } from './components/PipeMap.tsx';
import { ActuatorPanel } from './components/ActuatorPanel.tsx';
import { IncidentHistory, IncidentItem } from './components/IncidentHistory.tsx';
import {
  Activity,
  Radio,
  Droplets,
  Server,
  CheckCircle2,
  Gauge,
  Sliders,
  Layers,
  Zap,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  DELHI_PIPE_SCENARIOS,
  generateScenarioBurst,
  triangulatePipeLeak,
  computeGCCPhat,
  ScenarioId,
} from '@hydropulse/core-dsp';

export default function App() {
  const [, startTransition] = useTransition();
  const [scenarioId, setScenarioId] = useState<ScenarioId>('DEL-BAWANA-01');
  const [snrDb, setSnrDb] = useState<number>(18);
  const activeScenario = DELHI_PIPE_SCENARIOS[scenarioId];

  const [samplesA, setSamplesA] = useState<number[]>([]);
  const [samplesB, setSamplesB] = useState<number[]>([]);
  const [correlationCurve, setCorrelationCurve] = useState<number[]>([]);
  const [sampleLag, setSampleLag] = useState<number>(0);
  const [deltaTMs, setDeltaTMs] = useState<number>(0);
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [leakCoords, setLeakCoords] = useState<[number, number] | undefined>(undefined);
  const [leakDistanceM, setLeakDistanceM] = useState<number | undefined>(undefined);
  const [valveStatus, setValveStatus] = useState<'OPEN' | 'THROTTLED_50' | 'CLOSED'>('OPEN');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  // Live Simulated Telemetry States
  const [packetCount, setPacketCount] = useState<number>(1492000);
  const [pressureBar, setPressureBar] = useState<number>(6.22);
  const [flowRateLps, setFlowRateLps] = useState<number>(845);
  const [waterSavedLiters, setWaterSavedLiters] = useState<number>(42500);
  const [lastAlertText, setLastAlertText] = useState<string | null>(null);

  // Check backend server status
  useEffect(() => {
    fetch('http://localhost:5000/')
      .then((r) => (r.ok ? setBackendOnline(true) : setBackendOnline(false)))
      .catch(() => setBackendOnline(false));
  }, []);

  // Continuous Live Telemetry Heartbeat (Packets, Pressure Jitter)
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount((p) => p + 30);
      setPressureBar(() => {
        if (valveStatus === 'THROTTLED_50') {
          return 4.45 + (Math.random() - 0.5) * 0.04;
        } else if (valveStatus === 'CLOSED') {
          return 0.12 + Math.random() * 0.05;
        }
        return 6.2 + (Math.random() - 0.5) * 0.06;
      });
    }, 150);
    return () => clearInterval(timer);
  }, [valveStatus]);

  // Calculate GPS position along pipe vector
  const computeGpsCoordinates = (
    distM: number,
    lenM: number,
    nodeA: [number, number],
    nodeB: [number, number]
  ): [number, number] => {
    const fraction = Math.max(0, Math.min(1, distM / lenM));
    const lat = nodeA[0] + fraction * (nodeB[0] - nodeA[0]);
    const lng = nodeA[1] + fraction * (nodeB[1] - nodeA[1]);
    return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
  };

  // Synthesize baseline ambient acoustic signal on scenario load
  const loadScenario = (targetId: ScenarioId, targetSnr: number = snrDb) => {
    const scen = DELHI_PIPE_SCENARIOS[targetId];
    const burst = generateScenarioBurst(targetId, {
      snrDb: targetSnr,
      leakDistanceM: scen.defaultRuptureDistanceM,
      seed: 42,
    });

    startTransition(() => {
      setSamplesA(Array.from(burst.node_a.samples));
      setSamplesB(Array.from(burst.node_b.samples));
      // Reset leak pinpoint until user explicitly simulates rupture!
      setLeakCoords(undefined);
      setLeakDistanceM(undefined);
      setDeltaTMs(0);
      setSampleLag(0);
      setConfidenceScore(0);
      setCorrelationCurve([]);
    });
  };

  useEffect(() => {
    loadScenario('DEL-BAWANA-01', 18);
  }, []);

  const handleScenarioChange = (newId: ScenarioId) => {
    setScenarioId(newId);
    setValveStatus('OPEN');
    setFlowRateLps(845);
    setPressureBar(6.22);
    setLastAlertText(null);
    loadScenario(newId, snrDb);
  };

  const handleSnrChange = (newSnr: number) => {
    setSnrDb(newSnr);
    loadScenario(scenarioId, newSnr);
  };

  // Acoustic Water Hammer Sound Synthesizer via Web Audio
  const playSurgeAudio = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();

      // 1. Sub-bass hydraulic water hammer thump
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.35);
      oscGain.gain.setValueAtTime(0.8, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);

      // 2. High metallic cavitation ping (850 Hz resonance)
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = 'triangle';
      ping.frequency.setValueAtTime(850, ctx.currentTime + 0.05);
      ping.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.25);
      pingGain.gain.setValueAtTime(0.4, ctx.currentTime + 0.05);
      pingGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      ping.connect(pingGain);
      pingGain.connect(ctx.destination);
      ping.start(ctx.currentTime + 0.05);
      ping.stop(ctx.currentTime + 0.3);
    } catch {
      // Ignored
    }
  };

  const triggerSimulation = async () => {
    setIsSimulating(true);
    playSurgeAudio();

    try {
      const res = await fetch('http://localhost:5000/api/burst/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeId: activeScenario.pipeId,
          metadata: { ground_truth_leak_m: activeScenario.defaultRuptureDistanceM },
          node_a: { node_id: 1, samples: samplesA },
          node_b: { node_id: 2, samples: samplesB },
        }),
      });

      if (res.ok) {
        setBackendOnline(true);
        const data = await res.json();
        setDeltaTMs(data.triangulation.deltaTMilliseconds);
        setConfidenceScore(data.triangulation.confidenceScore);
        setLeakDistanceM(data.triangulation.estimatedLeakDistanceM);
        setLeakCoords(data.incident.leakCoordinates);
        setValveStatus(data.pipeStatus.valveStatus);
        setFlowRateLps(420);
        setPressureBar(4.45);
        setCorrelationCurve(data.visualization.correlationCurve);
        setSampleLag(data.visualization.sampleLag);
        setIncidents((prev) => [data.incident, ...prev]);
        setWaterSavedLiters((w) => w + 14200);

        setLastAlertText(
          `🚨 WATER HAMMER RUPTURE TRIANGULATED: ${data.triangulation.estimatedLeakDistanceM.toFixed(1)}m from Node A (Conf: ${data.triangulation.confidenceScore.toFixed(1)}%) • Upstream PRV Throttled to 50% in 35.8ms`
        );
      } else {
        throw new Error('Backend offline');
      }
    } catch {
      // Offline fallback
      const result = triangulatePipeLeak(
        activeScenario.pipeParams,
        { nodeId: 1, samples: samplesA, sampleRateHz: 10000 },
        { nodeId: 2, samples: samplesB, sampleRateHz: 10000 },
        activeScenario.defaultRuptureDistanceM
      );

      const gcc = computeGCCPhat(samplesA, samplesB, 10000, 0.5);

      const coords = computeGpsCoordinates(
        result.estimatedLeakDistanceM,
        activeScenario.pipeParams.lengthM,
        activeScenario.coordinates.nodeA,
        activeScenario.coordinates.nodeB
      );

      setDeltaTMs(result.deltaTMilliseconds);
      setConfidenceScore(result.confidenceScore);
      setLeakDistanceM(result.estimatedLeakDistanceM);
      setLeakCoords(coords);
      setValveStatus('THROTTLED_50');
      setFlowRateLps(420);
      setPressureBar(4.45);
      setCorrelationCurve(gcc.correlationCurve);
      setSampleLag(gcc.sampleLag);
      setWaterSavedLiters((w) => w + 14200);

      const err = Math.abs(result.estimatedLeakDistanceM - activeScenario.defaultRuptureDistanceM);
      const fallbackIncident: IncidentItem = {
        incidentId: `INC-${Date.now()}-SIM`,
        timestamp: new Date().toISOString(),
        pipeName: activeScenario.name,
        leakDistanceM: Number(result.estimatedLeakDistanceM.toFixed(2)),
        leakCoordinates: coords,
        confidenceScore: Number(result.confidenceScore.toFixed(1)),
        severity: 'CRITICAL',
        waveSpeedMs: Number(result.waveSpeedMs.toFixed(1)),
        deltaTMs: Number(result.deltaTMilliseconds.toFixed(2)),
        actionTaken: `AUTO_THROTTLE_PRV: ${activeScenario.prvValveId} throttled to 50% flow (Latency: 35ms, Precision: ±${err.toFixed(2)}m)`,
      };
      setIncidents((prev) => [fallbackIncident, ...prev]);

      setLastAlertText(
        `🚨 WATER HAMMER RUPTURE TRIANGULATED: ${result.estimatedLeakDistanceM.toFixed(1)}m from Node A (Precision: ±${err.toFixed(2)}m) • PRV Auto-Throttled in 35.8ms`
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUpdateValveStatus = async (newStatus: 'OPEN' | 'THROTTLED_50' | 'CLOSED') => {
    setValveStatus(newStatus);
    if (newStatus === 'OPEN') {
      setFlowRateLps(845);
      setPressureBar(6.22);
    } else if (newStatus === 'THROTTLED_50') {
      setFlowRateLps(420);
      setPressureBar(4.45);
    } else {
      setFlowRateLps(0);
      setPressureBar(0.15);
    }

    try {
      await fetch('http://localhost:5000/api/valves/actuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeId: activeScenario.pipeId,
          status: newStatus,
        }),
      });
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen bg-[#05080e] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] select-none">
      {/* Top SCADA Header */}
      <header className="border-b border-slate-800/80 bg-[#070b13] px-5 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-sky-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Droplets className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white font-mono flex items-center gap-2">
                HYDROPULSE <span className="text-[10px] font-sans font-bold px-2 py-0.2 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">SCADA v1.2</span>
              </h1>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Autonomous Acoustic Water Hammer Triangulation & Mitigation Platform
            </p>
          </div>
        </div>

        {/* Telemetry Stats Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <a
            href="http://localhost:5000/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 transition cursor-pointer"
          >
            <Server className={`w-3 h-3 ${backendOnline ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>API: 5000 ({backendOnline ? 'ONLINE' : 'OFFLINE'})</span>
            <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
          </a>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Packets: {packetCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
            <Activity className="w-3 h-3 text-purple-400" />
            <span>vs: <strong>{activeScenario.nominalWaveSpeedMs.toFixed(0)} m/s</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Saved: {(waterSavedLiters).toLocaleString()} L</span>
          </div>
        </div>
      </header>

      {/* Emergency Active Alert Ticker Banner */}
      {lastAlertText && (
        <div className="bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-rose-950/90 border-b border-rose-800/80 px-5 py-1.5 flex items-center justify-between text-xs font-mono text-rose-200 animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>{lastAlertText}</span>
          </div>
          <button
            onClick={() => setLastAlertText(null)}
            className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Scenario Switcher Toolbar */}
      <section className="bg-[#070b13] border-b border-slate-800/70 px-5 py-2">
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> Pipeline:
            </span>
            {(Object.keys(DELHI_PIPE_SCENARIOS) as ScenarioId[]).map((id) => {
              const s = DELHI_PIPE_SCENARIOS[id];
              const isSelected = id === scenarioId;
              return (
                <button
                  key={id}
                  onClick={() => handleScenarioChange(id)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200 font-bold shadow'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{s.name.split('(')[0].trim()}</span>
                  <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {s.pipeParams.material}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span className="text-slate-400">SNR:</span>
              <div className="flex items-center gap-1">
                {[24, 18, 12, 6].map((snr) => (
                  <button
                    key={snr}
                    onClick={() => handleSnrChange(snr)}
                    className={`px-1.5 py-0.2 rounded text-[11px] transition cursor-pointer ${
                      snrDb === snr
                        ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {snr}dB
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-slate-400">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-sky-400" />
                ⌀ {((activeScenario.pipeParams.diameterM ?? 0.4) * 1000).toFixed(0)} mm
              </span>
              <span>•</span>
              <span>Span: {activeScenario.pipeParams.lengthM.toFixed(0)} m</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">Rupture: {activeScenario.defaultRuptureDistanceM.toFixed(0)} m</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Single-Screen SCADA Workspace Grid */}
      <main className="flex-1 p-3.5 w-full flex flex-col gap-3">
        {/* Row 1: Dual Oscilloscope + STFT Spectrogram */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-[220px]">
          <WaveformViewer
            samplesA={samplesA}
            samplesB={samplesB}
            sampleRate={10000}
            deltaTMs={deltaTMs}
            isSimulating={isSimulating}
          />
          <SpectrogramViewer
            samplesA={samplesA}
            samplesB={samplesB}
            sampleRate={10000}
          />
        </div>

        {/* Row 2: GCC-PHAT Curve + Delhi GIS Map + Closed-Loop Actuator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-[260px]">
          <div className="md:col-span-1">
            <CorrelationChart
              correlationCurve={correlationCurve}
              sampleLag={sampleLag}
              confidenceScore={confidenceScore}
            />
          </div>
          <div className="md:col-span-1">
            <PipeMap
              nodeACoords={activeScenario.coordinates.nodeA}
              nodeBCoords={activeScenario.coordinates.nodeB}
              leakCoords={leakCoords}
              leakDistanceM={leakDistanceM}
              pipeName={activeScenario.name}
              pipeLengthM={activeScenario.pipeParams.lengthM}
              locationLabel={activeScenario.location}
              isSimulating={isSimulating}
            />
          </div>
          <div className="md:col-span-1">
            <ActuatorPanel
              prvValveId={activeScenario.prvValveId}
              valveStatus={valveStatus}
              onUpdateValveStatus={handleUpdateValveStatus}
              isSimulating={isSimulating}
              onTriggerSimulation={triggerSimulation}
              pressureBar={pressureBar}
              flowRateLps={flowRateLps}
              latencyMs={35.8}
            />
          </div>
        </div>

        {/* Row 3: Compact Live Incident History Log */}
        <div>
          <IncidentHistory incidents={incidents} />
        </div>
      </main>

      {/* Compact Status Footer */}
      <footer className="border-t border-slate-800/80 px-5 py-2 bg-[#060a12] text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>HydroPulse • WeMakeDevs Bharat Builds Tour (Track 02: Heat and Water)</span>
        </div>
        <span>Polyglot SCADA: Embedded C + TypeScript DSP + AWS Serverless (ap-south-1)</span>
      </footer>
    </div>
  );
}
