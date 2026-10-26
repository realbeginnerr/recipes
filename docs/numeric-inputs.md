# Numeric input editing

Audit date: 2026-10-26

## Shared contract

Use `src/components/ui/input.tsx` for numeric HTML inputs. While a controlled
number input is focused, it owns the raw editing string, including an empty
string. Parent handlers still receive every change for calculations and
validation, but parsing, clamping and formatting must not replace the text
being edited. On blur, the field displays the parent's committed value using
the existing display precision. Focusing restores its full stored precision.

Do not replace this with a native number input bound directly to a numeric
state value. For forms that require a number before saving, keep raw strings
in the form draft and explicitly reject blank values; the shared Input does
not decide whether blank means zero, missing, or the previous valid value.

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
