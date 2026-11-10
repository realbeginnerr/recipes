export function calendarDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function calendarToday(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value)
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')))
}

export function calendarMonthDays(month: Date): Date[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
  return Array.from({ length: 42 }, (_, index) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - first.getUTCDay() + index)))
}

export function shiftCalendarMonth(month: Date, direction: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + direction, 1))
}
