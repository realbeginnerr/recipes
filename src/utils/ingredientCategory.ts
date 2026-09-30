import type { Ingredient } from '../types'

export type IngredientCategory = '탄수화물' | '단백질' | '지방' | '채소' | '과일' | '기타'

// Classify the food itself, not a brand, an English substring, or the largest
// macro in a small serving. Specific processed foods precede their ingredients.
const rules: [IngredientCategory, RegExp][] = [
  ['기타', /^(고춧가루|고추장|굴소스|그린커리|돈까스 소스|된장|레몬즙|매실액|메밀소바 소스|멸치액젓|맛술|베이킹|사골 곰탕|소금|설탕|꿀|시나몬|식초|알룰로스|진간장|양조간장|카레가루|참치액|치킨스톡|카카오|크림소스|토마토 소스|토마토 페이스트|후추|흑후추|조미료|홀그레인머스터드|발사믹|드라이이스트|인스턴트드라이이스트|코인육수|생강즙|까나리액젓|소고기 육수|칠리 파우더|큐민|물$)/],
  ['지방', /^(땅콩버터|무염버터|버터|마요네즈|생크림|아몬드|깨|참깨|들깨|잣|캐슈넛|케슈넛|호두|땅콩|견과|올리브|오일|식용유|참기름|들기름)/],
  ['과일', /^(딸기|무화과|바나나|복숭아|사과|수박|아보카도|자두|참외|천도|포도|블루베리|오렌지|레몬|망고|키위)/],
  ['채소', /^(가지|김 \(|김밥김|꽈리고추|깻잎|다진마늘|다진 마늘|단무지|단호박|당근|대파|무$|무 \(|바질|배추김치|버섯|봄동|부추|브로콜리|숙주나물|썬드라이 토마토|알배추|애호박|양배추|양파|오이|청경채|콩나물|토마토홀|토마토 \(|파프리카|청고추|홍고추|고추$|다진생강|마늘|다진 토마토|시금치|상추|미역)/],
  ['탄수화물', /^(감자|고구마|파스타면|냉면|뇨끼|당면|도토리묵|또띠아|라이스페이퍼|라가토니|리가토니|만두피|메밀면|모닝빵|미숫가루|강력분|박력분|중력분|밀가루|베이글|베트남쌀국수|빵가루|소면|순대|식빵|오트밀|옥수수|통조림 옥수수|유부초밥|쌀|쫄면|찹쌀가루|통밀빵|튀김가루|잡곡밥|떡|현미|백미|귀리|퀴노아)/],
  ['단백질', /^(계란|달걀|고등어|그릭 요거트|다짐육|다진 소고기|닭|대두가루|돈까스|돼지|두부|등갈비|멸치|부라타 치즈|삶은 병아리콩|새우|소고기|어묵|우유|호랑이콩|서리태콩|쭈꾸미|주꾸미|참치|치즈|콩국물|팥|강낭콩|단백질파우더|연어|황태|요거트|요구르트)/],
]

export function reviewedIngredientCategory(ingredient: Pick<Ingredient, 'name' | 'nameKo'>): IngredientCategory | undefined {
  // Korean catalog names are authoritative; do not concatenate translated names.
  const name = (ingredient.nameKo || ingredient.name).trim().normalize('NFC')
  return rules.find(([, pattern]) => pattern.test(name))?.[0]
}

export function ingredientCategory(ingredient: Pick<Ingredient, 'name' | 'nameKo'>, saved?: string, reference?: string): IngredientCategory {
  const reviewed = reviewedIngredientCategory(ingredient)
  if (reviewed) return reviewed
  for (const category of [saved, reference]) {
    if (category === '채소류') return '채소'
    if (category === '고기류') return '단백질'
    if (category && ['탄수화물', '단백질', '지방', '채소', '과일', '기타'].includes(category)) return category as IngredientCategory
  }
  return '기타'
}
