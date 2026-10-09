import React, { useRef, useEffect } from 'react';
import { Volume2, Activity, Radio } from 'lucide-react';

interface WaveformViewerProps {
  samplesA: number[];
  samplesB: number[];
  sampleRate: number;
  deltaTMs: number;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  samplesA,
  samplesB,
  sampleRate,
  deltaTMs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Deep modern dark background with subtle radial gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#060a12');
    bgGrad.addColorStop(1, '#09101d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle modern grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const midY1 = height * 0.28;
    const midY2 = height * 0.74;

    // Center baselines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY1);
    ctx.lineTo(width, midY1);
    ctx.moveTo(0, midY2);
    ctx.lineTo(width, midY2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel headers directly inside HUD
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CH 1: NODE A • HYDROPHONE (10 kHz ADC)', 14, 20);

    ctx.fillStyle = '#c084fc';
    ctx.fillText('CH 2: NODE B • HYDROPHONE (10 kHz ADC)', 14, height * 0.53);

    const step = Math.max(1, Math.floor(samplesA.length / width));

    // Glow Effect helper
    ctx.shadowBlur = 10;

    // Draw Signal A (Cyan Neon)
    ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.0;
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const val = (samplesA[idx] || 0) / 32768.0;
      const y = midY1 - val * (height * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Signal B (Purple Neon)
    ctx.shadowColor = 'rgba(168, 85, 247, 0.7)';
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.0;
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const val = (samplesB[idx] || 0) / 32768.0;
      const y = midY2 - val * (height * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

  }, [samplesA, samplesB]);

  const playAcousticTransient = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const buffer = audioCtx.createBuffer(1, samplesA.length, sampleRate);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < samplesA.length; i++) {
        channelData[i] = (samplesA[i] || 0) / 32768.0;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  };

  return (
    <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl backdrop-blur-xl transition hover:border-cyan-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-2">
              Dual-Channel Acoustic Oscilloscope
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Synchronized 10 kHz differential hydrophone wave telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono text-xs shadow-inner">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Δt: <strong className="text-white">{deltaTMs.toFixed(2)} ms</strong></span>
          </div>
          <button
            onClick={playAcousticTransient}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-cyan-900/30 transition transform active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Play Transient Sound
          </button>
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
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span> T = 0 ms (Trigger Window)
        </span>
        <span className="text-slate-500 font-sans">Sampling: 100 μs/pt (10,000 S/s)</span>
        <span className="flex items-center gap-1.5 text-slate-400">
          T = 1000 ms <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        </span>
      </div>
    </div>
  );
};
