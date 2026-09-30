import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/ingredientCategory.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } })
const exports = {}
new Function('exports', outputText)(exports)
const { ingredientCategory } = exports
const cases = {
  채소: ['가지', '콩나물', '숙주나물', '깻잎', '꽈리고추', '청경채', '무', '김밥김', '단호박 (찐 것)', '썬드라이 토마토 (기름제거)'],
  과일: ['무화과', '복숭아', '수박', '참외 (중 사이즈)', '천도', '자두. 딱딱. 작은 것'],
  탄수화물: ['강력분 (백설. 밀가루)', '찹쌀가루', '빵가루', '튀김가루', '뇨끼', '만두피 (곰곰)', '고구마', '식빵 (널담 고단백 저당 슬랩)'],
  단백질: ['고등어', '대두가루 (노란콩 가루)', '단백질파우더', '콩국물 (이마트 두부코너)', '쭈꾸미 손질된 것', '두부'],
  지방: ['깨 (들깨가루)', '아몬드 가루', '마요네즈 (하프)', '올리브유', '잣', '생크림'],
  기타: ['멸치액젓', '참치액', '소고기 육수', '레몬즙', '돈까스 소스', '카레가루', '토마토 소스. 폰타나', '베이킹파우더'],
}
for (const [expected, names] of Object.entries(cases)) {
  for (const nameKo of names) {
    // Both stale saved tags and unrelated translated keywords must lose to
    // the reviewed food classification used by cards and category filters.
    assert.equal(ingredientCategory({ nameKo, name: 'chicken egg rice butter' }, '단백질', '고기류'), expected, nameKo)
  }
}
assert.equal(ingredientCategory({ name: 'New food' }, '채소'), '채소')
assert.equal(ingredientCategory({ name: 'New food' }), '기타')
console.log('Ingredient category regressions passed.')
