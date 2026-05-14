export default function BrandLogo({ size = 32, className = '' }) {
  return (
    <div
      className={`relative rounded-xl flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--primary), var(--primary-d))',
        boxShadow: '0 6px 16px color-mix(in srgb, var(--primary) 35%, transparent)',
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M17.5 5.8C16.3 4.8 14.4 4.7 13 5.6L8.4 8.6C7.3 9.3 7.2 10.8 8.3 11.5C9.1 12 10 12 10.8 11.6L13.1 10.3C13.9 9.9 15 10.2 15.4 11C15.8 11.8 15.5 12.8 14.7 13.3L10.3 15.9C8.8 16.8 6.8 16.7 5.5 15.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18.2" cy="7.6" r="1.3" fill="white" />
      </svg>
    </div>
  );
}
