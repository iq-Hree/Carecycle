import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

// Gives every button a brief, visible "tap" flash on click, in addition to
// the :active press state, so a click always reads as registered even on a
// very quick tap (this is theme-independent, unlike relying on colors alone).
document.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement)?.closest('button')
  if (!target) return
  target.classList.remove('tap-flash')
  // force reflow so the animation restarts on rapid repeat taps
  void target.offsetWidth
  target.classList.add('tap-flash')
  window.setTimeout(() => target.classList.remove('tap-flash'), 420)
}, true)

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
