import { useRef, useEffect, useState, useCallback } from 'react';
import { getInitials, generateAvatarColor } from '../utils/formatTime';

function readCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function SpatialMap({ participants, spatialPositions, myId, onPositionChange, disabled = false }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [myPos, setMyPos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (dragging || !myId) return;
    const sp = spatialPositions[myId];
    if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y)) {
      setMyPos((prev) => (
        Math.abs(prev.x - sp.x) < 0.002 && Math.abs(prev.y - sp.y) < 0.002 ? prev : { x: sp.x, y: sp.y }
      ));
    }
  }, [myId, spatialPositions, dragging]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const primary  = readCSSVar('--primary')   || '#9D6FFF';
    const second   = readCSSVar('--secondary') || '#22D3EE';
    const border   = readCSSVar('--border')    || '#1E1E32';
    const faint    = readCSSVar('--faint')     || '#3D4460';

    ctx.clearRect(0, 0, w, h);

    // Grid dots
    ctx.fillStyle = `${border}80`;
    for (let x = 0; x < w; x += 18) {
      for (let y = 0; y < h; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Listening source (center) with glow
    const cx = w * 0.5;
    const cy = h * 0.5;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 65);
    gradient.addColorStop(0, `${second}30`);
    gradient.addColorStop(1, `${second}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${second}60`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = second;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', cx, cy + 0.5);

    // Participants
    participants.forEach((p, idx) => {
      const pos = p.id === myId
        ? myPos
        : (spatialPositions[p.id] || { x: 0.3 + (idx * 0.15) % 0.6, y: 0.3 + ((idx * 0.2) % 0.5) });
      const px = pos.x * w;
      const py = pos.y * h;
      const color = generateAvatarColor(p.name);

      if (p.id === myId) {
        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getInitials(p.name), px, py);

      ctx.fillStyle = faint;
      ctx.font = '7px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(p.name.split(' ')[0], px, py + 22);
    });
  }, [participants, spatialPositions, myId, myPos]);

  useEffect(() => {
    draw();
  }, [draw, disabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        draw();
      }, 100);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [draw]);

  const getRel = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (x - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (y - rect.top) / rect.height)),
    };
  };

  const handleDown = (e) => {
    if (disabled) return;
    setDragging(true);
    const p = getRel(e, canvasRef.current);
    setMyPos(p);
    onPositionChange?.(p);
  };
  const handleMove = (e) => {
    if (disabled || !dragging) return;
    const p = getRel(e, canvasRef.current);
    setMyPos(p);
    onPositionChange?.(p);
  };
  const handleUp   = () => setDragging(false);

  return (
    <div className="relative w-full h-full min-h-0 rounded-xl">
      <canvas
        ref={canvasRef}
        className={`w-full h-full rounded-xl ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}`}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      />
      {disabled && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl pointer-events-none bg-[color-mix(in_srgb,var(--bg)_55%,transparent)]"
          aria-hidden
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--faint)' }}>
            Off
          </span>
        </div>
      )}
    </div>
  );
}
