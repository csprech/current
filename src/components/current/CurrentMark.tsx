interface CurrentMarkProps {
  className?: string;
  /** wordmark: full logotype. icon: compact "iso" mark for tight chrome like the command bar. */
  variant?: "wordmark" | "icon";
}

export function CurrentMark({
  className = "",
  variant = "wordmark",
}: CurrentMarkProps) {
  if (variant === "icon") {
    return (
      <span role="img" aria-label="Current" className={`current-identity ${className}`}>
        <span aria-hidden="true" className="current-brand-icon">
          <img className="current-brand-asset current-brand-asset--icon-black" src="/brand/current-icon-iso-black.svg" alt="" />
          <img className="current-brand-asset current-brand-asset--icon-white" src="/brand/current-icon-iso-white.svg" alt="" />
        </span>
      </span>
    );
  }

  return (
    <span role="img" aria-label="Current" className={`current-identity ${className}`}>
      <span aria-hidden="true" className="current-brand-wordmark">
        <img className="current-brand-asset current-brand-asset--wordmark-black" src="/brand/current-logo-black.svg" alt="" />
        <img className="current-brand-asset current-brand-asset--wordmark-white" src="/brand/current-logo-white.svg" alt="" />
      </span>
    </span>
  );
}
