import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SiaProvider } from './sia/SiaContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiaProvider>
      <App />
    </SiaProvider>
  </StrictMode>,
)
