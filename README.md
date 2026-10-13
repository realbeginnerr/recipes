# Recipe Nutrition Calculator

## Shop 상품 관리

- Shop 목록의 **상품 추가** → 관리자 Google 로그인 → `/products/new` 등록 폼
- `/products/:id/edit`: 동일한 폼으로 수정, 임시 저장, 복제, 삭제
- `/shop-settings`: 공통 카테고리 및 배송·교환·반품 정책, 변경 이력
- `/product/:slug`: 상품 상세와 고객 정책 안내. 주문·결제·환불 실행은 포함하지 않음
- 상품은 `products`, 매입 원가는 관리자만 읽는 `productAdmin`에 분리 저장
- 공통 정책을 설정하기 전에도 비공개 상품과 임시 상품은 저장 가능. 공개 상품은 필수 정책 정보 검증
- 날짜·예약 공개는 한국 시간(KST) 기준

검증:

```bash
npm test
firebase emulators:exec --only firestore --project demo-recipes-products --config firebase.emulators.json "node scripts/check-product-rules.mjs"
```

저장 트랜잭션 테스트는 Firestore 에뮬레이터가 실행되고 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8089`가 설정된 경우 실행한다. 다른 테스트는 에뮬레이터 없이 실행할 수 있다.

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

- Firestore `ingredients` collection — single source of truth for nutrition, units, conversions, and ingredient image URLs
- `src/data/recipe.ts` — recipe lines reference `ingredientId` only (no duplicated macros)
- `scripts/import-ingredients.mjs --input=<path>` — one-time CSV migration utility; preview by default, pass `--apply` to write to Firestore
