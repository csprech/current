import { useRef, type KeyboardEvent } from "react";

export interface CurrentSegmentOption<T extends string = string> {
  value: T;
  label: string;
}

export interface CurrentSegmentedControlProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly CurrentSegmentOption<T>[];
  label?: string;
  className?: string;
}

export function CurrentSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label = "View",
  className = "",
}: CurrentSegmentedControlProps<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex === undefined || !options[nextIndex]) return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    buttonsRef.current[nextIndex]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={`current-segmented-control ${className}`.trim()}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => { buttonsRef.current[index] = element; }}
            type="button"
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => moveSelection(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
