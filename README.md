# Recipe Nutrition Calculator

## 문서별 역할

| 파일 또는 문서 | 역할 |
| --- | --- |
| [project-checklist.md](project-checklist.md) | 무엇을 지원하고 결정해야 하는지 검토하는 질문과 시나리오 |
| PRD (제품 요구사항 정의서) | 체크리스트를 검토해 해당 프로젝트에서 실제로 결정한 요구사항 |
| [DESIGN-tsrecipe.md](DESIGN-tsrecipe.md) | 결정된 요구사항을 화면으로 표현하는 공통 규칙 |
| `content-guidelines.md` (필요 시 생성) | 필요해졌을 때 분리할 상세 UX 라이팅 규칙과 용어집 |

프로젝트 시작 및 PRD 작성 시 체크리스트를 참고한다. 같은 규칙을 여러 파일에 중복 정의하지 않고, 해당 규칙을 관리하는 문서를 참조한다. 상세 UX 라이팅 규칙과 용어집은 분량과 관리 필요성이 커지면 별도 문서로 분리한다.

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
