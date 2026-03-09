# Design Direction

## Brand Vibe

**"Supreme meets TCGPlayer meets PSA"** — Premium streetwear energy with serious collector functionality and grading-house trust. Dark, bold, and classy. By card people, for card people.

### What that means in practice

| Inspiration | What we take from it |
|-------------|---------------------|
| **Supreme** | Bold red accents, clean minimalism, hype/drop energy, exclusive feel, confidence |
| **TCGPlayer** | Dense but navigable catalog, strong search/filters, card-centric layout, collector UX |
| **PSA** | Premium trust signals, clean typography, professional authority, "this is legit" feel |

## Default Mode: Dark

Dark mode is the flagship experience. The cards are the stars — they pop against dark backgrounds like they're in a display case. Light mode is available but dark is the default.

## Color Palette

### Primary — Jersey Red
The signature color. Used for CTAs, key actions, price callouts, and brand moments.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#DC2626` | Buttons, CTAs, active states |
| `primary-hover` | `#B91C1C` | Button hover, pressed states |
| `primary-soft` | `#DC26261A` | Red tint backgrounds (10% opacity) |

### Secondary — Collector Blue
Trust, information, and secondary actions. Think PSA blue.

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary` | `#2563EB` | Links, info badges, secondary buttons |
| `secondary-hover` | `#1D4ED8` | Hover states |
| `secondary-soft` | `#2563EB1A` | Blue tint backgrounds (10% opacity) |

### Dark Mode (Default)

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#09090B` | Page background (zinc-950) |
| `surface` | `#18181B` | Cards, panels, modals (zinc-900) |
| `surface-raised` | `#27272A` | Elevated elements, hover cards (zinc-800) |
| `border` | `#3F3F46` | Borders, dividers (zinc-700) |
| `text-primary` | `#FAFAFA` | Primary text (zinc-50) |
| `text-secondary` | `#A1A1AA` | Secondary/muted text (zinc-400) |
| `text-tertiary` | `#71717A` | Disabled, placeholder (zinc-500) |

### Light Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FAFAFA` | Page background (zinc-50) |
| `surface` | `#FFFFFF` | Cards, panels, modals |
| `surface-raised` | `#F4F4F5` | Elevated elements (zinc-100) |
| `border` | `#E4E4E7` | Borders, dividers (zinc-200) |
| `text-primary` | `#09090B` | Primary text (zinc-950) |
| `text-secondary` | `#52525B` | Secondary text (zinc-600) |
| `text-tertiary` | `#A1A1AA` | Disabled, placeholder (zinc-400) |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22C55E` | Sold confirmations, success states |
| `warning` | `#EAB308` | Low stock, spin cooldown, attention |
| `error` | `#EF4444` | Errors, out of stock, payment failures |
| `info` | `#3B82F6` | Informational, shipping updates |

## Typography

### Font Stack
- **Headings:** Inter (bold/black weight) — clean, modern, slightly compressed feel
- **Body:** Inter (regular/medium) — excellent readability
- **Monospace:** JetBrains Mono — for SKUs, cert numbers, prices in certain contexts

### Scale
- Hero/page titles: bold, large, uppercase optional for hype moments
- Section headers: semibold, clean
- Body: regular weight, comfortable reading size
- Card prices: tabular numbers, semibold, slightly larger than body

## Component Style Guide

### Cards (Product Cards)
- Dark surface background with subtle border
- Card image takes ~60% of the card
- Clean hover state: slight lift (shadow) + border highlight
- Price in primary red, bold
- Condition/grade badge in top corner
- Minimal text — let the card image do the talking

### Buttons
- **Primary (Red):** Solid red background, white text. For "Add to Cart," "Buy," "Spin"
- **Secondary (Blue):** Outline or ghost style. For "View Details," "Filter," secondary actions
- **Ghost:** Transparent with text color. For tertiary actions
- All buttons: rounded corners (not fully pill, not sharp — `rounded-lg`)

### Navigation
- Dark header, logo left, nav center or right
- Minimal nav items: Collections, Search, Spin, Cart
- Admin nav: separate sidebar layout (dark)
- Mobile: hamburger menu or bottom nav

### Badges/Tags
- Condition badges: muted colored pills (NM = green, LP = yellow, MP = orange, etc.)
- Grade badges: blue with grade value prominent
- Status badges: color-coded (listed = green, reserved = yellow, sold = red)
- "New Drop" tag: primary red, bold

### Search/Filters
- Search bar prominent, full-width on search page
- Filter sidebar on desktop, bottom sheet on mobile
- Active filters shown as dismissible chips
- Clean, scannable filter groups

## Layout Principles

1. **Cards are the hero.** Large images, generous spacing. The product sells itself.
2. **Dense but not cluttered.** Show lots of inventory without overwhelming. Think well-organized display case.
3. **Responsive first.** Many collectors browse on mobile. Filters, search, and checkout must work perfectly on small screens.
4. **Speed = trust.** Fast image loading (optimized thumbnails), instant search, snappy interactions.
5. **Premium whitespace.** Not too tight. Breathing room = luxury feel.

## Spin Page Aesthetic

The spin page should feel special — like an event, not a regular product page.
- Full-width hero section
- Bold "$5 SPIN" typography
- Subtle animation or visual energy (nothing cheesy — think premium roulette, not slot machine)
- Clear rules displayed
- Value range disclaimer prominent
- "Reveal" moment after purchase should feel rewarding

## Admin Dashboard Aesthetic

Clean and functional. Not flashy — this is a work tool.
- Dark sidebar navigation
- Data tables with good density
- Status badges with at-a-glance color coding
- Quick action buttons
- Charts/stats at top of key pages (order counts, pool size, revenue)
