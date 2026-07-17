interface CurrentMarkProps {
  className?: string;
}

export function CurrentMark({
  className = "",
}: CurrentMarkProps) {
  return (
    <span role="img" aria-label="Current" className={`current-identity ${className}`}>
      <span aria-hidden="true" className="current-brand-wordmark">
        <img className="current-brand-asset current-brand-asset--wordmark-black" src="/brand/current-logo-black.svg" alt="" />
        <img className="current-brand-asset current-brand-asset--wordmark-white" src="/brand/current-logo-white.svg" alt="" />
      </span>
    </span>
  );
}
