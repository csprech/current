import { useLayoutEffect, useRef, type CSSProperties } from "react";

interface HandleLabelProps {
  label: string;
  side: "target" | "source";
  color: string;
  top?: string;
  visible: boolean;
  opacity?: number;
}

export function HandleLabel({ label, side, color, top = "calc(50% - 18px)", visible, opacity }: HandleLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const positionStyle = side === "target"
    ? { right: "calc(100% + 8px)" }
    : { left: "calc(100% + 8px)" };
  const labelStyle: CSSProperties & { "--current-handle-label-opacity": number } = {
    ...positionStyle,
    top,
    color,
    zIndex: 10,
    "--current-handle-label-opacity": opacity ?? 1,
  };

  useLayoutEffect(() => {
    const handle = labelRef.current?.previousElementSibling;
    if (!(handle instanceof HTMLElement) || !handle.classList.contains("react-flow__handle")) return;

    const fallbackName = handle.getAttribute("aria-label");
    handle.setAttribute("aria-label", `${label} connection port`);
    return () => {
      if (fallbackName) handle.setAttribute("aria-label", fallbackName);
      else handle.removeAttribute("aria-label");
    };
  }, [label]);

  return (
    <div
      ref={labelRef}
      aria-hidden="true"
      className={`current-handle-label absolute text-[10px] font-medium whitespace-nowrap pointer-events-none${visible ? " is-visible" : ""}${side === "target" ? " text-right" : ""}`}
      style={labelStyle}
    >
      {label}
    </div>
  );
}
