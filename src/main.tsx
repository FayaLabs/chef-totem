import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import { totemConfig } from '@/config/totem.config'
import { applyTheme, defaultTheme } from '@/design/theme'
import '@/styles.css'

// Before the first paint: a tenant's brand is variables, not a fork. A palette
// that fails contrast warns loudly here instead of reaching a dining room.
applyTheme({ ...defaultTheme, ...totemConfig.theme })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
