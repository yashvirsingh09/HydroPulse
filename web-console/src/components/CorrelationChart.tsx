import React, { useRef, useEffect } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

interface CorrelationChartProps {
  correlationCurve: number[];
  lagIndices: number[];
  sampleLag: number;
  confidenceScore: number;
}

export const CorrelationChart: React.FC<CorrelationChartProps> = ({
  correlationCurve,
  lagIndices,
  sampleLag,
  confidenceScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !correlationCurve || correlationCurve.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const minVal = Math.min(...correlationCurve, 0);
    const maxVal = Math.max(...correlationCurve, 0.01);
    const range = maxVal - minVal || 1;

    // Draw baseline zero
    const zeroY = height - ((0 - minVal) / range) * (height * 0.8) - 15;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot GCC-PHAT Curve
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < correlationCurve.length; i++) {
      const x = (i / (correlationCurve.length - 1)) * width;
      const y = height - ((correlationCurve[i] - minVal) / range) * (height * 0.8) - 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Find and highlight peak
    const peakIdx = correlationCurve.indexOf(Math.max(...correlationCurve));
    if (peakIdx >= 0) {
      const peakX = (peakIdx / (correlationCurve.length - 1)) * width;
      const peakY = height - ((correlationCurve[peakIdx] - minVal) / range) * (height * 0.8) - 15;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(peakX, 0);
      ctx.lineTo(peakX, height);
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f87171';
      ctx.fillText(`τ = ${sampleLag} samples`, Math.max(10, peakX - 45), 18);
    }
  }, [correlationCurve, lagIndices, sampleLag]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            GCC-PHAT Cross-Correlation Peak
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PSLR Confidence: {confidenceScore}%
        </div>
      </div>

      <div className="relative w-full aspect-[2.8/1] bg-[#0b111e] rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          className="w-full h-full block"
        />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
        <span>-40 Samples Delay</span>
        <span>Whitened Phase Transform (TDOA Extraction)</span>
        <span>+40 Samples Delay</span>
      </div>
    </div>
  );
};
