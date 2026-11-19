import csv
import json
import re
import unicodedata
from collections import Counter

with open(r"D:\flashcards\public\terms.json", encoding="utf-8") as f:
    terms = json.load(f)

with open(r"D:\flashcards\data\0 glossary 단어장 (공통).csv", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.reader(f))

print("terms", len(terms), "csvrows", len(rows))
print("headers1", rows[0])
print("headers2", rows[1])
print("ratings", Counter((row[1].strip() if len(row) > 1 else "") for row in rows[2:]))
print("TERMS")
for index, term in enumerate(terms, 1):
    print(f"{index:03}\t{','.join(term.get('categories', []))}\t{term.get('term', '')}\t{term.get('englishTerm', '')}")

def norm(value):
    return re.sub(r"[^0-9a-z가-힣]+", "", unicodedata.normalize("NFKC", value or "").casefold())

source = {}
source_en = {}
for row in rows[2:]:
    if len(row) > 6 and row[6].strip():
        source[norm(row[6])] = row
    if len(row) > 7 and row[7].strip():
        source_en.setdefault(norm(row[7]), []).append(row)

print("MISSING_OR_BLANK")
matched = rated = 0
for index, term in enumerate(terms, 1):
    row = source.get(norm(term.get("term", "")))
    if not row:
        candidates = source_en.get(norm(term.get("englishTerm", "")), [])
        if len(candidates) == 1:
            row = candidates[0]
    if row:
        matched += 1
    stars = row[1].count("★") if row else 0
    if stars:
        rated += 1
    else:
        print(f"{index:03}\t{','.join(term.get('categories', []))}\t{term.get('term', '')}\t{term.get('englishTerm', '')}\t{'NO MATCH' if not row else 'BLANK'}")
print("matched", matched, "rated", rated, "need_fill", len(terms)-rated)
