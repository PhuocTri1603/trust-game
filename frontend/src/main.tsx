import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main>
      <div className="sun" aria-hidden="true">☀️</div>
      <h1>The Trust Garden</h1>
      <p>Two strangers. One shared garden. Ten choices.</p>
      <section aria-hidden="true"><span>🌱</span><span>🤝</span><span>🌻</span></section>
      <p className="note">A story-driven two-player game about trust.</p>
      <p className="status">Multiplayer is not available yet. This is the starter landing page.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
