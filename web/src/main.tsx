import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cinzel/500.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/noto-sans-ethiopic/400.css'
import '@fontsource/noto-sans-ethiopic/600.css'
import '@fontsource/noto-naskh-arabic/400.css'
import '@fontsource/noto-naskh-arabic/600.css'
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
