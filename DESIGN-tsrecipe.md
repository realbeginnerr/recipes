# tsrecipe — 사진 중심 디자인 가이드 & 통합 토큰

## 목차

- [1장. 디자인의 방향과 원칙](#chapter-1)
- [2장. 레이아웃, 공통구조, 반응형](#chapter-2)
- [3장. 색상과 표면](#chapter-3)
- [4장. 글꼴과 언어](#chapter-4)
- [5장. 컴포넌트, 인터랙션](#chapter-5)
- [6장. 콘텐츠, 페이지 내용 구성](#chapter-6)
- [7장. 디자인 시스템 토큰](#chapter-7)

<!-- 1장. 디자인의 방향과 원칙 -->

<a id="chapter-1"></a>

## 1장. 디자인의 방향과 원칙

### 문서 사용 원칙

이 Markdown 파일 하나가 tsrecipe 디자인의 기준이다. 아래 설명과 문서 내부 YAML 코드 블록을 함께 사용하며, 별도 YAML 파일이나 보조 토큰 파일은 필요하지 않다.

- 설명은 사용 목적과 시각적 우선순위를, 내장 토큰은 정확한 색상·크기·간격을 정의한다. 수치를 변경할 때는 토큰을 수정한다.
- `{colors.primary}` 같은 참조는 이 문서 안에서 해석한다. 토큰 이름이나 참조 문자열을 화면 문구로 출력하지 않는다.
- `extends`는 지정한 스타일을 상속하고 명시한 속성만 덮어쓴다. `-active`, `-disabled`, `-focused` 상태도 기본 컴포넌트의 나머지 속성을 상속한다.
- 컴포넌트 목록은 사용할 수 있는 패턴이다. 모든 컴포넌트를 한 화면에 배치하라는 뜻이 아니다.
- 기존 화면을 수정할 때는 문구, 언어, 레시피, 수치, 이미지, 로고, 링크와 섹션 순서를 유지한다. 콘텐츠 추가·삭제·번역은 별도 요청이 있을 때만 한다.

### 생성형 AI툴에 전달할 디자인 방향

**음식 매거진처럼 큰 음식 사진이 중심이 되는 에디토리얼 레시피 화면을 디자인한다.** 완성된 요리의 질감과 색이 충분히 보이게 하고, 여백과 글자 크기로 정보의 순서를 만든다.

- 히어로와 레시피 카드의 주인공은 실제 음식 사진이다. 사진을 작은 썸네일로 줄여 장식이나 수치 패널의 공간을 확보하지 않는다.
- 관리자 대시보드 형태, 반복적인 KPI 카드, 빽빽한 통계 패널, 코드 에디터 모형, 장식용 차트는 피한다.
- 영양 정보·재료 계산·단위 조절은 레시피를 이해하는 보조 정보다. 기존 데이터는 보존하면서 간결한 목록이나 표로 정리하고 사진보다 시각적 비중을 낮춘다.
- 일러스트와 아이콘은 안내를 돕는 수준으로 사용한다. 음식 사진을 대체하거나 더 강하게 강조하지 않는다.
- 요금제·서비스 연동·개발자용 제품 소개 섹션을 새로 만들지 않는다. 기존 화면에 있는 콘텐츠라면 보존 원칙을 따른다.

<!-- 2장. 레이아웃, 공통구조, 반응형 -->

<a id="chapter-2"></a>

## 2장. 레이아웃, 공통구조, 반응형

기본 레이아웃은 전체 너비다. 네비게이션·페이지 헤더·필터·본문·푸터에는 동일한 좌우 여백(모바일 16px, 태블릿 24px, 데스크톱 32px)을 적용한다. 입력 폼과 긴 글의 읽기 영역처럼 좁은 폭이 필요한 내부 영역만 개별 최대 너비를 지정한다.

컨테이너 너비, 좌우 여백, 분기점, 카드 열 수는 `layout`을 따른다. 섹션 간 여백은 `spacing.section`을 한 번만 적용한다. 인접한 섹션의 아래·위 패딩으로 같은 간격을 두 번 더하지 않는다.

- **헤더:** 밝은 표면에 기존 로고·메뉴·언어 전환·주요 행동을 유지한다. 새 화면일 때만 tsrecipe 워드마크와 레시피·식재료·검색 메뉴를 기본으로 삼는다.
- **히어로:** 데스크톱에서는 제목과 사진을 나란히 둘 수 있다. 모바일에서는 글과 사진을 세로로 배치하고 제목에 `display-xl-mobile`을 적용한다. 사진은 계속 크게 보여준다.
- **CTA와 푸터:** CTA는 기존 화면에 있는 경우에 사용한다. 푸터는 다크 파인 표면과 `on-dark` 계열 텍스트로 마무리한다.
- 모바일은 `mobile-below` 미만, 태블릿은 그 이상부터 `desktop-from` 미만, 데스크톱은 그 이상, 와이드는 `wide-above` 초과다. 와이드에서도 공통 컨테이너는 전체 너비를 사용한다.
- 모바일 헤더는 접이식 메뉴를 사용한다. 모든 컨테이너의 좌우 패딩은 해당 뷰포트의 gutter를 사용한다. CTA·푸터 토큰의 데스크톱 좌우 패딩도 모바일·태블릿에서 같은 규칙으로 교체한다.
- 음식 사진은 비율을 유지하고 구도에 맞춰 자른다. 찌그러뜨리거나 사진 위에 복잡한 데이터 패널을 겹치지 않는다.

<!-- 3장. 색상과 표면 -->

<a id="chapter-3"></a>

## 3장. 색상과 표면

정확한 색상값은 아래 `colors`에서 관리한다.

| 토큰                                                          | 사용 목적                                         |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `primary`, `primary-active`, `primary-disabled`               | 포레스트 그린 브랜드 버튼과 눌림·비활성 상태      |
| `ink`, `body-strong`, `body`, `muted`, `muted-soft`           | 밝은 표면의 제목·본문·보조 정보                   |
| `canvas`, `surface-soft`, `surface-card`, `surface-sage`      | 흰색, 옅은 웜 뉴트럴, 중립 카드, 세이지 회색 표면 |
| `surface-dark`, `surface-dark-elevated`, `surface-dark-soft`  | 다크 파인 푸터와 필요한 영양 정보 영역            |
| `on-primary`, `on-dark`, `on-dark-soft`                       | 브랜드색·어두운 표면 위의 텍스트                  |
| `hairline`, `hairline-soft`                                   | 입력창 테두리와 필요한 구분선                     |
| `accent-green`, `accent-amber`, `success`, `warning`, `error` | 소량의 강조와 의미를 가진 상태 표시               |

브랜드 그린은 주요 행동과 제한된 강조에 사용한다. 섹션 구분은 중립 표면과 여백으로 해결하며 모든 영역을 초록색으로 채우지 않는다. 흰색 배경은 필수가 아니지만, 페이지 전체를 베이지·크림 테마로 바꾸지 않는다. `surface-soft`의 옅은 따뜻한 기운은 보조 영역에 허용한다.

기본 화면은 평면적으로 구성하고 그림자는 추가하지 않는다. 테두리가 필요한 입력창과 구분선에는 `interaction.border-width`와 `hairline`을 사용한다. 어두운 영역의 텍스트는 밝은 표면용 `ink` 대신 `on-dark` 계열을 사용한다.

<!-- 4장. 글꼴과 언어 -->

<a id="chapter-4"></a>

## 4장. 글꼴과 언어

### 최소 글자 크기

- 웹사이트의 텍스트는 모바일·데스크톱 모두 최소 14px로 표시한다. 캡션, 배지, 보조 설명, 표, 숫자, 입력창, 버튼과 오류 메시지에도 동일하게 적용한다.
- `caption`과 `caption-uppercase` 토큰도 14px를 사용한다. 작은 화면에서 공간이 부족하면 줄바꿈·배치·영역 크기를 조정하며 글자를 14px 미만으로 줄이지 않는다.
- 상대 단위와 반응형 크기도 실제 계산된 크기가 14px 이상이어야 한다. 특별한 이유로 예외가 필요하면 해당 사용처와 사유를 이 문서에 명시한다. 현재 승인된 예외는 없다.

**영문과 한글은 서로 독립된 타이포그래피 시스템이다. 한글은 영문 스타일에서 글꼴 이름만 바꾼 버전이 아니다. 언어가 바뀌면 글꼴·크기·굵기·행간·자간을 해당 언어의 토큰 전체로 교체한다.**

### 1. 언어 선택 기준 — 먼저 결정할 것

1. 화면의 표시 언어를 정한다. 한국어 화면은 `ko`, 영어 화면은 `en`이다. 디자인 변경을 이유로 콘텐츠를 번역하지 않는다.
2. 제목·문단·메뉴·버튼 등 **텍스트 요소 단위**로 해당 화면의 언어를 적용한다. 별도로 언어를 지정한 요소만 그 지정 언어를 따른다.
3. `en`이면 `typography`, `ko`이면 `typography-kr`에서 같은 역할의 토큰을 선택한다. 이름이 `typography`라고 해서 공통 토큰으로 해석하지 않는다. `numeric`을 제외하면 영문 전용이다.
4. 컴포넌트의 `typography.en`과 `typography.ko` 중 하나만 선택한다. 두 스타일을 합치거나 한쪽에서 빠진 속성을 다른 언어에서 상속하지 않는다.

| 적용 대상                          | 영어 `en`                                | 한국어 `ko`                              |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------- |
| 큰 제목 `display-*`                | 온글잎 윤탱체, `typography.display-*`    | 온글잎 윤탱체, `typography-kr.display-*` |
| 카드·소제목 `title-*`              | StyreneB → Inter, `typography.title-*`   | Pretendard, `typography-kr.title-*`      |
| 본문·메뉴·버튼·캡션                | StyreneB → Inter, 해당 `typography` 토큰 | Pretendard, 해당 `typography-kr` 토큰    |
| 표·카드의 영양 수치·중량·계산 결과 | Inter, `typography.numeric`              | Inter, `typography.numeric`              |
| 홈 섹션 번호 01–04                 | 온글잎 윤탱체, 72px                      | 온글잎 윤탱체, 72px                      |

### 2. 영어 전용 정책

- **큰 제목 `display-*`은 온글잎 윤탱체 (OwnglyphYuntaeng)를 웹폰트로 사용한다.** 사용자 기기의 폰트 설치 여부에 의존하지 않는다.
- 굵기는 `400`, 합성 굵기는 사용하지 않는다. 크기·행간·자간은 해당 `typography.display-*` 토큰을 따른다.
- 카드·소제목, 본문, 메뉴, 버튼, 캡션은 StyreneB를 사용하고, 없으면 Inter를 로드한다. Pretendard를 영어 UI의 대체 글꼴로 선택하지 않는다.

### 3. 한국어 전용 정책

- **큰 제목 `display-*`은 온글잎 윤탱체, 카드·소제목과 본문·메뉴·버튼·캡션은 Pretendard를 사용한다.** 모두 웹폰트로 실제 로드한다.
- 모든 속성은 해당 `typography-kr` 토큰을 따른다. 행간은 `1.5`, 자간은 `-0.04em`이다.
- 큰 제목 `display-*`의 굵기는 `400`, 카드·소제목 `title-*`은 `500`, 본문 `body-*`는 `400`, 메뉴·버튼·캡션은 `500`이다.
- 영문 제목의 좁은 행간과 px 자간을 한글에 적용하지 않는다.
- 큰 제목의 글꼴은 영문·한글 공통이지만 한국어 요소에는 한국어 크기·행간·자간을 명시한다.

### 4. 혼합 문장과 숫자

- 한 문장 안에 영문 약어·단위·숫자가 섞여 있어도 **문장 전체는 해당 텍스트 요소의 언어 정책**을 따른다. 글자마다 자동으로 영문·한글 스타일을 번갈아 적용하지 않는다.
- 예: 한국어 큰 제목 `AI로 만드는 레시피 3개`는 `AI`와 `3`까지 온글잎 윤탱체다. 영어 큰 제목 `Recipes for 3`도 전체가 온글잎 윤탱체이며 영문 `display-*` 정책을 따른다.
- 한 화면에서 한국어 제목과 독립된 영어 부제목을 함께 사용할 때는 각 요소에 `ko`, `en`을 명시하고 각자의 토큰을 적용한다. HTML에서는 요소의 `lang` 또는 이에 대응하는 명시적 언어 클래스로 구분한다.
- **표와 카드의 영양 수치·열량·중량·계산 결과, 수량 입력에는 공통 숫자 글꼴 Inter를 사용한다.** `typography.numeric`의 글꼴을 적용하고, 역할별 크기와 행간은 해당 컴포넌트 스타일을 따른다. 숫자 정렬이 필요한 영역에는 `font-variant-numeric: tabular-nums`를 명시해 숫자 폭을 일정하게 유지한다. 제목·본문 속 숫자, 메뉴, 표의 식재료 이름에는 적용하지 않는다. 홈 섹션 번호 01–04는 디스플레이 글꼴인 온글잎 윤탱체를 사용하며 크기는 72px로 유지한다.

### 5. 적용 예시와 확인 기준

| 예시                             | 적용 결과                                                 |
| -------------------------------- | --------------------------------------------------------- |
| 영어 큰 제목, `display-lg`       | 온글잎 윤탱체 / 48px / 굵기 400 / 행간 1.1 / 자간 -1px    |
| 한국어 큰 제목, `display-lg`     | 온글잎 윤탱체 / 48px / 굵기 400 / 행간 1.5 / 자간 -0.04em |
| 영어 본문, `body-md`, Inter 사용 | 16px / 굵기 400 / 행간 1.55 / 자간 0                      |
| 한국어 본문, `body-md`           | Pretendard / 16px / 굵기 400 / 행간 1.5 / 자간 -0.04em    |

- 언어 전환 시 글꼴 이름만 바꾸지 않았는지 확인한다. 행간·자간·굵기도 해당 언어의 값으로 바뀌어야 한다.
- 영문·한글 큰 제목에 온글잎 윤탱체가 로드되는지 확인한다. 굵기는 `400`이며 합성 굵기를 사용하지 않는다.
- 강조는 과도한 굵기보다 크기와 여백으로 만든다. 아래 YAML의 정확한 수치를 따른다.

### 6. 보이스 톤

- Voice, Tone 및 문장 작성에 관한 기본 정책은 **Carbon Design System의 Content Guidelines를 따른다.**
- Carbon에 명시되어 있지 않은 한국어 문체에 대해서는 아래 정책을 따른다.
- 화면 문구의 말투와 종결형은 이 절에서 관리한다.

#### 문체

- 사용자에게 문장으로 정보를 전달하는 UI Copy는 기본적으로 **해요체**를 사용한다.
- 정책, 약관, 법적 고지 등 공식적인 문체가 필요한 콘텐츠에서는 **합니다체**를 사용할 수 있다.
- 동일한 문맥 안에서는 해요체와 합니다체를 혼용하지 않는다.
- Button, Tab, Menu, Filter, Input Label 등 짧은 UI Label에는 해요체나 합니다체를 사용하지 않고 행동이나 대상을 간결하게 표현한다.

### 7. 온점

- Punctuation에 관한 기본 정책은 **Carbon Design System의 Content Guidelines를 따른다.**
- Carbon에 명시되어 있지 않은 경우 아래 정책을 따른다.

#### Table

- 단어, 숫자, 짧은 구(Phrase)에는 온점을 사용하지 않는다.
- 완전한 문장에는 온점을 사용한다.
- 동일한 Column에서는 가능한 한 동일한 문장 구조와 온점 사용 방식을 유지한다.

#### Bulleted List

- 단어 또는 짧은 구로 구성된 항목에는 온점을 사용하지 않는다.
- 완전한 문장으로 구성된 항목에는 온점을 사용한다.
- 하나의 목록 안에서는 온점 사용 방식을 통일한다.
- 완전한 문장과 짧은 구는 가능한 한 하나의 목록 안에서 혼용하지 않는다.

<!-- 5장. 컴포넌트, 인터랙션 -->

<a id="chapter-5"></a>

## 5장. 컴포넌트, 인터랙션

- 버튼·입력창은 `box-sizing: border-box`로 외곽 높이를 계산한다. 세로 패딩 없이 내용을 가운데 정렬하고, 테두리를 포함해 토큰 높이를 맞춘다. 버튼 문구가 여러 줄이어야 하면 잘라내지 말고 높이가 늘어나도록 허용한다.
- 기본·눌림·비활성·포커스 상태를 지원한다. 호버에서는 색상·크기·그림자를 추가로 바꾸지 않는다.
- 키보드 포커스에는 `interaction.focus-ring`을 표시한다. 입력창 포커스는 같은 두께의 테두리 색만 `focus-border`로 변경해 레이아웃 이동을 피한다.
- 초록색 CTA 영역에는 흰색 `button-secondary`, 다크 파인 영역에는 `button-secondary-on-dark`를 사용한다.
- 링크는 기본 상태에서 밑줄로 구분한다. 비활성 컨트롤은 실제 동작도 비활성화한다.
- 버튼·입력창·탭, 콘텐츠 카드, 히어로 사진, 배지는 각각 지정된 모서리 토큰을 따른다. 필터 탭을 임의로 알약 모양으로 바꾸지 않는다.
- 새로운 오류·성공 메시지의 내용이나 애니메이션은 이 문서에서 정하지 않는다.

### 카드 구성

- 식재료 카드 목록은 모바일(768px 미만)에서 2열로 표시하며 카드 사이 간격은 12px로 한다. 리스트 모드의 Table에는 적용하지 않는다.
- **레시피 카드:** 큰 음식 사진, 기존 레시피 제목·설명·필요한 메타데이터를 담는다. 사진 아래 본문 영역에 카드 패딩을 적용한다. 모든 섹션을 같은 카드 격자로 만들지 않는다.
- 레시피 목록의 모바일 화면(768px 미만)은 2열로 표시한다. 모바일 목록 카드에서는 탄단지의 구체적인 g 수치 영역을 숨기고, 한 끼 칼로리와 탄단지 비율은 각각 한 줄씩 위아래로 표시한다. 제목·사진·분류·평점은 유지한다. 이 간소화는 목록 화면에만 적용하며 룰렛·상세 화면에는 적용하지 않는다.

### 레시피 랜덤 룰렛

- 진입점은 네비게이션의 레시피 페이지 필터칩 맨 앞에 있는 `랜덤` 버튼이다. 기존 filter/compact 버튼 모양의 링크로 `/recipe-roulette`에 이동한다.
- `/recipe-roulette`에서 기존 `RecipeCard`와 `Button`을 재사용한다. 기존 목록과 같은 정적 레시피·Firestore 병합 소스를 매 돌리기 전에 읽으며 삭제 상태와 공개 범위를 그대로 따른다.
- 카드 띠 전체를 가로로 이동하고 4.2초 동안 감속해 중앙에 정렬한다. 좌우에 이전·다음 카드가 보이며 가장자리에 fade나 그라디언트를 표시하지 않는다. 최근 선택 5개를 제외하되 레시피가 적으면 오래된 제외 항목부터 완화한다. 단일 레시피도 안전하게 처리한다.
- 회전 중 버튼과 카드 접근은 비활성화한다. 결과 카드는 기존 상세 경로를 새 탭에서 연다. `prefers-reduced-motion`에서는 회전 없이 결과를 표시한다.
- 카드의 기존 콘텐츠·색상·타이포그래피·모서리를 유지하며 선택 영역만 브랜드색 테두리로 표시한다. 기존 gutter를 사용하고 좁은 화면에서 카드 너비를 가용 영역에 맞춘다.
- 룰렛 카드 띠의 표시 영역은 최대 너비 제한 없이 화면 좌우 끝까지 채운다. 제목과 버튼은 기존 gutter를 유지한다.
- 정지 상태의 카드 수는 화면 너비에 맞춰 늘린다. 중앙 선택 카드 양쪽에 충분한 카드를 배치해 PC의 넓은 화면도 채우며, 레시피 수가 부족하면 반복해서 표시한다.

### 공용 입력 컴포넌트 사용

#### 목록 공통 요소 (1단계)

- 레시피·식재료 목록은 `src/components/CatalogControls.tsx`의 `PageIntro`, `CatalogToolbar`, `CategoryFilter`, `SearchField`, `SortSelect`를 사용한다.
- 제목·설명·추가 버튼은 `PageIntro`, 필터 줄의 배치는 `CatalogToolbar`에서 관리한다. 해당 요소의 반응형 스타일은 `CatalogControls.css`에서 관리한다.
- 분류·정렬 항목은 `{ value, label }` 배열로 전달한다. 검색·필터·정렬 상태와 데이터 처리는 각 페이지에 둔다. 레시피 검색은 기존 URL의 `q` 값을 사용한다.
- 이 컴포넌트들은 기존 `Button`, `Input`, `Select`를 사용한다.

### 목록 탐색: 더 보기(Load More)

#### 1. 개요

- 목록의 일부를 먼저 보여주고, 사용자가 **더 보기** 버튼을 눌러 다음 데이터 묶음을 추가로 불러오는 점진적 로딩 방식이다.
- 서버에서 데이터를 실제 페이지 단위로 요청해 초기 응답량과 렌더링 부하를 줄이고, 첫 화면 표시를 빠르게 해야 할 때 사용한다. 이미 모든 데이터를 받아둔 뒤 화면에만 나누어 표시하는 경우에는 데이터베이스 요청 부하가 줄어들지 않는다.
- 연속해서 자동 로드하는 무한 스크롤 대신 사용자가 로딩 시점을 제어할 수 있고, 푸터에 도달하기 어려워지는 문제를 완화한다.

#### 2. 기본 수량 정책

- 그리드에서는 픽셀 크기가 아니라 **현재 반응형 열(Column) 수 × 기본 3행**을 기준으로 초기 노출량과 추가 로딩량을 정한다.
- 기본은 첫 화면에 3행을 보여주고, 더 보기 버튼을 누를 때마다 같은 3행 분량을 추가한다.
- 예시: 4열 PC는 처음 12개, 클릭마다 12개 추가; 3열 태블릿·소형 PC는 처음 9개, 클릭마다 9개 추가; 2열 모바일은 처음 6개, 클릭마다 6개 추가.
- 실제 페이지의 열 수가 예시와 다르면 해당 화면의 반응형 그리드 설정을 기준으로 다시 계산한다. 화면 크기가 바뀌어도 카드 크기나 열 배치가 흔들리지 않도록 하고, 마지막 행에 가짜 콘텐츠를 채우지 않는다.

#### 3. 단점과 위험

- **푸터 접근성:** 무한 스크롤은 고객센터·약관·저작권 등 페이지 하단 정보에 도달하기 어렵게 한다. 더 보기 버튼은 사용자가 로드를 멈출 수 있어 이 문제를 완화한다.
- **탐색 위치와 맥락:** 사용자가 현재 위치를 기억하기 어렵거나, 새 항목 추가 중 기존 스크롤 위치가 튀면 탐색을 방해한다. 추가 로딩은 기존 콘텐츠의 위치를 유지한다.
- **반복 클릭 피로:** 초기 노출량이 지나치게 적으면 원하는 항목을 찾기 위해 버튼을 반복해서 눌러야 한다. 기본 노출은 실제 열 수 기준 3행을 제공하고, 전체 항목 수와 남은 항목 수를 고려한다.

#### 4. 구현 시 고려사항

- **이미지:** 사진 그리드는 이미지 지연 로딩과 적절한 포맷·해상도 압축을 함께 적용한다. 초기 화면의 주요 이미지가 지연되어 빈칸으로 보이지 않도록 우선순위를 구분한다.
- **반응형 정렬:** 화면 크기에 따라 열 수가 바뀔 때 추가 로딩 단위와 마지막 행을 확인한다. 현재 열 수에 맞는 배수를 사용하고, 빈 슬롯을 가짜 카드로 채우지 않는다.
- **로딩 상태와 끝 상태:** 요청 중에는 중복 클릭을 막고 진행 상태를 표시한다. 더 불러올 데이터가 없으면 버튼을 숨기거나 종료 상태로 바꾼다.
- **패턴 선택:** 콘텐츠 탐색형 피드에는 더 보기나 무한 스크롤을 고려할 수 있다. 정확한 위치 이동과 비교·관리가 중요한 엔터프라이즈 화면이나 데이터 테이블은 [Carbon의 컴포넌트 가이드](https://carbondesignsystem.com/) 등을 참고해 페이지네이션처럼 명시적으로 제어할 수 있는 방식을 우선 검토한다.

#### 카드 공통 요소 (2단계)

- `IngredientCard`는 식재료 사진, 이름, 열량, 영양 막대, 계산 기준과 관련 레시피를 표시한다. 목록의 데이터 로딩·필터·정렬은 `IngredientsPage`에 둔다.
- `FoodImage`는 레시피 카드·식재료 카드·관련 레시피의 사진을 표시한다. 지연 로딩과 오류 시 대체 이미지를 공통 처리한다. 레시피 카드의 사진 미등록 아이콘은 `empty`로 전달한다.
- `MacroDisplay.tsx`의 `MacroSummary`는 레시피의 탄단지 요약, `MacroBars`는 식재료의 영양 막대를 담당한다. 기존 계산값·기준값과 표시 방식을 유지한다.
- `RelatedRecipes`는 관련 레시피, 결과 없음 문구, 추가 검색 링크를 표시한다. 공개 가능한 레시피 선별은 목록 페이지에서 처리한다.
- 카드·영양 표시·관련 레시피 스타일은 각 컴포넌트와 같은 이름의 CSS에서 관리한다. 카드 격자의 반응형 열 수는 페이지 CSS에서 관리한다.

#### 상세·상태 공통 요소 (3단계)

- `NutritionTable`은 전체 재료·한 끼 표의 열 제목, 합계, 선택적인 칼로리 행을 표시한다. `MacroCells`는 탄단지 셀과 0값 표시를 공통 처리한다. `labelledBy`에 섹션 제목 ID를 전달한다.
- `QuantityUnitCells`는 표의 수량·단위 셀을 구성하며 기존 `Input`, `UnitSelect`를 사용한다. 입력 변경은 콜백으로 전달하고, 단위 환산·등분·영양 계산과 상태 관리는 상세 페이지에서 처리한다.
- `ContentState`는 빈 결과·오류 안내에 사용한다. 목록은 `catalog`, 상세는 `detail`, 기존 데이터를 보여주면서 알리는 오류는 `inline` 형태를 사용한다. 재시도·초기화·이동 요소는 자식으로 전달한다.
- `LoadingState`는 상세의 로딩 문구와 레시피 목록의 스켈레톤을 제공한다. 관련 스타일은 `ContentState.css`, 영양 표 스타일은 `NutritionTable.css`에서 관리한다.

### 에러 처리

- 에러 처리, Form Validation, Error Message, Notification에 관한 기본 정책은 **Carbon Design System의 관련 정책을 따른다.**
- Carbon에 명시되어 있지 않은 경우 아래 정책을 따른다.
- 에러 발생 시 가능한 한 사용자가 현재 작업을 유지한 상태에서 문제를 해결하거나 다시 시도할 수 있도록 한다.

#### 에러 표시 방식

에러가 발생한 위치와 해결 방법에 따라 적절한 UI를 사용한다.

| 상황 | 표시 방식 | 기준 |
| --- | --- | --- |
| 특정 Input의 입력값 오류 | 해당 Field의 Error State | 문제가 발생한 Input에서 직접 표시 |
| 저장, 수정 등 사용자가 실행한 Action 실패 | Notification | 실패 사실과 다시 시도할 수 있는 방법 제공 |
| 페이지 또는 주요 데이터 로딩 실패 | 해당 콘텐츠 영역의 Error State | 문제가 발생한 영역에서 다시 시도할 수 있도록 제공 |
| 일부 콘텐츠만 로딩 실패 | 해당 콘텐츠 영역의 Error State | 정상적으로 불러온 다른 콘텐츠는 그대로 유지 |
| 일시적인 Network 또는 Server Error | Notification 또는 해당 콘텐츠 영역의 Error State | 현재 작업 맥락에 적합한 방식을 선택 |

#### 서비스별 에러 케이스

다음과 같은 에러 상황을 고려한다.

- 레시피 저장 또는 수정 실패
- 레시피 삭제 실패
- 레시피 목록 또는 상세 정보 로딩 실패
- 이미지 업로드 또는 이미지 로딩 실패
- 영양 정보 계산에 필요한 데이터가 없거나 계산할 수 없는 경우
- Network 연결 문제
- Server 또는 Database 요청 실패
- 랜덤 룰렛을 실행할 수 있는 레시피가 없는 경우

새로운 기능을 추가할 때도 해당 기능에서 발생할 수 있는 **실패, 데이터 없음, 요청 실패 등의 상태를 함께 정의한다.**

#### 작업 상태 유지

- 에러가 발생했다는 이유만으로 사용자가 입력하거나 수정한 데이터를 초기화하지 않는다.
- 다시 시도할 수 있는 에러라면 가능한 한 사용자가 처음부터 작업을 반복하지 않고 해당 Action만 다시 실행할 수 있도록 한다.
- 일부 데이터만 불러오지 못한 경우 정상적으로 불러온 다른 콘텐츠까지 제거하지 않는다.

#### Retry

사용자가 다시 시도하여 해결할 수 있는 에러에는 필요한 경우 `다시 시도` Action을 제공한다.

`다시 시도`는 전체 페이지를 새로고침하는 것보다 **실패한 요청 또는 영역만 다시 실행하는 것을 우선한다.**

#### Empty State와 Error State 구분

**정상적으로 데이터가 없는 상태와 데이터를 불러오지 못한 상태를 동일하게 표시하지 않는다.**

```text
Empty State
저장된 레시피가 없어요.

Error State
레시피를 불러오지 못했어요.
[다시 시도]
```

데이터 요청이 정상적으로 완료되었지만 결과가 없는 경우에는 Empty State를 사용한다.

Network, Server, Database 등의 문제로 데이터를 확인할 수 없는 경우에는 Error State를 사용한다.

### Data Table

#### General

- Table UI의 구성과 기본 사용 원칙은 Carbon Design System의 Data Table 정책을 따른다.
- Column 너비는 Carbon의 기본 정책보다 아래 `Column Width` 커스텀 정책을 우선 적용한다. 정렬·줄바꿈·숫자 표기는 기존 `Alignment` 및 `Text & Number` 정책을 따른다.

#### Default UI

- 레시피 상세 Table의 외형을 웹사이트 전체 Table의 기본 UI로 사용한다. 공통 스타일과 CSS 변수는 `src/components/ui/table.css`에서 관리하고, 공통 `Table`과 `NutritionTable`이 함께 사용한다.
- 제목행은 `surface-soft` 배경, 본문색 `body`, 14px·굵기 500을 사용한다. 본문행은 `canvas` 배경이며 짝수행은 `table-row-alternate` 배경으로 구분한다.
- 기본 행 높이는 56px이며 내용이 많으면 늘어난다. 셀 패딩은 상하 10px·좌우 14px이다. 외곽 테두리, 제목행 아래 구분선과 합계행 위 구분선은 `hairline-soft` 1px를 사용한다.
- 합계행은 `surface-soft` 배경, `ink` 색상, 15px·굵기 700으로 제목과 수치를 통일한다. 공통 `TableRow`의 `tone="total"` 또는 `table-row--total` 역할 클래스로 적용한다.
- 열 너비는 `Column Width` 정책을 따른다. 주식행·칼로리행 등 별도 의미를 가진 행은 해당 화면의 예외로 관리하며 공통 기본 스타일을 복제하지 않는다.

#### Column Width

- Table은 배치된 콘텐츠 영역의 사용 가능한 전체 너비를 채운다. Column은 기본적으로 Table 안에서 **Fill**로 설정한다.
- 별도의 너비가 지정되지 않은 Column들은 사용 가능한 공간을 균등하게 나누어 가진다.
- 재료명 Column은 예외로 **Hug**를 적용해 줄바꿈 없이 내용에 맞는 너비를 사용하며, 아래 최소·최대 너비 범위 안에서 조정한다. 나머지 Column은 아래 Fill 및 커스텀 너비 규칙을 따른다.
  - **최소 너비:** Table 전체 너비의 `100% ÷ 전체 Column 수`. 예를 들어 6열인 레시피 상세 Table에서는 `100% ÷ 6 ≈ 16.67%`보다 좁아지지 않는다.
  - **최대 너비:** Table 전체 너비의 **40%**.
  - **레시피 상세 Table 예외:** 식재료명 Column의 기본 너비는 Hug 대신 Table 전체 너비의 **30%**로 설정한다. 최소 너비 `100% ÷ 전체 Column 수`와 최대 너비 **40%** 제한은 그대로 적용한다. 다른 Table은 기존 Hug 기준을 유지한다.
  - 내용에 필요한 너비가 최소값보다 작으면 최소값을, 최대값보다 크면 최대값을 적용한다. 최대 너비보다 긴 내용은 줄바꿈하지 않고 셀 내부에서 가로로 확인할 수 있도록 한다.
  - 이 기준은 모든 재료명 Column에 공통 적용한다. Column 수는 헤더의 논리적 열 수를 기준으로 계산하며, 작업 버튼 등 별도의 열도 포함한다. 합계 행의 병합 셀은 열 수를 바꾸지 않는다.
- 특정 Column에 커스텀 너비가 지정된 경우, 해당 Column은 지정된 너비를 우선 적용한다.
- 커스텀 너비가 지정되지 않은 나머지 Column들은 지정된 Column의 너비를 제외한 남은 공간을 균등하게 나누어 채운다.
- 지정된 너비 등으로 Table이 콘텐츠 영역을 넘치는 경우에는 기존 정책에 따라 Table 내부의 가로 스크롤을 허용하며, 페이지 전체가 가로로 넘치지 않도록 한다.

<!-- 위 Column 너비 및 아래 정렬·줄바꿈·숫자 표기 규칙은 Carbon Design System에 명시된 내용이 아니라 tsrecipe의 자체 규칙이다. -->

#### Alignment

| Data type | Alignment |
|---|---|
| Column header | Left |
| Text | Left |
| Name / Status / Category | Left |
| Number | Left |
| Icon / Checkbox / Controls | Center |

#### Text & Number

- 텍스트와 숫자는 기본적으로 좌측 정렬한다.
- 셀 너비를 초과할 정도로 내용이 긴 경우, 말줄임표(`…`)를 사용하지 않고 줄바꿈하여 전체 내용을 표시한다.
- 말줄임표(`…`)가 필요한 경우에는 해당 상황에 따라 별도로 지정한다.
- 우측 정렬이 필요한 경우에는 해당 상황에 따라 별도로 지정한다.
- 숫자는 가독성을 위해 천 단위마다 쉼표(`,`)를 표시한다.
  - Example: `1,000`, `10,000`, `1,500,000`

#### 헤더·홈 구조 (4단계)

- `SiteHeader`는 브랜드, 주 메뉴, 현재 메뉴 표시, About Me 버튼과 모바일 메뉴를 관리한다. 모바일 메뉴는 경로 이동 시 닫히고 Escape 키로 닫으면 메뉴 버튼에 포커스를 돌려준다. About Me는 https://linktr.ee/growyourbusinesstogether 를 새 탭에서 연다.
- `Layout`은 컨텍스트 공급자, 페이지 폭, 경로 이동 시 스크롤 초기화, 헤더·본문·푸터 배치를 담당한다. 헤더 스타일은 `SiteHeader.css`, 전체 배치와 공통 컨테이너는 `SiteLayout.css`에서 관리한다.
- `StorySection`은 홈의 번호·제목·본문 영역을 구성하며 밝은 배경과 상단 배너 사진을 지원한다. `StorySplit`은 사진과 본문을 나란히 표시하며 사진 위치와 배경을 지정한다.
- 홈의 문구·사진·순서는 `AboutPage`와 `i18n/about.ts`에서 전달한다. 반복 섹션 스타일은 `StorySection.css`, 히어로와 홈 전체 글꼴은 `AboutPage.css`에서 관리한다. 섹션 제목 ID와 스크롤 목적지는 유지한다.

#### 기본 컨트롤 적용 규칙

- 공개 화면의 버튼은 `components/ui/button.tsx`, 입력은 `ui/input.tsx`, 선택창은 `ui/select.tsx`를 사용한다. 메모는 `ui/textarea.tsx`를 사용한다.
- 단위 선택은 `components/UnitSelect.tsx`를 사용하고, 재료마다 허용된 단위를 `options`로 전달한다. 접근성 이름은 `aria-label`로 전달한다.
- 목록의 작은 컨트롤은 Button/SelectTrigger의 `size="compact"`, Input의 `density="compact"`를 사용한다. 상세 표는 `size="quantity"` / `density="quantity"`를 사용한다.
- 헤더 버튼은 `size="header"`, 메뉴 토글은 `size="menu"`다. 공통 크기 스타일은 `src/index.css`의 Shared density variants 영역에서 관리한다. 기존 화면의 기본 크기는 유지한다.
- 버튼 모양으로 페이지를 이동하는 요소는 `Button`의 `render={<Link ... />}`와 `nativeButton={false}`를 사용해 링크의 동작을 유지한다.
- 필터칩 모양의 이동 링크는 다른 필터 버튼과 동일하게 밑줄 없이 표시한다. 일반 텍스트 링크의 밑줄 규칙은 적용하지 않는다.
- 선택창에는 `items`를 전달해 열기 전부터 선택값의 표시 이름이 나오게 한다. 선택값의 변경은 `onValueChange`로 처리한다.

### Filter Chip

Filter Chip은 Carbon의 `Tag`와 거의 비슷한 UI 요소이다.
따라서 기본적인 작동 방식과 UX 원칙은 Carbon `Tag`를 따른다.
단, 서비스의 사용 맥락에 따라 일부 인터랙션과 시각 표현은 조정하여 사용할 수 있다.

#### Overflow

- 필터 칩이 표시 영역의 너비를 넘으면 줄바꿈하지 않고 한 줄의 가로 overflow 영역으로 유지한다. 아래 정책은 모바일·데스크톱에 공통 적용한다.
- **기본 탐색 UI는 가로 스크롤바가 아니라 좌우 탐색 버튼이다.** 브라우저의 가로 스크롤바는 숨기고, 버튼을 누르면 칩 영역이 해당 방향으로 이동하도록 한다. 내부 가로 스크롤 기능 자체를 제거하거나 칩을 잘라서 접근할 수 없게 만들지 않는다.
- 모바일 및 터치 환경에서는 버튼과 함께 스와이프 또는 드래그를 통한 좌우 이동도 지원한다.
- **오른쪽에 화면 밖으로 숨겨진 칩이 있으면 칩 표시 영역의 오른쪽 가장자리에 fade를 적용한다.** 오른쪽 끝에 도달하면 fade를 제거한다. 왼쪽 fade는 기본으로 적용하지 않는다.
- 좌우 탐색 버튼은 숨겨진 필터 칩이 있는 방향에만 표시한다. 시작 위치에서는 오른쪽 버튼만, 양쪽에 숨겨진 칩이 있는 중간 위치에서는 양쪽 버튼을, 끝 위치에서는 왼쪽 버튼만 표시한다.
- 시작 위치의 첫 칩은 필터 영역 왼쪽에 붙이며, 왼쪽 버튼을 위한 빈 공간을 미리 확보하지 않는다. 이동 후 나타나는 왼쪽 버튼은 칩 영역 위에 겹쳐 표시한다. 버튼 표시 여부가 바뀌어도 칩 표시 영역의 너비와 배치를 변경하지 않는다.
- 모든 칩이 표시 영역 안에 들어오는 경우에는 탐색 버튼과 fade를 표시하지 않는다. 화면 크기, 칩 목록 또는 스크롤 위치가 바뀌면 표시 조건을 다시 계산한다.
- 필터 칩 텍스트는 임의로 줄이거나 말줄임 처리하지 않고, 각 칩의 레이블이 읽히는 너비를 유지한다.
- 선택된 필터 칩은 스크롤 영역 안에서도 명확한 selected 상태를 유지한다.

#### Reference

- Filter Chip은 시각적으로 Carbon `Tag`와 가장 유사하다.
- 필터링 목적은 Carbon `Filtering pattern`을 참고한다.
- 가로 overflow 동작은 Carbon `Tabs`의 responsive behavior를 참고한다.

### Input, Select & Dropdown

#### Text & Number

- Input, Select, Dropdown의 텍스트 및 숫자 표시는 `Data Table > Text & Number` 정책을 동일하게 적용한다.
- 한 줄 Input은 말줄임표로 자르지 않고 입력창 내부에서 긴 값을 가로로 확인할 수 있게 한다. Select·Dropdown의 선택값과 항목은 줄바꿈하여 전체 내용을 표시한다.
- 숫자 입력 필드는 브라우저의 `type="number"` 동작을 유지하므로 값에 천 단위 쉼표를 넣지 않고 좌측 정렬한다. 읽기 전용 숫자 텍스트에는 천 단위 쉼표를 적용한다.
- 별도의 정책이 명시된 경우에만 해당 컴포넌트의 정책을 우선 적용한다.

### Select, Dropdown & Menu

#### General

- Select, Dropdown, Menu의 정의와 기본 사용 원칙은 Carbon Design System의 정책을 따른다.
- Dropdown과 Menu는 시각적으로 유사할 수 있으나 목적과 사용 방식이 다른 컴포넌트이므로, 화면 디자인 시 사용 맥락에 적합한 요소를 선택한다.
- 본 웹사이트에서는 값 선택이 필요한 경우 일반적으로 Select를 우선 사용한다.

#### Width

- Select, Dropdown, Menu의 너비는 기본적으로 Carbon Design System의 정책을 따른다.
- 단, Dropdown 및 Menu가 열렸을 때 표시되는 영역의 **기본 너비(default width)**는 Carbon의 너비 정책보다 아래의 커스텀 정책을 우선 적용한다.
- 열린 Dropdown 및 Menu의 기본 너비는 해당 요소를 열리게 한 **trigger 요소와 동일한 너비**로 설정한다.

#### Position

- Dropdown 및 Menu가 열리는 위치와 방향은 기본적으로 Carbon Design System의 정책을 따른다.

### Content Switcher

- Content Switcher의 기본 구조, 동작 방식, 상태(State), 인터랙션 및 접근성은 Carbon Design System의 `Content Switcher` 정책을 따른다.
- 단, 시각적 스타일은 Carbon의 기본 스타일을 그대로 사용하지 않고 현재 웹사이트의 디자인 시스템을 우선 적용한다.
- 컬러, 타이포그래피, 폰트 크기 및 굵기, 패딩, 간격, 높이, Border, Border Radius 등의 스타일은 웹사이트 전반에서 사용되는 기존 UI 스타일 및 디자인 토큰과 일관되게 적용한다.
- Hover, Selected, Focus, Disabled 등의 상태별 스타일 역시 웹사이트의 기존 컴포넌트 스타일 및 디자인 토큰을 기준으로 적용한다.
- Carbon Design System은 Content Switcher의 구조와 사용 원칙에 대한 기준으로 사용하며, 시각적 스타일에 대해서는 현재 웹사이트의 디자인 시스템을 우선한다.

<!-- 6장. 콘텐츠, 페이지 내용 구성 -->

<a id="chapter-6"></a>

## 6장. 콘텐츠, 페이지 내용 구성

### 식재료·레시피와 영양 정보

- **영양 정보:** 필요할 때만 `nutrition-panel`을 사용한다. 데이터가 많으면 표 내부 가로 스크롤을 허용하며 페이지 전체를 가로로 넘치게 만들지 않는다.
- 식재료·레시피의 영양 정보는 기존 계산값·기준값과 표시 방식을 유지한다. 영양 요약과 표의 공용 컴포넌트 사용법은 [5장](#chapter-5)을 따른다.

### 2026-09-26 공개 사이트 반영 기준

최신 화면 기준은 https://ethics-code-82488462.figma.site/ 이며, 아래 구성은 이전의 일반 가이드보다 우선한다.

- 공통 헤더는 높이 64px, 전체 너비이며 공통 gutter를 적용한다. `T's Recipe / 홈 / 레시피 / 식재료`와 오른쪽 `About Me`로 구성한다. 선택 메뉴는 초록 밑줄로 표시한다. 768px 미만은 접이식 메뉴를 사용한다. 검색은 목록의 필터 줄에 배치한다.
- 홈은 전체 화면 사진의 히어로, 이야기 소개, 번호 01–04 섹션으로 구성한다. 첫 섹션 캡션은 `T's Recipe`, 두 번째 섹션 캡션은 `나를 아낀다는 것`이다. 영문은 각각 `T's Recipe`, `What it means to care for myself`이며 `src/i18n/about.ts`에서 관리한다. 제목은 온글잎 윤탱체 400, 히어로 26–52px, 나머지 섹션 제목은 40px다.
- 레시피 목록은 소개 영역, 분류·검색·정렬 줄, 모바일 2열·태블릿 2열·데스크톱 3열 카드 순서다. 식재료는 같은 소개·도구 구조에 2/3/4/5열 사진 카드를 사용한다. 레시피는 1440px 이상에서 카드 최소 너비 300px, 식재료는 1600px 이상에서 최소 너비 240px 기준으로 열 수를 자동으로 늘린다.
- 상세는 목록 돌아가기, 제목·원본 링크, 전체 재료 표, 등분 수·주식을 포함하는 한 끼 표, 메모 순서다. 큰 음식 사진과 기존 평점 영역은 상세의 기본 화면에 표시하지 않는다.
- 공통 푸터에는 `© 2026 T's Recipe. All rights reserved.` 문구만 표시하고 가로 중앙 정렬한다. 로고·브랜드 소개·메뉴·소셜은 표시하지 않는다.
- About Me CTA는 https://linktr.ee/growyourbusinesstogether 를 새 탭에서 연다. 소셜 링크는 추후 제공된다.
- 기존 저장 데이터와 관리자 편집 기능은 유지하며, 공개 화면은 위 구조로 표시한다. 사진이 없는 실제 식재료는 공통 대체 이미지를 사용한다.
- 식재료 추가와 레시피 추가 화면은 페이지 맨 위에 기존 수정 화면과 동일한 ghost/sm 뒤로가기 버튼을 표시한다. 각 목록으로 돌아간다. 레시피 추가·수정 및 식재료 추가·수정은 관리자 Google 로그인 팝업을 통과해야 접근할 수 있다. 로그인은 Firebase 브라우저 세션으로 유지하며, 경로 이동 및 새로고침 시 유지되고 탭·창 종료 시 끝난다. 브라우저 세션 복원 기능에 따라 재시작 시 복원될 수 있으며 웹에서 컴퓨터 재시작 자체를 감지하지는 못한다.
- 재료 문서의 `imageUrl` 필드에 이미지 URL 또는 `/recipes/images/...` 경로를 저장한다. Firestore에서 직접 수정한 값은 사이트를 새로고침하면 반영된다. 빈 문자열은 사진 미등록을 뜻하며, 새 재료에도 이 필드를 생성한다.
- 식재료 수정의 단위 환산은 각진 테이블로 표시하며, 너비가 넘치면 가로 스크롤바를 표시한다. 열은 `g / T / t / 컵 / 개 / 캔 / 팩`이고 각 셀은 동일한 양의 수량이다. `g=100, 컵=1`은 1컵이 100g이라는 의미다. 저장 시 `conversionGrams`에 g 값을, 기존 `gramsPer*` 필드에는 g 값을 해당 단위 수량으로 나눈 값을 저장한다.

<!-- 7장. 디자인 시스템 토큰 -->

<a id="chapter-7"></a>

## 7장. 디자인 시스템 토큰

다음 YAML은 **이 MD 안에 포함된 데이터**이며 별도 파일로 분리하지 않는다. 색상과 수치의 기준은 이 블록이다. 레시피와 무관한 과거 컴포넌트는 제거했고, 사진·그린 색상과 어긋났던 이름은 의미에 맞게 정리했다.

```yaml
version: 1
name: tsrecipe-design-analysis
description: Photo-first editorial recipe design for tsrecipe. Food photography leads; nutrition and controls support it. All usage rules and tokens are maintained in this Markdown file.

colors:
  primary: "#255A46"
  primary-active: "#1E4A39"
  primary-disabled: "#CBD4D2"
  ink: "#122B22"
  body: "#596B64"
  body-strong: "#364B43"
  muted: "#899591"
  muted-soft: "#ACB5B2"
  hairline: "#CBD4D2"
  hairline-soft: "#E5EAE9"
  canvas: "#FFFFFF"
  surface-soft: "#F6F5F1"
  surface-card: "#E9EBE8"
  table-row-alternate: "#FAFAF8"
  surface-sage: "#DEE3E1"
  surface-dark: "#0D1F19"
  surface-dark-elevated: "#132D23"
  surface-dark-soft: "#10261D"
  on-primary: "#FFFFFF"
  on-dark: "#FFFFFF"
  on-dark-soft: "#B7DBBF"
  accent-green: "#4AA660"
  accent-amber: "#F8C166"
  success: "#4AA660"
  warning: "#F8C166"
  error: "#EC4E20"

# English-only tokens, except numeric (shared for numeric displays).
typography:
  display-xl-mobile:
    extends: "{typography.display-xl}"
    fontSize: 32px
  display-xl:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  numeric:
    fontFamily: "Inter, sans-serif"
    fontVariantNumeric: tabular-nums
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  button:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

# Korean text elements use this complete, independent token family.
# Embedded Latin letters and inline numbers keep the Korean element's style.
# Never inherit English metrics or font-substitution overrides here.
# Numeric displays defined in chapter 4 use the shared typography.numeric font.
typography-kr:
  display-xl-mobile:
    extends: "{typography-kr.display-xl}"
    fontSize: 32px
  display-xl:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  display-lg:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  display-md:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  display-sm:
    fontFamily: "OwnglyphYuntaeng, Pretendard Variable, Inter, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  title-lg:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  title-md:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  title-sm:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  body-md:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  body-sm:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.04em
  caption:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  caption-uppercase:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  button:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em
  nav-link:
    fontFamily: "Pretendard, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.04em

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
  cta: 64px

font-substitutions:
  display:
    languages: [en, ko]
    applies-to: [typography.display-*, typography-kr.display-*]
    preferred: OwnglyphYuntaeng
    fallback: Pretendard Variable / Inter / sans-serif
    font-weight: 400
    font-synthesis: none
    webfont-url: "https://cdn.jsdelivr.net/gh/Project-Noonnu/2608211801@font-160/font-160/온글잎 윤탱체.woff2"
    source: "https://noonnu.cc/font_page/1918"

layout:
  content-max: none
  recipe-detail-content-max: 1200px
  gutter-mobile: 16px
  gutter-tablet: 24px
  gutter-desktop: 32px
  mobile-below: 768px
  desktop-from: 1024px
  wide-above: 1440px
  recipe-columns-mobile: 2
  recipe-columns-tablet: 2
  recipe-columns-desktop: 3
  recipe-auto-grid-from: 1440px
  recipe-card-min-width-wide: 300px
  ingredient-auto-grid-from: 1600px
  ingredient-card-min-width-wide: 240px

interaction:
  border-width: 1px
  focus-ring: 0 0 0 3px rgba(37, 90, 70, 0.15)
  focus-border: "{colors.primary}"
  hover: unchanged

components:
  data-table:
    headerBackgroundColor: "{colors.surface-soft}"
    headerTextColor: "{colors.body}"
    rowBackgroundColor: "{colors.canvas}"
    alternateRowBackgroundColor: "{colors.table-row-alternate}"
    borderColor: "{colors.hairline-soft}"
    borderWidth: 1px
    rowMinHeight: 56px
    cellPadding: 10px 14px
    fontSize: 14px
    headerFontWeight: 500
    totalBackgroundColor: "{colors.surface-soft}"
    totalTextColor: "{colors.ink}"
    totalFontSize: 15px
    totalFontWeight: 700
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography:
      en: "{typography.button}"
      ko: "{typography-kr.button}"
    rounded: "{rounded.md}"
    padding: 0 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.button}"
      ko: "{typography-kr.button}"
    rounded: "{rounded.md}"
    padding: 0 20px
    height: 40px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography:
      en: "{typography.button}"
      ko: "{typography-kr.button}"
    rounded: "{rounded.md}"
    padding: 0 20px
    height: 40px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography:
      en: "{typography.button}"
      ko: "{typography-kr.button}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 40px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography:
      en: "{typography.body-md}"
      ko: "{typography-kr.body-md}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.nav-link}"
      ko: "{typography-kr.nav-link}"
    height: 64px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.display-xl}"
      ko: "{typography-kr.display-xl}"
    paddingBlock: "{spacing.section}"
  hero-photo:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  recipe-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.title-md}"
      ko: "{typography-kr.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  nutrition-panel:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography:
      en: "{typography.title-md}"
      ko: "{typography-kr.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography:
      en: "{typography.title-md}"
      ko: "{typography-kr.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.body-md}"
      ko: "{typography-kr.body-md}"
    rounded: "{rounded.md}"
    padding: 0 14px
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography:
      en: "{typography.nav-link}"
      ko: "{typography-kr.nav-link}"
    padding: 8px 14px
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.nav-link}"
      ko: "{typography-kr.nav-link}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography:
      en: "{typography.caption}"
      ko: "{typography-kr.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography:
      en: "{typography.caption-uppercase}"
      ko: "{typography-kr.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  cta-band-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography:
      en: "{typography.display-sm}"
      ko: "{typography-kr.display-sm}"
    rounded: "{rounded.lg}"
    paddingBlock: "{spacing.cta}"
    paddingInline: "{layout.gutter-desktop}"
  cta-band-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography:
      en: "{typography.display-sm}"
      ko: "{typography-kr.display-sm}"
    rounded: "{rounded.lg}"
    paddingBlock: "{spacing.cta}"
    paddingInline: "{layout.gutter-desktop}"
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
    typography:
      en: "{typography.body-sm}"
      ko: "{typography-kr.body-sm}"
    paddingBlock: "{spacing.cta}"
    paddingInline: "{layout.gutter-desktop}"
```
