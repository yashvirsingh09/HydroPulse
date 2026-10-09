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
    <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono">
              Triangulated Incident Audit Log
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Amazon DynamoDB telemetry history & automated actuation records
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
          Incidents Recorded: <strong className="text-rose-400">{incidents.length}</strong>
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#060a12]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Pipeline Sector</th>
              <th className="py-3 px-4">Leak Offset</th>
              <th className="py-3 px-4">Wave Speed / Δt</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Closed-Loop Mitigation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {incidents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-sans italic">
                  No active rupture incidents detected. Acoustic baseline nominal across Delhi Jal Board network.
                </td>
              </tr>
            ) : (
              incidents.map((inc) => (
                <tr key={inc.incidentId} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {inc.pipeName}
                  </td>
                  <td className="py-3 px-4 text-amber-300 font-bold">
                    {inc.leakDistanceM.toFixed(2)} m
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {inc.waveSpeedMs.toFixed(0)} m/s • {inc.deltaTMs.toFixed(2)} ms
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 font-bold text-[11px]">
                      {inc.confidenceScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-rose-300 font-medium">
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
