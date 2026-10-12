/** Simulated medical-scope capture (otoscope view). Demo only. */
export function ScopeImage({ variant, className }: { variant: number; className?: string }) {
  const hue = 8 + (variant % 18)
  const id = `scope-${variant}`
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Image de caméra médicale">
      <defs>
        <radialGradient id={`${id}-m`} cx="52%" cy="48%" r="50%">
          <stop offset="0%" stopColor={`hsl(${hue + 20} 55% 82%)`} />
          <stop offset="55%" stopColor={`hsl(${hue} 50% 66%)`} />
          <stop offset="100%" stopColor={`hsl(${hue} 45% 38%)`} />
        </radialGradient>
        <radialGradient id={`${id}-v`} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="#120f0c" />
      <circle cx="100" cy="100" r="88" fill={`url(#${id}-m)`} />
      <path d="M100 40 L 104 100 L 132 140" stroke={`hsl(${hue} 40% 92%)`} strokeWidth="3" fill="none" opacity="0.7" />
      <ellipse cx="128" cy="138" rx="22" ry="12" fill="white" opacity="0.18" />
      <path d="M60 70 q 15 -8 30 0" stroke={`hsl(${hue} 60% 45%)`} strokeWidth="1.2" fill="none" opacity="0.6" />
      <circle cx="100" cy="100" r="88" fill={`url(#${id}-v)`} />
    </svg>
  )
}
