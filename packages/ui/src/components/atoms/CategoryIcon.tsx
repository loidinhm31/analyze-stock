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

// Temporary monochrome stroke wrapper — batch 2 icons pending Phase 2 colorization
const strokeSvg = (children: ReactNode, props: SVGProps<SVGSVGElement>) =>
  svg(children, {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  });

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

// ─── BATCH 2: Monochrome stroke icons (pending Phase 2 colorization) ──────────
// game, education, book, travel, plane, hotel, gift, pet, baby,
// salary, investment, savings, insurance, tax, donation, repair, wallet

const Game: IconComponent = (p) =>
  strokeSvg(
    <>
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </>,
    p,
  );

const Education: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </>,
    p,
  );

const Book: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>,
    p,
  );

const Travel: IconComponent = (p) =>
  strokeSvg(
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>,
    p,
  );

const Plane: IconComponent = (p) =>
  strokeSvg(
    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
    p,
  );

const Hotel: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
      <path d="M9 22v-4h6v4" />
      <rect x="8" y="6" width="3" height="3" />
      <rect x="13" y="6" width="3" height="3" />
      <rect x="8" y="12" width="3" height="3" />
      <rect x="13" y="12" width="3" height="3" />
    </>,
    p,
  );

const Gift: IconComponent = (p) =>
  strokeSvg(
    <>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </>,
    p,
  );

const Pet: IconComponent = (p) =>
  strokeSvg(
    <>
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </>,
    p,
  );

const Baby: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
    </>,
    p,
  );

const Salary: IconComponent = (p) =>
  strokeSvg(
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>,
    p,
  );

const Investment: IconComponent = (p) =>
  strokeSvg(
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>,
    p,
  );

const Savings: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" />
      <path d="M2 9.5c1 0 3.6.5 4.6 2" />
      <circle cx="15.5" cy="9.5" r="0.5" fill="currentColor" />
    </>,
    p,
  );

const Insurance: IconComponent = (p) =>
  strokeSvg(
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    p,
  );

const Tax: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </>,
    p,
  );

const Donation: IconComponent = (p) =>
  strokeSvg(
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    p,
  );

const Repair: IconComponent = (p) =>
  strokeSvg(
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
    p,
  );

const Wallet: IconComponent = (p) =>
  strokeSvg(
    <>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
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
