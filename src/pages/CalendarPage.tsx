import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Utensils } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAdmin } from '../context/AdminContext'
import { recipes as staticRecipes } from '../data/recipe'
import { loadRecipesFromFirestore, mergeStaticAndFirestoreRecipes } from '../services/recipeService'
import { getRecipeDisplayName } from '../utils/displayNames'
import { recipeCookingDates } from '../utils/recipeCookingDates'
import type { Recipe } from '../types'
import { PageIntro } from '../components/catalog/CatalogControls'
import { Button } from '../components/ui/button'
import { calendarDateKey, calendarMonthDays, calendarToday, shiftCalendarMonth } from '../utils/calendar'
import './CalendarPage.css'

export function CalendarPage() {
  const { language } = useLanguage()
  const { isAdmin } = useAdmin()
  const ko = language === 'ko'
  const [today, setToday] = useState(calendarToday)
  const [month, setMonth] = useState(() => shiftCalendarMonth(calendarToday(), 0))
  const [selected, setSelected] = useState(() => calendarDateKey(calendarToday()))
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError(false)
    loadRecipesFromFirestore().then(documents => {
      if (active) setRecipes(mergeStaticAndFirestoreRecipes(staticRecipes, documents).filter(recipe => isAdmin || !recipe.hidden))
    }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt, isAdmin])
  useEffect(() => {
    const update = () => setToday(calendarToday())
    const refresh = () => { update(); setAttempt(value => value + 1) }
    const interval = window.setInterval(update, 60_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [])
  const recipesByDate = useMemo(() => {
    const result = new Map<string, Recipe[]>()
    for (const recipe of [...recipes].sort((a, b) => getRecipeDisplayName(a, language).localeCompare(getRecipeDisplayName(b, language), language))) {
      for (const date of recipeCookingDates(recipe)) result.set(date, [...(result.get(date) ?? []), recipe])
    }
    return result
  }, [recipes, language])
  const selectedRecipes = recipesByDate.get(selected) ?? []
  const todayKey = calendarDateKey(today)
  const locale = ko ? 'ko-KR' : 'en-US'
  const monthLabel = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(month)
  const fullDate = (date: Date) => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' }).format(date)
  const days = calendarMonthDays(month)
  const weekdays = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  function goToday() { const value = calendarToday(); setToday(value); setMonth(shiftCalendarMonth(value, 0)); setSelected(calendarDateKey(value)) }
  return <div className="calendar-page" lang={language}>
    <PageIntro title={ko ? '캘린더' : 'Calendar'} description="" backgroundImage={`${import.meta.env.BASE_URL}images/service/04.jpg`} />
    <div className="calendar-container calendar-content">
      <div className="calendar-toolbar">
        <h2 id="calendar-month" aria-live="polite">{monthLabel}</h2>
        <div className="calendar-navigation">
          <Button type="button" variant="outline" size="compact" onClick={goToday}>{ko ? '오늘' : 'Today'}</Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={ko ? '이전 달' : 'Previous month'} onClick={() => setMonth(current => shiftCalendarMonth(current, -1))}><ChevronLeft aria-hidden="true" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={ko ? '다음 달' : 'Next month'} onClick={() => setMonth(current => shiftCalendarMonth(current, 1))}><ChevronRight aria-hidden="true" /></Button>
        </div>
      </div>
      {loading && <p role="status">{ko ? '요리 기록을 불러오는 중입니다…' : 'Loading cooking records…'}</p>}
      {error && <div role="alert" className="calendar-load-error">{ko ? '요리 기록을 불러오지 못했습니다.' : 'Unable to load cooking records.'}<Button type="button" variant="outline" onClick={() => setAttempt(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</Button></div>}
      <table className="cooking-calendar" aria-labelledby="calendar-month" aria-busy={loading}>
        <thead><tr>{weekdays.map((day, index) => <th key={day} scope="col" className={index === 0 ? 'is-sunday' : index === 6 ? 'is-saturday' : ''}>{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(date => {
          const key = calendarDateKey(date)
          const currentMonth = date.getUTCMonth() === month.getUTCMonth()
          const entries = !loading && !error ? recipesByDate.get(key) ?? [] : []
          return <td key={key} className={`${currentMonth ? '' : 'is-outside'} ${key === selected ? 'is-selected' : ''}`}>
            <button type="button" aria-label={fullDate(date)} aria-pressed={key === selected} aria-current={key === todayKey ? 'date' : undefined}
              onClick={() => { setSelected(key); if (!currentMonth) setMonth(shiftCalendarMonth(date, 0)) }}>
              <span className={`calendar-day-number${key === todayKey ? ' is-today' : ''}`}>{date.getUTCDate()}</span>
            </button>
            {!!entries.length && <ul className="calendar-day-recipes">{entries.slice(0, 3).map(recipe => <li key={recipe.id}><Link to={`/recipe/${encodeURIComponent(recipe.id)}`} title={getRecipeDisplayName(recipe, language)}>{getRecipeDisplayName(recipe, language)}</Link></li>)}</ul>}
            {entries.length > 3 && <button type="button" className="calendar-more" aria-label={ko ? `${fullDate(date)} 요리 ${entries.length}개 모두 보기` : `Show all ${entries.length} recipes for ${fullDate(date)}`} onClick={() => { setSelected(key); if (!currentMonth) setMonth(shiftCalendarMonth(date, 0)) }}>{ko ? `+${entries.length - 3}개 더 보기` : `+${entries.length - 3} more`}</button>}
          </td>
        })}</tr>)}</tbody>
      </table>
      <section className="calendar-records" aria-labelledby="calendar-selected-date">
        <h3 id="calendar-selected-date">{fullDate(new Date(`${selected}T00:00:00Z`))}</h3>
        {!loading && !error && (selectedRecipes.length ? <ul className="calendar-selected-recipes">{selectedRecipes.map(recipe => <li key={recipe.id}><Link to={`/recipe/${encodeURIComponent(recipe.id)}`}>{getRecipeDisplayName(recipe, language)}</Link></li>)}</ul> : <div className="calendar-empty"><Utensils size={24} strokeWidth={1.4} aria-hidden="true" /><p>{ko ? '아직 요리 기록이 없어요.' : 'No cooking records yet.'}</p></div>)}
      </section>
    </div>
  </div>
}
