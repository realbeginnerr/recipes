const REFINED_CARB_KO = new Set([
  '백미밥', '흰쌀밥', '쌀밥', '쌀',
  '국수', '소면', '우동', '라면', '쫄면', '냉면',
  '파스타', '스파게티',
  '식빵', '빵',
  '밀가루', '전분',
  '물엿',
])

const ADDED_SUGAR_KO = new Set([
  '설탕', '흑설탕', '황설탕', '백설탕',
  '꿀', '벌꿀',
  '메이플시럽', '메이플 시럽',
  '조청',
  '시럽',
  '아가베', '아가베시럽',
  '과당', '포도당', '올리고당',
  '액상과당',
  '맛술',
])

export function isRefinedCarb(nameKo?: string, _name?: string, flag?: boolean): boolean {
  if (flag !== undefined) return flag
  if (nameKo) {
    if (REFINED_CARB_KO.has(nameKo)) return true
    for (const key of REFINED_CARB_KO) {
      if (nameKo.includes(key)) return true
    }
  }
  return false
}

export function isAddedSugarIngredient(nameKo?: string): boolean {
  if (!nameKo) return false
  if (ADDED_SUGAR_KO.has(nameKo)) return true
  for (const key of ADDED_SUGAR_KO) {
    if (nameKo.includes(key)) return true
  }
  return false
}
