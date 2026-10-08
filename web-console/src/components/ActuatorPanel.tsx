import React from 'react';
import { Gauge, ShieldAlert, Cpu, RefreshCw, Power } from 'lucide-react';

interface ActuatorPanelProps {
  prvValveId: string;
  valveStatus: 'OPEN' | 'THROTTLED_50' | 'CLOSED';
  onUpdateValveStatus: (newStatus: 'OPEN' | 'THROTTLED_50' | 'CLOSED') => void;
  isSimulating: boolean;
  onTriggerSimulation: () => void;
}

export const ActuatorPanel: React.FC<ActuatorPanelProps> = ({
  prvValveId,
  valveStatus,
  onUpdateValveStatus,
  isSimulating,
  onTriggerSimulation,
}) => {
  const getBadgeStyle = () => {
    switch (valveStatus) {
      case 'OPEN':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
      case 'THROTTLED_50':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80 animate-pulse';
      case 'CLOSED':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
    }
  };

  const getStatusText = () => {
    switch (valveStatus) {
      case 'OPEN':
        return '100% FLOW NOMINAL';
      case 'THROTTLED_50':
        return 'THROTTLED 50% (SURGE RELIEF ACTIVE)';
      case 'CLOSED':
        return '0% FULL SHUTOFF (ISOLATED)';
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            Autonomous Closed-Loop SCADA Control
          </h2>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
          IoT Actuation Loop: ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Valve Status Card */}
        <div className="bg-[#0b111e] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">VALVE ID: {prvValveId}</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`px-3 py-2 rounded border text-center font-mono font-bold text-xs ${getBadgeStyle()}`}>
            {getStatusText()}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Auto-mitigation engages when GCC-PHAT rupture confidence &gt; 75%.
          </p>
        </div>

        {/* Transient Burst Trigger */}
        <div className="bg-[#0b111e] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400">TELEMETRY INJECTION</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <button
            onClick={onTriggerSimulation}
            disabled={isSimulating}
            className={`w-full py-2.5 px-3 rounded-md font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
              isSimulating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {isSimulating ? 'Processing Acoustic Transient...' : 'Inject Rupture Transient (Bawana Rd)'}
          </button>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Transmits 10 kHz dual hydrophone burst to AWS Lambda.
          </p>
        </div>
      </div>

      {/* Manual Override Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-xs font-mono text-slate-400">Manual Operator Override:</span>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateValveStatus('OPEN')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 transition"
          >
            <RefreshCw className="w-3 h-3" />
            Reset 100%
          </button>
          <button
            onClick={() => onUpdateValveStatus('THROTTLED_50')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 text-amber-300 transition"
          >
            <Gauge className="w-3 h-3" />
            Throttle 50%
          </button>
          <button
            onClick={() => onUpdateValveStatus('CLOSED')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 transition"
          >
            <Power className="w-3 h-3" />
            Emergency Shutoff
          </button>
        </div>
      </div>
    </div>
  );
};
