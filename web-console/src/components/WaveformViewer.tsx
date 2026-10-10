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

    // Dark background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
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

    const midY1 = height * 0.28;
    const midY2 = height * 0.74;

    // Baselines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, midY1);
    ctx.lineTo(width, midY1);
    ctx.moveTo(0, midY2);
    ctx.lineTo(width, midY2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel labels in HUD
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CH 1: HYDROPHONE 01 (10 kHz)', 10, 16);

    ctx.fillStyle = '#c084fc';
    ctx.fillText('CH 2: HYDROPHONE 02 (10 kHz)', 10, height * 0.54);

    const step = Math.max(1, Math.floor(samplesA.length / width));

    // Glow Effect
    ctx.shadowBlur = 8;

    // Draw Signal A (Cyan Neon)
    ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.8;
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const val = (samplesA[idx] || 0) / 32768.0;
      const y = midY1 - val * (height * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Signal B (Purple Neon)
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.8;
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const val = (samplesB[idx] || 0) / 32768.0;
      const y = midY2 - val * (height * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

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
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl h-full justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
              Dual-Channel Oscilloscope
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono text-[11px]">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Δt: <strong>{deltaTMs.toFixed(2)} ms</strong></span>
          </div>
          <button
            onClick={playAcousticTransient}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold rounded-lg shadow transition cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            Play Audio
          </button>
        </div>
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
        <span>T = 0 ms</span>
        <span className="text-slate-500">10,000 S/s (100 μs/pt)</span>
        <span>T = 1000 ms</span>
      </div>
    </div>
  );
};
