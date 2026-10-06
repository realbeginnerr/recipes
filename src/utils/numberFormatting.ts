export function formatTableNumber(
  value: number,
  maximumFractionDigits = 20,
  minimumFractionDigits = 0,
): string {
  return new Intl.NumberFormat('en-US', {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}
