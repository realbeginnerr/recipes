export function formatTableNumber(
  value: number,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
): string {
  return new Intl.NumberFormat('en-US', {
    useGrouping: true,
    minimumFractionDigits: Math.min(1, minimumFractionDigits, maximumFractionDigits),
    maximumFractionDigits: Math.min(1, maximumFractionDigits),
  }).format(value)
}
