import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

TERMS_PATH = Path(r"D:\flashcards\public\terms.json")
CSV_PATH = Path(r"D:\flashcards\data\0 glossary 단어장 (공통).csv")
OUTPUT_PATH = Path(r"D:\recipes\.tmp\glossary_review_data.json")

INFERRED_SCORES = {
    "어피니티 다이어그램": 4,
    "카드 소팅": 4,
    "AI 제품/툴": 5,
    "AI 모델": 5,
    "라이브러리 (디자인)": 4,
    "탭 (터치 동작)": 4,
    "탭 (UI 요소)": 5,
    "변수": 5,
    "상수": 4,
    "디자인 토큰": 4,
    "AI 토큰": 5,
    "접근 토큰": 4,
    "머메이드": 3,
    "마크다운": 5,
    "스킬": 4,
    "오딧": 3,
    "라이브러리 (개발)": 5,
    "어셈블리어": 2,
    "PaaS": 3,
    "IaaS": 3,
    "플레이롸이트": 3,
    "시각적 회귀 테스트": 3,
    "axe-core": 3,
    "WCAG": 5,
    "W3C": 4,
    "PR (개발)": 5,
    "n8n": 4,
    "메이크": 4,
    "SSOT": 4,
    "의존성": 5,
    "라우트": 4,
    "이스케이프": 3,
    "참여율 (ER)": 5,
    "VS Code": 5,
    "터미널": 5,
    "샌드박스": 4,
    "쉘": 4,
    "Ctrl + Shift + P": 3,
}


def normalize(value):
    return re.sub(
        r"[^0-9a-z가-힣]+",
        "",
        unicodedata.normalize("NFKC", value or "").casefold(),
    )


with TERMS_PATH.open(encoding="utf-8") as source:
    terms = json.load(source)

with CSV_PATH.open(encoding="utf-8-sig", newline="") as source:
    csv_rows = list(csv.reader(source))

by_term = {}
by_english = {}
for row in csv_rows[2:]:
    if len(row) <= 7:
        continue
    if row[6].strip():
        by_term[normalize(row[6])] = row
    if row[7].strip():
        by_english.setdefault(normalize(row[7]), []).append(row)

review_rows = []
for index, term in enumerate(terms, 1):
    original = by_term.get(normalize(term.get("term", "")))
    if original is None:
        candidates = by_english.get(normalize(term.get("englishTerm", "")), [])
        if len(candidates) == 1:
            original = candidates[0]

    original_score = original[1].count("★") if original else 0
    if original_score:
        score = original_score
        score_source = "원본"
    else:
        score = INFERRED_SCORES.get(term["term"])
        if score is None:
            raise ValueError(f"중요도 보완 점수가 없습니다: {term['term']}")
        score_source = "보완"

    if not 1 <= score <= 5:
        raise ValueError(f"중요도 범위 오류: {term['term']}={score}")

    review_rows.append(
        {
            "number": index,
            "categories": ", ".join(term.get("categories", [])),
            "term": term.get("term", ""),
            "englishTerm": term.get("englishTerm", ""),
            "definition": term.get("definition", ""),
            "importance": "★" * score + "☆" * (5 - score),
            "score": score,
            "scoreSource": score_source,
        }
    )

term_names = [row["term"] for row in review_rows]
if len(review_rows) != 239 or len(set(term_names)) != 239:
    raise ValueError("용어 수 또는 중복 검증에 실패했습니다.")

summary = {
    "total": len(review_rows),
    "original": sum(row["scoreSource"] == "원본" for row in review_rows),
    "inferred": sum(row["scoreSource"] == "보완" for row in review_rows),
    "scoreCounts": dict(sorted(Counter(row["score"] for row in review_rows).items())),
}

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH.write_text(
    json.dumps({"summary": summary, "rows": review_rows}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(json.dumps(summary, ensure_ascii=False))
