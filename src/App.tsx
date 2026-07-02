import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RecipePage } from './pages/RecipePage'
import { AddRecipePage } from './pages/AddRecipePage'
import { IngredientsPage } from './pages/IngredientsPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipePage />} />
        <Route path="add-recipe" element={<AddRecipePage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
