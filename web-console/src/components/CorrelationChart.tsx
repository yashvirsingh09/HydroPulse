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

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#060a12');
    bgGrad.addColorStop(1, '#09101d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
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
    const zeroY = height - ((0 - minVal) / range) * (height * 0.78) - 20;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Find Peak Index
    let peakIdx = 0;
    let peakVal = -Infinity;
    for (let i = 0; i < correlationCurve.length; i++) {
      if (correlationCurve[i] > peakVal) {
        peakVal = correlationCurve[i];
        peakIdx = i;
      }
    }

    const peakX = (peakIdx / (correlationCurve.length - 1)) * width;
    const peakY = height - ((peakVal - minVal) / range) * (height * 0.78) - 20;

    // Gradient fill under the curve
    const areaGrad = ctx.createLinearGradient(0, peakY, 0, height);
    areaGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    areaGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    for (let i = 0; i < correlationCurve.length; i++) {
      const x = (i / (correlationCurve.length - 1)) * width;
      const y = height - ((correlationCurve[i] - minVal) / range) * (height * 0.78) - 20;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Plot GCC-PHAT Curve Line with glow
    ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < correlationCurve.length; i++) {
      const x = (i / (correlationCurve.length - 1)) * width;
      const y = height - ((correlationCurve[i] - minVal) / range) * (height * 0.78) - 20;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Sharp Vertical Indicator at Interpolated Peak
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(peakX, 10);
    ctx.lineTo(peakX, height - 10);
    ctx.stroke();

    // Peak Marker Dot
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Peak Label Callout
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(Math.min(width - 150, Math.max(10, peakX - 60)), 12, 125, 20);
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`τ̂ = ${sampleLag.toFixed(2)} SAMPLES`, Math.min(width - 145, Math.max(15, peakX - 55)), 26);

  }, [correlationCurve, sampleLag]);

  return (
    <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-xl transition hover:border-emerald-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-2">
              GCC-PHAT Cross-Correlation Curve
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Generalized Cross-Correlation with Phase Transform Whitening
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-lg shadow-inner">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Confidence: <strong>{confidenceScore.toFixed(1)}%</strong>
          </span>
        </div>
      </div>

      <div className="relative w-full aspect-[2.6/1] bg-[#060a12] rounded-xl overflow-hidden border border-slate-800 shadow-inner">
        <canvas
          ref={canvasRef}
          width={820}
          height={300}
          className="w-full h-full block"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1 border-t border-slate-800/60">
        <span>Lag Window: ±50 ms</span>
        <span className="text-emerald-400/90 font-sans">3-Point Parabolic Sub-Sample Interpolation</span>
        <span className="text-white font-mono">Peak Delay: {sampleLag.toFixed(2)}</span>
      </div>
    </div>
  );
};
