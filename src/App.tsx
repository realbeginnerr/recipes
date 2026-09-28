import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AddPagePasswordGate } from './components/AddPagePasswordGate'
import { RecipePage } from './pages/RecipePage'
import { AddRecipePage } from './pages/AddRecipePage'
import { IngredientsPage } from './pages/IngredientsPage'
import { IngredientsPage as IngredientManagementPage } from './pages/IngredientManagementPage'
import { AddIngredientPage } from './pages/AddIngredientPage'
import { SignupPage } from './pages/SignupPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeDetailPage as RecipeManagementPage } from './pages/RecipeManagementPage'
import { EatingOutPage } from './pages/EatingOutPage'
import { AboutPage } from './pages/AboutPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AboutPage />} />
        <Route path="recipes" element={<RecipePage />} />
        <Route path="eating-out" element={<EatingOutPage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="add-recipe" element={<AddPagePasswordGate key="add-recipe"><AddRecipePage /></AddPagePasswordGate>} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="ingredients/manage" element={<IngredientManagementPage />} />
        <Route path="add-ingredient" element={<AddPagePasswordGate key="add-ingredient"><AddIngredientPage /></AddPagePasswordGate>} />
        <Route path="recipe/:id" element={<RecipeDetailPage />} />
        <Route path="recipe/:id/edit" element={<RecipeManagementPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
