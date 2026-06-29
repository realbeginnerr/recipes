import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/recipes/',   // ⭐ 이거 추가
  plugins: [react()],
})