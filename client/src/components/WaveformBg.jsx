import { useEffect, useRef } from 'react';

function readCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function WaveformBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;
    let dpr = window.devicePixelRatio || 1;
    let resizeTimeout;

    const resize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        dpr = window.devicePixelRatio || 1;
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        canvas.width = Math.max(1, w * dpr);
        canvas.height = Math.max(1, h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }, 100);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const primary = readCSSVar('--primary') || '#9470ff';
      const second = readCSSVar('--secondary') || '#1fc9e6';

      const bars = 64;
      const barW = w / bars;

      for (let i = 0; i < bars; i++) {
        const f = i / bars;
        const amp =
          Math.sin(f * Math.PI * 4 + time * 0.55) * 0.22 +
          Math.sin(f * Math.PI * 7 + time * 0.85) * 0.14 +
          Math.sin(f * Math.PI * 2 + time * 0.35) * 0.1 +
          0.14;

        const barH = Math.max(2, Math.abs(amp) * h * 0.48);
        const x = i * barW;
        const cy = h * 0.5;

        const gTop = ctx.createLinearGradient(0, cy - barH, 0, cy);
        gTop.addColorStop(0, `${primary}${Math.round((0.06 + Math.abs(amp) * 0.22) * 255).toString(16).padStart(2, '0')}`);
        gTop.addColorStop(0.55, `${second}${Math.round((0.04 + Math.abs(amp) * 0.14) * 255).toString(16).padStart(2, '0')}`);
        gTop.addColorStop(1, `${primary}04`);

        ctx.fillStyle = gTop;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, cy - barH, barW - 3, barH, [2, 2, 0, 0]);
        ctx.fill();

        const gBot = ctx.createLinearGradient(0, cy, 0, cy + barH * 0.45);
        gBot.addColorStop(0, `${primary}${Math.round((0.03 + Math.abs(amp) * 0.1) * 255).toString(16).padStart(2, '0')}`);
        gBot.addColorStop(1, `${primary}00`);

        ctx.fillStyle = gBot;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, cy, barW - 3, barH * 0.45, [0, 0, 2, 2]);
        ctx.fill();
      }

      time += 0.011;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ opacity: 0.22 }}
      aria-hidden
    />
  );
}
