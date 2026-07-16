import type { SVGProps } from "react";

type CurrentIconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: CurrentIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const AddIcon = (props: CurrentIconProps) => <Icon {...props}><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" /><path d="M12 8.5v7M8.5 12h7" /></Icon>;
export const UndoIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m9 7-5 5 5 5" /><path d="M4 12h8.5a5.5 5.5 0 0 1 5.5 5.5" /></Icon>;
export const RedoIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m15 7 5 5-5 5" /><path d="M20 12h-8.5A5.5 5.5 0 0 0 6 17.5" /></Icon>;
export const LibraryIcon = (props: CurrentIconProps) => <Icon {...props}><rect x="4" y="5" width="7" height="14" rx="1.75" /><path d="M14 7h6v10a2 2 0 0 1-2 2h-4zM6.5 8.5h2" /></Icon>;
export const ActivityIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M4 14.5h3l2-6 3.5 10 2.5-5H20" /><path d="M4 5.5h16" opacity=".38" /></Icon>;
export const AssistantIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M12 3.5 13.45 8.55 18.5 10 13.45 11.45 12 16.5l-1.45-5.05L5.5 10l5.05-1.45L12 3.5Z" /><path d="m18 15 .65 2.35L21 18l-2.35.65L18 21l-.65-2.35L15 18l2.35-.65L18 15Z" /></Icon>;
export const MoonIcon = (props: CurrentIconProps) => <Icon {...props}><path d="M20 15.2A7.8 7.8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z" /></Icon>;
export const SunIcon = (props: CurrentIconProps) => <Icon {...props}><circle cx="12" cy="12" r="3.3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.65 5.65l1.4 1.4M16.95 16.95l1.4 1.4M18.35 5.65l-1.4 1.4M7.05 16.95l-1.4 1.4" /></Icon>;
export const KeyIcon = (props: CurrentIconProps) => <Icon {...props}><circle cx="8.3" cy="11.7" r="3.3" /><path d="m10.65 14.05 6.85 6.85M14.35 17.75l1.75-1.75M16.1 19.5l1.75-1.75" /></Icon>;
export const CloseIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
export const ChevronDownIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m7 9.5 5 5 5-5" /></Icon>;
export const PlayIcon = (props: CurrentIconProps) => <Icon {...props}><path d="m9 6 9 6-9 6V6Z" /></Icon>;
export const StopIcon = (props: CurrentIconProps) => <Icon {...props}><rect x="7" y="7" width="10" height="10" rx="1.5" /></Icon>;
export const MoreIcon = (props: CurrentIconProps) => <Icon {...props}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>;
