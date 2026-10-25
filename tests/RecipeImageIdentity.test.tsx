import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { expect, it } from 'vitest'
import { RecipeImagesEditor, recipeImageDrafts, type ImageDraft } from '../src/components/RecipeImagesEditor'
import { LanguageProvider } from '../src/context/LanguageContext'
const recipe = { id: 'test', name: 'Test', nameKo: '테스트', imageUrl: 'https://example.com/a.jpg', imageUrls: ['https://example.com/b.jpg'], images: [{ id: 'a', url: 'https://example.com/a.jpg' }, { id: 'b', url: 'https://example.com/b.jpg' }], items: [] }
it('preserves photo identity on reordering but replaces identity on URL changes', () => {
  function Editor() {
    const [images, setImages] = useState<ImageDraft[]>(recipeImageDrafts(recipe))
    return <><RecipeImagesEditor images={images} onChange={setImages} /><output data-testid="images">{JSON.stringify(images)}</output></>
  }
  render(<LanguageProvider><Editor /></LanguageProvider>)
  fireEvent.click(screen.getByRole('button', { name: '대표 사진으로' }))
  expect(JSON.parse(screen.getByTestId('images').textContent!).map((item: ImageDraft) => item.id)).toEqual(['b', 'a'])
  fireEvent.change(screen.getByLabelText('사진 1 URL'), { target: { value: 'https://example.com/new.jpg' } })
  expect(JSON.parse(screen.getByTestId('images').textContent!)[0].id).not.toBe('b')
})
