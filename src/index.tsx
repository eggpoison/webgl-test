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

// export async function connect(): Promise<void> {
//    await setGameState(GameState.connecting);
   
//    // Attempt to connect to the server
//    const serverResponse = await Client.connectToServer();
//    if (serverResponse === null) {
//       setGameState(GameState.error);
//       return;
//    }

//    await setGameState(GameState.game);

//    // Initialise the canvas and gl variables, and configure the canvas
//    setupCanvas();
//    setupTextCanvas();

//    await loadTextures();
   
//    createEntityShaders();

//    Board.setup(serverResponse.tiles);
//    const position = Game.spawnPlayer(playerName, serverResponse.playerID);
//    Game.setup();
//    Game.start();

//    Client.sendInitialPlayerData(playerName, [position.x, position.y]);
// }

// export async function loadGame(): Promise<void> {
//    createEventListeners();

//    // Prompt the player name
//    playerName = await getPlayerName();

//    connect();
// };