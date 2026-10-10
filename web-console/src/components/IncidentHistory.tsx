import React from 'react';
import { Clock, History } from 'lucide-react';

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
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <History className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
              Triangulated Incident Audit Log (DynamoDB)
            </h2>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
          Logged Incidents: <strong className="text-rose-400">{incidents.length}</strong>
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#060a12] max-h-[140px] overflow-y-auto">
        <table className="w-full text-left text-[11px] font-mono">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase sticky top-0">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Pipeline Sector</th>
              <th className="py-2 px-3">Leak Offset</th>
              <th className="py-2 px-3">Wave Speed / Δt</th>
              <th className="py-2 px-3">Confidence</th>
              <th className="py-2 px-3">Mitigation Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500 font-sans italic text-xs">
                  No rupture incidents detected. Acoustic baseline nominal across Delhi Jal Board network.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.incidentId} className="hover:bg-slate-800/30 transition">
                  <td className="py-1.5 px-3 whitespace-nowrap text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-1.5 px-3 font-semibold text-white truncate max-w-[200px]">
                    {inc.pipeName}
                  </td>
                  <td className="py-1.5 px-3 text-amber-300 font-bold">
                    {inc.leakDistanceM.toFixed(2)} m
                  </td>
                  <td className="py-1.5 px-3 text-slate-400">
                    {inc.waveSpeedMs.toFixed(0)} m/s • {inc.deltaTMs.toFixed(2)} ms
                  </td>
                  <td className="py-1.5 px-3">
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                      {inc.confidenceScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-rose-300 text-[10px]">
                    {inc.actionTaken}
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
