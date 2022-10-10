import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

import "./css/index.css";
import "./css/main-menu.css";
import "./css/loading-screen.css";
import "./css/game/chatbox.css";
import "./css/game/settings.css";
import "./css/game/pause-screen.css";
import "./css/game/cursor-tooltip.css";
import "./css/game/dev-entity-viewer.css";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);