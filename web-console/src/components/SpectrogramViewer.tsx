import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Waves, Sparkles } from 'lucide-react';
import { computeSTFT, normalizePowerMatrix } from '@hydropulse/core-dsp';

interface SpectrogramViewerProps {
  samplesA: number[];
  samplesB: number[];
  sampleRate: number;
}

export const SpectrogramViewer: React.FC<SpectrogramViewerProps> = ({
  samplesA,
  samplesB,
  sampleRate = 10000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeChannel, setActiveChannel] = useState<'A' | 'B'>('A');

  const activeSamples = activeChannel === 'A' ? samplesA : samplesB;

  const stftData = useMemo(() => {
    if (!activeSamples || activeSamples.length === 0) return null;
    const rawStft = computeSTFT(activeSamples, sampleRate, 128, 32);
    const normalized = normalizePowerMatrix(rawStft.powerMatrixDb, 70);
    return {
      ...rawStft,
      normalizedPower: normalized,
      peakFreqHz: rawStft.dominantFrequencyHz ?? 850,
    };
  }, [activeSamples, sampleRate]);

  const getColor = (normVal: number): [number, number, number] => {
    const clamped = Math.max(0, Math.min(1, normVal));
    if (clamped < 0.2) {
      const t = clamped / 0.2;
      return [
        Math.round(10 + t * 25),
        Math.round(15 + t * 20),
        Math.round(35 + t * 90),
      ];
    } else if (clamped < 0.45) {
      const t = (clamped - 0.2) / 0.25;
      return [
        Math.round(35 + t * 145),
        Math.round(35 + t * 15),
        Math.round(125 + t * 25),
      ];
    } else if (clamped < 0.75) {
      const t = (clamped - 0.45) / 0.3;
      return [
        Math.round(180 + t * 65),
        Math.round(50 + t * 105),
        Math.round(150 - t * 120),
      ];
    } else {
      const t = (clamped - 0.75) / 0.25;
      return [
        Math.round(245 + t * 10),
        Math.round(155 + t * 95),
        Math.round(30 + t * 180),
      ];
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stftData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    const numTimes = stftData.timeBins.length;
    const numFreqs = stftData.freqBins.length;

    if (numTimes === 0 || numFreqs === 0) return;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let py = 0; py < height; py++) {
      const freqFrac = (height - 1 - py) / (height - 1);
      const freqIdx = Math.min(numFreqs - 1, Math.floor(freqFrac * numFreqs));

      for (let px = 0; px < width; px++) {
        const timeFrac = px / (width - 1);
        const timeIdx = Math.min(numTimes - 1, Math.floor(timeFrac * numTimes));

        const normVal = stftData.normalizedPower[timeIdx]?.[freqIdx] ?? 0;
        const [r, g, b] = getColor(normVal);

        const pIdx = (py * width + px) * 4;
        data[pIdx] = r;
        data[pIdx + 1] = g;
        data[pIdx + 2] = b;
        data[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 850 Hz marker
    const ruptureBandFreq = 850;
    const nyquist = sampleRate / 2;
    const targetY = height - (ruptureBandFreq / nyquist) * height;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(8, targetY - 14, 180, 14);
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText('850 Hz CAVITATION BAND', 12, targetY - 4);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let f = 1000; f < nyquist; f += 1000) {
      const y = height - (f / nyquist) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [stftData, sampleRate]);

  return (
    <div className="bg-[#0b101c] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl h-full justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
            <Waves className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider text-slate-100 uppercase font-mono">
              STFT Spectral Heatmap
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setActiveChannel('A')}
              className={`px-2 py-0.5 rounded transition font-medium cursor-pointer ${
                activeChannel === 'A'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node A
            </button>
            <button
              onClick={() => setActiveChannel('B')}
              className={`px-2 py-0.5 rounded transition font-medium cursor-pointer ${
                activeChannel === 'B'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node B
            </button>
          </div>

          {stftData && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-yellow-300 bg-yellow-950/60 border border-yellow-800/60 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <strong>{stftData.peakFreqHz.toFixed(0)} Hz</strong>
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-[2.6/1] bg-[#060a12] rounded-lg overflow-hidden border border-slate-800 shadow-inner flex-1 min-h-[160px]">
        <canvas
          ref={canvasRef}
          width={640}
          height={210}
          className="w-full h-full block"
        />
        <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[8px] font-mono text-slate-400 pointer-events-none text-right font-medium">
          <span className="bg-slate-950/70 px-1 rounded">5 kHz</span>
          <span className="bg-slate-950/70 px-1 rounded">2.5 kHz</span>
          <span className="bg-slate-950/70 px-1 rounded">0 Hz</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <span>T = 0 ms</span>
        <span className="text-yellow-400/90 font-sans">Hann: 128 (12.8ms) • Hop: 32</span>
        <span>T = 1000 ms</span>
      </div>
    </div>
  );
};
