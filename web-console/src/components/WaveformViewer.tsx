import React, { useRef, useEffect, useState } from 'react';
import { Volume2, Activity, Radio, Zap } from 'lucide-react';

interface WaveformViewerProps {
  samplesA: number[];
  samplesB: number[];
  sampleRate: number;
  deltaTMs: number;
  isSimulating?: boolean;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  samplesA,
  samplesB,
  sampleRate,
  deltaTMs,
  isSimulating = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);

  // High-performance continuous animation loop (CRT Sweep Beam + Water Turbulence)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepPhase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark CRT screen background with soft fade trail
      ctx.fillStyle = 'rgba(6, 10, 18, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Subtle dynamic grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.35)';
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

      // Center dashed baselines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, midY1);
      ctx.lineTo(width, midY1);
      ctx.moveTo(0, midY2);
      ctx.lineTo(width, midY2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Channel headers in HUD
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('CH 1: NODE A • HYDROPHONE 01 (10 kHz ADC)', 10, 16);

      ctx.fillStyle = '#c084fc';
      ctx.fillText('CH 2: NODE B • HYDROPHONE 02 (10 kHz ADC)', 10, height * 0.54);

      const step = Math.max(1, Math.floor((samplesA.length || 1000) / width));
      const timeOffset = isStreaming ? (sweepPhase % width) : 0;

      // Oscilloscope Phosphor Glow
      ctx.shadowBlur = 8;

      // Draw Signal A (Cyan Neon)
      ctx.shadowColor = 'rgba(6, 182, 212, 0.9)';
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.9;
      for (let x = 0; x < width; x++) {
        const sampleIdx = (x * step + Math.floor(sweepPhase * 2)) % (samplesA.length || 1);
        let val = (samplesA[sampleIdx] || 0) / 32768.0;
        
        // Add subtle live hydrodynamic jitter when idle
        if (isStreaming && !isSimulating) {
          val += Math.sin((x + sweepPhase) * 0.05) * 0.015 + (Math.random() - 0.5) * 0.01;
        }

        const y = midY1 - val * (height * 0.22);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Signal B (Purple Neon)
      ctx.shadowColor = 'rgba(168, 85, 247, 0.9)';
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.9;
      for (let x = 0; x < width; x++) {
        const sampleIdx = (x * step + Math.floor(sweepPhase * 2)) % (samplesB.length || 1);
        let val = (samplesB[sampleIdx] || 0) / 32768.0;

        if (isStreaming && !isSimulating) {
          val += Math.sin((x + sweepPhase + 20) * 0.05) * 0.015 + (Math.random() - 0.5) * 0.01;
        }

        const y = midY2 - val * (height * 0.22);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // CRT Sweeping Laser Beam (Vertical scanning line)
      if (isStreaming) {
        const beamX = timeOffset;
        const beamGrad = ctx.createLinearGradient(beamX - 20, 0, beamX, 0);
        beamGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
        beamGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(beamX - 20, 0, 20, height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(beamX, 0);
        ctx.lineTo(beamX, height);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      sweepPhase = (sweepPhase + 2.5) % width;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [samplesA, samplesB, isStreaming, isSimulating]);

  // Audio Playback with Web Audio API
  const playAcousticTransient = () => {
    try {
      setIsPlayingAudio(true);
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const buffer = audioCtx.createBuffer(1, samplesA.length, sampleRate);
      const channelData = buffer.getChannelData(0);

      for (let i = 0; i < samplesA.length; i++) {
        channelData[i] = (samplesA[i] || 0) / 32768.0;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlayingAudio(false);
      source.start();
    } catch (e) {
      console.warn('Web Audio playback error:', e);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl h-full justify-between transition hover:border-cyan-500/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono flex items-center gap-1.5">
              Live CRT Oscilloscope
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer flex items-center gap-1 ${
              isStreaming
                ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Live Sweep"
          >
            <Zap className={`w-2.5 h-2.5 ${isStreaming ? 'text-emerald-400' : 'text-slate-500'}`} />
            {isStreaming ? 'SWEEP: ON' : 'HOLD'}
          </button>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-mono text-[11px]">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Δt: <strong>{deltaTMs.toFixed(2)} ms</strong></span>
          </div>

          <button
            onClick={playAcousticTransient}
            disabled={isPlayingAudio}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-white text-[11px] font-semibold rounded-lg shadow transition cursor-pointer ${
              isPlayingAudio
                ? 'bg-amber-600 animate-pulse'
                : 'bg-cyan-600 hover:bg-cyan-500 active:scale-95'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            {isPlayingAudio ? 'Playing...' : 'Play Audio'}
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
        <span className="flex items-center gap-1 text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> 10,000 S/s Active Stream
        </span>
        <span className="text-slate-500">Phosphor Decay: 250ms • Bandwidth: 5 kHz</span>
        <span className="text-purple-400">T = 1000 ms</span>
      </div>
    </div>
  );
};
