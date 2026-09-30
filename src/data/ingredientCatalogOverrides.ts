export const retiredIngredientIds = new Set([
  'PVB1l0VMQQh0Nmr1Sa7h',
  '329iyOIuuBoku04FYSoc',
  'csv-b9526ace8620b8365bf94992',
  'csv-d28b20496a4e3c637c6ae798',
  'csv-6fe7d889fe1a809638709cd6',
  'THpcK1CLYcnCS3ZEilmj',
  'UvpnGsTEJRDrK2dskUeZ',
  'XH0zw778N0QnIz1Q9ys5',
  '8PBt3uMKbJXoo0SLSFd8',
])

export function canonicalIngredientId(id: string): string {
  return id === 'PVB1l0VMQQh0Nmr1Sa7h' ? 'KiclanzESLnu5nzgri5x' : id
}

export const ingredientNameOverrides: Record<string, { name: string; nameKo: string }> = {
  'WV1sky3mHn3Rc2ZESnLf': { name: 'Ginger powder', nameKo: '생강가루 (생강분말)' },
  'jEqm93wSTmv5KCvkGM9q': { name: '강력분 (백설. 밀가루)', nameKo: '강력분 (백설. 밀가루)' },
  '9WeXrM3WaIuTgQLipEdZ': { name: 'onion', nameKo: '양파' },
}
