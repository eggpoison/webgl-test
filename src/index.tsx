import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { GameState, setGameState } from './App';
import { loadTextures } from './textures';
import Game from './Game';
import Client from './client/Client';
import Board from './Board';
import { createCircleProgram } from './webgl';

import './css/index.css';
import './css/name-input.css';
import './css/chatbox.css';
import { getPlayerName } from './components/NameInput';
import { setupTextCanvas } from './text-canvas';
import { clearPressedKeys } from './keyboard';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

let canvas: HTMLCanvasElement;
export let gl: WebGLRenderingContext;

export let windowWidth: number;
export let windowHeight: number;

const resizeCanvas = (): void => {
   if (typeof canvas === "undefined") return;

   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;

   gl.viewport(0, 0, window.innerWidth, window.innerHeight);

   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;
   textCanvas.width = window.innerWidth;
   textCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);

window.addEventListener("contextmenu", clearPressedKeys);

const setupCanvas = (): void => {
   canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      return;
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   resizeCanvas();
}

export async function loadGame(): Promise<void> {
   // Get the player name
   const playerName = await getPlayerName();

   setGameState(GameState.connecting);
   
   // Attempt to connect to the server
   const serverResponse = await Client.connectToServer();
   if (serverResponse === null) {
      setGameState(GameState.serverError);
      return;
   }

   await setGameState(GameState.game);

   // Initialise the canvas and gl variables, and configure the canvas
   setupCanvas();
   setupTextCanvas();
   
   // Load all textures
   await loadTextures();

   createCircleProgram();

   Board.setup(serverResponse.tiles);
   const position = Game.spawnPlayer(playerName);
   Game.setup();
   Game.start();

   Client.sendPlayerData(playerName, [position.x, position.y]);
};