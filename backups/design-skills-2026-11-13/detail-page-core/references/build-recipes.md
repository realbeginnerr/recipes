# 제작 레시피 (HOW) — MCP 조작 순서·재사용 코드 패턴

> 이 문서는 **"어떻게 만드는가"**만 다룬다. "무엇을/왜"(색·조형·타이포·카피·페이지·이미지의 결정 규칙)는 `design-dna/01~06`, `00-interview`로 라우팅한다. use_figma API 자체의 규칙(폰트로딩·async·10연산 제한 등)은 `figma-mcp.md`.
> 여기 있는 코드는 원본 실측 + 실측 검증으로 확인된 패턴이다. 값을 하드코딩하지 말고, 각 상황의 결정은 design-dna 문서와 브랜드 프로파일에서 가져와 대입한다.

---

## 0. 공통 제작 순서 (모든 섹션 5단계)

1. **섹션 프레임 생성** — 폭 860 고정(재사용 상수, 플랫폼 규격 다르면 그 값), 높이는 콘텐츠 가변. 이름 `[제품명] 섹션유형`.
2. **하위 구조(서브프레임/그룹) 골격** — 의미단위별 서브프레임을 먼저 만들고 이름 지정. 계층은 `design-dna/02` §1(섹션→카드→row 3단). leaf는 이 다음에.
3. **오토레이아웃 설정** — 표준. `appendChild` **먼저** → 그 다음 `layoutSizing*='FILL/HUG'`(순서 바뀌면 실패, `figma-mcp.md`). **정렬 전용 래퍼는 `fills=[]`**(→ `troubleshooting.md` T8).
4. **텍스트** — `loadFontAsync` 완료 후 생성/수정. 폰트·굵기·색은 `design-dna/03`(위계)·`01`(색)에서. 카피 길이는 `design-dna/04`. (줄바꿈·높이 미계산 함정은 `figma-mcp.md` 쓰기규칙 2·`troubleshooting.md` T1~T3)
5. **이미지** — 삽입 방식·블렌드·거리는 `design-dna/06`. 배치 후 `node.screenshot()`으로 즉시 확인.

각 use_figma 호출은 **논리 연산 10개 이내**로 분할(`figma-mcp.md`).

---

## 1. 구조·네이밍 강제 + 완료 전 검증 (필수)

`design-dna/02` §2·§6의 규칙을 **코드에서 반드시 지킨다**:
- 생성하는 **모든 노드**에 역할 한글명(`사진`/`제목`/`본문`/`구분선`/`말풍선_꼬리`/`개성카드1`). 기본명(`Frame 12`) 방치 금지.
- 의미단위(이미지+캡션, 강조어+배경, 아이콘+라벨)는 반드시 서브프레임/`group`으로 묶는다. leaf 흩뿌리기 금지.
- 절대좌표(`x`/`y` 직접 대입)는 (a)레거시 복제, (b)그룹 내부 오버레이 상대배치(형광펜 rect)만.

**완료 보고 전 `get_metadata`로 자가 검증** — 걸리면 고친 뒤에만 "완료":
1. 이름이 `Frame\d+`/`Rectangle\d+`/`Group\d+`/`Vector\d+`/`Text\d+`면 결함 → 역할명으로.
2. 섹션 최상위 직계 자식이 과다하고(낱개 10+), 묶여야 할 것들이 그룹 없이 형제로만 있으면 결함 → 그룹화.
3. **스크린샷**으로: 의도치 않은 흰 박스(래퍼 fill), 사진 "깡" 삽입(블렌드 누락), 텍스트 겹침/잘림 확인.
4. **스켈레톤 placeholder·작업용 라벨 잔존 확인** — 세부 제작 후 스켈레톤의 섹션라벨·회색 슬롯이 남아 있으면 결함(실측 사례: 최종 스윕에서야 잔존 라벨 발견). 단 촬영 지시 라벨(의도된 슬롯 표시)은 잔존물이 아니다.
5. **수치 하드 게이트 전수 확인** — `SKILL.md` "하드 게이트" 체크리스트(모바일 최소폰트·컨테이너 최대폭·히어로 세로/면적·하단 클리어런스·그룹 간 간격·임의색 0 등 — 기준값은 그 표가 정본)를 `get_metadata` 실측으로 하나씩 대조. **오토레이아웃만 통과하고 이 수치들을 건너뛰는 것이 반복 결함 지점**이다(검증 시점 누락 → 규칙 증발).
6. **계층 계약 전수 판정** — `design-dna/08-hierarchy-contract.md` §7 `auditHierarchy()`를 섹션 루트에서 실행해 **세로·가로 넘침 0건** 확인(스크린샷으로는 잘린 글을 발견할 수 없다 — 잘린 결과가 "원래 짧은 글"처럼 보인다). 무효 fill·동명 형제는 의심 신호로 확인 후 판단. §6 예외 선언(이름에 연출 의도 표기)이 있는 노드만 면제.

---

## 2. 낯선 조형요소: 분석 후 구현 (눈대중 치환 금지)

레퍼런스에 design-dna에 없는 조형(말풍선/배지 등)이 있으면 익숙한 패턴으로 때우지 않는다. 절차:
1. `get_screenshot`로 고해상도 재조회 + 필요시 해당 영역 크롭·확대해서 **도형 구성**을 실제로 분석(배경/전경 관계, 꼬리·모서리 같은 정체성 요소).
2. 해석이 갈리면 유저에게 확인(→ `00-interview` §3). 명확하면 생략.
3. 구현 후 레퍼런스와 나란히 대조 — 색만 바뀐 게 아니라 형태 자체가 같은 조형 문법인지.

> 실패 사례(실측): "말풍선"을 흰 배경 둥근 사각형으로 때워 "성의없다" 지적. 말풍선의 정체성=꼬리인데 놓침. → 아래 §3-C가 교정 패턴.

---

## 3. 재사용 코드 패턴 (검증 완료)

> 아래 코드의 폰트 패밀리(`"BrandFont"` 등)·색 상수(`CREAM`/`ACCENT`/`NEUTRAL_INK` 등)·크기 상수(`BODY` 등)는 **전부 중립 placeholder**다. 실제 값은 작업 중인 브랜드의 `brands/<이름>.md`에서 가져와 대입한다(색 결정은 `design-dna/01`, 폰트는 브랜드 프로파일, 크기 하한은 SKILL.md 하드 게이트).

### 3-A. 인라인 강조 (한 텍스트 노드 안, 구간만 다르게)

리뷰 본문처럼 한 문장 안 특정 구절만 굵고 진하게. **별도 텍스트박스 아님.**
```js
const t = figma.createText();
t.fontName = { family: "BrandFont", style: "Light" };
t.characters = plain + highlight;          // 통짜로 먼저 채우고
t.fontSize = BODY;                         // 본문 크기 = 캔버스폭 4.5%↑(860→39) + 브랜드 값 대입
t.fills = [{ type: "SOLID", color: NEUTRAL_INK }];
t.setRangeFontName(plain.length, plain.length + highlight.length, { family: "BrandFont", style: "Medium" });
t.setRangeFills(plain.length, plain.length + highlight.length, [{ type: "SOLID", color: ACCENT }]);
```
- 순서 중요: `characters` 통짜 → 그 다음 `setRange*`(거꾸로면 인덱스 어긋남).
- 구간마다 폰트 다르면 각 스타일을 미리 `loadFontAsync`.
- 색/굵기 선택 근거 → `design-dna/03` §3(문장 내부 부분강조는 크기 유지, 굵기+색만).

### 3-B. 형광펜형 하이라이트 (특정 단어만 배경색 박스)

한 단어만 배경색 강조. 텍스트박스 2개 + 배경 사각형 + group.
```js
const wordA = figma.createText();          // 강조 단어만
wordA.fontName = { family: "BrandFont", style: "Bold" };
wordA.characters = "강조어"; wordA.fontSize = DISPLAY;   // 디스플레이급 강조 크기 — 브랜드 값 대입
wordA.fills = [{ type: "SOLID", color: WHITE_OR_CREAM }];
frame.appendChild(wordA); wordA.x = ...; wordA.y = ...;

const rect = figma.createRectangle();
rect.cornerRadius = 4;
rect.fills = [{ type: "SOLID", color: ACCENT }];
frame.appendChild(rect);
rect.resize(wordA.width + 12, wordA.height + 12);   // wordA의 "실제 렌더 크기" 기준 — 하드코딩 금지
rect.x = wordA.x - 6; rect.y = wordA.y - 6;
frame.insertChild(frame.children.indexOf(wordA), rect); // rect를 wordA 아래 z-order
figma.group([rect, wordA], frame);                  // 배경+단어만 그룹(뒷문장 wordB는 그룹 밖 인접 배치)
```
- 하이라이트 크기는 **항상 `wordA.width/height`(렌더 후)로** 계산. 원본 좌표 베끼지 말 것.

### 3-C. 말풍선 (몸통 + 꼬리 union) — 검증됨

말풍선의 정체성=꼬리. 둥근 몸통 + 좌하단 45° 꼬리를 union한 **단일 도형**(별도 배경 프레임 아님).
```js
const bubbleText = figma.createText();
bubbleText.fontName = { family: "BrandFont", style: "Light" };
bubbleText.characters = "본문"; bubbleText.fontSize = BODY;   // 캔버스폭 4.5%↑
bubbleText.fills = [{ type: "SOLID", color: TEXT_COLOR }];

const padX = 28, padY = 20;
const rectW = bubbleText.width + padX*2, rectH = bubbleText.height + padY*2;

const body = figma.createRectangle();
body.resize(rectW, rectH);
body.cornerRadius = rectH * 0.42;          // 알약형(높이의 ~42%)
body.fills = [{ type: "SOLID", color: BUBBLE_COLOR }];
body.x = 0; body.y = 0;

const tail = figma.createRectangle();
tail.resize(26, 26); tail.cornerRadius = 6;
tail.fills = [{ type: "SOLID", color: BUBBLE_COLOR }];
tail.rotation = 45; tail.x = 6; tail.y = rectH - 14;   // 좌하단 모서리로 살짝 튀어나오게

const bubbleShape = figma.union([body, tail], parentRow);
bubbleShape.name = "말풍선_형태";
bubbleShape.fills = [{ type: "SOLID", color: BUBBLE_COLOR }];  // ★ union 결과는 fill이 회색으로 리셋 → 반드시 재지정

parentRow.appendChild(bubbleText);
bubbleText.layoutPositioning = "ABSOLUTE";   // 형태 위에 겹침(오토레이아웃 flow 제외)
bubbleText.x = bubbleShape.x + padX; bubbleText.y = bubbleShape.y + padY;
```
- 꼬리는 각 말풍선 **자신의 좌하단**(row가 좌/우 정렬이든 동일). 좌우 교차 배치로 대화감(→ `design-dna/02`·`05` §1-8).
- 1개 먼저 만들어 `node.screenshot()` 확인 후 나머지 복제 적용.

### 3-D. 격리 샘플 카드 (사진을 하나의 표본으로)

인물/라이프스타일/디테일 컷을 카드로 격리(→ `design-dna/06` §4). 면배경+얇은 테두리+라운딩, 블렌드 없음, fill 크롭.
```js
const card = figma.createFrame();
card.name = "개성카드1";
card.resize(500, 500);                       // 반복 카드는 한 규격으로 통일(리듬). 실제 값은 브랜드 프로파일
card.cornerRadius = 20;                       // 라운딩값은 브랜드 프로파일
card.clipsContent = true;
card.fills = [{ type: "SOLID", color: CREAM }];      // 연한 면 = 안정된 바닥
card.strokes = [{ type: "SOLID", color: NEUTRAL_LINE }]; card.strokeWeight = 1;  // 얇은 경계
// 사진을 card 안에 fill 크롭으로 채움(넘치는 부분 crop). 블렌드 없음.
```

### 3-E. 누끼 사진 곱하기 블렌드 (배경에 녹이기)

누끼 제품이 유채색/텍스처 배경 위에 얹힐 때(→ `design-dna/06` §3). 흰 후광 제거·톤 융합.
```js
// 이미지 노드(또는 그 안 이미지 레이어)의 blendMode 지정
imgNode.blendMode = "MULTIPLY";     // 짙은 피사체는 "DARKEN"
// ★ 순백 배경엔 곱하기 효과 없음(항등) — 유채색/텍스처 배경일 때만.
```
- 기존 원본 사진을 `clone()`하면 원래 blendMode가 보존된다. **새로 넣은 사진은 blendMode를 명시하지 않으면 "깡"으로 들어간다** — 배경 톤과 겹치는 누끼면 반드시 지정.

### 3-F. 타이틀 줄바꿈 균형 (어절 경계 + 폭 균등) — 검증됨

Figma에는 `word-break: keep-all`도 `text-wrap: balance`도 없다. 한글은 음절 사이에서 끊기고, 줄바꿈은 그리디라 아랫줄이 토막 난다. **대상·의미 판정 규칙은 `design-dna/03` §6** — 여기 코드는 그 판정이 끝난 노드에만 쓴다.

측정 원리: Figma에 `measureText`가 없다. 유일한 실측 경로는 **페이지 루트로 뺀 clone 프로브**를 `WIDTH_AND_HEIGHT`(hug)로 두고 `width`를 읽는 것 — 대입 직후 **동기적으로** 갱신된다.

> ★ **프로브를 `characters` 대입으로 만들지 말 것.** `characters`에 문자열을 넣으면 **첫 글자 스타일이 전체에 적용돼** 혼합 스타일 노드(3-A 인라인 강조, 크기 섞인 마커)의 폭이 통째로 왜곡된다. 실측 사고: 두 줄이 485/486px로 이미 잘 맞던 노드가 "폭 초과+어절 절단"으로 오판됨. **`clone()` + `deleteCharacters()` 트리밍**을 쓰면 구간별 스타일이 보존돼 정확하다.

```js
const NLc = String.fromCharCode(10), LS = String.fromCharCode(8232), SP = String.fromCharCode(32);
// LS = U+2028 소프트 개행 (\n = 문단개행이라 금지, →03 §6-3)

function balanceTitle(node, opts) {          // ★ 호출 전에 node의 폰트를 전부 loadFontAsync 해둘 것
  opts = opts || {};
  const W = opts.maxWidth || node.width, chars = node.characters, L = chars.length;
  const trash = [];
  const widthOf = (s, e) => {                        // [s,e) 구간의 실측 1줄 폭 (스타일 보존)
    const p = node.clone();
    figma.currentPage.appendChild(p);               // ★ 원본 부모(오토레이아웃)에서 반드시 빼낸다
    p.x = 99999; p.y = 99999;                       // 캔버스 밖 — 렌더 간섭 없음
    p.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (e < L) p.deleteCharacters(e, L);
    if (s > 0) p.deleteCharacters(0, s);
    trash.push(p); return p.width;
  };

  const bounds = []; let s0 = 0;                     // ★ 기존 문단(\n·U+2028)은 보존 — 통짜로 잇지 않는다
  for (let i = 0; i < L; i++) if (chars[i] === NLc || chars[i] === LS) { bounds.push([s0, i]); s0 = i + 1; }
  bounds.push([s0, L]);

  const banned = new Array(L).fill(false);           // ★ 따옴표·괄호 안 공백은 후보 제외 (→03 §6-2-⑤)
  {
    const OPEN = {'(':')','[':']','{':'}','“':'”','‘':'’','「':'」','『':'』','（':'）'};
    const CLOSE = {}; for (const k in OPEN) CLOSE[OPEN[k]] = 1;
    const stack = []; let dq = false, sq = false;    // 직선 따옴표("·')는 토글로 짝 판정
    for (let i = 0; i < L; i++) {
      const ch = chars[i];
      if (ch === '"') dq = !dq;
      else if (ch === "'") sq = !sq;
      else if (OPEN[ch]) stack.push(ch);
      else if (CLOSE[ch] && stack.length) stack.pop();
      else if (ch === SP && (dq || sq || stack.length)) banned[i] = true;
    }
  }

  const reports = [];
  for (const [a, b] of bounds) {
    if (b - a < 2 || widthOf(a, b) <= W) continue;   // 넘치는 문단만 처리
    const cands = [];
    for (let i = a; i < b; i++) {
      if (chars[i] !== SP || banned[i]) continue;    // 후보는 어절(공백) 경계만 + 묶음 내부 제외
      const wa = widthOf(a, i), wb = widthOf(i + 1, b);
      if (wa > W || wb > W) continue;                // 두 줄 다 폭 이내여야 후보
      cands.push({ at: i, a: chars.slice(a, i), b: chars.slice(i + 1, b),
                   wa: Math.round(wa), wb: Math.round(wb), diff: Math.round(Math.abs(wa - wb)) });
    }
    cands.sort((x, y) => x.diff - y.diff);           // 폭 차이 최소 순
    reports.push({ candidates: cands.slice(0, 3), pick: cands[opts.rank || 0] || null });
  }
  for (const p of trash) p.remove();

  if (opts.apply === true) {
    const picks = reports.map(r => r.pick).filter(Boolean).sort((x, y) => y.at - x.at);  // 뒤에서부터(인덱스 보존)
    for (const p of picks) {                          // 공백을 U+2028로 치환 — characters 통짜 대입 금지
      node.deleteCharacters(p.at, p.at + 1);
      node.insertCharacters(p.at, LS, 'BEFORE');
    }
    node.layoutSizingVertical = 'HUG';                // 높이 재계산 강제 (→troubleshooting T3)
  }
  return reports;
}
```

- **2단 운용이 기본**: 먼저 `apply` 없이 호출해 후보 3개를 받아 **의미가 끊기지 않는지 검토**하고, 고른 순위로 `{rank:n, apply:true}` 재호출. 최소 diff가 항상 좋은 분할은 아니다(`03` §6-2).
- **묶음 단위 처리 분담**: 따옴표·괄호 내부 공백은 위 `banned`가 **기계적으로** 제외한다. `몇 px인지`·`폭 차이`·`안 건드리고` 같은 결합 표현은 기계 판정이 안 되므로 **rank 검토 단계에서 거른다**(→ `03` §6-2-⑤).
- **폰트는 스테이지 조작 전에 선로드.** 대상 노드들의 폰트를 `getStyledTextSegments(['fontName'])`로 모아 **먼저 전부** `loadFontAsync` 한 뒤 clone·`textAutoResize`를 건드린다. 순서를 바꾸면 `Cannot write to node with unloaded font`로 죽는다(실측).
- **적용도 `deleteCharacters`+`insertCharacters`로.** `node.characters = a + LS + b`는 인라인 강조·크기 혼합을 전부 날린다.
- **넘치는데 후보가 0개면** 2줄에 못 담는 것 — 개행을 늘리지 말고 카피를 줄인다(→ `04-copy`).
- **역방향 감사**(기존 파일에서 어절 절단 노드 찾기): 같은 `widthOf`로 컨테이너 폭에 들어가는 최대 prefix를 이진탐색한 뒤, 그 경계 앞뒤 두 글자가 **둘 다 한글**(`AC00–D7A3`/`1100–11FF`/`3130–318F`)이면 어절 절단이다. 경계가 라틴 단어·숫자런 안이면 Figma는 실제로 안 끊으므로 **오탐**이다(렌더 대조로 확인).

---

## 4. 기술 함정 → `troubleshooting.md`로 이관

기술 함정은 전부 **`troubleshooting.md`**(증상별 색인 T1~T15)로 통합했다. 에러·이상 렌더가 나면 그 색인부터 본다. 이 문서에는 제작 절차·재사용 코드만 남긴다.

---

## 4b. 컴포넌트 운용 전략 — 무엇을 컴포넌트로 만들고 무엇을 복제로 두나

실측된 효율적 운용(여러 브랜드 공통): **진짜 컴포넌트는 소수만** 만들고, 텍스트 오버라이드·색 베리언트 스와핑으로 수십 회 재사용한다.

- **컴포넌트로 만들 것**: 반복 빈도가 높고 내용만 바뀌는 원자 단위 — 타이틀 배지(색 스와핑), 가격/리워드 카드, 법정 고시 행(라벨-값), 체크리스트 항목, 태그 필, 목업 창(브라우저/OS 크롬). 베리언트는 "상태/톤"(기본/활성/경고)으로 구성.
- **복제(clone)로 둘 것**: 통짜 공용 섹션(철학·팀소개 등 브랜드 자산), 반복 섹션의 골격(첫 섹션을 완성·검증 후 복제해 콘텐츠 교체).
- **실측된 함정 (하지 말 것)**:
  - **이름-실체 불일치**: 색이 바뀌었는데 옛 색 이름이 남은 컴포넌트("green" 접미사인데 실제론 오프화이트), 동명이물(같은 이름의 전혀 다른 두 배지) — 베리언트/컴포넌트 이름은 역할 기반으로 짓고, 실체가 바뀌면 이름도 갱신.
  - **부분 detach**: N개 반복 중 1개만 인스턴스고 나머지는 detach 복제 — 수정이 전파되지 않는 유령 세트가 된다. 반복 세트는 전부 인스턴스로 통일.
  - placeholder 텍스트가 남은 인스턴스를 "완료"로 방치하지 않는다.

## 4c. 파생 채널 배리에이션 — 마스터 → 크롭 순서

상세페이지 본판(마스터 서사)을 먼저 완성하고, 파생물은 **채널 규격의 새 프레임**으로 뜬다:
- 파생 예: SNS 피드(1080×1350), 펀딩 요약 카드(정사각), E북/PDF(595×842). 상세페이지 폭(860)을 그대로 늘리거나 줄여 쓰지 않는다(→ `design-dna/02` §7 "상세페이지 폭 ≠ 파생 채널 폭").
- 파생 프레임은 마스터의 카피·비주얼을 **재사용하되 재배치**한다(크기·위계를 채널에 맞게 재조정). 같은 메시지의 색 테마/레이아웃 A/B 변형을 나란히 만들어 비교·선택하는 것도 유효한 관례 — 단 변형 프레임 이름에 A/B·용도를 명시해 동명 방치하지 않는다.

## 5. 스켈레톤 생성 (전체 신규일 때만)

세부 제작 전 **섹션별 빈 placeholder 프레임**으로 전체 구성을 캔버스에 먼저 그려 승인받는다(→ 섹션 순서·구성은 `design-dna/05`).
- 폭 860 고정, 높이는 섹션 유형별 임시값(세부 단계에서 콘텐츠에 맞춰 조정).
- 하나의 세로 컬럼으로 스택(x=0, y=이전 y+height+간격), 편집 스크롤 편의.
- 네이밍 `[제품명] 0N_섹션유형`(예 `[제품명] 01_소개메인`).
- placeholder 내부엔 회색 사각형 + 섹션명 텍스트만. use_figma `description`에 "스켈레톤: 순서 확정용, 세부 미제작".
- **세부 제작 단계에서 스켈레톤 placeholder는 전부 대체·제거**한다(잔존 = 결함, §1 검증 4번). 섹션 병렬 제작 시 프레임 높이가 변하므로 웨이브마다 감독이 재배치한다(→ `orchestration.md` §3).

---

## 6. 공용 섹션 clone (브랜드 철학·활용 안내 등)

`design-dna/05` §1-7: 새로 만들지 않고 **기존 프레임을 `clone()`**해 붙인다.
- clone은 마스크/그라디언트/이미지/blendMode까지 깊은 복제 → 그대로 재사용.
- clone 시 내부 계층·이름 유지(ungroup·rename 금지). 텍스트/색/폰트 수정 불필요.
- clone은 "재현"이 아니라 "복제"다 — 새 카피를 쓰는 섹션에 clone을 재구축이라 보고하지 않는다.
