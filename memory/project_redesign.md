---
name: Lumen Design System Redesign
description: New design system applied in April 2026 — fonts, colors, sidebar, all 4 dashboard pages
type: project
---

Completed full dashboard redesign based on Stitch design files in `C:\Users\Acer\Desktop\redesign\`.

**Why:** User wanted to match the editorial "Curated Archive" aesthetic from the Stitch design prototypes.

**How to apply:** When making UI changes, follow these design tokens and component patterns:

## Design System

**Fonts:**
- Headlines: `Plus Jakarta Sans` (var --font-syne alias)
- Body: `Inter` (var --font-ibm alias)
- Icons: Material Symbols Outlined (`<span className="material-symbols-outlined">icon_name</span>`)

**Colors (dark mode):**
- Background: `#0e0e0d` (var --carbon)
- Surface: `#141412` (var --surface)
- Surface-2: `#1c1c19` (var --surface-2)
- Surface-3: `#282723` (var --surface-3)
- Primary/gold: `#b68d40` (var --candle)
- Dark gold: `#7b580d` (var --ember)
- Text: `#fcf9f4` (var --parchment)
- Muted text: `#c9c2b5` (var --sand)
- Border: `rgba(78,69,56,0.35)` (var --border)

**Key design rules:**
- Border radius: 16px for cards, 20-24px for large sections, 9999px for pills/buttons
- NO 1px borders for separation — use tonal backgrounds instead
- Active nav items: `background: rgba(182,141,64,0.12)` (gold tint pill)
- Primary buttons: `linear-gradient(135deg, var(--candle), var(--ember))`
- Sidebar width: 256px expanded, 60px collapsed

**Files changed:**
- `src/app/layout.tsx` — fonts switched to Plus Jakarta Sans + Inter + Material Symbols link
- `src/app/globals.css` — new color palette, font aliases
- `src/components/dashboard/Sidebar.tsx` — full pill-nav redesign with Material Symbols
- `src/components/dashboard/DashboardShell.tsx` — width 256/60
- `src/app/dashboard/overview/page.tsx` — new 3-col KPI + horizontal pending cards + weekly flow
- `src/components/dashboard/OverviewPendingPost.tsx` — horizontal scroll card carousel
- `src/components/dashboard/PostCard.tsx` — new card with backdrop blur status badge + italic caption
- `src/components/dashboard/PostsClient.tsx` — new header + underline filter tabs
- `src/app/dashboard/statistics/page.tsx` — new KPI bento grid + styled containers
- `src/components/brand-brain/BrandBrainClient.tsx` — new section cards, inner nav, page header
