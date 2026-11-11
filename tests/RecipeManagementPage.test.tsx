import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { RecipeDetailPage as RecipeManagementPage } from '../src/pages/RecipeManagementPage'
import { loadRecipesFromFirestore, updateRecipeInFirestore } from '../src/services/recipeService'

vi.mock('../src/context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }), useUiCopy: () => (text: string) => text }))
vi.mock('../src/context/AdminContext', () => ({ useAdmin: () => ({ isAdmin: true }) }))
vi.mock('../src/services/ingredientService', () => ({ loadIngredientsFromFirestore: vi.fn() }))
vi.mock('../src/services/recipeService', () => ({
  loadRecipesFromFirestore: vi.fn(async () => []),
  mergeStaticAndFirestoreRecipes: () => [{ id: 'test', name: 'Original', imageUrl: '', items: [] }],
  updateRecipeInFirestore: vi.fn(), deleteRecipeFromFirestore: vi.fn(),
}))
vi.mock('../src/components/RecipeTable', () => ({
  RecipeTable: ({ recipe, onSaveRecipe, defaultEditing }: any) => <>
    <p>{defaultEditing ? 'Edit form' : 'Saved management view'}</p>
    <button onClick={() => void onSaveRecipe({ ...recipe, name: 'Updated' }).catch(() => {})}>Save</button>
  </>,
}))

it('returns directly to the detail route only after the edit is saved successfully', async () => {
  let complete!: () => void
  vi.mocked(updateRecipeInFirestore).mockRejectedValueOnce(new Error('offline'))
    .mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve }))
  render(<MemoryRouter initialEntries={['/recipe/test/edit']}><Routes>
    <Route path="/recipe/:id/edit" element={<RecipeManagementPage />} />
    <Route path="/recipe/:id" element={<p>Recipe detail</p>} />
  </Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
  await waitFor(() => expect(updateRecipeInFirestore).toHaveBeenCalledTimes(1))
  expect(screen.getByText('Edit form')).toBeTruthy()
  expect(screen.queryByText('Recipe detail')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText('Edit form')).toBeTruthy()
  complete()
  expect(await screen.findByText('Recipe detail')).toBeTruthy()
  expect(screen.queryByText('Edit form')).toBeNull()
  expect(updateRecipeInFirestore).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Updated' }))
})

it('distinguishes a load failure from a missing recipe and retries', async () => {
  vi.mocked(loadRecipesFromFirestore).mockRejectedValueOnce(new Error('offline'))
  render(<MemoryRouter initialEntries={['/recipe/test/edit']}><Routes>
    <Route path="/recipe/:id/edit" element={<RecipeManagementPage />} />
  </Routes></MemoryRouter>)
  expect(await screen.findByText('Could not load the recipe.')).toBeTruthy()
  expect(screen.queryByText('Recipe not found')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('Edit form')).toBeTruthy()
})
