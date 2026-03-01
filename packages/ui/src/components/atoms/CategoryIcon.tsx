/**
 * ══════════════════════════════════════════════════════════════
 * CATEGORY ICON DESIGN SCHEMA
 * ══════════════════════════════════════════════════════════════
 *
 * Visual Language:
 *   - Style: Flat, minimal, filled shapes — no gradients, no shadows
 *   - Grid: 24x24 viewBox, 1-2px safe padding (usable area: ~22x22)
 *   - Shapes: Bold rounded forms — readable at 16px, 18px, 24px
 *   - Fill: Solid primary color per category group (see palette below)
 *   - Detail: Slightly darker shade of primary for depth (max 2-3 colors/icon)
 *   - Background: Transparent — icons must be visible on light (#f8f9fa) and dark (#0f172a)
 *
 * Color Palette:
 *   Food & Drink:   #FF6B35 (warm orange)    — food, coffee, grocery
 *   Transport:      #4A90D9 (steel blue)     — transport, car, bus
 *   Housing:        #D4A017 (amber)          — home, electricity, wifi, water
 *   Shopping:       #E91E8C (hot pink)       — shopping, clothing
 *   Health:         #2ECC71 (emerald)        — health, pill, gym
 *   Entertainment:  #9B59B6 (purple)         — entertainment, movie, music, game
 *   Education:      #2980B9 (royal blue)     — education, book
 *   Travel:         #1ABC9C (teal)           — travel, plane, hotel
 *   Personal:       #E74C3C (coral red)      — gift, pet, baby
 *   Finance:        #27AE60 (money green)    — salary, investment, savings, insurance, tax
 *   Other:          #95A5A6 (slate)          — donation, repair, wallet
 *
 * Adding New Icons:
 *   1. Pick the category group color from palette above
 *   2. Design as filled shapes in 24x24 viewBox (no stroke="currentColor")
 *   3. Use primary color for main shape, ~20% darker shade for details
 *   4. Max 3 colors per icon. Keep shapes bold — min ~3px stroke or fill width
 *   5. Add entry to CATEGORY_ICONS registry
 *
 * AI Generation Pipeline (optional for complex icons):
 *   Prompt: "Flat minimal [ICON_NAME] icon, solid [COLOR_NAME] fill, simple rounded shapes,
 *            no gradients, no shadows, white background, 256x256px, single centered object"
 *   Trace:  vtracer --input icon.png --output icon.svg --colormode color --filter_speckle 4 --color_precision 6
 *   Extract <path> elements → embed in component with viewBox="0 0 256 256" override
 *
 * ══════════════════════════════════════════════════════════════
 */

import type { SVGProps, ReactNode } from "react";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode;

interface IconEntry {
  label: string;
  icon: IconComponent;
}

// Colorful filled icons — each icon controls its own colors
const svg = (children: ReactNode, props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
    {children}
  </svg>
);

// ─── BATCH 1: Colorful icons (Phase 1) ────────────────────────────────────────
// food, coffee, grocery, transport, car, bus, home, electricity, wifi, water,
// shopping, clothing, health, pill, gym, entertainment, movie, music

const Food: IconComponent = (p) =>
  svg(
    <>
      {/* Pot body */}
      <path fill="#FF6B35" d="M2 9h20v7a7 7 0 0 1-7 7H9A7 7 0 0 1 2 16V9z" />
      {/* Side handle */}
      <path fill="none" stroke="#E55A28" strokeWidth="2.5" d="M18 11h1a3 3 0 0 1 0 6h-1" />
      {/* Rim */}
      <rect fill="#E55A28" x="2" y="8" width="20" height="2" rx="1" />
      {/* Steam prongs */}
      <rect fill="#FF9B6E" x="7.5" y="2" width="1.5" height="5.5" rx=".75" />
      <rect fill="#FF9B6E" x="11.25" y="2" width="1.5" height="5.5" rx=".75" />
      <rect fill="#FF9B6E" x="15" y="2" width="1.5" height="5.5" rx=".75" />
    </>,
    p,
  );

const Coffee: IconComponent = (p) =>
  svg(
    <>
      {/* Mug body */}
      <path fill="#C8553D" d="M4 8h12v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
      {/* Rim */}
      <rect fill="#A83D28" x="4" y="7" width="12" height="2" rx="1" />
      {/* Handle */}
      <path fill="none" stroke="#A83D28" strokeWidth="2.5" d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      {/* Coffee surface */}
      <ellipse fill="#A83D28" cx="10" cy="8" rx="4.5" ry="1.5" />
    </>,
    p,
  );

const Grocery: IconComponent = (p) =>
  svg(
    <>
      {/* Bag body */}
      <path fill="#6ABF4B" d="M5 9h14v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9z" />
      {/* Top edge */}
      <rect fill="#4A9A31" x="5" y="8" width="14" height="2" rx="1" />
      {/* Handles */}
      <path fill="none" stroke="#4A9A31" strokeWidth="2" d="M9 9V7a3 3 0 0 1 6 0v2" />
      {/* Center stripe */}
      <rect fill="#4A9A31" x="11" y="12" width="2" height="6" rx="1" />
    </>,
    p,
  );

const Transport: IconComponent = (p) =>
  svg(
    <>
      {/* Cargo box */}
      <rect fill="#4A90D9" x="1" y="5" width="14" height="12" rx="1.5" />
      {/* Cab */}
      <path fill="#2C6FAC" d="M15 8h5l2 3v6h-7V8z" />
      {/* Cab window */}
      <path fill="#BDE0FF" d="M16 9.5h3.5l1 2H16v-2z" />
      {/* Wheels */}
      <circle fill="#1A4F7A" cx="6" cy="18" r="2.5" />
      <circle fill="#1A4F7A" cx="18.5" cy="18" r="2.5" />
      <circle fill="#4A90D9" cx="6" cy="18" r="1" />
      <circle fill="#4A90D9" cx="18.5" cy="18" r="1" />
    </>,
    p,
  );

const Car: IconComponent = (p) =>
  svg(
    <>
      {/* Body */}
      <rect fill="#2C6FAC" x="2" y="12" width="20" height="6" rx="2" />
      {/* Roof */}
      <path fill="#4A90D9" d="M6 12l2.5-5h7l2.5 5H6z" />
      {/* Windshield */}
      <path fill="#BDE0FF" d="M9 11l1.5-3h3L15 11H9z" />
      {/* Wheels */}
      <circle fill="#1A3E6A" cx="7" cy="18.5" r="2.5" />
      <circle fill="#1A3E6A" cx="17" cy="18.5" r="2.5" />
      <circle fill="#4A90D9" cx="7" cy="18.5" r="1" />
      <circle fill="#4A90D9" cx="17" cy="18.5" r="1" />
    </>,
    p,
  );

const Bus: IconComponent = (p) =>
  svg(
    <>
      {/* Bus body */}
      <rect fill="#5DADE2" x="2" y="4" width="20" height="14" rx="2" />
      {/* Windows */}
      <rect fill="#C8EAFB" x="5" y="7" width="4" height="4" rx="1" />
      <rect fill="#C8EAFB" x="12" y="7" width="4" height="4" rx="1" />
      {/* Door */}
      <rect fill="#3A9BC8" x="9" y="11" width="3" height="7" rx=".5" />
      {/* Bottom stripe */}
      <rect fill="#3A9BC8" x="2" y="16" width="20" height="2" />
      {/* Wheels */}
      <circle fill="#1A6180" cx="7" cy="19" r="2" />
      <circle fill="#1A6180" cx="17" cy="19" r="2" />
    </>,
    p,
  );

const Home: IconComponent = (p) =>
  svg(
    <>
      {/* Roof */}
      <polygon fill="#D4A017" points="12,3 22,12 2,12" />
      {/* House body */}
      <rect fill="#E8B52A" x="5" y="12" width="14" height="10" rx="1" />
      {/* Door */}
      <rect fill="#B38012" x="9.5" y="16" width="5" height="6" rx="1" />
      {/* Window */}
      <rect fill="#D4A017" x="14" y="13.5" width="3" height="3" rx=".5" />
    </>,
    p,
  );

const Electricity: IconComponent = (p) =>
  svg(
    <polygon fill="#F1C40F" points="13,2 4,14 12,14 11,22 20,10 13,10" />,
    p,
  );

const Wifi: IconComponent = (p) =>
  svg(
    <>
      <path fill="none" stroke="#6366F1" strokeWidth="2.5" d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path fill="none" stroke="#6366F1" strokeWidth="2.5" d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path fill="none" stroke="#6366F1" strokeWidth="2.5" d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle fill="#6366F1" cx="12" cy="20" r="1.5" />
    </>,
    p,
  );

const Water: IconComponent = (p) =>
  svg(
    <>
      <path fill="#3498DB" d="M12 2.5L5.5 10a8 8 0 1 0 13 0L12 2.5z" />
      <ellipse fill="#5DADE2" cx="9.5" cy="13" rx="1.5" ry="2.5" transform="rotate(-20 9.5 13)" />
    </>,
    p,
  );

const Shopping: IconComponent = (p) =>
  svg(
    <>
      {/* Cart basket */}
      <path fill="#E91E8C" d="M6 6h14l-2 10H8L6 6z" />
      {/* Handle rail */}
      <path fill="none" stroke="#E91E8C" strokeWidth="2" d="M2 3h3l1 3" />
      {/* Wheels */}
      <circle fill="#C01878" cx="9" cy="19" r="2" />
      <circle fill="#C01878" cx="17" cy="19" r="2" />
    </>,
    p,
  );

const Clothing: IconComponent = (p) =>
  svg(
    <path
      fill="#E84393"
      d="M20.38 3.46L16 2l-4 4-4-4-4.38 1.46A2 2 0 0 0 2 5.19l.58 7.3a1 1 0 0 0 1 .92h3.3v8.4h14v-8.4h3.3a1 1 0 0 0 1-.92l.58-7.3a2 2 0 0 0-1.38-1.73z"
    />,
    p,
  );

const Health: IconComponent = (p) =>
  svg(
    <path fill="#2ECC71" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
    p,
  );

const Pill: IconComponent = (p) =>
  svg(
    <>
      <path
        fill="#1ABC9C"
        d="M10.5 20.5a4.95 4.95 0 0 1-7-7L13.5 3.5a4.95 4.95 0 0 1 7 7L10.5 20.5z"
      />
      <path fill="none" stroke="#0E8C7A" strokeWidth="2" d="M8 9l7 7" />
    </>,
    p,
  );

const Gym: IconComponent = (p) =>
  svg(
    <>
      {/* Left weight plate */}
      <rect fill="#FF6348" x="1" y="8" width="5" height="8" rx="1.5" />
      {/* Right weight plate */}
      <rect fill="#FF6348" x="18" y="8" width="5" height="8" rx="1.5" />
      {/* Left grip */}
      <rect fill="#D94A34" x="6" y="10" width="3" height="4" rx="1" />
      {/* Right grip */}
      <rect fill="#D94A34" x="15" y="10" width="3" height="4" rx="1" />
      {/* Center bar */}
      <rect fill="#D94A34" x="9" y="11" width="6" height="2" rx="1" />
    </>,
    p,
  );

const Entertainment: IconComponent = (p) =>
  svg(
    <>
      {/* Screen */}
      <rect fill="#9B59B6" x="2" y="5" width="20" height="13" rx="2" />
      {/* Screen face */}
      <rect fill="#7A35A0" x="4" y="7" width="16" height="9" rx="1" />
      {/* Stand */}
      <rect fill="#9B59B6" x="9" y="18" width="6" height="2" />
      <rect fill="#9B59B6" x="6" y="20" width="12" height="2" rx="1" />
    </>,
    p,
  );

const Movie: IconComponent = (p) =>
  svg(
    <>
      {/* Film strip background */}
      <rect fill="#8E44AD" x="2" y="2" width="20" height="20" rx="2" />
      {/* Left film track */}
      <rect fill="#6A2090" x="2" y="2" width="5" height="20" />
      {/* Right film track */}
      <rect fill="#6A2090" x="17" y="2" width="5" height="20" />
      {/* Left sprocket holes */}
      <rect fill="#8E44AD" x="3" y="5" width="3" height="2" rx=".5" />
      <rect fill="#8E44AD" x="3" y="11" width="3" height="2" rx=".5" />
      <rect fill="#8E44AD" x="3" y="17" width="3" height="2" rx=".5" />
      {/* Right sprocket holes */}
      <rect fill="#8E44AD" x="18" y="5" width="3" height="2" rx=".5" />
      <rect fill="#8E44AD" x="18" y="11" width="3" height="2" rx=".5" />
      <rect fill="#8E44AD" x="18" y="17" width="3" height="2" rx=".5" />
      {/* Center frame area */}
      <rect fill="#A855D4" x="7" y="7" width="10" height="10" rx="1" />
    </>,
    p,
  );

const Music: IconComponent = (p) =>
  svg(
    <>
      {/* Connecting beam */}
      <rect fill="#C850C0" x="9" y="3" width="12" height="3" />
      {/* Left stem */}
      <rect fill="#C850C0" x="9" y="3" width="2" height="13" />
      {/* Right stem */}
      <rect fill="#C850C0" x="19" y="3" width="2" height="11" />
      {/* Left note head */}
      <ellipse fill="#C850C0" cx="7" cy="18" rx="3" ry="2" />
      {/* Right note head */}
      <ellipse fill="#C850C0" cx="17" cy="16" rx="3" ry="2" />
    </>,
    p,
  );

// ─── BATCH 2: Colorful icons (Phase 2) ────────────────────────────────────────
// game, education, book, travel, plane, hotel, gift, pet, baby,
// salary, investment, savings, insurance, tax, donation, repair, wallet

const Game: IconComponent = (p) =>
  svg(
    <>
      {/* Controller body */}
      <path fill="#7C3AED" d="M17.32 6H6.68A3 3 0 0 0 3.7 8.69C3.26 11.5 2 16 2 16.5A2.5 2.5 0 0 0 6.5 17c.6 0 1-.3 1.5-.8l1.2-1.2A1.5 1.5 0 0 1 10.27 14.5h3.46a1.5 1.5 0 0 1 1.06.44L16 16.2c.5.5.9.8 1.5.8a2.5 2.5 0 0 0 2.5-2.5c0-.5-1.26-5-1.7-7.81A3 3 0 0 0 17.32 6z" />
      {/* D-pad horizontal */}
      <rect fill="#5B21B6" x="5.5" y="10.5" width="4" height="1.5" rx=".75" />
      {/* D-pad vertical */}
      <rect fill="#5B21B6" x="7" y="9" width="1.5" height="4" rx=".75" />
      {/* Buttons */}
      <circle fill="#A78BFA" cx="15" cy="11.5" r="1" />
      <circle fill="#A78BFA" cx="17.5" cy="10" r="1" />
    </>,
    p,
  );

const Education: IconComponent = (p) =>
  svg(
    <>
      {/* Graduation cap top */}
      <polygon fill="#2980B9" points="12,4 22,9 12,14 2,9" />
      {/* Left side of mortarboard brim */}
      <path fill="#1A6FA0" d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5l-6 3-6-3z" />
      {/* Tassel string */}
      <rect fill="#2980B9" x="21" y="9" width="1.5" height="5" rx=".75" />
      {/* Tassel end */}
      <circle fill="#5DADE2" cx="21.75" cy="15" r="1.25" />
    </>,
    p,
  );

const Book: IconComponent = (p) =>
  svg(
    <>
      {/* Back cover */}
      <rect fill="#8B4513" x="4" y="2" width="14" height="20" rx="1.5" />
      {/* Pages block */}
      <rect fill="#F5E6D0" x="6" y="3" width="11" height="18" rx=".5" />
      {/* Spine highlight */}
      <rect fill="#6B3410" x="4" y="2" width="3" height="20" rx="1.5" />
      {/* Bookmark ribbon */}
      <path fill="#A0522D" d="M14 3v6l-1.5-1.5L11 9V3h3z" />
    </>,
    p,
  );

const Travel: IconComponent = (p) =>
  svg(
    <>
      {/* Globe */}
      <circle fill="#1ABC9C" cx="12" cy="12" r="9.5" />
      {/* Equator */}
      <ellipse fill="none" stroke="#16A085" strokeWidth="1.5" cx="12" cy="12" rx="9.5" ry="4.5" />
      {/* Prime meridian */}
      <line x1="12" y1="2.5" x2="12" y2="21.5" stroke="#16A085" strokeWidth="1.5" />
      {/* Top latitude */}
      <path fill="none" stroke="#16A085" strokeWidth="1" d="M4.5 8.5a15 15 0 0 1 15 0" />
      {/* Bottom latitude */}
      <path fill="none" stroke="#16A085" strokeWidth="1" d="M4.5 15.5a15 15 0 0 0 15 0" />
    </>,
    p,
  );

const Plane: IconComponent = (p) =>
  svg(
    <>
      {/* Fuselage */}
      <path fill="#5DADE2" d="M21 3c.5 1 0 3-1.5 4.5L16 11l1.8 8.2c.1.5-.1.9-.5 1.1l-.5.2c-.5.2-1-.1-1.3-.5L12 15l-3 2v3l-1 1-2-3-3-2 1-1h3l2-3-4.7-3.2c-.4-.3-.5-.8-.3-1.3l.3-.5c.2-.4.6-.6 1.1-.5L13 8l3.5-3.5C18 3 20 2.5 21 3z" />
    </>,
    p,
  );

const Hotel: IconComponent = (p) =>
  svg(
    <>
      {/* Building */}
      <rect fill="#16A085" x="4" y="2" width="16" height="20" rx="1.5" />
      {/* Roof accent */}
      <rect fill="#0E7566" x="4" y="2" width="16" height="3" rx="1.5" />
      {/* Windows row 1 */}
      <rect fill="#A8E6DC" x="7" y="6" width="3" height="3" rx=".5" />
      <rect fill="#A8E6DC" x="14" y="6" width="3" height="3" rx=".5" />
      {/* Windows row 2 */}
      <rect fill="#A8E6DC" x="7" y="12" width="3" height="3" rx=".5" />
      <rect fill="#A8E6DC" x="14" y="12" width="3" height="3" rx=".5" />
      {/* Door */}
      <rect fill="#0E7566" x="9.5" y="17" width="5" height="5" rx=".5" />
    </>,
    p,
  );

const Gift: IconComponent = (p) =>
  svg(
    <>
      {/* Box body */}
      <rect fill="#E74C3C" x="4" y="12" width="16" height="10" rx="1" />
      {/* Ribbon band */}
      <rect fill="#C0392B" x="10.5" y="12" width="3" height="10" />
      {/* Box lid */}
      <rect fill="#C0392B" x="2" y="8" width="20" height="4" rx="1" />
      {/* Lid stripe */}
      <rect fill="#E74C3C" x="10.5" y="8" width="3" height="4" />
      {/* Left bow loop */}
      <path fill="#E74C3C" d="M12 8C12 8 9 5 7.5 3.5A2.5 2.5 0 0 1 11 7L12 8z" />
      {/* Right bow loop */}
      <path fill="#E74C3C" d="M12 8C12 8 15 5 16.5 3.5A2.5 2.5 0 0 0 13 7L12 8z" />
    </>,
    p,
  );

const Pet: IconComponent = (p) =>
  svg(
    <>
      {/* Body */}
      <path fill="#D35400" d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.5 17.5 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
      {/* Left ear (paw) */}
      <circle fill="#D35400" cx="11" cy="4" r="2" />
      {/* Right ear (paw) */}
      <circle fill="#D35400" cx="18" cy="8" r="2" />
      {/* Tail tip */}
      <circle fill="#D35400" cx="20" cy="16" r="2" />
      {/* Nose dot */}
      <circle fill="#A04000" cx="9.5" cy="14" r="1" />
    </>,
    p,
  );

const Baby: IconComponent = (p) =>
  svg(
    <>
      {/* Head */}
      <circle fill="#FD79A8" cx="12" cy="11" r="7.5" />
      {/* Left eye */}
      <circle fill="#C0539E" cx="9.5" cy="11" r="1" />
      {/* Right eye */}
      <circle fill="#C0539E" cx="14.5" cy="11" r="1" />
      {/* Smile */}
      <path fill="none" stroke="#C0539E" strokeWidth="1.5" d="M10 14.5c.5.5 1.2.8 2 .8s1.5-.3 2-.8" />
      {/* Hair curl */}
      <path fill="#C0539E" d="M12 3.5c1 0 2 .5 2 1.5 0 .5-.4 1-1 1s-1-.5-1-1" />
    </>,
    p,
  );

const Salary: IconComponent = (p) =>
  svg(
    <>
      {/* Bill background */}
      <rect fill="#27AE60" x="2" y="5" width="20" height="14" rx="2" />
      {/* Left oval */}
      <circle fill="#1E8449" cx="5.5" cy="12" r="2.5" />
      {/* Right oval */}
      <circle fill="#1E8449" cx="18.5" cy="12" r="2.5" />
      {/* Dollar sign vertical bar */}
      <rect fill="#FFFFFF" x="11.25" y="8" width="1.5" height="8" rx=".75" />
      {/* Dollar sign upper curve */}
      <path fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" d="M14 9.5a2.5 1.5 0 0 0-5 0c0 .83 2.5 1.5 2.5 1.5s2.5.67 2.5 1.5a2.5 1.5 0 0 1-5 0" />
    </>,
    p,
  );

const Investment: IconComponent = (p) =>
  svg(
    <>
      {/* Chart background area */}
      <path fill="#2ECC71" fillOpacity=".25" d="M2 17L8.5 10.5l5 5L22 7v10H2z" />
      {/* Trend line */}
      <polyline fill="none" stroke="#2ECC71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points="2,17 8.5,10.5 13.5,15.5 22,7" />
      {/* Arrow head */}
      <polyline fill="none" stroke="#2ECC71" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points="16,7 22,7 22,13" />
    </>,
    p,
  );

const Savings: IconComponent = (p) =>
  svg(
    <>
      {/* Piggy bank body */}
      <path fill="#229954" d="M19 6c-1.5 0-2.8 1.3-3 2-3.5-1.5-10.5-.3-10.5 5 0 1.8 0 3 2 4.5V21h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z" />
      {/* Snout */}
      <path fill="#1A7A40" d="M2.5 9.5c1 0 3.5.5 4.5 2" />
      {/* Eye */}
      <circle fill="#ABEBC6" cx="15.5" cy="9.5" r="1" />
      {/* Coin slot */}
      <rect fill="#1A7A40" x="10" y="5" width="4" height="1.5" rx=".75" />
    </>,
    p,
  );

const Insurance: IconComponent = (p) =>
  svg(
    <>
      {/* Shield */}
      <path fill="#17A589" d="M12 2l8 3v7c0 5-4 9-8 10C8 21 4 17 4 12V5l8-3z" />
      {/* Check mark */}
      <path fill="none" stroke="#A2F3E8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-6" />
    </>,
    p,
  );

const Tax: IconComponent = (p) =>
  svg(
    <>
      {/* Ticket/receipt body */}
      <path fill="#5B7BAD" d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      {/* % symbol */}
      <circle fill="#A8BED4" cx="9" cy="10" r="1.5" />
      <circle fill="#A8BED4" cx="15" cy="14" r="1.5" />
      <line x1="9" y1="14" x2="15" y2="10" stroke="#A8BED4" strokeWidth="1.5" strokeLinecap="round" />
      {/* Perforation dots */}
      <rect fill="#4A6894" x="12.25" y="5" width="1" height="2" rx=".5" />
      <rect fill="#4A6894" x="12.25" y="17" width="1" height="2" rx=".5" />
      <rect fill="#4A6894" x="12.25" y="11" width="1" height="2" rx=".5" />
    </>,
    p,
  );

const Donation: IconComponent = (p) =>
  svg(
    <>
      {/* Heart */}
      <path fill="#E84393" d="M12 21l-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08A5.99 5.99 0 0 1 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.18L12 21z" />
      {/* Highlight glint */}
      <path fill="#F472B6" d="M8 6.5a3.5 3.5 0 0 0-3 3" stroke="none" />
    </>,
    p,
  );

const Repair: IconComponent = (p) =>
  svg(
    <>
      {/* Wrench handle */}
      <path fill="#7F8C8D" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      {/* Grip highlight */}
      <rect fill="#B2BABB" x="3" y="16.5" width="5" height="2" rx="1" transform="rotate(-45 3 16.5)" />
    </>,
    p,
  );

const Wallet: IconComponent = (p) =>
  svg(
    <>
      {/* Wallet body */}
      <path fill="#95A5A6" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2H5a1 1 0 0 0 0 2h16v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
      {/* Card pocket */}
      <rect fill="#7F8C8D" x="15" y="11" width="6" height="5" rx="1" />
      {/* Coin circle */}
      <circle fill="#BDC3C7" cx="18" cy="13.5" r="1.5" />
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
