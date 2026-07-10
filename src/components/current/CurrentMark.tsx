import { useId } from "react";

interface CurrentMarkProps {
  showWordmark?: boolean;
  className?: string;
}

export function CurrentMark({ showWordmark = false, className = "" }: CurrentMarkProps) {
  const gradientId = `current-flow-${useId().replace(/:/g, "")}`;

  return (
    <span role="img" aria-label="Current" className={`current-identity ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 32 32" className="current-mark">
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28">
            <stop offset="0" stopColor="var(--current-blue)" />
            <stop offset="1" stopColor="var(--current-aqua)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill={`url(#${gradientId})`} />
        <path d="M6 12c4-3 8 3 12 0s6-2 8-1M6 20c4 3 8-3 12 0s6 2 8 1" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {showWordmark && <span aria-hidden="true" className="current-wordmark">current</span>}
    </span>
  );
}
