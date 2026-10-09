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
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 shadow-emerald-950/40';
      case 'THROTTLED_50':
        return 'bg-amber-950/90 text-amber-300 border-amber-700/80 animate-pulse shadow-amber-950/50';
      case 'CLOSED':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80 shadow-rose-950/50';
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
    <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xl backdrop-blur-xl transition hover:border-amber-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono">
              Autonomous SCADA Closed-Loop
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Microsecond water hammer surge suppression via IoT PRV actuation
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          IoT Actuation: ACTIVE
        </span>
      </div>

      {/* Valve Status Dashboard */}
      <div className="bg-[#060a12] border border-slate-800/90 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            ACTUATOR: <strong className="text-slate-200">{prvValveId}</strong>
          </span>
          <span className="text-[11px] font-mono text-slate-500">Response SLA: &lt; 40 ms</span>
        </div>

        <div className="flex items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Current PRV State</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">{getStatusText()}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shadow ${getBadgeStyle()}`}>
            {valveStatus}
          </div>
        </div>

        {/* Manual Override Buttons */}
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1.5">Operator Manual Override</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onUpdateValveStatus('OPEN')}
              className={`py-1.5 px-2 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
                valveStatus === 'OPEN'
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              100% OPEN
            </button>
            <button
              onClick={() => onUpdateValveStatus('THROTTLED_50')}
              className={`py-1.5 px-2 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
                valveStatus === 'THROTTLED_50'
                  ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              50% THROTTLE
            </button>
            <button
              onClick={() => onUpdateValveStatus('CLOSED')}
              className={`py-1.5 px-2 rounded-lg font-mono text-xs font-semibold border transition cursor-pointer ${
                valveStatus === 'CLOSED'
                  ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              0% SHUTOFF
            </button>
          </div>
        </div>
      </div>

      {/* Main Trigger Action Button */}
      <button
        onClick={onTriggerSimulation}
        disabled={isSimulating}
        className={`w-full py-3.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition transform active:scale-98 shadow-xl cursor-pointer ${
          isSimulating
            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/40'
        }`}
      >
        {isSimulating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Triangulating Acoustic Transient...</span>
          </>
        ) : (
          <>
            <ShieldAlert className="w-4 h-4 text-white animate-bounce" />
            <span>Simulate Water Hammer Pipe Rupture</span>
          </>
        )}
      </button>
    </div>
  );
};
