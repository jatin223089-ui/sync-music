export default function WaveformVisualizer({ data, isPlaying }) {
  const bars = Array.from(data || new Uint8Array(40));

  return (
    <div className="flex items-end justify-center gap-[2px] h-12 w-full">
      {bars.map((val, i) => {
        const height = isPlaying ? Math.max(3, (val / 255) * 48) : 4;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: '3px',
              height: `${height}px`,
              background: 'linear-gradient(to top, var(--primary), var(--secondary))',
              opacity: isPlaying ? 0.7 + (val / 255) * 0.3 : 0.25,
            }}
          />
        );
      })}
    </div>
  );
}
