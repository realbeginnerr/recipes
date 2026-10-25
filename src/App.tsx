import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AddPagePasswordGate } from './components/AddPagePasswordGate'
import { AboutPage } from './pages/AboutPage'
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })))

const RecipePage = lazy(() => import('./pages/RecipePage').then(module => ({ default: module.RecipePage })))
const RecipeRoulettePage = lazy(() => import('./pages/RecipeRoulettePage').then(module => ({ default: module.RecipeRoulettePage })))
const AddRecipePage = lazy(() => import('./pages/AddRecipePage').then(module => ({ default: module.AddRecipePage })))
const IngredientsPage = lazy(() => import('./pages/IngredientsPage').then(module => ({ default: module.IngredientsPage })))
const IngredientManagementPage = lazy(() => import('./pages/IngredientManagementPage').then(module => ({ default: module.IngredientsPage })))
const IngredientEditPage = lazy(() => import('./pages/IngredientEditPage').then(module => ({ default: module.IngredientEditPage })))
const AddIngredientPage = lazy(() => import('./pages/AddIngredientPage').then(module => ({ default: module.AddIngredientPage })))
const RecipeDetailPage = lazy(() => import('./pages/RecipeDetailPage').then(module => ({ default: module.RecipeDetailPage })))
const RecipeManagementPage = lazy(() => import('./pages/RecipeManagementPage').then(module => ({ default: module.RecipeDetailPage })))
const EatingOutPage = lazy(() => import('./pages/EatingOutPage').then(module => ({ default: module.EatingOutPage })))
const ProductEditPage = lazy(() => import('./pages/ProductEditPage').then(module => ({ default: module.ProductEditPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(module => ({ default: module.ProductDetailPage })))
const ShopPage = lazy(() => import('./pages/ShopPage').then(module => ({ default: module.ShopPage })))
const ShopSettingsPage = lazy(() => import('./pages/ShopSettingsPage').then(module => ({ default: module.ShopSettingsPage })))

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AboutPage />} />
        <Route path="admin" element={<AddPagePasswordGate key="admin"><AdminPage /></AddPagePasswordGate>} />
        <Route path="recipes" element={<RecipePage key="recipes" />} />
        <Route path="blending-tea" element={<ShopPage />} />
        <Route path="products/new" element={<AddPagePasswordGate key="new-product"><ProductEditPage /></AddPagePasswordGate>} />
        <Route path="products/:id/edit" element={<AddPagePasswordGate key="edit-product"><ProductEditPage /></AddPagePasswordGate>} />
        <Route path="product/:slug" element={<ProductDetailPage />} />
        <Route path="shop-settings" element={<AddPagePasswordGate key="shop-settings"><ShopSettingsPage /></AddPagePasswordGate>} />
        <Route path="recipe-roulette" element={<RecipeRoulettePage />} />
        <Route path="eating-out" element={<EatingOutPage />} />
        <Route path="about" element={<Navigate to="/" replace />} />
        <Route path="add-recipe" element={<AddPagePasswordGate key="add-recipe"><AddRecipePage /></AddPagePasswordGate>} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="ingredients/manage" element={<AddPagePasswordGate key="manage-ingredients"><IngredientManagementPage /></AddPagePasswordGate>} />
        <Route path="ingredient/:id/edit" element={<AddPagePasswordGate key="edit-ingredient"><IngredientEditPage /></AddPagePasswordGate>} />
        <Route path="add-ingredient" element={<AddPagePasswordGate key="add-ingredient"><AddIngredientPage /></AddPagePasswordGate>} />
        <Route path="recipe/:id" element={<RecipeDetailPage />} />
        <Route path="recipe/:id/edit" element={<AddPagePasswordGate key="edit-recipe"><RecipeManagementPage /></AddPagePasswordGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
