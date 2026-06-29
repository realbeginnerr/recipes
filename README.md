# Recipe Nutrition Calculator

Frontend-only MVP: calculate macros for **Chili Con Carne** as you edit amounts and units.

## Features

- Editable amounts, unit dropdowns (per-ingredient `allowedUnits`), live carbs/protein/fat
- Nutrition scales by each ingredient's `baseAmount` and `baseUnit` (not fixed per 100g)
- Unit changes auto-convert the amount (grams as the internal basis)
- No auth, no persistence (refresh resets state)
- Mobile-friendly tables via horizontal scroll (`min-width: 600px`)

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Data

- `src/data/ingredients.ts` — single source of truth for nutrition, units, and conversions
- `src/data/recipe.ts` — recipe lines reference `ingredientId` only (no duplicated macros)
