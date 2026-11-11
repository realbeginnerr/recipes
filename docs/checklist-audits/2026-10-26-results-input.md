# Numeric input editing

Audit date: 2026-10-26

## 적용 기준

숫자 입력의 현재 편집 규칙은 [프로젝트 디자인 명세](../design-system-project.md#number-editing)에서 관리한다. 아래 결과는 2026-10-26 점검 당시 기록이다.

## Audit results

All `src` TSX input declarations, dynamic input types, `inputMode` fields,
numeric conversion handlers, and native inputs were searched.

| Area | Finding | Resolution |
| --- | --- | --- |
| Ingredient editor: base amount and macros | Empty changed to zero | Form string drafts and blank-save validation; shared editing protection |
| Ingredient management: inline base amount and macros | Empty changed to zero | Shared editing protection |
| Add recipe: side amounts | Empty ignored, retaining old number | Shared editing protection |
| Add recipe: English amounts | Empty changed to zero; `toFixed(1)` rewrote text | Shared editing protection |
| Recipe edit modal: ingredient amounts | Empty changed to zero | Shared editing protection |
| Ingredient selector: counts | `Number('')` changed empty to zero | Shared editing protection |
| Photo product tags: X/Y positions | Empty ignored; positions rounded | Shared editing protection |
| Recipe tables, serving counts and cooking time | Existing string drafts preserve empty input | Retained; shared editing protection also applies |
| Ingredient card quantities | Already preserves empty input | Retained |
| Ingredient conversions and new ingredient rows | Already string-backed or optional values | Retained |
| Product tag prices | Already string-backed | Retained |
| Product editor: prices, quantities, shipping, blend fields | Separate `NumberField` already keeps a display string while focused | Retained |
| Native input elements | Search, checkbox and file controls; no native number inputs | No change needed |

## Regression checks

Run `npm test`. `tests/NumericInput.test.tsx` exercises actual clearing and
replacement through user events against zero coercion, fallback parsing,
ignored blanks, bounds, integer coercion, rounding and fixed decimal parents.
It also checks decimals, blur callbacks, external updates, string-backed
inputs, uncontrolled inputs and read-only fields.

`tests/numberFormatting.test.tsx` protects full precision on focus and rounded
display on blur. `tests/IngredientEditor.test.tsx` checks clearing all four
numeric fields, rejecting blank saves, and persisting replacement numbers.
