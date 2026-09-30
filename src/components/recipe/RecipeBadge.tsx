import { useLanguage } from '../../context/LanguageContext'
import type { CSSProperties } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { BadgeLevel, MacroIssue, RecipeBadgeResult } from '../../utils/recipeBadge'

const REC = { carbs: 75, protein: 33, fat: 22 }

function macroColor(value: number, target: number): string {
  const diff = Math.abs(value - target)
  if (diff >= 10) return 'var(--destructive)'
  if (diff >= 5) return 'var(--warning)'
  return 'var(--success)'
}

function MacroChart({ macros }: { macros: { carbs: number; protein: number; fat: number } }) {
  const { language } = useLanguage()
  const bars = [
    { label: language === 'ko' ? '탄' : 'C', value: macros.carbs, rec: REC.carbs },
    { label: language === 'ko' ? '단' : 'P', value: macros.protein, rec: REC.protein },
    { label: language === 'ko' ? '지' : 'F', value: macros.fat, rec: REC.fat },
  ]
  return (
    <div className="macro-chart" style={{ marginTop: '8px' }}>
      {bars.map(({ label, value, rec }) => {
        const pct = Math.min((value / rec) / 1.3 * 100, 100)
        const color = macroColor(value, rec)
        return (
          <div key={label} className="macro-chart__row" style={{ gap: '8px' }}>
            <span className="macro-chart__label" style={{ width: 'auto' }}>{label}</span>
            <div className="macro-chart__track">
              <div className="macro-chart__bar" style={{ width: `${pct}%`, background: color }} />
              <div className="macro-chart__rec-line" style={{ left: `${(100 / 130) * 100}%` }} />
            </div>
            <span className="macro-chart__value" style={{ color, minWidth: 'unset', width: '52px', textAlign: 'right' }}>
              {Math.round(value)} / {rec}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const LEVEL_CONFIG: Record<BadgeLevel, { emoji: string; ko: string; en: string; bg: string; color: string }> = {
  good:     { emoji: '🟢', ko: '혈당 양호', en: 'Blood Sugar: Good',     bg: 'var(--surface-sage)',  color: 'var(--primary)' },
  moderate: { emoji: '🟡', ko: '혈당 보통', en: 'Blood Sugar: Moderate', bg: 'var(--warning)',  color: 'var(--foreground)' },
  caution:  { emoji: '🔴', ko: '혈당 주의', en: 'Blood Sugar: Caution',  bg: 'var(--surface-soft)',  color: 'var(--destructive)' },
}

const BADGE_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 12px',
  borderRadius: '9999px',
  fontSize: '14px',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  lineHeight: 1.6,
  border: 'none',
  cursor: 'pointer',
}

const NUTRIENT_LABEL: Record<string, { ko: string; en: string }> = {
  carbs:   { ko: '탄수화물', en: 'Carbs' },
  protein: { ko: '단백질',   en: 'Protein' },
  fat:     { ko: '지방',     en: 'Fat' },
}

function macroIssueText(issue: MacroIssue, isKo: boolean): string {
  const label = isKo ? NUTRIENT_LABEL[issue.nutrient].ko : NUTRIENT_LABEL[issue.nutrient].en
  if (isKo) return issue.direction === 'over' ? `${label} 과다` : `${label} 부족`
  return issue.direction === 'over' ? `Too much ${label}` : `Low ${label}`
}

const SECTION_STYLE: CSSProperties = {
  borderTop: '1px solid var(--border)',
  paddingTop: '10px',
  marginTop: '10px',
}

const LABEL_STYLE: CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--muted-foreground)',
  marginBottom: '4px',
}

const STATUS_GOOD: CSSProperties  = { fontWeight: 500, color: 'var(--primary)' }
const STATUS_WARN: CSSProperties  = { fontWeight: 500, color: 'var(--destructive)' }
const STATUS_MID: CSSProperties   = { fontWeight: 500, color: 'var(--foreground)' }

export function RecipeBadge({ result, language }: { result: RecipeBadgeResult; language: 'ko' | 'en' }) {
  const c = LEVEL_CONFIG[result.level]
  const isKo = language === 'ko'
  const sugarG = result.addedSugarPerMeal.toFixed(1)
  const sugarOk = result.addedSugarPerMeal < 8

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        style={{ ...BADGE_STYLE, background: c.bg, color: c.color }}
      >
        {c.emoji} {isKo ? c.ko : c.en}
      </PopoverTrigger>

      <PopoverContent className="w-72 text-sm" align="start" onClick={(e) => e.stopPropagation()}>

        {/* 첨가당 */}
        <div>
          <p style={LABEL_STYLE}>{isKo ? '첨가당' : 'Added Sugar'}</p>
          <p style={sugarOk ? STATUS_GOOD : STATUS_WARN}>
            {sugarOk
              ? (isKo ? '양호' : 'Good')
              : (isKo ? '주의' : 'Caution')}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
            {isKo
              ? `WHO 권장 한도 ${sugarOk ? '미만' : '초과'}이에요`
              : `${sugarOk ? 'Below' : 'Above'} WHO recommended limit`}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {isKo
              ? `현재 레시피 포함량: ${sugarG}g`
              : `This recipe: ${sugarG}g`}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {isKo
              ? 'WHO 권장량: 8g 미만/끼니'
              : 'WHO guideline: < 8g/meal'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', opacity: 0.5, marginTop: '4px' }}>
            {isKo
              ? '첨가당(자유당): 하루 총 에너지의 5% 미만.'
              : 'Added sugars: less than 5% of total daily energy.'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', opacity: 0.5 }}>
            {isKo
              ? '(예) 하루 권장 섭취 칼로리가 2,000kcal 일 경우, 첨가당은 하루 약 25g 이하로 섭취하는 것이 좋다.'
              : '(e.g.) For a 2,000kcal daily intake, aim for under 25g of added sugars per day.'}
          </p>
          {result.addedSugarItems.length > 0 && (
            <ul style={{ marginTop: '4px', paddingLeft: 0, listStyle: 'none', fontSize: '14px', color: 'var(--destructive)' }}>
              {result.addedSugarItems.map((item, i) => <li key={i}>- {item.nameKo}</li>)}
            </ul>
          )}
        </div>

        {/* 정제 탄수화물 */}
        <div style={SECTION_STYLE}>
          <p style={LABEL_STYLE}>{isKo ? '정제 탄수화물' : 'Refined Carbs'}</p>
          {result.refinedCarbItems.length === 0 ? (
            <p style={STATUS_GOOD}>{isKo ? '없음' : 'None'}</p>
          ) : (
            <>
              <p style={STATUS_WARN}>{isKo ? '주의 필요' : 'Caution'}</p>
              <ul style={{ marginTop: '4px', paddingLeft: 0, listStyle: 'none', fontSize: '14px', color: 'var(--destructive)' }}>
                {result.refinedCarbItems.map((item, i) => <li key={i}>- {item.nameKo}</li>)}
              </ul>
            </>
          )}
        </div>

      </PopoverContent>
    </Popover>
  )
}

export function MacroBadge({ result, language }: { result: RecipeBadgeResult; language: 'ko' | 'en' }) {
  const isKo = language === 'ko'
  const hasIssues = result.macroIssues.length > 0

  const bg = hasIssues ? 'var(--warning)' : 'var(--surface-sage)'
  const color = hasIssues ? 'var(--foreground)' : 'var(--primary)'
  const emoji = hasIssues ? '🟡' : '🟢'

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        style={{ ...BADGE_STYLE, background: bg, color }}
      >
        {emoji} {isKo ? '탄단지 균형' : 'Macros'}
      </PopoverTrigger>

      <PopoverContent className="w-72 text-sm" align="start" onClick={(e) => e.stopPropagation()}>
        <div>
          <p style={LABEL_STYLE}>{isKo ? '탄·단·지 비율' : 'Macro Balance'}</p>
          {hasIssues ? (
            <>
              <p style={STATUS_MID}>{isKo ? '불균형' : 'Imbalanced'}</p>
              <ul style={{ marginTop: '4px', paddingLeft: 0, listStyle: 'none', fontSize: '14px', color: 'var(--muted-foreground)' }}>
                {result.macroIssues.map((issue, i) => (
                  <li key={i}>{macroIssueText(issue, isKo)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p style={STATUS_GOOD}>{isKo ? '양호' : 'Good'}</p>
          )}
          <MacroChart macros={result.macrosPerMeal} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
