import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './index.css'
import * as amplitude from '@amplitude/analytics-browser'

amplitude.init('691b8ae0f6de739ca491823aec0e2071', { defaultTracking: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/recipes/">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
