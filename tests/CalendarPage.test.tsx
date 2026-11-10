import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CalendarPage } from '../src/pages/CalendarPage'
import { calendarDateKey, calendarMonthDays, calendarToday, shiftCalendarMonth } from '../src/utils/calendar'
import { loadRecipesFromFirestore } from '../src/services/recipeService'
import type { Recipe } from '../src/types'

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: false }) }))
vi.mock('../src/services/recipeService', () => ({ loadRecipesFromFirestore: vi.fn(), mergeStaticAndFirestoreRecipes: (_static: Recipe[], documents: Recipe[]) => documents }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(loadRecipesFromFirestore).mockResolvedValue([]) })
afterEach(() => vi.useRealTimers())
async function showCalendar() { await act(async () => { render(<MemoryRouter><CalendarPage /></MemoryRouter>) }) }

it('includes leap days, complete weeks, and correct year boundaries', () => {
  const days = calendarMonthDays(new Date('2024-02-01T00:00:00Z'))
  expect(days).toHaveLength(42)
  expect(days[0].getUTCDay()).toBe(0)
  expect(days.at(-1)?.getUTCDay()).toBe(6)
  expect(days.map(calendarDateKey)).toContain('2024-02-29')
  expect(new Set(days.map(calendarDateKey)).size).toBe(42)
  expect(calendarDateKey(shiftCalendarMonth(new Date('2026-12-31T00:00:00Z'), 1))).toBe('2027-01-01')
  expect(calendarDateKey(shiftCalendarMonth(new Date('2026-01-01T00:00:00Z'), -1))).toBe('2025-12-01')
})

it('uses the Seoul date at midnight rather than the execution host timezone', () => {
  expect(calendarDateKey(calendarToday(new Date('2026-11-10T14:59:59Z')))).toBe('2026-11-10')
  expect(calendarDateKey(calendarToday(new Date('2026-11-10T15:00:00Z')))).toBe('2026-11-11')
})

it('navigates months, returns to today, and selects dates without writing records', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-10T01:00:00Z'))
  await showCalendar()
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('2026년 11월')
  expect(screen.getByRole('button', { name: /2026년 11월 10일/ }).getAttribute('aria-current')).toBe('date')
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('2026년 12월')
  fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('2027년 1월')
  fireEvent.click(screen.getByRole('button', { name: '오늘' }))
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('2026년 11월')
  fireEvent.click(screen.getByRole('button', { name: /2026년 11월 15일/ }))
  expect(screen.getByRole('button', { name: /2026년 11월 15일/ }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('heading', { level: 3 }).textContent).toContain('11월 15일')
  fireEvent.click(screen.getByRole('button', { name: /2026년 12월 1일/ }))
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('2026년 12월')
  expect(screen.queryByRole('button', { name: /등록|저장/ })).toBeNull()
})

it('shows a recipe on every cooking date, includes legacy dates, and links to details', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T01:00:00Z'))
  const base = { name: 'Shrimp udon', nameKo: '새우 볶음 우동', imageUrl: '', items: [], createdAt: 1 }
  vi.mocked(loadRecipesFromFirestore).mockResolvedValue([
    { ...base, id: 'udon', cookedDates: ['2026-11-10', '2026-01-01', '2026-11-10'] },
    { ...base, id: 'legacy', nameKo: '기존 날짜 요리', lastCookedAt: '2026-11-10' },
    { ...base, id: 'hidden', nameKo: '비공개 요리', hidden: true, cookedDates: ['2026-11-10'] },
    { ...base, id: 'cleared', nameKo: '기록 지운 요리', cookedDates: [], lastCookedAt: '2026-11-10' },
  ] as never)
  await showCalendar()
  const cell = screen.getByRole('button', { name: /2026년 11월 10일/ }).closest('td')!
  expect(within(cell).getAllByRole('link', { name: '새우 볶음 우동' })).toHaveLength(1)
  expect(within(cell).getByRole('link', { name: '새우 볶음 우동' }).getAttribute('href')).toBe('/recipe/udon')
  expect(within(cell).getByRole('link', { name: '기존 날짜 요리' })).toBeTruthy()
  expect(screen.queryByText('비공개 요리')).toBeNull()
  expect(screen.queryByText('기록 지운 요리')).toBeNull()
  for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
  const january = screen.getByRole('button', { name: /2026년 1월 1일/ }).closest('td')!
  expect(within(january).getByRole('link', { name: '새우 볶음 우동' })).toBeTruthy()
})

it('refreshes cooking records when returning from an edit screen', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-10T01:00:00Z'))
  const recipe = { id: 'test', name: 'Test', nameKo: '테스트 요리', imageUrl: '', items: [], cookedDates: ['2026-11-10'] }
  vi.mocked(loadRecipesFromFirestore).mockResolvedValueOnce([recipe] as never).mockResolvedValueOnce([{ ...recipe, cookedDates: [] }] as never)
  await showCalendar()
  expect(screen.getAllByRole('link', { name: '테스트 요리' }).length).toBeGreaterThan(0)
  await act(async () => { fireEvent(window, new Event('focus')) })
  expect(screen.queryByRole('link', { name: '테스트 요리' })).toBeNull()
  expect(screen.getByText('아직 요리 기록이 없어요.')).toBeTruthy()
})

it('distinguishes a failed load from a day with no records and supports retry', async () => {
  vi.mocked(loadRecipesFromFirestore).mockRejectedValueOnce(new Error('offline'))
  await showCalendar()
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('아직 요리 기록이 없어요.')).toBeNull()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '다시 시도' })) })
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByText('아직 요리 기록이 없어요.')).toBeTruthy()
})
