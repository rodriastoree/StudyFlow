import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ConfirmEmailPage } from './components/auth/ConfirmEmailPage.tsx'

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const rootComponent = currentPath === '/confirm-email' ? <ConfirmEmailPage /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {rootComponent}
  </StrictMode>,
)
