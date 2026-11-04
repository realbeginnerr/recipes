import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext'
import { SearchProvider } from '../src/context/SearchContext'
import { AboutPage } from '../src/pages/AboutPage'
import { EatingOutPage } from '../src/pages/EatingOutPage'
import { CookingSteps } from '../src/components/CookingSteps'
import { RecipeCard } from '../src/components/recipe/RecipeGrid'
import { ProductPreview } from '../src/components/product/ProductPreview'
import { PolicyPreview } from '../src/components/product/PolicyPreview'
import { ShippingPolicyFields } from '../src/components/product/PolicyFields'
import { TextField } from '../src/components/product/ProductFields'
import { emptyProduct } from '../src/utils/product'
import { emptyPolicies } from '../src/utils/shopPolicy'
import { ingredientMatchesSearch, recipeMatchesSearch } from '../src/utils/search'
import { getIngredientDisplayName, getUnitDisplayName } from '../src/utils/displayNames'
import { translateContent } from '../src/i18n/content'
import { recipes } from '../src/data/recipe'

vi.mock('../src/hooks/useScrollReveal', async () => {
  const { useRef } = await import('react')
  return { useScrollReveal: () => useRef(null) }
})

function LanguageControls() {
  const { setLanguage } = useLanguage()
  return <><button onClick={() => setLanguage('en')}>English</button><button onClick={() => setLanguage('ko')}>Korean</button></>
}
function show(children: ReactNode) {
  const view = render(<MemoryRouter><LanguageProvider><SearchProvider><LanguageControls /><main>{children}</main></SearchProvider></LanguageProvider></MemoryRouter>)
  return { ...view, main: screen.getByRole('main') }
}
function english() { fireEvent.click(screen.getByRole('button', { name: 'English', exact: true })) }
function korean() { fireEvent.click(screen.getByRole('button', { name: 'Korean', exact: true })) }
function expectEnglish(main: HTMLElement) {
  expect(main.textContent).not.toMatch(/[가-힣]/)
  for (const element of main.querySelectorAll('[aria-label], [placeholder], img[alt]')) {
    for (const attribute of ['aria-label', 'placeholder', 'alt']) expect(element.getAttribute(attribute) ?? '').not.toMatch(/[가-힣]/)
  }
}

it('shows the current recipe feature introduction in English and returns to the Korean original', () => {
  const { main } = show(<AboutPage />)
  expect(screen.getByRole('heading', { name: '인스타그램에서 본 레시피는 돼지고기 600g, 쿠팡에서 파는 돼지고기는 1kg라면?' })).toBeDefined()
  english()
  expect(screen.getByRole('heading', { name: 'What if you have a different amount of an ingredient than the recipe calls for?' })).toBeDefined()
  expect(screen.getByRole('heading', { name: 'Where was I in the recipe?' })).toBeDefined()
  expect(main.textContent).not.toContain('Your wounds')
  expectEnglish(main)
  korean()
  expect(screen.getByRole('heading', { name: /내 입맛\s*에 맞추기/ })).toBeDefined()
})

it('translates the complete eating-out article including the numeric fat target', () => {
  const { main } = show(<EatingOutPage />)
  english()
  expect(screen.getByRole('heading', { name: 'Remember these three things when eating out!' })).toBeDefined()
  expect(main.textContent).toContain("This site's per-meal fat target:")
  expectEnglish(main)
  korean()
  expect(main.textContent).toContain('식사할 때 다음 세가지를 꼭 기억하세요!')
})

it('translates a recipe with a Korean English-name field and supports English searching', () => {
  const recipe = { ...recipes[0], name: '무생채', nameKo: '무생채', items: [] }
  const { main } = show(<RecipeCard recipe={recipe} />)
  english()
  expect(screen.getByRole('heading', { name: 'Spicy Shredded Radish Salad' })).toBeDefined()
  expect(recipeMatchesSearch(recipe, 'shredded radish')).toBe(true)
  expectEnglish(main)
  expect(recipe.name).toBe('무생채')
})

it('translates current ingredient names and corrects mistranslations without modifying source data', () => {
  const ingredient = { id: 'crab', name: '게살 (수분 제거 후)', nameKo: '게살 (수분 제거 후)', baseUnit: 'g', baseAmount: 100, carbs: 0, protein: 20, fat: 1, conversions: { g: 1 }, allowedUnits: ['g'] }
  expect(getIngredientDisplayName(ingredient, 'en')).toBe('Crab Meat (Drained)')
  expect(ingredientMatchesSearch(ingredient, 'crab meat')).toBe(true)
  expect(getIngredientDisplayName({ ...ingredient, name: 'Sesame leaf' }, 'en')).toBe('Perilla Leaves')
  expect(getIngredientDisplayName(ingredient, 'ko')).toBe('게살 (수분 제거 후)')
  expect(ingredient.name).toBe('게살 (수분 제거 후)')
  expect(getUnitDisplayName('컵', 'en')).toBe('cup')
  expect(getUnitDisplayName('개', 'en')).toBe('each')
  expect(getUnitDisplayName('컵', 'ko')).toBe('컵')
})

it('keeps cooking progress when switching languages and stores the original step text', () => {
  const steps = [{ id: 'potato', text: '감자 깍뚝 썰어서 물에 10분 담궈놓기' }]
  function Steps() { const { language } = useLanguage(); return <CookingSteps recipeId="localization-test" steps={steps} ko={language === 'ko'} /> }
  const { main } = show(<Steps />)
  fireEvent.click(screen.getByRole('checkbox'))
  english()
  expect(screen.getByText('Dice the potatoes and soak in water for 10 minutes.')).toBeDefined()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  expect(JSON.parse(localStorage.getItem('recipe-cooking-progress:localization-test')!)).toEqual({ potato: steps[0].text })
  expectEnglish(main)
  korean()
  expect(screen.getByText(steps[0].text)).toBeDefined()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
})

it('translates product content and category tags in the customer preview', () => {
  const product = { ...emptyProduct(), name: '페퍼민트', description: '<p>티백 X. 35g</p>', teaTags: ['무카페인' as const] }
  const { main } = show(<ProductPreview product={product} settings={null} />)
  english()
  expect(screen.getByRole('heading', { name: 'Peppermint' })).toBeDefined()
  expect(screen.getByText('Caffeine-free')).toBeDefined()
  expect(screen.getByText('Loose leaf, not tea bags. 35 g')).toBeDefined()
  expectEnglish(main)
  expect(product.description).toBe('<p>티백 X. 35g</p>')
})

it('translates policy amounts, periods, carriers, and withdrawal exception descriptions', () => {
  const policies = emptyPolicies()
  Object.assign(policies.shipping, { carrier: 'CJ대한통운', leadDays: 2, fee: 3000, feeType: 'conditional', freeThreshold: 50000, jejuFee: 2000 })
  Object.assign(policies.exchange, { days: 7, changeFee: 3000 })
  policies.refund.exceptions = ['consumer-damage', 'used', 'perishable', 'custom']
  const { main } = show(<PolicyPreview policies={policies} />)
  english()
  expect(main.textContent).toContain('CJ Logistics')
  expect(main.textContent).toContain('3,000 KRW')
  expect(main.textContent).toContain('Dispatch within 2 business days')
  expect(main.textContent).toContain('Free on orders of 50,000 KRW or more')
  expectEnglish(main)
})

it('translates field labels and validation errors while retaining Korean stored carrier values', async () => {
  const changed = vi.fn()
  const user = userEvent.setup()
  const policies = emptyPolicies()
  policies.shipping.carrier = 'CJ대한통운'
  const { main } = show(<><ShippingPolicyFields value={policies.shipping} onChange={changed} /><TextField label="상품명" value="" onChange={() => {}} error="상품명을 입력해 주세요." /></>)
  english()
  expect(screen.getByText('Enter a product name.')).toBeDefined()
  expect(screen.getByText('CJ Logistics')).toBeDefined()
  expectEnglish(main)
  await user.click(screen.getByRole('combobox', { name: 'Carrier', exact: true }))
  await user.click(await screen.findByRole('option', { name: 'Korea Post', exact: true }))
  await waitFor(() => expect(changed).toHaveBeenCalledWith(expect.objectContaining({ carrier: '우체국택배' })))
})

it('translates stored notes line by line but never substitutes a stale translation after an edit', () => {
  expect(translateContent('- 165도 30분\n\n- 접시는 흰색 계열 쓰는게 좋을 듯.', 'en')).toBe('- 165°C for 30 minutes\n\n- A white or off-white plate would work well.')
  expect(translateContent('새롭게 수정한 메모', 'en')).toBe('새롭게 수정한 메모')
  expect(translateContent(recipes[0].memo, 'en')).not.toMatch(/[가-힣]/)
  expect(translateContent(recipes[1].memo, 'en')).not.toMatch(/[가-힣]/)
})
