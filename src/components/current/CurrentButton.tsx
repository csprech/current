import type { ButtonHTMLAttributes } from "react";

export type CurrentButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export interface CurrentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CurrentButtonVariant;
}

export function CurrentButton({
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}: CurrentButtonProps) {
  return (
    <button
      type={type}
      className={`current-button current-button--${variant} ${className}`.trim()}
      data-variant={variant}
      {...props}
    />
  );
}
