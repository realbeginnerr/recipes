# IA 관리 가이드

기준일: 2026-10-19 (KST). 소스 정적 분석을 근거로 하며 운영 사이트의 실행 결과는 포함하지 않는다.

## 1. 목적과 범위

사용자가 정보를 찾고 관리하는 구조를 코드와 연결해 관리한다. 공개 콘텐츠, 관리자 운영, 의미 있는 하위 화면과 접근 조건을 포함한다. 컴포넌트 트리·DB 스키마·시각 디자인 전체를 복제하지 않는다. 분석 문서는 제품 요구사항을 새로 확정하거나 사이트 변경을 승인하는 문서가 아니다.

## 2. IA와 사이트맵

사이트맵은 주로 URL과 페이지 관계를 나타낸다. IA는 URL이 없는 정보 분류, 모달, 탐색 분기, 권한과 명명도 다룬다. `/recipe/:id/edit`의 URL 길이를 IA depth로 해석하지 않는다.

## 3. IA와 User Flow

IA의 부모·자식은 정보의 포함 관계다. 로그인 성공 → 저장 → 복귀 같은 시간 순서는 User Flow에 기록한다. `cross_links`는 다른 정보로 이동하는 연결만 기록하며 전체 작업 흐름을 대신하지 않는다. 생성 다이어그램은 계층만 표현하고 화살표를 사용하지 않는다.

## 4. 메뉴와 전체 IA

`navigation.primary`는 GNB, `utility`는 유틸리티 접근이다. 전체 `nodes`는 메뉴 밖의 상세·운영·모달까지 포함한다. 루트 자식이라고 GNB 메뉴인 것은 아니다. 사이트 공통 헤더·푸터는 navigation에 기록하고, 모바일 접힘 메뉴처럼 탐색 이해에 의미 있는 영역만 노드로 둔다.

## 5. Depth

루트는 0, 자식은 부모 + 1. 기본 검토 기준은 5 이하이며 더 깊으면 삭제하거나 잘라내지 않고 Warning으로 검토한다. 한 화면의 제목/문단/필드마다 depth를 늘리지 않는다. 현재 As-Is 최대 depth 4, To-Be 최대 depth 4다.

## 6. 스키마와 노드 유형

YAML은 단일 원본이다. `.mmd`는 생성물이며 직접 수정하지 않는다. 모든 노드는 아래 필수 필드를 가진다.

| 필드 | 규칙 |
| --- | --- |
| id | 영문 소문자로 시작, 소문자·숫자·하이픈. 기능 의미 기반의 영구 식별자 |
| name | 사용자 관점 명칭. 코드 export명과 같을 필요 없음 |
| parent | 상위 ID, 루트만 null |
| depth | 0 이상의 정수 |
| order | 동일 부모 내 1 이상의 고유 정수. 번호 간격 허용 |
| type | category / page / modal / drawer / tab / section |
| path | 앱 기준 절대 경로 또는 null. 동적 세그먼트는 :id 등 사용 |
| access | public / admin |
| description | 정보 목적 |
| implementation | implemented / planned / unreachable |
| verification | code-confirmed / needs-verification / proposed |
| source_files | 프로젝트 루트 상대 경로 배열 |
| notes | 주의점 문자열. 없으면 빈 문자열 |

`category`는 분류, `page`는 독립 라우트, `modal`은 의미 있는 대화 화면, `drawer`는 실제 슬라이드/오버레이 영역, `tab`은 정보/보기 전환, `section`은 정보 목적이 있는 페이지 영역이다. 정보상 tab은 ARIA role=tab 구현을 보증하지 않는다. 현재 모바일 메뉴는 section이며 drawer가 아니다.

단순 확인창·토스트·로딩·인풋·반복 문단은 원칙적으로 노드에서 제외한다. 삭제 영향이나 미리보기처럼 정보 구조를 이해하는 데 중요한 모달만 포함한다. 오류/빈 상태는 `state_inventory`에 묶어 독립 URL처럼 오해하지 않게 한다. 구현되어도 현재 연결되지 않은 코드 조각은 `excluded`에 근거와 함께 기록한다.

최상위 보조 필드: `routing`(basename/redirect), `access_model`, `navigation`, `cross_links`, `state_inventory`, `excluded`. To-Be에는 `changes`, `proposals_pending`를 추가한다. 중복 설명은 notes를 최소화하고 근거 파일을 참조한다.

## 7. 권한

public은 비회원·관리자 모두 화면에 접근할 수 있다는 뜻이다. admin은 관리자 인증이 필요한 화면을 뜻한다. 일반 로그인 회원 역할은 현재 없다. 로그인 모달의 진입 자체는 public이다.

아래 세 층을 따로 확인한다.

1. 메뉴/버튼 노출: 숨겨져 있어도 접근 차단의 근거가 되지 않는다.
2. 페이지 가드: `AddPagePasswordGate`와 `isProtectedPagePath`가 실제 렌더를 막는지 확인한다.
3. 데이터 권한: Firestore/Storage 규칙과 페이지 내부 필터를 확인한다. 저장소 규칙과 실제 배포 규칙의 일치는 별도 검증한다.

화면 노출 정책과 데이터 접근 정책은 별개다. 화면의 숨김 표시만으로 데이터 접근 제한을 판단하지 않는다. 두 정책의 정합성과 운영 환경의 권한은 별도로 확인한다. 서버 권한 감사 전체는 이 IA 검증기의 범위 밖이다. 제출 문서에는 인증 조건이나 내부 데이터 저장 구조의 세부 내용을 포함하지 않는다.

## 8. ID 명명

`recipe-detail`, `ingredient-picker`처럼 목적 기반 이름을 쓴다. URL 변경·이름 변경·계층 이동에도 기존 ID를 유지한다. 삭제된 ID를 새 목적에 재사용하지 않는다. 공통 폼을 쓴다는 이유만으로 URL이 다른 추가/수정을 하나의 page로 합치지 않는다.

## 9. URL과 라우팅

YAML path는 앱 내부 경로다. 배포 basename `/recipes/`를 포함하지 않는다. 예: IA `/recipes`는 배포 시 `/recipes/recipes`, IA `/recipe/:id`는 `/recipes/recipe/:id`다. 쿼리·해시는 notes에 관리하고 별도 page를 만들지 않는다. 현재 `/about`과 `*`는 홈 redirect이며 page 수에 포함하지 않는다.

검증기의 TS AST 추출은 현재 App.tsx의 평면 Route JSX를 대상으로 한다. 중첩 상대 라우트·별도 라우터 파일·객체 라우터로 전환하면 `sourceInventory`를 먼저 확장한다. 파일 이름을 보고 라우트가 존재한다고 추정하지 않는다.

## 10. 중복 페이지와 공유 영역

여러 위치에서 진입하는 상세 페이지는 단일 ID를 유지한다. `cross_links`로 재사용 관계를 기록한다. 상품 추가/수정의 미리보기, 레시피 추가/수정의 재료 선택은 각각 대표 부모 한 곳에 두고 공유 위치를 notes/cross_links에 기록한다. 대표 부모는 진입을 제한하는 의미가 아니다.

## 11. As-Is / To-Be

As-Is는 현재 구현의 증거, To-Be는 개선 구조의 제안이다. 기존 페이지가 To-Be에서 이동해도 페이지 자체의 implementation은 implemented를 유지하고 `changes[].implementation: planned`로 재배치가 미구현임을 표시한다. 신규 UI는 planned/proposed로 쓴다. To-Be source_files는 planned 노드에 한해 수정 후보 파일이며 구현 증거가 아니다.

불확정 아이디어는 `proposals_pending`에 둔다. 회원가입은 제공하지 않는다. 장바구니, 주문/결제, 대시보드는 현재 확정 To-Be에 추가하지 않았다.

## 12. 변경·버전 관리

변경 유형은 Added / Removed / Moved / Renamed / Merged / Split / Unchanged이며 권한·URL 변경은 AccessChanged / URLChanged로 별도 표시한다. `changes`는 모든 ID의 비교 결과를 기록하며 이유와 issue_ids를 가진다. Merged/Split에는 related_ids를 기록하고 원래 ID 보존/종료를 설명한다. 부모가 같고 path/name/access가 같으면 Unchanged이며 order/depth의 파생 변경은 계층 비교로 검토한다.

변경 리뷰에는 근거 커밋과 날짜, 영향 ID, 문제 ID, 결정 상태를 추가한다. 본 초판은 작업 중 소스 스냅샷이며 커밋된 원격 사이트와 같다고 가정하지 않는다. 운영 배포와 문서 승인도 구분한다.

## 13. 코드 동기화·검증

프로젝트 루트 PowerShell에서 실행한다.

```powershell
node docs/ia/scripts/validate-ia.mjs
node docs/ia/scripts/generate-ia.mjs --check
node docs/ia/scripts/test-ia.mjs
```

Error는 종료 코드 1, Warning/Info만 있으면 0이다. 구조·경로 누락은 Error, 정적 진입 경로 미확인·데이터 권한 의심은 Warning, 동적 진입 후보·변경 내역은 Info로 출력한다. Warning은 자동 실패로 처리하지 않지만 검토/해결 근거를 기록한다.

검증 범위: 중복 ID/부모/순환/depth/필수 필드/타입/순서/URL/상태/근거 파일, 페이지와 redirect 목록, 라우트 가드와 access 대조, 변경 이력, 생성물 동기화. 단일 구조 파일 검사는 `node docs/ia/scripts/validate-ia.mjs --file docs/ia/ia-as-is.yaml`이다.

진입 분석은 JSX Link·href·navigate·requestAccess·GNB 객체와 동적 URL 템플릿을 수집한다. 후보는 컴포넌트 마운트/조건부 버튼 노출/실제 데이터의 존재까지 증명하지 않는다. 고립 경고를 곧바로 접근 불가능이라고 해석하지 않는다. 로그인·권한·운영 규칙·배포 서버의 새로고침 처리는 사람이 확인한다.

현재 설치된 `js-yaml`(전이 의존성)과 `typescript`를 사용하며 package.json/lockfile 변경이나 추가 설치는 하지 않는다. 환경 재구성 후 `js-yaml`이 없어지면 자동 설치하지 말고 기존 의존성 구조를 확인한다. 재사용 프로젝트에서 라이브러리가 없으면 설치 필요성을 먼저 검토한다.

## 14. Mermaid 생성

```powershell
node docs/ia/scripts/generate-ia.mjs
node docs/ia/scripts/generate-ia.mjs --branch=recipes
```

기본 명령은 두 `.mmd`를 갱신한다. `--branch`는 지정 노드와 하위 정보만 별도 `.노드ID.mmd`로 출력하며 원본 YAML을 수정하지 않는다. `--check`는 기존 생성물이 같은지 검사한다.

TD 방향, 카드, ID 기반 식별자, 화살표 없는 `---`, depth별 색상을 사용한다. 큰따옴표로 감싼 카드 안에서 한국어와 `|`, `/`, `:` 등 일반 문장부호를 그대로 유지한다. 따옴표·HTML 구분 문자·제어 문자 등 문법을 깨뜨릴 수 있는 문자만 엔티티로 변환한다. FigJam은 엔티티를 그대로 표시할 수 있으므로 필요한 경우 해당 문자의 보드 표시를 추가 확인한다. [Mermaid 공식 Flowchart 문법](https://mermaid.js.org/syntax/flowchart.html)을 기준으로 제한된 안전 템플릿을 사용한다.

현재 로컬 Mermaid 엔진/CLI는 설치되어 있지 않다. 자동 검증은 구조와 생성 템플릿·동기화까지이며 실제 엔진의 파싱/렌더링과 시각 배치는 Mermaid 지원 미리보기나 FigJam에서 확인해야 한다. 생성 파일은 코드펜스 없이 Mermaid 원문이다.

## 15. FigJam

2026-10-18 확인한 [Figma 공식 안내](https://help.figma.com/hc/en-us/articles/1500004414542-Create-diagrams-and-flows-with-connectors-in-FigJam)는 Mermaid 구문을 보드에 붙여 편집 가능한 다이어그램을 생성하는 방법을 명시한다.

1. 편집 권한이 있는 FigJam 보드를 연다.
2. `diagrams/ia-as-is.mmd`의 전체 텍스트를 복사해 보드의 빈 영역에 붙여넣는다. 파일이나 PNG를 붙이는 것이 아니다.
3. 카드 하나를 선택해 텍스트를 수정하고 연결선 끝점을 이동할 수 있는지 확인한다.
4. To-Be는 별도 영역/보드에 같은 방식으로 넣고 날짜·버전을 적는다.
5. 노드가 많아 읽기 어려우면 `--branch=recipes` 등으로 생성한 범위별 다이어그램을 사용한다.

공식 지원과 이 계정의 실제 UI 동작은 다르므로 이번 작업에서는 FigJam 계정 내 변환까지 실행하지 않았다. 텍스트만 생기거나 변환이 제공되지 않으면 현재 계정/클라이언트 지원 여부를 확인한다. PNG/SVG 단순 가져오기를 편집 가능한 카드 변환이라고 안내하지 않는다. 색상·엔티티 표시·선 방향도 보드에서 확인한다.

FigJam의 편집은 검토용이다. 확정 변경은 YAML에 반영한 뒤 다시 생성한다. FigJam만 고쳐 SSOT가 갈라지지 않게 한다.

## 16. 신규 기능 추가 절차

1. 요구사항과 정보 목적·대상 역할·진입 경로를 확인한다.
2. 기존 노드/공통 화면으로 처리 가능한지 검토한다.
3. To-Be에 새 ID와 planned/proposed, 문제/요구 ID 및 후보 근거 파일을 기록한다.
4. 검증 → 다이어그램 생성 → 변경 리뷰를 수행한다.
5. 구현이 완료되면 실제 Route/가드/링크/데이터 규칙을 확인해 As-Is로 반영한다.
6. 모바일·비회원·관리자·직접 URL·뒤로가기·오류/빈 결과를 실행 확인하고 검증 상태를 갱신한다.
7. 코드·YAML·생성물·리뷰·변경 이력을 함께 버전 관리한다. 배포는 별도 절차다.
