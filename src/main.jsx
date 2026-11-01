import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PuntoNexusProvider } from './context/PuntoNexusContext'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <PuntoNexusProvider>
      <App />
    </PuntoNexusProvider>
  </StrictMode>,
);

// Ocultar el splash screen con transición suave una vez React esté montado
const hideSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 650);
  }
};

// Esperar un breve momento para que el primer paint de React sea visible
setTimeout(hideSplash, 900);

