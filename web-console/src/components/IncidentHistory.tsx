import React from 'react';
import { AlertTriangle, Clock, MapPin, CheckCircle } from 'lucide-react';

export interface IncidentItem {
  incidentId: string;
  timestamp: string;
  pipeName: string;
  leakDistanceM: number;
  leakCoordinates: [number, number];
  confidenceScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'MINOR';
  waveSpeedMs: number;
  deltaTMs: number;
  actionTaken: string;
}

interface IncidentHistoryProps {
  incidents: IncidentItem[];
}

export const IncidentHistory: React.FC<IncidentHistoryProps> = ({ incidents }) => {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            Triangulated Incident Audit Log
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Total Incidents Logged: {incidents.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0b111e] text-slate-400 border-b border-slate-800 uppercase">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Pipe / Location</th>
              <th className="py-2.5 px-3">Leak Offset</th>
              <th className="py-2.5 px-3">Wave Speed / Δt</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-3">Closed-Loop Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                  No active rupture incidents detected. Acoustic baseline nominal.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.incidentId} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                    {inc.pipeName}
                  </td>
                  <td className="py-2.5 px-3 text-rose-400 font-bold whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{inc.leakDistanceM.toFixed(1)} m</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300 whitespace-nowrap">
                    {inc.waveSpeedMs} m/s | {inc.deltaTMs.toFixed(2)} ms
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400">
                      {inc.confidenceScore}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-amber-300 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate max-w-[280px]">{inc.actionTaken}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
