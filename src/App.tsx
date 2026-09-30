import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AddPagePasswordGate } from './components/AddPagePasswordGate'
import { AboutPage } from './pages/AboutPage'

const RecipePage = lazy(() => import('./pages/RecipePage').then(module => ({ default: module.RecipePage })))
const AddRecipePage = lazy(() => import('./pages/AddRecipePage').then(module => ({ default: module.AddRecipePage })))
const IngredientsPage = lazy(() => import('./pages/IngredientsPage').then(module => ({ default: module.IngredientsPage })))
const IngredientManagementPage = lazy(() => import('./pages/IngredientManagementPage').then(module => ({ default: module.IngredientsPage })))
const AddIngredientPage = lazy(() => import('./pages/AddIngredientPage').then(module => ({ default: module.AddIngredientPage })))
const SignupPage = lazy(() => import('./pages/SignupPage').then(module => ({ default: module.SignupPage })))
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then(module => ({ default: module.RecipeDetailPage })))
const RecipeManagementPage = lazy(() => import('./pages/RecipeManagementPage').then(module => ({ default: module.RecipeDetailPage })))
const EatingOutPage = lazy(() => import('./pages/EatingOutPage').then(module => ({ default: module.EatingOutPage })))

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
