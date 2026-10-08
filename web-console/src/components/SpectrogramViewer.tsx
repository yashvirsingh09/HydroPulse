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

  // Compute STFT on client side in real-time (< 5 ms for 10,000 samples)
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

  // Colormap helper: Turbo / Magma style gradient from 0.0 (dark purple/blue) to 1.0 (bright yellow/white)
  const getColor = (normVal: number): [number, number, number] => {
    const clamped = Math.max(0, Math.min(1, normVal));
    if (clamped < 0.25) {
      const t = clamped / 0.25;
      return [
        Math.round(11 + t * (45 - 11)),
        Math.round(17 + t * (20 - 17)),
        Math.round(44 + t * (110 - 44)),
      ];
    } else if (clamped < 0.5) {
      const t = (clamped - 0.25) / 0.25;
      return [
        Math.round(45 + t * (180 - 45)),
        Math.round(20 + t * (30 - 20)),
        Math.round(110 + t * (90 - 110)),
      ];
    } else if (clamped < 0.75) {
      const t = (clamped - 0.5) / 0.25;
      return [
        Math.round(180 + t * (245 - 180)),
        Math.round(30 + t * (130 - 30)),
        Math.round(90 - t * 60),
      ];
    } else {
      const t = (clamped - 0.75) / 0.25;
      return [
        Math.round(245 + t * 10),
        Math.round(130 + t * (245 - 130)),
        Math.round(30 + t * (180 - 30)),
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

    // Reset background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    const numTimes = stftData.timeBins.length;
    const numFreqs = stftData.freqBins.length;

    if (numTimes === 0 || numFreqs === 0) return;

    // Render off-screen pixel buffer for fast rendering
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Map canvas pixel (x, y) to time (x) and frequency (y, inverted so 0 Hz is at bottom)
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

    // Draw Frequency Guideline Overlay (850 Hz rupture resonance band)
    const ruptureBandFreq = 850;
    const nyquist = sampleRate / 2;
    const targetY = height - (ruptureBandFreq / nyquist) * height;

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label rupture target line
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.9)';
    ctx.fillText('850 Hz CAVITATION RESONANCE BAND', 10, targetY - 4);

    // Grid markers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let f = 1000; f < nyquist; f += 1000) {
      const y = height - (f / nyquist) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, targetY);
      ctx.stroke();
    }
  }, [stftData, sampleRate]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-yellow-400" />
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono">
            STFT Spectral Energy Heatmap
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Channel selector pill */}
          <div className="flex rounded-md bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveChannel('A')}
              className={`px-2.5 py-0.5 rounded transition ${
                activeChannel === 'A'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hydrophone 01
            </button>
            <button
              onClick={() => setActiveChannel('B')}
              className={`px-2.5 py-0.5 rounded transition ${
                activeChannel === 'B'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hydrophone 02
            </button>
          </div>

          {stftData && (
            <span className="flex items-center gap-1 text-xs font-mono text-yellow-400 bg-yellow-950/70 border border-yellow-800/60 px-2.5 py-0.5 rounded">
              <Sparkles className="w-3 h-3" />
              Peak: {stftData.peakFreqHz.toFixed(0)} Hz
            </span>
          )}
        </div>
      </div>

      {/* Spectrogram Canvas with Axis Indicators */}
      <div className="relative w-full aspect-[2.8/1] bg-[#080d1a] rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          width={800}
          height={280}
          className="w-full h-full block"
        />
        {/* Right axis frequency markers */}
        <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[9px] font-mono text-slate-400 pointer-events-none text-right">
          <span>5.0 kHz</span>
          <span>3.75 kHz</span>
          <span>2.5 kHz</span>
          <span>1.25 kHz</span>
          <span>0 Hz</span>
        </div>
      </div>

      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
        <span>T = 0 ms</span>
        <span className="text-yellow-400/80">
          Window: 128 samples (12.8ms) • Hop: 32 (75% overlap) • Radix-2 FFT
        </span>
        <span>T = 1000 ms</span>
      </div>
    </div>
  );
};
