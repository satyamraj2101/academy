export function SpotLogoLight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 64" className={className} role="img" aria-label="SpotCLM">
      <defs>
        <linearGradient id="lk_comet" x1="145" y1="200" x2="270" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0a2a6a"></stop>
          <stop offset="0.42" stopColor="#1460c8"></stop>
          <stop offset="1" stopColor="#5bc8f5"></stop>
        </linearGradient>
      </defs>
      <text x="4" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#0d1f4a">Sp</text>
      <g transform="translate(47.8 2.0) scale(0.122)">
        <path d="M 256 100 A 156 156 0 1 1 127 169 C 136 175 154 187 163 193 A 112 112 0 1 0 256 144 A 22 22 0 0 1 256 100 Z" fill="url(#lk_comet)"></path>
        <circle cx="256" cy="256" r="40" fill="none" stroke="#0a2a63" strokeWidth="3.5" strokeOpacity="0.38"></circle>
        <circle cx="256" cy="256" r="23" fill="#0a2a63"></circle>
      </g>
      <text x="99" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#0d1f4a">t</text>
      <text x="120" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#1246a0">CLM</text>
    </svg>
  );
}

export function SpotLogoDark({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 262 64" className={className} role="img" aria-label="SpotCLM">
      <defs>
        <linearGradient id="lkw_comet" x1="145" y1="200" x2="270" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2a8fe0"></stop>
          <stop offset="0.45" stopColor="#5bc5f5"></stop>
          <stop offset="1" stopColor="#c0eaff"></stop>
        </linearGradient>
      </defs>
      <text x="4" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#ffffff">Sp</text>
      <g transform="translate(47.8 2.0) scale(0.122)">
        <path d="M 256 100 A 156 156 0 1 1 127 169 C 136 175 154 187 163 193 A 112 112 0 1 0 256 144 A 22 22 0 0 1 256 100 Z" fill="url(#lkw_comet)"></path>
        <circle cx="256" cy="256" r="40" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeOpacity="0.32"></circle>
        <circle cx="256" cy="256" r="23" fill="#ffffff"></circle>
      </g>
      <text x="99" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#ffffff">t</text>
      <text x="120" y="47" fontFamily="Inter, system-ui, sans-serif" fontSize="45" fontWeight="800" letterSpacing="-1.4" fill="#7dd3fc">CLM</text>
    </svg>
  );
}
