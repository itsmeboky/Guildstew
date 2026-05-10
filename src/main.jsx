import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import '@/index.css'
// Dev-only: exposes window.seedTestCampaign() for quick combat-test seeding
import '@/utils/seedTestCampaign'
import { logHiringMessage } from '@/lib/consoleEasterEgg'

// Console easter egg — fires once before React renders so the ASCII
// art lands at the top of the DevTools log, ahead of React DevTools
// chatter and any app-bootstrap noise. Free recruitment marketing
// for the technical audience that opens consoles.
logHiringMessage()

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}



