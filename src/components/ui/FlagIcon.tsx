/**
 * Crisp SVG flag icons used by the header LanguageSelector. Avoids relying on
 * emoji flags which render inconsistently across OSes (Windows in particular
 * shows them as 2-letter glyphs).
 */

export function FlagRO({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 6 4"
      role="img"
      aria-label="Steagul României"
      className={`${className} rounded-sm shadow-sm`}
      preserveAspectRatio="none"
    >
      <rect width="2" height="4" x="0" y="0" fill="#002B7F" />
      <rect width="2" height="4" x="2" y="0" fill="#FCD116" />
      <rect width="2" height="4" x="4" y="0" fill="#CE1126" />
    </svg>
  );
}

export function FlagGB({ className = "h-4 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      role="img"
      aria-label="Union Jack"
      className={`${className} rounded-sm shadow-sm`}
      preserveAspectRatio="none"
    >
      <clipPath id="flag-gb-clip">
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <clipPath id="flag-gb-clip-diag">
        <path d="M30 15h30v15zM30 15v15H0zM30 15H0V0zM30 15V0h30z" />
      </clipPath>
      <g clipPath="url(#flag-gb-clip)">
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0 0l60 30m0-30L0 30"
          clipPath="url(#flag-gb-clip-diag)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
