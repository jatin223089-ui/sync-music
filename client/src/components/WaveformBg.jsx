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

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const primary  = readCSSVar('--primary')   || '#9D6FFF';
      const second   = readCSSVar('--secondary') || '#22D3EE';

      const bars = 90;
      const barW = w / bars;

      for (let i = 0; i < bars; i++) {
        const f = i / bars;
        const amp =
          Math.sin(f * Math.PI * 5 + time * 0.9)  * 0.28 +
          Math.sin(f * Math.PI * 9 + time * 1.4)  * 0.18 +
          Math.sin(f * Math.PI * 3 + time * 0.5)  * 0.14 +
          0.18;

        const barH = Math.max(3, Math.abs(amp) * h * 0.62);
        const x    = i * barW;
        const cy   = h * 0.5;

        const gTop = ctx.createLinearGradient(0, cy - barH, 0, cy);
        gTop.addColorStop(0, `${primary}${Math.round((0.12 + Math.abs(amp) * 0.35) * 255).toString(16).padStart(2, '0')}`);
        gTop.addColorStop(0.5, `${second}${Math.round((0.08 + Math.abs(amp) * 0.2) * 255).toString(16).padStart(2, '0')}`);
        gTop.addColorStop(1, `${primary}05`);

        ctx.fillStyle = gTop;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, cy - barH, barW - 3, barH, [2, 2, 0, 0]);
        ctx.fill();

        const gBot = ctx.createLinearGradient(0, cy, 0, cy + barH * 0.55);
        gBot.addColorStop(0, `${primary}${Math.round((0.05 + Math.abs(amp) * 0.15) * 255).toString(16).padStart(2, '0')}`);
        gBot.addColorStop(1, `${primary}00`);

        ctx.fillStyle = gBot;
        ctx.beginPath();
        ctx.roundRect(x + 1.5, cy, barW - 3, barH * 0.55, [0, 0, 2, 2]);
        ctx.fill();
      }

      time += 0.018;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ opacity: 0.45 }}
    />
  );
}
