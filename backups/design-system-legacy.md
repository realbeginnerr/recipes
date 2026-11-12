# tsrecipe Design System

Token values live in [`DESIGN-tsrecipe.tokens.yaml`](./DESIGN-tsrecipe.tokens.yaml). This file is the usage guide only — do not duplicate hex values here; reference tokens such as `{colors.primary}`.

## Overview

tsrecipe is an editorial, **photo-first** recipe interface. Page floors use **surface roles** — `{colors.canvas}` (white), `{colors.surface-soft}` / `{colors.surface-card}` (neutral gray), and `{colors.surface-dark}` (pine) — chosen by content, not locked to white. Headlines run a **slab-serif display** ("Copernicus" / Tiempos Headline) at weight 400 with negative letter-spacing for English, paired with **StyreneB / Inter** body sans. Korean uses **Pretendard** (`{typography-kr}`) at the same sizes, with leading 1.5 and tracking -0.04em.

Brand voltage comes from **forest green as Primary** (`{colors.primary}` — #255A46) on CTAs and scarce accents — never as the way to separate every surface. Secondary, neutral, and surface colors do the spatial work. The green is deep and botanical, never cyan/blue.

The system has surface modes that mix by page purpose:

1. **Canvas** (`{colors.canvas}`) — white floor when the page should feel open
2. **Neutral / surface cards** (`{colors.surface-soft}`, `{colors.surface-card}`) — gray bands and cards when the page needs rest or grouping
3. **Dark pine product surfaces** (`{colors.surface-dark}`) — recipe tables, nutrition totals, footer

**Food photography is the primary visual.** Finished-dish, photoreal photos lead Hero, recipe cards, and detail. Illustration stays secondary.

**Key Characteristics:**

- Surfaces are chosen by **role** (Primary, Secondary, Neutral, Surface), not by locking the whole site to one hex. White is allowed; gray `{colors.surface-soft}` / `{colors.surface-card}` is allowed. Beige or warm cream is not a page floor.
- Forest-green Primary (`{colors.primary}` — #255A46) is scarce: CTAs and a few callouts, not every divider.
- Photoreal food photos at generous size in Hero, recipe cards, and detail pages. Texture, color, and form of the real dish stay visible.
- Slab-serif English headlines via Copernicus / Tiempos Headline at weight 400 with negative letter-spacing. Korean headlines and UI copy use Pretendard. English body stays humanist sans.
- Dark pine product mockup cards (`{colors.surface-dark}` — #0D1F19) for tables and nutrition chrome — still secondary to the dish photo when both appear.
- Cool-gray feature cards (`{colors.surface-card}` — #E9EBE8) for grouping content, not for replacing photography.
- tsrecipe wordmark — the brand name in the header.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content + product cards, `{rounded.xl}` (16px) for the hero photo container, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard. Internal card padding stays generous at `{spacing.xl}` (32px).

## Colors

### Brand & Accent

- **Forest green / Primary** (`{colors.primary}` — #255A46): The signature deep green. Used on every primary CTA background, on full-bleed green callout cards, on the brand wordmark accent.
- **Forest green Active** (`{colors.primary-active}` — #1E4A39): The press / hover-darker variant.
- **Forest green Disabled** (`{colors.primary-disabled}` — #CBD4D2): A desaturated sage-gray disabled state.
- **Accent Teal** (`{colors.accent-teal}` — #4AA660): Used sparingly on secondary product surfaces (terminal status indicators, "active connection" dots in connectors page).
- **Accent Amber** (`{colors.accent-amber}` — #F8C166): A small companion warm-tone used on category badges and inline highlights.

### Surface

- **Canvas** (`{colors.canvas}` — #FFFFFF): A white page floor. Use when the page should feel open. Not mandatory on every page — gray `{colors.surface-soft}` / `{colors.surface-card}` floors are valid when the content needs rest or grouping.
- **Surface Soft** (`{colors.surface-soft}` — #F6F5F1): Section dividers, very-soft band backgrounds.
- **Surface Card** (`{colors.surface-card}` — #E9EBE8): Feature cards, content cards. One step darker than canvas.
- **Surface Cream Strong** (`{colors.surface-cream-strong}` — #DEE3E1): A strongest sage-gray variant used on selected category tabs and emphasized section bands. Token name is historical; the fill is cool gray-green, not cream.
- **Surface Dark** (`{colors.surface-dark}` — #0D1F19): Code editor mockups, model showcase cards, footer. The dominant dark pine surface.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #132D23): Elevated cards inside dark bands (settings panels in mockups).
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #10261D): Slightly lighter dark, used for code block backgrounds inside larger dark cards.
- **Hairline** (`{colors.hairline}` — #CBD4D2): The 1px border tone on light surfaces. Same hex as `{colors.primary-disabled}` — borders feel like one elevation step rather than ink lines.
- **Hairline Soft** (`{colors.hairline-soft}` — #E5EAE9): Barely-visible divider used inside the same band.

### Text

- **Ink** (`{colors.ink}` — #122B22): All headlines and primary text. Dark pine, slightly off-pure-black.
- **Body Strong** (`{colors.body-strong}` — #364B43): Emphasized paragraphs, lead text.
- **Body** (`{colors.body}` — #596B64): Default running-text color.
- **Muted** (`{colors.muted}` — #899591): Sub-headings, breadcrumbs, footer-adjacent secondary text.
- **Muted Soft** (`{colors.muted-soft}` — #ACB5B2): Captions, fine-print, copyright lines.
- **On Primary** (`{colors.on-primary}` — #FFFFFF): Text on forest-green buttons.
- **On Dark** (`{colors.on-dark}` — #FFFFFF): White used on dark pine surfaces (echoes the canvas tone).
- **On Dark Soft** (`{colors.on-dark-soft}` — #B7DBBF): Footer body text, secondary labels in dark mockups. A mint-sage on pine.

### Color roles

Surfaces are designed by **role and hierarchy**, not by repeating one favorite hex.

- **Primary** — `{colors.primary}` and variants. CTAs, scarce emphasis.
- **Secondary** — `{colors.accent-teal}` (and related accents). Supporting status, secondary actions — not a second paint job of Primary.
- **Neutral** — `{colors.ink}`, `{colors.body}`, `{colors.muted}`, `{colors.hairline}`. Type and dividers.
- **Surface** — `{colors.canvas}`, `{colors.surface-soft}`, `{colors.surface-card}`, `{colors.surface-dark}`. Page floors and cards.

Do not use Primary alone to tell regions apart. Mix Secondary, Neutral, and Surface.

### Semantic

- **Success** (`{colors.success}` — #4AA660): Green status dots, "available" indicators.
- **Warning** (`{colors.warning}` — #F8C166): Warning callouts (rare on marketing surfaces).
- **Error** (`{colors.error}` — #EC4E20): Validation errors.

## Typography

### Font Family

English and numerals use **Copernicus** (or **Tiempos Headline**) for display and **StyreneB** (or **Inter**) for body, navigation, and UI labels. **JetBrains Mono** handles code, amounts, and tabular figures. Korean (Hangul) uses **Pretendard** from `{typography-kr}` — never Copernicus or StyreneB on Hangul.

The split:

- English display → Copernicus serif (weight 400, negative tracking)
- English UI / body → StyreneB sans (weight 400–500)
- Korean, all levels → Pretendard (`{typography-kr.*}`), leading 1.5, tracking -0.04em
- Code / numbers in tables → JetBrains Mono
- Size and weight at each level stay matched between `{typography}` and `{typography-kr}`

### Hierarchy (English — `{typography}`)

| Token                            | Size | Weight | Line Height | Letter Spacing | Use                                     |
| -------------------------------- | ---- | ------ | ----------- | -------------- | --------------------------------------- |
| `{typography.display-xl}`        | 64px | 400    | 1.05        | -1.5px         | Homepage h1 — Copernicus serif          |
| `{typography.display-lg}`        | 48px | 400    | 1.1         | -1px           | Section heads — Copernicus              |
| `{typography.display-md}`        | 36px | 400    | 1.15        | -0.5px         | Sub-section heads — Copernicus          |
| `{typography.display-sm}`        | 28px | 400    | 1.2         | -0.3px         | Callout headlines — Copernicus          |
| `{typography.title-lg}`          | 22px | 500    | 1.3         | 0              | Plan / recipe labels — StyreneB         |
| `{typography.title-md}`          | 18px | 500    | 1.4         | 0              | Feature card titles                     |
| `{typography.title-sm}`          | 16px | 500    | 1.4         | 0              | List labels                             |
| `{typography.body-md}`           | 16px | 400    | 1.55        | 0              | Default running-text — StyreneB         |
| `{typography.body-sm}`           | 14px | 400    | 1.55        | 0              | Footer body, fine-print                 |
| `{typography.caption}`           | 13px | 500    | 1.4         | 0              | Badge labels                            |
| `{typography.caption-uppercase}` | 12px | 500    | 1.4         | 1.5px          | Category tags                           |
| `{typography.code}`              | 14px | 400    | 1.6         | 0              | Code / tabular numbers — JetBrains Mono |
| `{typography.button}`            | 14px | 500    | 1.0         | 0              | English button labels                   |
| `{typography.nav-link}`          | 14px | 500    | 1.4         | 0              | English nav items                       |

### Hierarchy (Korean — `{typography-kr}`)

Pretendard at the same sizes/weights. All Korean levels use line-height **1.5** and letter-spacing **-0.04em**. There is no `code` token in `{typography-kr}`; digits stay on `{typography.code}`.

| Token                                                       | Size    | Weight | Line Height | Letter Spacing | Face       |
| ----------------------------------------------------------- | ------- | ------ | ----------- | -------------- | ---------- |
| `{typography-kr.display-xl}` … `{typography-kr.display-sm}` | 64–28px | 400    | 1.5         | -0.04em        | Pretendard |
| `{typography-kr.title-*}` / `{typography-kr.caption*}`      | 22–12px | 500    | 1.5         | -0.04em        | Pretendard |
| `{typography-kr.body-*}`                                    | 16–14px | 400    | 1.5         | -0.04em        | Pretendard |
| `{typography-kr.button}` / `{typography-kr.nav-link}`       | 14px    | 500    | 1.5         | -0.04em        | Pretendard |

### Principles

English display stays weight 400, never bold. Negative letter-spacing on Copernicus is essential. Korean must not inherit English leading/tracking — use `{typography-kr}` so Hangul does not collide.

Body English stays weight 400 for paragraphs, 500 for labels. StyreneB is humanist; Inter is the substitute. Helvetica or Arial is too neutral.

When the UI language is Korean, buttons, nav, titles, and body all switch to `{typography-kr}`. Mixed strings (English recipe names inside Korean UI) keep Copernicus/StyreneB on the Latin run and Pretendard on Hangul.

### Note on Font Substitutes

If Copernicus / Tiempos Headline is unavailable, **Cormorant Garamond** at weight 500 with -0.02em letter-spacing is the closest open-source approximation. **EB Garamond** is a fallback. For StyreneB, **Inter** is the closest match. **Söhne** is another licensed alternative. Pretendard is publicly available; load it from a webfont host rather than substituting Nanum or Malgun Gothic.

## Layout

### Spacing System

- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards, model comparison cards; `{spacing.lg}` (24px) for code-window cards and connector tiles.
- **Callout / CTA bands:** `{spacing.xxl}` (48px) inside green callout cards; 64px inside the larger dark CTA band.

### Grid & Container

- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often uses 6/6 split (h1 left, illustration right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop (Free / Pro / Team / Enterprise often), 1-up at mobile.

### Whitespace Philosophy

The white canvas + serif display + generous internal padding create an editorial pacing — tsrecipe reads like a long-form magazine column rather than a marketing template. Whitespace between bands stays uniform at 96px; whitespace inside cards is generous (32px), letting type breathe.

## Elevation & Depth

| Level              | Treatment                                      | Use                                                                            |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Flat               | No shadow, no border                           | Body sections, top nav, hero bands                                             |
| Soft hairline      | 1px `{colors.hairline}` border                 | Inputs, sub-nav, occasionally on cards                                         |
| Soft card          | `{colors.surface-card}` background — no shadow | Feature cards, content cards                                                   |
| Dark surface card  | `{colors.surface-dark}` background — no shadow | Code editor mockups, model showcase cards                                      |
| Subtle drop shadow | Faint shadow at low alpha                      | Hover-elevated states (the system uses `0 1px 3px rgba(20,20,19,0.08)` rarely) |

The elevation philosophy is **color-block first, shadow rare**. Most depth comes from the white-vs-pine surface contrast. Shadows are minimal. The dark surface mockups have their own internal product chrome (code editor scrollbars, line numbers, syntax highlighting) which adds detail without needing external shadows.

### Decorative Depth

- The tsrecipe wordmark appears in the header.
- Recipe tables and nutrition chrome sit on dark pine when needed; they never outrank the dish photo on the same screen.
- Illustration (line-art, icons, geometric marks) supports photography. It must not become the focal object.

## Shapes

### Border Radius Scale

| Token            | Value        | Use                                                             |
| ---------------- | ------------ | --------------------------------------------------------------- |
| `{rounded.xs}`   | 4px          | Reserved for badge accents and tiny dropdowns                   |
| `{rounded.sm}`   | 6px          | Small inline buttons, dropdown items                            |
| `{rounded.md}`   | 8px          | Standard CTA buttons, text inputs, category tabs                |
| `{rounded.lg}`   | 12px         | Content cards (feature, pricing, code-window, model-comparison) |
| `{rounded.xl}`   | 16px         | Hero illustration container, the larger marquee components      |
| `{rounded.pill}` | 9999px       | Badge pills, "NEW" tags                                         |
| `{rounded.full}` | 9999px / 50% | Avatar substitutes, icon buttons                                |

### Photography & Illustrations

Food photography is the **most important visual**. Use photoreal photos of the **finished dish** so texture, color, and form read naturally.

- Hero, recipe cards, and detail pages show the dish at a **generous size**. Do not shrink the photo to make room for decoration.
- Marketing moments also prefer **high-quality photoreal photos** over illustration.
- Illustration and graphic devices only **support** the photo. They must not outrank it.
- Avatars (testimonials) crop to circles at 40px diameter — small UI, not the content hero.

## Components

### Top Navigation

**`top-nav`** — White nav bar pinned to the top of every page. 64px tall, `{colors.canvas}` background. Carries the "tsrecipe" wordmark at left, primary horizontal menu (Recipes, Ingredients, Search) center-left, right-side cluster with language toggle and `{component.button-primary}` (forest green). Menu items in `{typography.nav-link}` (StyreneB 14px / 500) for English, `{typography-kr.nav-link}` (Pretendard) for Korean.

### Buttons

**`button-primary`** — The signature forest-green CTA. Background `{colors.primary}` (#255A46), text `{colors.on-primary}` (white), type `{typography.button}` (StyreneB 14px / 500; Pretendard via `{typography-kr.button}` in Korean), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Active state `button-primary-active` darkens to `{colors.primary-active}` (#1E4A39).

**`button-secondary`** — White button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}` (#132D23), text `{colors.on-dark}`. Stays dark — the system never inverts to a light secondary on dark surfaces.

**`button-text-link`** — Inline text button, no background. Used for "Sign in" in the top nav and inline CTA links.

**`button-icon-circular`** — 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-color icon. Used for carousel arrows, share, "view more".

**`text-link`** — Inline body links in `{colors.primary}` (forest green). Underlined on press; the green inline link is one of the system's most distinctive small details.

### Cards & Containers

**`hero-band`** — Photo-first hero: large finished-dish photograph plus h1, sub-headline, and actions. Vertical padding `{spacing.section}` (96px). The photo is the focal object; type and controls sit around it, not over a tiny crop.

**`hero-illustration-card`** — Token name is historical. This slot is the **hero food photo** (photoreal, large). Background `{colors.canvas}` or `{colors.surface-dark}` depending on context, rounded `{rounded.xl}` (16px). Do not fill this slot with decorative illustration.

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (#E9EBE8 — slightly darker than white), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Dark pine card showing tsrecipe product chrome (recipe tables, nutrition totals, unit controls). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries text labels in `{colors.on-dark}` and product UI fragments below.

**`code-window-card`** — A specialized dark card for dense data (nutrition breakdowns, conversion tables) in `{typography.code}` (JetBrains Mono). Background `{colors.surface-dark}` with `{colors.surface-dark-soft}` for the inner block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px).

**`model-comparison-card`** — Used on the homepage to compare recipes or nutrition profiles. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries the recipe name, a short blurb, and a `{component.text-link}` to learn more.

**`pricing-tier-card`** — Standard tier card. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Carries the plan name in `{typography.title-lg}` (StyreneB), price in `{typography.display-sm}` (Copernicus serif!), feature checklist in `{typography.body-md}`, and a `{component.button-primary}` at the bottom.

**`pricing-tier-card-featured`** — The featured tier (typically "Pro" or "Team"). Background flips to `{colors.surface-dark}`, text inverts to `{colors.on-dark}`. The dark surface IS the featured-tier signal.

**`callout-card-coral`** — A full-bleed forest-green card carrying a major call-to-action. (Token name is historical.) Background `{colors.primary}` (#255A46), text `{colors.on-primary}` (white), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px). The green surface IS the voltage; the CTA inside uses an inverted button style (white/canvas button on green).

**`connector-tile`** — Used on the connectors page's integration grid. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding 20px. Each tile carries a logo at top, a `{typography.title-sm}` connector name, and a short description.

### Inputs & Forms

**`text-input`** — Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`.

**`text-input-focused`** — Focus state. Border thickens or shifts to `{colors.primary}` (forest green) for emphasis. Carries a 3px green-at-15%-alpha outer ring.

**`cookie-consent-card`** — Bottom-right floating dark cookie banner. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). One of the few places dark surface appears at small scale on white pages.

### Tags / Badges

**`badge-pill`** — Small pill label used for category tags. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-coral`** — Forest-green fill badge for "NEW", "BETA", featured highlights. (Token name is historical.) Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows on solutions / connectors pages. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

### CTA / Footer

**`cta-band-coral`** — A pre-footer "Try tsrecipe" CTA card. Full-width forest-green fill, white type, rounded `{rounded.lg}`, padding 64px. (Token name is historical.) Carries an h2 in `{typography.display-sm}` (Copernicus in English, Pretendard in Korean), a sub-line, and a white-button CTA.

**`cta-band-dark`** — Alternative pre-footer band on developer-focused pages. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding 64px. Often pairs with a code-window card.

**`footer`** — Dark pine footer that closes every page. Background `{colors.surface-dark}` (#0D1F19), text `{colors.on-dark-soft}`. Link columns at desktop. Vertical padding 64px. The "tsrecipe" wordmark sits at the top in `{colors.on-dark}`. The footer never inverts.

## Do's and Don'ts

### Do

- Choose the page floor by role: white `{colors.canvas}` or gray `{colors.surface-soft}` / `{colors.surface-card}` as the content needs. Dark pine `{colors.surface-dark}` for product chrome and footer.
- Lead with a large photoreal photo of the finished dish in Hero, recipe cards, and detail.
- Use Copernicus serif for English display headlines. Pair with StyreneB sans for English body. Use Pretendard (`{typography-kr}`) for all Korean copy.
- Reserve `{colors.primary}` for primary CTAs and rare full-bleed callouts. Separate regions with Surface, Neutral, and Secondary — not with more green.
- Pair `{component.feature-card}` (sage gray) with photography and, where needed, `{component.product-mockup-card-dark}` (pine).
- Use the tsrecipe wordmark in the header. Don't invent a secondary logo lockup unless it is a documented token.
- Apply `{spacing.section}` (96px) between major bands.

### Don't

- Don't lock every page to white. Gray surfaces are valid when the page purpose asks for them.
- Don't use beige or warm cream as the default page background.
- Don't repeat Primary on too many elements. Don't use Primary as the only way to tell surfaces apart.
- Don't let decorative illustration or graphics outrank the food photo.
- Don't make dish photos unnecessarily small. Don't lower their visual weight in core content areas.
- Don't bold serif display weight. Copernicus at 700 reads as bombastic; the system stays at 400.
- Don't use cool blue or saturated cyan as a brand accent. Forest green is Primary voltage, used sparingly.
- Don't use Inter or Pretendard for English display headlines. Don't use Copernicus on Hangul.
- Don't add hover state styling beyond what the system already encodes — primary darkens on press; nothing else changes.

## Responsive Behavior

### Breakpoints

| Name    | Width       | Key Changes                                                                                                                                            |
| ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile  | < 768px     | Hamburger nav; hero h1 64→32px; hero-illustration-card stacks below content; feature grids 1-up; connector tiles 2-up; pricing 1-up; footer 4 cols → 1 |
| Tablet  | 768–1024px  | Top nav stays horizontal but tightens; feature cards 2-up; connector tiles 3-up; pricing 2-up                                                          |
| Desktop | 1024–1440px | Full top-nav with all menu items; 3-up feature cards; 4-up or 6-up connector tiles; 3-up pricing tiers                                                 |
| Wide    | > 1440px    | Same as desktop with more outer breathing room; max content width caps at 1200px                                                                       |

### Touch Targets

- `{component.button-primary}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36 — slightly under WCAG 44 but visually centered.
- `{component.text-input}` height is 40px.
- Connector tile entire card area is tappable; effective tap area >> 44px.

### Collapsing Strategy

- Top nav collapses to hamburger at < 768px; menu opens as a full-screen white sheet.
- Hero band's photo + copy stack to single-column on mobile — dish photo stays large; do not collapse it into a thumbnail.
- Feature grids reduce columns rather than scaling cards down.
- Pricing tier cards collapse 4 → 2 → 1; featured-tier dark surface stays visually distinct at every breakpoint.
- Code-window cards retain code legibility at every breakpoint by allowing horizontal scroll within the card rather than wrapping code lines.

### Image Behavior

- Hero and recipe-card food photos stay large at every breakpoint; crop for composition, don't shrink for decoration.
- Line-art and icons, if used, stay smaller than the dish photo on the same screen.
- Avatar photos in testimonials crop to circles at every breakpoint.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.feature-card}`, `{component.code-window-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. English display stays Copernicus serif 400 with negative tracking. English body stays StyreneB / Inter. Korean stays Pretendard via `{typography-kr}`. The language split is unbreakable.
6. Design surfaces by role (Primary, Secondary, Neutral, Surface). White is not mandatory. Photoreal food photos outrank illustration.
7. When in doubt about emphasis: bigger type before bolder weight. English: bigger Copernicus. Korean: bigger Pretendard, still weight 400 on display.

## Known Gaps

- Copernicus and StyreneB are licensed typefaces and not available as public web fonts. Substitutes (Tiempos Headline / Cormorant Garamond / EB Garamond for serif; Inter / Söhne for sans) are documented in the typography section. Pretendard is the Korean face and can be loaded as a webfont.
- The tsrecipe wordmark is a brand asset; it is not formalized as a system token here.
- Animation and transition timings are not in scope.
- Form validation states beyond `{component.text-input-focused}` are not extracted — error / success states would need a sign-up or feedback flow to confirm.
- The live tsrecipe product UI (recipe tables, search, language toggle) may add components that are out of scope for this marketing-surface document.
