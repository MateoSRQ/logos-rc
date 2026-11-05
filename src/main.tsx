import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Host3DView } from './components/Host3DView'
import { MobileController } from './components/MobileController'
import './styles.css'

function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // If path starts with /controller or hash is #controller
  const isController =
    currentPath.startsWith('/controller') || window.location.hash === '#controller'

  if (isController) {
    return <MobileController />
  }

  return <Host3DView />
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />)
}
