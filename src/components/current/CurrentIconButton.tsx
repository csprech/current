import type { ButtonHTMLAttributes } from "react";

export interface CurrentIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function CurrentIconButton({
  label,
  className = "",
  type = "button",
  title,
  ...props
}: CurrentIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={`current-icon-button ${className}`.trim()}
      {...props}
    />
  );
}
