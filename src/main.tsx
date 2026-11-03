import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import EmailChooser from './components/EmailChooser'
import { DESIGN_KEY, startDesign } from './lib/design'
import { supabase, isConfigured } from './lib/supabase'

// The shared look (Staff → Web page design): the browser's remembered copy is already on the page
// (design.ts applies it as it loads); this refreshes it. Offline or on an error, the remembered one stays.
startDesign(async () => {
  if (!isConfigured) throw new Error('not configured')
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', DESIGN_KEY).limit(1).maybeSingle()
  if (error) throw error
  return data?.value ?? null
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* On a computer: email links go to Gmail, the email program, or are copied */}
      <EmailChooser />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
