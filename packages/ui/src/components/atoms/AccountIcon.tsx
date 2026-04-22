/**
 * ══════════════════════════════════════════════════════════════
 * ACCOUNT ICON DESIGN SCHEMA — Flat Outlined Style
 * ══════════════════════════════════════════════════════════════
 *
 * Matches CategoryIcon v2 design language exactly:
 *   - Grid: 24x24 viewBox, flat solid fills + dark stroke outlines
 *   - Fill: Solid flat colors — no gradients, no shadows
 *   - Outline: #474D54 stroke (1.5px) on main shapes
 *   - Depth: Darker shade fills (#5FA77E / #FF9052) for secondary areas
 *   - Interior: #FFFFFF white fills for details
 *
 * Color Palette (identical to CategoryIcon):
 *   Teal:   #92E0C0 (fill)  ·  #5FA77E (dark/depth)
 *   Amber:  #FFC850 (fill)  ·  #FF9052 (dark/depth)
 *   Stroke: #474D54 (all outlines)
 *   White:  #FFFFFF (interior fills)
 *
 * Account Type → Primary Color:
 *   Cash:         Amber (#FFC850) — physical money / accessible cash
 *   Bank Account: Teal  (#92E0C0) — institutional / secure
 *   Credit Card:  Teal  (#92E0C0) — card / digital payment
 *   Investment:   Teal  (#92E0C0) — growth / portfolio
 *   Savings:      Teal  (#92E0C0) — secure storage / vault
 * ══════════════════════════════════════════════════════════════
 */

import type { SVGProps, ReactNode } from "react";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode;

interface IconEntry {
  label: string;
  icon: IconComponent;
}

const svg = (children: ReactNode, props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    {children}
  </svg>
);

// Palette (matches CategoryIcon)
const TF = "#92E0C0"; // teal fill
const TD = "#5FA77E"; // teal dark/depth
const AF = "#FFC850"; // amber fill
const AD = "#FF9052"; // amber dark/depth
const SK = "#474D54"; // stroke/outline
const W = "#FFFFFF"; // white interior

// ─── Cash (Amber) — fan of banknotes ─────────────────────────────────────────

const Cash: IconComponent = (p) =>
  svg(
    <>
      {/* Back bill — rotated to create fan effect */}
      <rect
        fill={AD}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        x="5"
        y="4"
        width="16"
        height="10"
        rx="1.5"
        transform="rotate(10 13 9)"
      />
      {/* Front bill */}
      <rect
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        x="3"
        y="10"
        width="18"
        height="11"
        rx="1.5"
      />
      {/* Corner oval decorations */}
      <ellipse fill={W} cx="6.5" cy="15.5" rx="1.5" ry="1" />
      <ellipse fill={W} cx="17.5" cy="15.5" rx="1.5" ry="1" />
      {/* Center dollar-sign area */}
      <rect fill={W} x="10.5" y="12.5" width="3" height="5" rx=".5" />
    </>,
    p,
  );

// ─── Bank Account (Teal) — classical bank building ────────────────────────────

const Bank: IconComponent = (p) =>
  svg(
    <>
      {/* Pediment / roof triangle */}
      <polygon
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points="12,3 21,8 3,8"
      />
      {/* Left pillar */}
      <rect fill={TF} stroke={SK} strokeWidth="1" x="5" y="8" width="3" height="10" />
      {/* Center pillar */}
      <rect fill={TF} stroke={SK} strokeWidth="1" x="10.5" y="8" width="3" height="10" />
      {/* Right pillar */}
      <rect fill={TF} stroke={SK} strokeWidth="1" x="16" y="8" width="3" height="10" />
      {/* Base / steps */}
      <rect
        fill={TD}
        stroke={SK}
        strokeWidth="1.5"
        x="2"
        y="18"
        width="20"
        height="3.5"
        rx="1"
      />
    </>,
    p,
  );

// ─── Credit Card (Teal) — card with chip ──────────────────────────────────────

const CreditCard: IconComponent = (p) =>
  svg(
    <>
      {/* Card body */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2"
      />
      {/* Dark header band */}
      <rect fill={TD} x="2" y="5" width="20" height="4" rx="2" />
      {/* Fill bottom of rounded top rect */}
      <rect fill={TD} x="2" y="7" width="20" height="2" />
      {/* Chip — amber gold */}
      <rect
        fill={AF}
        stroke={SK}
        strokeWidth="1"
        x="4"
        y="12"
        width="5"
        height="4"
        rx=".5"
      />
      {/* Chip contact lines */}
      <line x1="6.5" y1="12" x2="6.5" y2="16" stroke={AD} strokeWidth=".75" />
      <line x1="4" y1="14" x2="9" y2="14" stroke={AD} strokeWidth=".75" />
      {/* Card number placeholder bar */}
      <rect fill={W} x="12" y="13" width="8" height="2" rx=".5" />
    </>,
    p,
  );

// ─── Investment (Teal) — ascending bar chart ──────────────────────────────────

const Investment: IconComponent = (p) =>
  svg(
    <>
      {/* Short bar */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="2"
        y="15"
        width="5"
        height="7"
        rx="1"
      />
      {/* Medium bar */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="9.5"
        y="10"
        width="5"
        height="12"
        rx="1"
      />
      {/* Tall bar (dark = highlight the growth peak) */}
      <rect
        fill={TD}
        stroke={SK}
        strokeWidth="1.5"
        x="17"
        y="5"
        width="5"
        height="17"
        rx="1"
      />
      {/* Up arrow on tallest bar */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 4.5 L22 8 L17 8 Z"
      />
      {/* Floor baseline */}
      <line
        x1="1"
        y1="22"
        x2="23"
        y2="22"
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>,
    p,
  );

// ─── Savings (Teal) — safe / vault ────────────────────────────────────────────

const Savings: IconComponent = (p) =>
  svg(
    <>
      {/* Safe body */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="3"
        y="3"
        width="16"
        height="18"
        rx="2"
      />
      {/* Hinge top */}
      <rect fill={TD} x="3" y="6" width="2" height="3" rx=".5" />
      {/* Hinge bottom */}
      <rect fill={TD} x="3" y="15" width="2" height="3" rx=".5" />
      {/* Combination lock ring */}
      <circle fill={TD} stroke={SK} strokeWidth="1.5" cx="13" cy="12" r="5" />
      {/* Lock inner face */}
      <circle fill={TF} cx="13" cy="12" r="3" />
      {/* Dial knob — amber */}
      <circle fill={AF} stroke={SK} strokeWidth="1" cx="13" cy="12" r="1.5" />
      {/* Handle */}
      <rect
        fill={AF}
        stroke={SK}
        strokeWidth="1"
        x="19"
        y="10"
        width="2"
        height="4"
        rx="1"
      />
    </>,
    p,
  );

// ─── Icon Registry ─────────────────────────────────────────────────────────────

export const ACCOUNT_ICONS: Record<string, IconEntry> = {
  cash: { label: "Cash", icon: Cash },
  bank: { label: "Bank Account", icon: Bank },
  card: { label: "Credit Card", icon: CreditCard },
  investment: { label: "Investment", icon: Investment },
  savings: { label: "Savings", icon: Savings },
};

/** Maps account type strings to default icon keys */
export const ACCOUNT_TYPE_ICON: Record<string, string> = {
  Cash: "cash",
  "Bank Account": "bank",
  "Credit Card": "card",
  Investment: "investment",
  Savings: "savings",
};

// ─── Render component ──────────────────────────────────────────────────────────

export interface AccountIconProps {
  name?: string;
  size?: number;
  className?: string;
}

export function AccountIcon({
  name,
  size = 24,
  className,
}: AccountIconProps) {
  const entry = name ? ACCOUNT_ICONS[name] : undefined;
  const Icon = entry?.icon ?? Cash;

  return (
    <Icon width={size} height={size} className={className} aria-hidden="true" />
  );
}
