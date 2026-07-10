import type { SVGProps } from "react";

type CurrentIconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: CurrentIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const AddIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>;
export const UndoIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m9 7-5 5 5 5" /><path d="M4 12h9a6 6 0 0 1 6 6" /></Icon>;
export const RedoIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m15 7 5 5-5 5" /><path d="M20 12h-9a6 6 0 0 0-6 6" /></Icon>;
export const LibraryIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M4 5.5h6v13H4zM14 5.5h6v13h-6z" /></Icon>;
export const ActivityIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M4 12h3l2-5 4 10 2-5h5" /></Icon>;
export const AssistantIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M12 3.5 13.7 9l5.3 2-5.3 2-1.7 5.5-1.7-5.5L5 11l5.3-2L12 3.5Z" /></Icon>;
export const CloseIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const ChevronDownIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m7 9.5 5 5 5-5" /></Icon>;
export const PlayIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m9 6 9 6-9 6V6Z" /></Icon>;
export const StopIcon = (props: CurrentIconProps) => <Icon {...props}><rect x="7" y="7" width="10" height="10" rx="1.5" /></Icon>;
export const MoreIcon = (props: CurrentIconProps) => <Icon {...props}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>;
