/** Line icons for the landing (24px grid, 1.75 stroke, currentColor). */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: P) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconCash = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M3 3l18 18" />
  </Icon>
);

export const IconBank = (p: P) => (
  <Icon {...p}>
    <path d="M3 9.5L12 4l9 5.5" />
    <path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7" />
    <path d="M3 20h18" />
  </Icon>
);

export const IconTransfer = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h14l-3.5-3.5" />
    <path d="M20 16H6l3.5 3.5" />
  </Icon>
);

export const IconBarrier = (p: P) => (
  <Icon {...p}>
    <path d="M5 21V11" />
    <rect x="3" y="15" width="4" height="6" rx="1" />
    <path d="M6 11L19 4" />
  </Icon>
);

export const IconLive = (p: P) => (
  <Icon {...p}>
    <path d="M3 12h3.5l2.5-6 4 12 2.5-6H21" />
  </Icon>
);

export const IconScreen = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" />
    <rect x="5.5" y="7.5" width="8" height="7" rx="1" />
    <path d="M17 13.5h1.5M8.5 21h7M12 17.5V21" />
  </Icon>
);

export const IconTablet = (p: P) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <path d="M11 16h2" />
  </Icon>
);

export const IconRelay = (p: P) => (
  <Icon {...p}>
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <path d="M8 3v3M12 3v3M16 3v3M8 18v3M16 18v3" />
    <circle cx="12" cy="12" r="2" />
  </Icon>
);

export const IconWifi = (p: P) => (
  <Icon {...p}>
    <path d="M2.5 9a14 14 0 0119 0" />
    <path d="M5.5 12.5a9.5 9.5 0 0113 0" />
    <path d="M8.5 16a5 5 0 017 0" />
    <path d="M12 19.5h.01" />
  </Icon>
);

export const IconArrow = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconImage = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="M21 16l-5-5-8 9" />
  </Icon>
);

export const IconPlus = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconMenu = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h16M4 16h16" />
  </Icon>
);

export const IconClose = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconCheck = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const IconPhone = (p: P) => (
  <Icon {...p}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </Icon>
);

export const IconTicket = (p: P) => (
  <Icon {...p}>
    <path d="M4 6.5h16v3a2.5 2.5 0 000 5v3H4v-3a2.5 2.5 0 000-5z" />
    <path d="M14 6.5v11" strokeDasharray="1.5 2" />
  </Icon>
);

export const IconMachine = (p: P) => (
  <Icon {...p}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <rect x="7.5" y="5" width="9" height="6" rx="1" />
    <path d="M8.5 14.5h7M8.5 17.5h3" />
  </Icon>
);
