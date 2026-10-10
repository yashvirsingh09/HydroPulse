import React, { useRef, useEffect } from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

interface CorrelationChartProps {
  correlationCurve: number[];
  lagIndices?: number[];
  sampleLag: number;
  confidenceScore: number;
}

export const CorrelationChart: React.FC<CorrelationChartProps> = ({
  correlationCurve,
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

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const minVal = Math.min(...correlationCurve, 0);
    const maxVal = Math.max(...correlationCurve, 0.01);
    const range = maxVal - minVal || 1;

    const zeroY = height - ((0 - minVal) / range) * (height * 0.78) - 15;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    let peakIdx = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < correlationCurve.length; i++) {
      if (correlationCurve[i] > peakVal) {
        peakVal = correlationCurve[i];
        peakIdx = i;
      }
    }

    const peakX = (peakIdx / (correlationCurve.length - 1)) * width;
    const peakY = height - ((peakVal - minVal) / range) * (height * 0.78) - 15;

    const areaGrad = ctx.createLinearGradient(0, peakY, 0, height);
    areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    for (let i = 0; i < correlationCurve.length; i++) {
      const x = (i / (correlationCurve.length - 1)) * width;
      const y = height - ((correlationCurve[i] - minVal) / range) * (height * 0.78) - 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < correlationCurve.length; i++) {
      const x = (i / (correlationCurve.length - 1)) * width;
      const y = height - ((correlationCurve[i] - minVal) / range) * (height * 0.78) - 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Peak Crosshair
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(peakX, 8);
    ctx.lineTo(peakX, height - 8);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(Math.min(width - 120, Math.max(8, peakX - 50)), 10, 105, 18);
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`τ̂ = ${sampleLag.toFixed(2)} SAMPLES`, Math.min(width - 116, Math.max(12, peakX - 46)), 22);

  }, [correlationCurve, sampleLag]);

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl h-full justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
              GCC-PHAT Cross-Correlation
            </h2>
          </div>
        </div>

        <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Conf: <strong>{confidenceScore.toFixed(1)}%</strong>
        </span>
      </div>

      <div className="relative w-full aspect-[2.6/1] bg-[#060a12] rounded-lg overflow-hidden border border-slate-800 shadow-inner flex-1 min-h-[160px]">
        <canvas
          ref={canvasRef}
          width={640}
          height={210}
          className="w-full h-full block"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <span>Lag: ±50 ms</span>
        <span className="text-emerald-400/90 font-sans">Parabolic Interpolation</span>
        <span className="text-white">Delay: {sampleLag.toFixed(2)} pts</span>
      </div>
    </div>
  );
};
