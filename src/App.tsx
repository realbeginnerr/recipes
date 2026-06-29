import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RecipePage } from './pages/RecipePage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecipePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
