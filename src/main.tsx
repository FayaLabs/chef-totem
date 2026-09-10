import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import { totemConfig } from '@/config/totem.config'
import { applyTheme, defaultTheme } from '@/design/theme'
import { loadTenantBrand } from '@/config/tenant-brand'
import '@/styles.css'

// Before the first paint: a tenant's brand is variables, not a fork. A palette
// that fails contrast warns loudly here instead of reaching a dining room.
applyTheme({ ...defaultTheme, ...totemConfig.theme })

// Fire and forget: the panel paints the configured name immediately and swaps
// to the tenant's own as soon as the pool answers. Awaiting it here would hold
// the first paint hostage to a network round trip.
void loadTenantBrand()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
