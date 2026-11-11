# Recipe Nutrition Calculator

<a id="documents"></a>

## 문서 목록

| 문서 | 내용 |
| --- | --- |
| [개발 작업 규칙](docs/dev-rules.md) | 개발·수정·테스트·검증·배포 작업 기준 |
| [웹사이트 체크리스트](docs/website-checklist.md) | 기획·접근성·인증·보안·테스트·운영 검토 항목 |
| [기능 요구사항](docs/requirements.md) | 사이트 기능과 승인된 정책 |
| [공통 디자인 시스템](docs/design-system.md) | 재사용할 시각·컴포넌트·인터랙션 규칙 |
| [프로젝트 디자인 명세](docs/design-system-project.md) | 이 사이트의 설정·예외·구현 연결 |
| [사진 속 상품 태그](docs/photo-tags.md) | 사진·상품 연결 데이터와 기능 명세 |
| [Shop 운영 상태](docs/shop-status.md) | Shop 임시 중지와 노출 정책 |
| [UX audit 가이드](docs/audits/audit-guide.md) | 분석 범위·판정·보고서 작성 방법 |
| [레시피 UX 결과](docs/audits/2026-10-28-results-nav-recipes.md) | 2026-10-28 진단, 승인·구현 상태는 본문 참조 |
| [디자인 시스템 간격 결과](docs/audits/2026-11-10-results-design-system-spacing.md) | 간격 점검·수정·검증 기록 |
| [숫자 입력 결과](docs/audits/2026-10-26-results-input.md) | 2026-10-26 입력 동작 점검 |
| [영어 표시 결과](docs/audits/2026-11-02-results-english.md) | 2026-11-02 번역·표시 점검 |
| [메뉴 구조 결과](docs/audits/2026-10-18-results-navigation.md) | 메뉴·페이지 구조 분석과 개선 가설 |
| [상품 태그 검증 결과](docs/audits/2026-10-25-results-photo-tags.md) | 상품 태그 개발 데모·검증·제한 |
| [메뉴 구조 가이드](docs/navigation/guide.md) | 구조 데이터·권한·ID·검증 기준 |

하나의 정책은 한 문서에서 관리하고 다른 문서에서는 링크로 참조한다. 체크리스트는 질문, 요구사항은 결정, 디자인 시스템은 표현·동작 규칙, audit 결과는 작성 시점의 관찰과 검증 기록이다. 과거 결과를 현재 구현이나 배포 완료로 해석하지 않는다.

## 폴더 사용법

| 폴더 | 넣을 내용 |
| --- | --- |
| `docs` | 현재 요구사항·규칙·설계 명세 |
| `docs/audits` | Audit 가이드와 점검 결과. 결과 이름에는 `results` 포함 |
| `docs/navigation` | 메뉴 구조 YAML·도식·검증 도구 |
| `src` / `public` / `tests` | 사이트 소스 / 공개 이미지·아이콘 / 자동 테스트 |
| `scripts` | 실행 스크립트. 입력 JSON이나 백업은 두지 않음 |
| `data` | 가져오기 입력·준비 데이터·처리 결과 JSON |
| `backups` | 복구 데이터·과거 문서·압축본·보존할 빌드 자료 |
| `logs` | 로컬 실행 로그. Git에는 포함하지 않음 |

디자인 시스템 관련 명세는 `design-system`으로 시작한다. `docs/audits`의 가이드는 `audit-guide.md`로 유지한다. 날짜가 있는 기록은 `YYYY-MM-DD-문서유형-상세주제.md` 순서로 이름을 짓고, 결과는 `results`, 요약은 `summary`처럼 내용에 맞는 유형을 날짜 바로 뒤에 둔다. 디자인 시스템 점검 결과는 `YYYY-MM-DD-results-design-system-상세주제.md`로 이름을 짓는다. 생성일과 분석 기준일은 구분하며 날짜를 임의로 만들지 않는다. 새 결과는 이 목록에 링크·범위·상태를 추가한다. 자세한 절차는 audit 가이드를 따른다.

`AGENTS.md`는 AI 도구가 자동으로 찾는 연결 파일이다. 사람이 읽는 작업 규칙 본문은 `docs/dev-rules.md` 한 곳에서 관리한다. `node_modules`·`dist`는 설치·빌드로 생성되는 폴더다.

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

## 초기 MVP 기록 (과거)

아래 설명은 초기 구현 당시의 기록이다. 현재 인증·저장 기능과 운영 정책은 문서 목록의 최신 명세를 따른다.

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

일상적인 테스트는 **로컬 개발 서버** `http://localhost:5173/recipes/`를 사용합니다. 소스 수정이 바로 반영됩니다. 5173 포트가 사용 중이면 다른 포트로 바꾸지 않고 오류로 중단하므로, 기존 서버가 어느 프로젝트인지 먼저 확인합니다.

## Build

```bash
npm run preview
```

`npm run preview`는 매번 최신 소스를 빌드한 뒤 `http://localhost:4173/recipes/`에서 실행합니다. 이전 `dist` 폴더를 별도 정적 서버로 실행하면 수정 전 화면이 보일 수 있습니다. 개발 서버와 미리보기 서버를 혼동하지 않도록 주소를 고정합니다.

## 회귀 방지

```bash
npm run test:regressions
```

단위 경고 해제, 식재료 순서 변경, 새로고침 경로 복원, 사진 삭제 후 참조 정리, 레시피 이름 중복 차단을 확인합니다. 배포 빌드 전에도 같은 테스트를 실행하며 실패하면 배포를 중단합니다. 테스트 통과와 실제 브라우저 확인은 구분합니다.

레시피 생성·수정은 서버에서 한글·영문 이름을 각각 검사합니다. 수정 중인 자기 ID는 제외하고, 숨김 항목도 검사하되 삭제한 항목은 제외합니다. 저장되는 앞뒤 공백 제거 값을 비교하며 대소문자·내부 공백은 바꾸지 않습니다. `recipes/recipe-name-guard`는 동시 저장 시 검사를 재시도하기 위한 메타데이터입니다. `deleted: true`, `createdAt` 없음으로 목록에서 제외됩니다. 콘솔이나 외부 스크립트의 직접 쓰기는 이 앱의 중복 검사를 거치지 않습니다.

큰 변경 전에는 확인된 수정만 별도 Git 커밋으로 남기고, 이후 문제 발생 시 그 시점과 비교합니다. 작업 중인 다른 변경이나 의도적으로 삭제한 파일을 일괄 복원하지 않습니다. 작업자의 로컬 테스트 기준은 [개발 작업 규칙](docs/dev-rules.md)에 기록되어 있습니다.

## Data

- Firestore `ingredients` collection — single source of truth for nutrition, units, conversions, and ingredient image URLs
- `src/data/recipe.ts` — recipe lines reference `ingredientId` only (no duplicated macros)
- `scripts/import-ingredients.mjs --input=<path>` — one-time CSV migration utility; preview by default, pass `--apply` to write to Firestore


<a id="navigation-history"></a>

## 정보 구조 분석 기록 — 2026-10-19

### T's Recipe 정보 구조 포트폴리오

기준일: 2026-10-19 (KST) · IA v1.1

레시피·식재료 탐색과 영양 계산, 관리자 운영 화면의 정보 구조를 소스 코드로 분석하고 탐색 개선안을 제안한 자료다. 사용자 테스트와 운영 환경 실행 검증은 수행하지 않았다.

2026-10-20 레시피 메뉴 검토에서 승인된 정책과 시나리오는 [PRD 11장](docs/requirements.md#11-레시피-메뉴-검토--승인된-정책)에 기록했다. 이번 승인은 문서 반영에 한정하며 코드 변경·배포를 뜻하지 않는다. As-Is YAML과 다이어그램은 기존 코드 분석 기록으로 보존한다. To-Be YAML의 기존 제안 전체를 승인한 것이 아니며, ‘8개씩 자동 추가’ 등 현재 구현 설명과 새 정책의 차이는 PRD 11.4에서 구분한다. 페이지 계층 변경은 없으므로 이번 정책 반영으로 YAML·다이어그램을 재생성하지 않는다.

#### 읽는 순서

1. `docs/navigation/diagrams/ia-as-is.png`, `docs/navigation/diagrams/ia-to-be.png`: 현재 구조와 개선안의 전체 계층 이미지.
2. `docs/audits/2026-10-18-results-navigation.md`: 코드 근거, 발견한 문제, 개선 가설과 검증 한계.
3. `docs/navigation/ia-as-is.yaml`, `docs/navigation/ia-to-be.yaml`: 구조의 단일 원본과 ID별 변경 이유.
4. `docs/navigation/guide.md`: 분류·권한·ID·검증 기준.
5. `docs/navigation/changes.md`: 과거 결정과 변경 이유를 담은 보조 자료.

#### 현재 상태와 개선안

| 구분 | As-Is | To-Be |
| --- | --- | --- |
| 전체 노드 | 44 | 45 |
| 페이지 | 17 | 17 |
| 룰렛 | 최상위 정보 | 레시피 하위로 이동 제안 |
| 식사 가이드 | 최상위 정보 | 홈의 ‘더 알아보기’ 하위로 이동 제안 |
| 더 알아보기 | 없음 | 홈 하위 section 1개 신설 제안 |
| Shop 메뉴 | 주 메뉴에 없음 | 기존 Shop의 주 메뉴 진입 제안 |

To-Be는 구현 완료 결과가 아닌 제안이다. 계층 구조는 실제 클릭 순서나 사용자 흐름과 다르다. 회원가입과 사전 신청은 제공하지 않는다. 과거 변경 이력의 사전 신청 내용은 종료된 기록이다.

#### 검증 결과와 남은 항목

구조 테스트 및 YAML·Mermaid 동기화 검사 통과. 구조 검증 결과 Error 0 / Warning 2 / Info 12. Warning은 룰렛·식사 가이드의 내부 진입 링크 미확인이다. 의도적인 비노출이라는 근거가 없어 검토 항목으로 남겼으며, To-Be에 문맥 진입을 제안했다. 운영 적용은 보류 상태다.

실제 사용자 과제 테스트, 운영 로그인·권한, 모바일 기기 동작은 별도 확인이 필요하다. 구조 검증 통과를 사용성 검증 완료로 해석하지 않는다.

2026-11-11 폴더 정리 후 재확인: YAML과 Mermaid의 동기화는 통과했다. 다만 2026-10-19 구조 원본에는 이후 추가된 자료실·캘린더가 없어 현재 소스 대조에서 2개 누락과 페이지 수 차이가 보고된다. 위의 Error 0은 과거 분석 시점의 결과다. 이번 파일 정리에서는 과거 구조 데이터를 최신 구조로 덮어쓰지 않았다.

#### 파일과 실행 방법

`.mmd`는 편집 가능한 Mermaid 원본이고 PNG는 동일 YAML에서 만든 읽기용 계층 이미지다. PNG를 Mermaid 엔진으로 렌더링한 결과라고 주장하지 않는다. 전체 Mermaid 파서·FigJam 변환은 별도 확인이 필요하다.

검증 스크립트는 사이트 런타임에 포함되지 않는다. 프로젝트 루트의 소스와 설치된 Node 의존성에 의존하므로 이 폴더만으로 전체 코드 대조를 실행할 수는 없다.

```sh
node docs/navigation/scripts/test-ia.mjs
node docs/navigation/scripts/validate-ia.mjs
node docs/navigation/scripts/generate-ia.mjs --check
```

PNG 재생성은 Python과 Pillow, 한글 폰트가 설치된 환경에서 프로젝트 루트 기준 `python docs/navigation/scripts/render-ia.py`로 실행한다. 이 문서 정리와 이미지 생성은 웹사이트 코드나 배포 설정을 변경하지 않는다.
