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
import "./css/game/inventories/inventory.css";
import "./css/game/inventories/hotbar.css";
import "./css/game/inventories/cooking-inventory.css";
import "./css/game/inventories/tribesman-inventory.css";
import "./css/game/inventories/barrel-inventory.css";
import "./css/game/inventories/backpack-inventory.css";
import "./css/game/inventories/tombstone-epitaph.css";
import "./css/game/charge-meter.css";
import "./css/game/menus/crafting-menu.css";
import "./css/game/nerd-vision/nerd-vision.css";
import "./css/game/nerd-vision/game-info-display.css";
import "./css/game/nerd-vision/cursor-tooltip.css";
import "./css/game/nerd-vision/terminal-button.css";
import "./css/game/nerd-vision/terminal.css";
import "./css/game/nerd-vision/debug-info.css";
import "./css/game/nerd-vision/frame-graph.css";
import "./css/game/tech-tree.css";
import "./css/game/research-bench-caption.css";
import "./css/tribe-selection-screen.css";

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