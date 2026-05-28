import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AnalyticsProvider } from 'emit-io-react'
import { emit } from './logger'
import { App } from './App'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <AnalyticsProvider client={emit} autoTrack>
      <App />
    </AnalyticsProvider>
  </StrictMode>,
)
