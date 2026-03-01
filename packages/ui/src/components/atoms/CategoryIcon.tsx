/**
 * ══════════════════════════════════════════════════════════════
 * CATEGORY ICON DESIGN SCHEMA v2 — Flat Outlined Style
 * ══════════════════════════════════════════════════════════════
 *
 * Visual Language:
 *   - Style: Flat two-tone outlined icons — mint-teal + amber palette
 *   - Grid: 24x24 viewBox, 2px safe padding (usable area: ~20x20)
 *   - Fill: Solid flat colors — no gradients, no shadows
 *   - Outline: #474D54 stroke (1.5px) on main shapes
 *   - Depth: Darker shade fills (#5FA77E / #FF9052) for secondary areas
 *   - Interior: #FFFFFF white fills for windows, screens, paper areas
 *
 * Color Palette:
 *   Teal:   #92E0C0 (fill)  ·  #5FA77E (dark/depth)
 *   Amber:  #FFC850 (fill)  ·  #FF9052 (dark/depth)
 *   Stroke: #474D54 (all outlines)
 *   White:  #FFFFFF (interior fills)
 *
 * Category → Primary Color:
 *   Food & Drink:  Amber (#FFC850) — food, coffee, grocery
 *   Transport:     Teal  (#92E0C0) — transport, car, bus
 *   Housing:       Teal  (#92E0C0) — home, electricity, wifi, water
 *   Shopping:      Amber (#FFC850) — shopping, clothing
 *   Health:        Teal  (#92E0C0) — health, pill, gym
 *   Entertainment: Teal  (#92E0C0) — entertainment, movie, music, game
 *   Education:     Teal  (#92E0C0) — education, book
 *   Travel:        Teal  (#92E0C0) — travel, plane, hotel
 *   Personal:      Amber (#FFC850) — gift, pet, baby
 *   Finance:       Teal  (#92E0C0) — salary, investment, savings, insurance, tax
 *   Other:         Teal  (#92E0C0) — donation, repair, wallet
 *
 * Adding New Icons:
 *   1. Pick primary color from palette (teal for most, amber for food/shopping/personal)
 *   2. Use fill + stroke="#474D54" strokeWidth="1.5" on main shapes
 *   3. Add darker shade for depth elements (no separate outline needed)
 *   4. White fills for interior details (windows, text lines, screens)
 *   5. Add entry to CATEGORY_ICONS registry
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

// Palette
const TF = "#92E0C0"; // teal fill
const TD = "#5FA77E"; // teal dark/depth
const AF = "#FFC850"; // amber fill
const AD = "#FF9052"; // amber dark/depth
const SK = "#474D54"; // stroke/outline
const W = "#FFFFFF"; // white interior

// ─── Food & Drink (Amber) ─────────────────────────────────────────────────────

const Food: IconComponent = (p) =>
  svg(
    <>
      {/* Pot rim */}
      <rect fill={AD} stroke={SK} strokeWidth="1.5" x="2.5" y="8" width="19" height="2" rx="1" />
      {/* Pot body */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10h16v5a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-5z"
      />
      {/* Side handle */}
      <path
        fill="none"
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M19 12h1a2 2 0 0 1 0 4h-1"
      />
      {/* Steam prongs */}
      <rect fill={TF} x="8" y="2.5" width="1.5" height="4.5" rx=".75" />
      <rect fill={TF} x="11.25" y="2.5" width="1.5" height="4.5" rx=".75" />
      <rect fill={TF} x="14.5" y="2.5" width="1.5" height="4.5" rx=".75" />
    </>,
    p,
  );

const Coffee: IconComponent = (p) =>
  svg(
    <>
      {/* Mug body */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 8h11v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z"
      />
      {/* Rim */}
      <rect fill={AD} x="5" y="7" width="11" height="2" rx="1" />
      {/* Coffee surface */}
      <ellipse fill={AD} cx="10.5" cy="8" rx="4" ry="1" />
      {/* Handle */}
      <path
        fill="none"
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M16 11h1.5a2 2 0 0 1 0 4H16"
      />
      {/* Steam */}
      <path
        fill="none"
        stroke={TF}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M9 6c0-1 1-1 1-2"
      />
      <path
        fill="none"
        stroke={TF}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M12 6c0-1 1-1 1-2"
      />
    </>,
    p,
  );

const Grocery: IconComponent = (p) =>
  svg(
    <>
      {/* Bag body — teal to differentiate from food/coffee amber */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9z"
      />
      {/* Top edge */}
      <rect fill={TD} x="6" y="8" width="12" height="2" rx="1" />
      {/* Handles */}
      <path
        fill="none"
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M9.5 9.5V7a2.5 2.5 0 0 1 5 0v2.5"
      />
      {/* Center accent stripe */}
      <rect fill={AF} x="11" y="12" width="2" height="5" rx="1" />
    </>,
    p,
  );

// ─── Transport (Teal) ─────────────────────────────────────────────────────────

const Transport: IconComponent = (p) =>
  svg(
    <>
      {/* Cargo box */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="1" y="6" width="14" height="11" rx="1.5" />
      {/* Cab */}
      <path
        fill={TD}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h5l2 3v5h-7V9z"
      />
      {/* Cab window */}
      <path fill={W} d="M16.5 10.5h3l.5 1.5H16v-1.5z" />
      {/* Wheels */}
      <circle fill={SK} cx="6" cy="18" r="2.5" />
      <circle fill={SK} cx="18.5" cy="18" r="2.5" />
      <circle fill={TF} cx="6" cy="18" r="1" />
      <circle fill={TF} cx="18.5" cy="18" r="1" />
    </>,
    p,
  );

const Car: IconComponent = (p) =>
  svg(
    <>
      {/* Body */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="2" y="12" width="20" height="6" rx="2" />
      {/* Roof */}
      <path
        fill={TD}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 12l2-5h6l2 5H7z"
      />
      {/* Windshield */}
      <path fill={W} d="M9.5 11l1-2.5h3L15 11H9.5z" />
      {/* Wheels */}
      <circle fill={SK} cx="7" cy="18.5" r="2.5" />
      <circle fill={SK} cx="17" cy="18.5" r="2.5" />
      <circle fill={TF} cx="7" cy="18.5" r="1" />
      <circle fill={TF} cx="17" cy="18.5" r="1" />
    </>,
    p,
  );

const Bus: IconComponent = (p) =>
  svg(
    <>
      {/* Body */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="2" y="4" width="20" height="14" rx="2" />
      {/* Windows */}
      <rect fill={W} stroke={SK} strokeWidth="1" x="5" y="7" width="4" height="4" rx="1" />
      <rect fill={W} stroke={SK} strokeWidth="1" x="12" y="7" width="4" height="4" rx="1" />
      {/* Door */}
      <rect fill={TD} x="9" y="11" width="3" height="7" rx=".5" />
      {/* Amber accent stripe */}
      <rect fill={AF} x="2" y="15" width="20" height="3" />
      {/* Wheels */}
      <circle fill={SK} cx="7" cy="19" r="2" />
      <circle fill={SK} cx="17" cy="19" r="2" />
    </>,
    p,
  );

// ─── Housing (Teal) ───────────────────────────────────────────────────────────

const Home: IconComponent = (p) =>
  svg(
    <>
      {/* Roof */}
      <polygon
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points="12,3 22,12 2,12"
      />
      {/* House body */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="5" y="12" width="14" height="10" rx="1" />
      {/* Door */}
      <rect fill={TD} x="9.5" y="16" width="5" height="6" rx=".5" />
      {/* Window */}
      <rect fill={W} stroke={SK} strokeWidth="1" x="14" y="13.5" width="3" height="3" rx=".5" />
    </>,
    p,
  );

const Electricity: IconComponent = (p) =>
  svg(
    <polygon
      fill={AF}
      stroke={SK}
      strokeWidth="1.5"
      strokeLinejoin="round"
      points="13,2 4,14 12,14 11,22 20,10 13,10"
    />,
    p,
  );

const Wifi: IconComponent = (p) =>
  svg(
    <>
      <path
        fill="none"
        stroke={TF}
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M1.5 9a16 16 0 0 1 21 0"
      />
      <path
        fill="none"
        stroke={TF}
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M5.5 13a11 11 0 0 1 13 0"
      />
      <path
        fill="none"
        stroke={TF}
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M9 17a6 6 0 0 1 6 0"
      />
      <circle fill={AF} stroke={SK} strokeWidth="1" cx="12" cy="21" r="1.5" />
    </>,
    p,
  );

const Water: IconComponent = (p) =>
  svg(
    <>
      {/* Drop */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.5L5.5 11a8 8 0 1 0 13 0L12 2.5z"
      />
      {/* Highlight */}
      <ellipse
        fill={W}
        cx="9.5"
        cy="13.5"
        rx="1.5"
        ry="2.5"
        transform="rotate(-20 9.5 13.5)"
      />
    </>,
    p,
  );

// ─── Shopping (Amber) ─────────────────────────────────────────────────────────

const Shopping: IconComponent = (p) =>
  svg(
    <>
      {/* Cart basket */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h14l-2 10H8L6 6z"
      />
      {/* Handle rail */}
      <path
        fill="none"
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M2 3h3l1 3"
      />
      {/* Wheels */}
      <circle fill={AD} stroke={SK} strokeWidth="1" cx="9" cy="19" r="2" />
      <circle fill={AD} stroke={SK} strokeWidth="1" cx="17" cy="19" r="2" />
      {/* Teal accent line */}
      <rect fill={TF} x="9" y="9" width="6" height="1.5" rx=".75" />
    </>,
    p,
  );

const Clothing: IconComponent = (p) =>
  svg(
    <path
      fill={AF}
      stroke={SK}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46A2 2 0 0 0 2 5.19l.58 7.3a1 1 0 0 0 1 .92h3.3v8.4h14v-8.4h3.3a1 1 0 0 0 1-.92l.58-7.3a2 2 0 0 0-1.38-1.73z"
    />,
    p,
  );

// ─── Health (Teal) ────────────────────────────────────────────────────────────

const Health: IconComponent = (p) =>
  svg(
    <path
      fill={TF}
      stroke={SK}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"
    />,
    p,
  );

const Pill: IconComponent = (p) =>
  svg(
    <>
      {/* Left half */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 20.5a4.95 4.95 0 0 1-7-7l3.5-3.5 7 7-3.5 3.5z"
      />
      {/* Right half */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 3.5a4.95 4.95 0 0 1 7 7l-3.5 3.5-7-7 3.5-3.5z"
      />
      {/* Divider line */}
      <line
        x1="8.5"
        y1="9"
        x2="15"
        y2="15.5"
        stroke={W}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>,
    p,
  );

const Gym: IconComponent = (p) =>
  svg(
    <>
      {/* Weight plates */}
      <rect
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        x="1"
        y="8"
        width="5"
        height="8"
        rx="1.5"
      />
      <rect
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        x="18"
        y="8"
        width="5"
        height="8"
        rx="1.5"
      />
      {/* Grips */}
      <rect
        fill={AD}
        stroke={SK}
        strokeWidth="1.5"
        x="6"
        y="10"
        width="3"
        height="4"
        rx="1"
      />
      <rect
        fill={AD}
        stroke={SK}
        strokeWidth="1.5"
        x="15"
        y="10"
        width="3"
        height="4"
        rx="1"
      />
      {/* Center bar */}
      <rect fill={AD} x="9" y="11" width="6" height="2" rx="1" />
    </>,
    p,
  );

// ─── Entertainment (Teal) ─────────────────────────────────────────────────────

const Entertainment: IconComponent = (p) =>
  svg(
    <>
      {/* Monitor frame */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="2"
        y="5"
        width="20"
        height="13"
        rx="2"
      />
      {/* Screen area */}
      <rect fill={W} stroke={SK} strokeWidth="1" x="4" y="7" width="16" height="9" rx="1" />
      {/* Stand */}
      <rect fill={TD} x="9" y="18" width="6" height="2" />
      <rect fill={TD} stroke={SK} strokeWidth="1" x="6" y="20" width="12" height="2" rx="1" />
      {/* Play button */}
      <circle fill={AF} cx="12" cy="11.5" r="2.5" />
      <polygon fill={W} points="11,10.5 14,11.5 11,12.5" />
    </>,
    p,
  );

const Movie: IconComponent = (p) =>
  svg(
    <>
      {/* Film strip */}
      <rect
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
      />
      {/* Side tracks */}
      <rect fill={TD} x="2" y="2" width="5" height="20" />
      <rect fill={TD} x="17" y="2" width="5" height="20" />
      {/* Sprocket holes */}
      <rect fill={TF} x="3" y="5" width="3" height="2" rx=".5" />
      <rect fill={TF} x="3" y="11" width="3" height="2" rx=".5" />
      <rect fill={TF} x="3" y="17" width="3" height="2" rx=".5" />
      <rect fill={TF} x="18" y="5" width="3" height="2" rx=".5" />
      <rect fill={TF} x="18" y="11" width="3" height="2" rx=".5" />
      <rect fill={TF} x="18" y="17" width="3" height="2" rx=".5" />
      {/* Frame */}
      <rect fill={W} x="7" y="8" width="10" height="8" rx="1" />
      {/* Play triangle */}
      <polygon fill={AF} points="10.5,10 10.5,14 14.5,12" />
    </>,
    p,
  );

const Music: IconComponent = (p) =>
  svg(
    <>
      {/* Beam */}
      <rect fill={AF} x="9" y="3" width="12" height="3" rx=".5" />
      {/* Left stem */}
      <rect fill={AF} x="9" y="3" width="2" height="12" />
      {/* Right stem */}
      <rect fill={AF} x="19" y="3" width="2" height="10" />
      {/* Note heads */}
      <ellipse fill={AF} stroke={SK} strokeWidth="1.5" cx="7" cy="17" rx="3" ry="2" />
      <ellipse fill={AF} stroke={SK} strokeWidth="1.5" cx="17" cy="15" rx="3" ry="2" />
      {/* Inner note detail */}
      <ellipse fill={AD} cx="7" cy="17" rx="1.5" ry="1" />
      <ellipse fill={AD} cx="17" cy="15" rx="1.5" ry="1" />
    </>,
    p,
  );

const Game: IconComponent = (p) =>
  svg(
    <>
      {/* Controller body */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.32 6H6.68A3 3 0 0 0 3.7 8.69C3.26 11.5 2 16 2 16.5A2.5 2.5 0 0 0 6.5 17c.6 0 1-.3 1.5-.8l1.2-1.2A1.5 1.5 0 0 1 10.27 14.5h3.46a1.5 1.5 0 0 1 1.06.44L16 16.2c.5.5.9.8 1.5.8a2.5 2.5 0 0 0 2.5-2.5c0-.5-1.26-5-1.7-7.81A3 3 0 0 0 17.32 6z"
      />
      {/* D-pad */}
      <rect fill={TD} x="5.5" y="10.5" width="4" height="1.5" rx=".75" />
      <rect fill={TD} x="7" y="9" width="1.5" height="4" rx=".75" />
      {/* Action buttons */}
      <circle fill={AF} cx="15" cy="11.5" r="1" />
      <circle fill={AF} cx="17.5" cy="10" r="1" />
      <circle fill={AF} cx="17.5" cy="13" r="1" />
      <circle fill={AF} cx="15" cy="9" r="1" />
    </>,
    p,
  );

// ─── Education (Teal) ─────────────────────────────────────────────────────────

const Education: IconComponent = (p) =>
  svg(
    <>
      {/* Mortarboard top */}
      <polygon
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinejoin="round"
        points="12,4 22,9 12,14 2,9"
      />
      {/* Brim/base */}
      <path
        fill={TD}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5l-6 3-6-3z"
      />
      {/* Tassel string */}
      <rect fill={TF} stroke={SK} strokeWidth="1" x="21" y="9" width="1.5" height="5" rx=".75" />
      {/* Tassel end */}
      <circle fill={AF} stroke={SK} strokeWidth="1" cx="21.75" cy="15" r="1.5" />
    </>,
    p,
  );

const Book: IconComponent = (p) =>
  svg(
    <>
      {/* Back cover */}
      <rect fill={AF} stroke={SK} strokeWidth="1.5" x="4" y="2" width="14" height="20" rx="1.5" />
      {/* Pages */}
      <rect fill={W} x="6" y="3" width="11" height="18" rx=".5" />
      {/* Spine */}
      <rect fill={AD} x="4" y="2" width="3" height="20" rx="1.5" />
      {/* Teal bookmark */}
      <path fill={TF} d="M14 3v6l-1.5-1.5L11 9V3h3z" />
    </>,
    p,
  );

// ─── Travel (Teal) ────────────────────────────────────────────────────────────

const Travel: IconComponent = (p) =>
  svg(
    <>
      {/* Globe */}
      <circle fill={TF} stroke={SK} strokeWidth="1.5" cx="12" cy="12" r="9.5" />
      {/* Equator */}
      <ellipse
        fill="none"
        stroke={TD}
        strokeWidth="1.5"
        cx="12"
        cy="12"
        rx="9.5"
        ry="4.5"
      />
      {/* Meridian */}
      <line x1="12" y1="2.5" x2="12" y2="21.5" stroke={TD} strokeWidth="1.5" />
      {/* Latitude lines */}
      <path fill="none" stroke={TD} strokeWidth="1" d="M4.5 8.5a15 15 0 0 1 15 0" />
      <path fill="none" stroke={TD} strokeWidth="1" d="M4.5 15.5a15 15 0 0 0 15 0" />
    </>,
    p,
  );

const Plane: IconComponent = (p) =>
  svg(
    <path
      fill={TF}
      stroke={SK}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 3c.5 1 0 3-1.5 4.5L16 11l1.8 8.2c.1.5-.1.9-.5 1.1l-.5.2c-.5.2-1-.1-1.3-.5L12 15l-3 2v3l-1 1-2-3-3-2 1-1h3l2-3-4.7-3.2c-.4-.3-.5-.8-.3-1.3l.3-.5c.2-.4.6-.6 1.1-.5L13 8l3.5-3.5C18 3 20 2.5 21 3z"
    />,
    p,
  );

const Hotel: IconComponent = (p) =>
  svg(
    <>
      {/* Building */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="4" y="2" width="16" height="20" rx="1.5" />
      {/* Roof accent */}
      <rect fill={TD} x="4" y="2" width="16" height="3" rx="1.5" />
      {/* Windows row 1 */}
      <rect fill={W} stroke={SK} strokeWidth="1" x="7" y="6" width="3" height="3" rx=".5" />
      <rect fill={W} stroke={SK} strokeWidth="1" x="14" y="6" width="3" height="3" rx=".5" />
      {/* Windows row 2 */}
      <rect fill={W} stroke={SK} strokeWidth="1" x="7" y="12" width="3" height="3" rx=".5" />
      <rect fill={W} stroke={SK} strokeWidth="1" x="14" y="12" width="3" height="3" rx=".5" />
      {/* Door */}
      <rect fill={TD} x="9.5" y="17" width="5" height="5" rx=".5" />
    </>,
    p,
  );

// ─── Personal (Amber) ─────────────────────────────────────────────────────────

const Gift: IconComponent = (p) =>
  svg(
    <>
      {/* Box body */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="4" y="12" width="16" height="10" rx="1" />
      {/* Vertical ribbon */}
      <rect fill={AF} x="10.5" y="12" width="3" height="10" />
      {/* Lid */}
      <rect fill={TD} stroke={SK} strokeWidth="1.5" x="2" y="8" width="20" height="4" rx="1" />
      <rect fill={AF} x="10.5" y="8" width="3" height="4" />
      {/* Left bow loop */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8C12 8 9 5 7.5 3.5A2.5 2.5 0 0 1 11 7L12 8z"
      />
      {/* Right bow loop */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8C12 8 15 5 16.5 3.5A2.5 2.5 0 0 0 13 7L12 8z"
      />
    </>,
    p,
  );

const Pet: IconComponent = (p) =>
  svg(
    <>
      {/* Main paw pad */}
      <ellipse
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        cx="12"
        cy="17"
        rx="4"
        ry="3"
      />
      {/* Toe pads */}
      <circle fill={AF} stroke={SK} strokeWidth="1.5" cx="7.5" cy="13" r="2" />
      <circle fill={AF} stroke={SK} strokeWidth="1.5" cx="10.5" cy="11" r="2" />
      <circle fill={AF} stroke={SK} strokeWidth="1.5" cx="13.5" cy="11" r="2" />
      <circle fill={AF} stroke={SK} strokeWidth="1.5" cx="16.5" cy="13" r="2" />
    </>,
    p,
  );

const Baby: IconComponent = (p) =>
  svg(
    <>
      {/* Head */}
      <circle fill={AF} stroke={SK} strokeWidth="1.5" cx="12" cy="11" r="7.5" />
      {/* Eyes */}
      <circle fill={AD} cx="9.5" cy="11" r="1" />
      <circle fill={AD} cx="14.5" cy="11" r="1" />
      {/* Smile */}
      <path
        fill="none"
        stroke={AD}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M10 14c.5.8 1.2 1.2 2 1.2s1.5-.4 2-1.2"
      />
      {/* Hair curl */}
      <path fill={AD} d="M12 3.5c1 0 2.5.8 2.5 2s-.8 1.2-1.2 1.2-1.3-.6-1.3-1.7" />
    </>,
    p,
  );

// ─── Finance (Teal) ───────────────────────────────────────────────────────────

const Salary: IconComponent = (p) =>
  svg(
    <>
      {/* Bill background */}
      <rect fill={TF} stroke={SK} strokeWidth="1.5" x="2" y="5" width="20" height="14" rx="2" />
      {/* Corner ovals */}
      <circle fill={TD} cx="5.5" cy="12" r="2.5" />
      <circle fill={TD} cx="18.5" cy="12" r="2.5" />
      {/* Dollar sign bar */}
      <rect fill={W} x="11.25" y="8" width="1.5" height="8" rx=".75" />
      {/* Dollar sign curves */}
      <path
        fill="none"
        stroke={W}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M14 9.5a2.5 1.5 0 0 0-5 0c0 .83 2.5 1.5 2.5 1.5s2.5.67 2.5 1.5a2.5 1.5 0 0 1-5 0"
      />
    </>,
    p,
  );

const Investment: IconComponent = (p) =>
  svg(
    <>
      {/* Area fill */}
      <path
        fill={TF}
        fillOpacity=".35"
        d="M2 17L8.5 10.5l5 5L22 7v10H2z"
      />
      {/* Trend line */}
      <polyline
        fill="none"
        stroke={TF}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="2,17 8.5,10.5 13.5,15.5 22,7"
      />
      {/* Arrow (amber) */}
      <polyline
        fill="none"
        stroke={AF}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="16,7 22,7 22,13"
      />
    </>,
    p,
  );

const Savings: IconComponent = (p) =>
  svg(
    <>
      {/* Piggy bank body */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 6c-1.5 0-2.8 1.3-3 2-3.5-1.5-10.5-.3-10.5 5 0 1.8 0 3 2 4.5V21h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"
      />
      {/* Snout */}
      <path
        fill="none"
        stroke={TD}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M2.5 9.5c1 0 3.5.5 4.5 2"
      />
      {/* Eye */}
      <circle fill={W} cx="15.5" cy="9.5" r="1" />
      {/* Coin slot */}
      <rect fill={AF} stroke={SK} strokeWidth="1" x="10" y="5" width="4" height="1.5" rx=".75" />
    </>,
    p,
  );

const Insurance: IconComponent = (p) =>
  svg(
    <>
      {/* Shield */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2l8 3v7c0 5-4 9-8 10C8 21 4 17 4 12V5l8-3z"
      />
      {/* Checkmark */}
      <path
        fill="none"
        stroke={W}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12l3 3 5-6"
      />
    </>,
    p,
  );

const Tax: IconComponent = (p) =>
  svg(
    <>
      {/* Ticket/receipt */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
      />
      {/* % symbol circles */}
      <circle fill={AF} cx="9" cy="10" r="1.5" />
      <circle fill={AF} cx="15" cy="14" r="1.5" />
      {/* % diagonal */}
      <line
        x1="9"
        y1="14"
        x2="15"
        y2="10"
        stroke={AF}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Perforation dots */}
      <rect fill={TD} x="12.25" y="5" width="1" height="2" rx=".5" />
      <rect fill={TD} x="12.25" y="17" width="1" height="2" rx=".5" />
      <rect fill={TD} x="12.25" y="11" width="1" height="2" rx=".5" />
    </>,
    p,
  );

// ─── Other (Teal/Amber) ───────────────────────────────────────────────────────

const Donation: IconComponent = (p) =>
  svg(
    <>
      {/* Heart */}
      <path
        fill={AF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08A5.99 5.99 0 0 1 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.18L12 21z"
      />
      {/* Highlight glint */}
      <path fill={AD} d="M8 6.5a3.5 3.5 0 0 0-3 3" />
    </>,
    p,
  );

const Repair: IconComponent = (p) =>
  svg(
    <path
      fill={TF}
      stroke={SK}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    />,
    p,
  );

const Wallet: IconComponent = (p) =>
  svg(
    <>
      {/* Wallet body */}
      <path
        fill={TF}
        stroke={SK}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H5a1 1 0 0 0 0 2h16v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"
      />
      {/* Card pocket */}
      <rect fill={TD} stroke={SK} strokeWidth="1" x="15" y="11" width="6" height="5" rx="1" />
      {/* Coin */}
      <circle fill={AF} cx="18" cy="13.5" r="1.5" />
    </>,
    p,
  );

// ─── Icon Registry ─────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, IconEntry> = {
  food: { label: "Food & Dining", icon: Food },
  coffee: { label: "Coffee/Drinks", icon: Coffee },
  grocery: { label: "Groceries", icon: Grocery },
  transport: { label: "Transportation", icon: Transport },
  car: { label: "Car/Fuel", icon: Car },
  bus: { label: "Public Transit", icon: Bus },
  home: { label: "Housing/Rent", icon: Home },
  electricity: { label: "Utilities/Bills", icon: Electricity },
  wifi: { label: "Internet/Phone", icon: Wifi },
  water: { label: "Water Bill", icon: Water },
  shopping: { label: "Shopping", icon: Shopping },
  clothing: { label: "Clothing", icon: Clothing },
  health: { label: "Healthcare", icon: Health },
  pill: { label: "Pharmacy", icon: Pill },
  gym: { label: "Fitness", icon: Gym },
  entertainment: { label: "Entertainment", icon: Entertainment },
  movie: { label: "Movies/Streaming", icon: Movie },
  music: { label: "Music", icon: Music },
  game: { label: "Gaming", icon: Game },
  education: { label: "Education", icon: Education },
  book: { label: "Books", icon: Book },
  travel: { label: "Travel/Vacation", icon: Travel },
  plane: { label: "Flights", icon: Plane },
  hotel: { label: "Hotel", icon: Hotel },
  gift: { label: "Gifts", icon: Gift },
  pet: { label: "Pets", icon: Pet },
  baby: { label: "Children", icon: Baby },
  salary: { label: "Salary/Income", icon: Salary },
  investment: { label: "Investments", icon: Investment },
  savings: { label: "Savings", icon: Savings },
  insurance: { label: "Insurance", icon: Insurance },
  tax: { label: "Taxes", icon: Tax },
  donation: { label: "Charity/Donation", icon: Donation },
  repair: { label: "Maintenance/Repair", icon: Repair },
  wallet: { label: "General/Other", icon: Wallet },
};

// ─── Render component ──────────────────────────────────────────────────────────

export interface CategoryIconProps {
  name?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({
  name,
  size = 24,
  className,
}: CategoryIconProps) {
  const entry = name ? CATEGORY_ICONS[name] : undefined;
  const Icon = entry?.icon ?? Wallet;

  return (
    <Icon width={size} height={size} className={className} aria-hidden="true" />
  );
}
