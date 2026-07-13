import { useEffect, useRef } from 'react';

/**
 * Live microphone level visual: a row of rounded bars driven by the
 * recorder's AnalyserNode via requestAnimationFrame.
 */
export function LevelMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = new Uint8Array(analyser.fftSize);
    const BARS = 24;
    let raf = 0;

    const draw = () => {
      analyser.getByteTimeDomainData(data);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const step = Math.floor(data.length / BARS);
      const barWidth = width / BARS;
      ctx.fillStyle = '#d98a7e'; // blush-500

      for (let i = 0; i < BARS; i++) {
        let peak = 0;
        for (let j = 0; j < step; j++) {
          peak = Math.max(peak, Math.abs((data[i * step + j] ?? 128) - 128));
        }
        const barHeight = Math.max(6, (peak / 128) * height);
        const x = i * barWidth + barWidth * 0.25;
        const y = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth * 0.5, barHeight, barWidth * 0.25);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return <canvas ref={canvasRef} width={320} height={72} className="h-[72px] w-full" />;
}
