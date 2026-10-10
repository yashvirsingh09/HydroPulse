import React from 'react';
import { Gauge, ShieldAlert, Cpu, RefreshCw, ShieldCheck } from 'lucide-react';

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
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80 animate-pulse';
      case 'CLOSED':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80';
    }
  };

  const getStatusText = () => {
    switch (valveStatus) {
      case 'OPEN':
        return '100% NOMINAL';
      case 'THROTTLED_50':
        return 'THROTTLED 50% (ACTIVE)';
      case 'CLOSED':
        return '0% FULL SHUTOFF';
    }
  };

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xl h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
              Autonomous SCADA Closed-Loop
            </h2>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          SLA &lt; 40ms
        </span>
      </div>

      {/* Valve Status Card */}
      <div className="bg-[#060a12] border border-slate-800/90 rounded-lg p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            ACTUATOR: <strong className="text-slate-200">{prvValveId}</strong>
          </span>
          <div className={`px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${getBadgeStyle()}`}>
            {valveStatus}
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400">STATE:</span>
          <span className="text-xs font-bold font-mono text-white">{getStatusText()}</span>
        </div>

        {/* Manual Override Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <button
            onClick={() => onUpdateValveStatus('OPEN')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'OPEN'
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            100% OPEN
          </button>
          <button
            onClick={() => onUpdateValveStatus('THROTTLED_50')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'THROTTLED_50'
                ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            50% THROTTLE
          </button>
          <button
            onClick={() => onUpdateValveStatus('CLOSED')}
            className={`py-1 px-1 rounded font-mono text-[10px] font-semibold border transition cursor-pointer ${
              valveStatus === 'CLOSED'
                ? 'bg-rose-600/30 border-rose-500 text-rose-200'
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
        className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
          isSimulating
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/40 active:scale-98'
        }`}
      >
        {isSimulating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Triangulating...</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-3.5 h-3.5 text-white animate-bounce" />
            <span>Simulate Water Hammer Burst</span>
          </>
        )}
      </button>
    </div>
  );
};
