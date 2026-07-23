// Glycemic Index values by Korean ingredient name (primary key)
// Sources: International GI database, Sydney University GI Research Service
const GI_BY_KO: Record<string, number> = {
  // Proteins — GI = 0
  '닭다리살': 0, '닭가슴살': 0, '닭': 0, '치킨': 0,
  '다진 소고기': 0, '소고기': 0, '쇠고기': 0,
  '돼지고기': 0, '삼겹살': 0, '목살': 0,
  '연어': 0, '참치': 0, '새우': 0, '생선': 0, '멸치': 0,
  '계란': 0, '달걀': 0,

  // Oils — GI = 0
  '올리브 오일': 0, '참기름': 0, '들기름': 0, '식용유': 0, '버터': 0,

  // Salt/spices — GI = 0
  '소금': 0, '흑후추': 0, '후추': 0, '고춧가루': 0,
  '칠리 파우더': 0, '큐민 가루': 0, '파프리카 파우더': 0,

  // Stock — GI = 0
  '소고기 육수': 0, '닭 육수': 0, '육수': 0,

  // Vegetables (low GI)
  '양파': 10, '마늘': 30, '파': 15, '대파': 15, '쪽파': 15,
  '당근': 39, '브로콜리': 15, '시금치': 15,
  '배추': 15, '양배추': 15, '오이': 15, '애호박': 15, '가지': 15,
  '고추': 15, '피망': 15, '파프리카': 15,
  '버섯': 15, '팽이버섯': 15, '느타리버섯': 15, '표고버섯': 15,
  '콩나물': 15, '숙주': 15, '깻잎': 15,
  '토마토': 15, '다진 토마토': 15,
  '토마토 페이스트': 45,
  '감자': 78, '고구마': 63,

  // Legumes
  '강낭콩': 52, '검은콩': 42, '렌틸콩': 32, '병아리콩': 36, '두부': 15,

  // Grains & starches (cooked)
  '잡곡밥': 55, '현미밥': 55, '백미밥': 72, '쌀밥': 72, '쌀': 72,
  '국수': 53, '소면': 53, '쫄면': 50, '냉면': 45, '라면': 73,
  '파스타': 45, '빵': 70, '식빵': 70,
  '밀가루': 85, '전분': 95,

  // Dairy
  '우유': 32, '요거트': 36, '치즈': 15,

  // Condiments
  '고추장': 60, '된장': 40, '간장': 20, '쌈장': 55,
  '케찹': 55, '마요네즈': 0, '식초': 0,
  '설탕': 65, '꿀': 58, '물엿': 75,
  '다시마': 15,
}

export function getGI(nameKo?: string, name?: string, gi?: number): number | undefined {
  if (gi !== undefined) return gi
  if (nameKo) {
    if (GI_BY_KO[nameKo] !== undefined) return GI_BY_KO[nameKo]
    for (const [key, value] of Object.entries(GI_BY_KO)) {
      if (nameKo.includes(key) || key.includes(nameKo)) return value
    }
  }
  return undefined
}

export function getGL(gi: number | undefined, carbs: number): number | undefined {
  if (gi === undefined) return undefined
  return (gi * carbs) / 100
}

export function fmtGL(gi: number | undefined, carbs: number): string {
  const gl = getGL(gi, carbs)
  if (gl === undefined) return '—'
  return gl.toFixed(1)
}

export function glColor(gi: number | undefined, carbs: number): string | undefined {
  const gl = getGL(gi, carbs)
  if (gl === undefined) return undefined
  if (gl >= 20) return '#dc2626'
  if (gl >= 11) return '#fb923c'
  return undefined
}
