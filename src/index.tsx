import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { createPlayerInputListeners } from './player-input';

import "./css/index.css";
import "./css/main-menu.css";
import "./css/loading-screen.css";
import "./css/game/chatbox.css";
import "./css/game/menus/settings.css";
import "./css/game/death-screen.css";
import "./css/game/pause-screen.css";
import "./css/game/health-bar.css";
import "./css/game/inventory.css";
import "./css/game/menus/crafting-menu.css";
import "./css/game/menus/backpack-inventory.css";
import "./css/game/nerd-vision/terminal.css";
import "./css/game/nerd-vision/nerd-vision.css";
import "./css/game/nerd-vision/game-info-display.css";
import "./css/game/nerd-vision/cursor-tooltip.css";
import "./css/game/nerd-vision/entity-viewer.css";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
      <App />
  </React.StrictMode>
);

window.addEventListener("load", () => {
   createPlayerInputListeners();
});