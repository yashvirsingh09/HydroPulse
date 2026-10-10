import React from 'react';
import { Gauge, ShieldAlert, Cpu, RefreshCw, ShieldCheck, Zap, Droplet } from 'lucide-react';

interface ActuatorPanelProps {
  prvValveId: string;
  valveStatus: 'OPEN' | 'THROTTLED_50' | 'CLOSED';
  onUpdateValveStatus: (newStatus: 'OPEN' | 'THROTTLED_50' | 'CLOSED') => void;
  isSimulating: boolean;
  onTriggerSimulation: () => void;
  pressureBar?: number;
  flowRateLps?: number;
  latencyMs?: number;
}

export const ActuatorPanel: React.FC<ActuatorPanelProps> = ({
  prvValveId,
  valveStatus,
  onUpdateValveStatus,
  isSimulating,
  onTriggerSimulation,
  pressureBar = 6.2,
  flowRateLps = 845,
  latencyMs = 35.8,
}) => {
  const getBadgeStyle = () => {
    switch (valveStatus) {
      case 'OPEN':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 shadow-sm shadow-emerald-900/50';
      case 'THROTTLED_50':
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80 animate-pulse shadow-md shadow-amber-900/50';
      case 'CLOSED':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80 shadow-md shadow-rose-900/50';
    }
  };

  const getStatusText = () => {
    switch (valveStatus) {
      case 'OPEN':
        return '100% NOMINAL FLOW';
      case 'THROTTLED_50':
        return 'THROTTLED 50% (SURGE RELIEF ACTIVE)';
      case 'CLOSED':
        return '0% FULL EMERGENCY SHUTOFF';
    }
  };

  // Play mechanical relay click audio via Web Audio
  const playRelayClick = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignored
    }
  };

  const handleValveChange = (status: 'OPEN' | 'THROTTLED_50' | 'CLOSED') => {
    playRelayClick();
    onUpdateValveStatus(status);
  };

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xl h-full transition hover:border-amber-500/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-1.5">
              SCADA Closed-Loop Control
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </h2>
          </div>
        </div>

        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          SLA: <strong>{latencyMs.toFixed(1)} ms</strong>
        </span>
      </div>

      {/* Hydraulic Pressure & Flow Rate Live Telemetry Gauges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#060a12] border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-sky-400" /> PRESSURE
            </span>
            <span className="text-emerald-400 font-bold">NOMINAL</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-white tracking-tight">
              {pressureBar.toFixed(2)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">bar</span>
          </div>
          {/* Visual Bar Gauge */}
          <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pressureBar < 4.0
                  ? 'bg-rose-500'
                  : pressureBar < 5.0
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-cyan-500 to-sky-400'
              }`}
              style={{ width: `${Math.min(100, (pressureBar / 10) * 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-[#060a12] border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Droplet className="w-3 h-3 text-cyan-400" /> HYD FLOW
            </span>
            <span className="text-cyan-400 font-bold">{valveStatus === 'OPEN' ? '100%' : valveStatus === 'THROTTLED_50' ? '50%' : '0%'}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono text-white tracking-tight">
              {flowRateLps.toFixed(0)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">L/s</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (flowRateLps / 1000) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Valve Status Card */}
      <div className="bg-[#060a12] border border-slate-800/90 rounded-lg p-2.5 flex flex-col gap-2 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            ACTUATOR: <strong className="text-slate-200">{prvValveId}</strong>
          </span>
          <div className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${getBadgeStyle()}`}>
            {valveStatus}
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80">
          <span className="text-[9px] uppercase font-mono text-slate-400">STATUS:</span>
          <span className="text-[11px] font-bold font-mono text-white">{getStatusText()}</span>
        </div>

        {/* Manual Override Buttons with Sound Click */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <button
            onClick={() => handleValveChange('OPEN')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'OPEN'
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            100% OPEN
          </button>
          <button
            onClick={() => handleValveChange('THROTTLED_50')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'THROTTLED_50'
                ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            50% THROTTLE
          </button>
          <button
            onClick={() => handleValveChange('CLOSED')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'CLOSED'
                ? 'bg-rose-600/30 border-rose-500 text-rose-200 shadow'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            0% SHUTOFF
          </button>
        </div>
      </div>

      {/* Main Trigger Action Button */}
      <button
        onClick={onTriggerSimulation}
        disabled={isSimulating}
        className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-98 ${
          isSimulating
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/50'
        }`}
      >
        {isSimulating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Triangulating Cavitation Transient...</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-3.5 h-3.5 text-white animate-bounce" />
            <span>Simulate Water Hammer Pipe Rupture</span>
          </>
        )}
      </button>
    </div>
  );
};
