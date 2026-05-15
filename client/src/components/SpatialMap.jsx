import { useRef, useEffect, useState, useCallback } from 'react';
import { getInitials, generateAvatarColor } from '../utils/formatTime';

function readCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function SpatialMap({ participants, spatialPositions, myId, onPositionChange }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [myPos, setMyPos] = useState({ x: 0.5, y: 0.5 });

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
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getInitials(p.name), px, py);

      ctx.fillStyle = faint;
      ctx.font = '7px Inter, sans-serif';
      ctx.fillText(p.name.split(' ')[0], px, py + 22);
    });
  }, [participants, spatialPositions, myId, myPos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
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

  const handleDown = (e) => { setDragging(true); const p = getRel(e, canvasRef.current); setMyPos(p); onPositionChange?.(p); };
  const handleMove = (e) => { if (!dragging) return; const p = getRel(e, canvasRef.current); setMyPos(p); onPositionChange?.(p); };
  const handleUp   = () => setDragging(false);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-xl cursor-crosshair"
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
    />
  );
}
