interface CurrentMarkProps {
  showWordmark?: boolean;
  wordmarkTone?: "adaptive" | "color";
  className?: string;
}

export function CurrentMark({
  showWordmark = false,
  wordmarkTone = "adaptive",
  className = "",
}: CurrentMarkProps) {
  return (
    <span role="img" aria-label="Current" className={`current-identity ${className}`}>
      <span aria-hidden="true" className="current-brand-icon">
        <img className="current-brand-asset current-brand-asset--icon-color" src="/brand/current-icon-color.svg" alt="" />
        <img className="current-brand-asset current-brand-asset--white" src="/brand/current-icon-white.svg" alt="" />
      </span>
      {showWordmark && (
        <span aria-hidden="true" className={`current-brand-wordmark current-brand-wordmark--${wordmarkTone}`}>
          <img className="current-brand-asset current-brand-asset--black" src="/brand/current-logo-black.svg" alt="" />
          <img className="current-brand-asset current-brand-asset--wordmark-color" src="/brand/current-logo-color.svg" alt="" />
          <img className="current-brand-asset current-brand-asset--white" src="/brand/current-logo-white.svg" alt="" />
        </span>
      )}
    </span>
  );
}
