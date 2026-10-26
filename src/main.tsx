import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import EmailChooser from './components/EmailChooser'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* On a computer: email links go to Gmail, the email program, or are copied */}
      <EmailChooser />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
