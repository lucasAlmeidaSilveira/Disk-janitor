import { cn } from '@renderer/lib/utils'

type LogoProps = {
  className?: string
  withBackground?: boolean
}

export function Logo({ className, withBackground = false }: LogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('block', className)}
      role="img"
      aria-label="Disk Janitor"
    >
      <defs>
        <linearGradient id="dj-ring" x1="100" y1="100" x2="440" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7CC9FF" />
          <stop offset="0.55" stopColor="#3B9BFF" />
          <stop offset="1" stopColor="#0A5BD1" />
        </linearGradient>
        <radialGradient id="dj-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#7CC9FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dj-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#111827" />
          <stop offset="1" stopColor="#050914" />
        </linearGradient>
      </defs>

      {withBackground && <rect width="512" height="512" rx="114" fill="url(#dj-bg)" />}

      <path
        d="M 416 256 A 160 160 0 1 1 256 96"
        stroke="url(#dj-ring)"
        strokeWidth="56"
        strokeLinecap="round"
        fill="none"
      />

      <g transform="translate(369 143)">
        <circle r="70" fill="url(#dj-spark)" opacity="0.55" />
        <path d="M 0 -54 Q 11 0 0 54 Q -11 0 0 -54 Z" fill="#FFFFFF" />
        <path d="M -54 0 Q 0 -11 54 0 Q 0 11 -54 0 Z" fill="#FFFFFF" />
        <circle r="9" fill="#FFFFFF" />
      </g>
    </svg>
  )
}
