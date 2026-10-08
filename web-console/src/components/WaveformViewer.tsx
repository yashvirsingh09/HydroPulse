import React, { useRef, useEffect } from 'react';
import { Volume2, Activity } from 'lucide-react';

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

    // Clear background
    ctx.fillStyle = '#0b111e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const midY1 = height * 0.28;
    const midY2 = height * 0.72;

    // Baseline labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CHANNEL A: HYDROPHONE 01 (10 kHz ADC)', 12, 18);

    ctx.fillStyle = '#a855f7';
    ctx.fillText('CHANNEL B: HYDROPHONE 02 (10 kHz ADC)', 12, height * 0.52);

    const step = Math.max(1, Math.floor(samplesA.length / width));

    // Draw Signal A (Cyan)
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

    // Draw Signal B (Purple)
    ctx.beginPath();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    for (let x = 0; x < width; x++) {
      const idx = x * step;
      const val = (samplesB[idx] || 0) / 32768.0;
      const y = midY2 - val * (height * 0.22);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

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
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            Dual-Channel Acoustic Oscilloscope
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
            Δt Delay: {deltaTMs.toFixed(2)} ms
          </span>
          <button
            onClick={playAcousticTransient}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-md shadow transition"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Play Acoustic Burst
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-[2.8/1] bg-[#0b111e] rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={800}
          height={280}
          className="w-full h-full block"
        />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
        <span>T = 0 ms (Trigger Window Start)</span>
        <span>Resolution: 100 μs / sample</span>
        <span>T = 1000 ms</span>
      </div>
    </div>
  );
};
