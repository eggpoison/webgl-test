import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { GameState, setGameState } from './App';
import { loadTextures } from './textures';
import Game from './Game';
import Client from './client/Client';
import Board from './Board';
import { createCircleShaders } from './webgl';

import './css/index.css';
import './css/name-input.css';
import './css/chatbox.css';
import { getPlayerName } from './components/NameInput';
import { setupTextCanvas } from './text-canvas';
import { clearPressedKeys } from './keyboard';
import { createEntityShaders } from './entity-rendering';

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
export let halfWindowWidth: number;
export let halfWindowHeight: number;

const resizeCanvas = (): void => {
   if (typeof canvas === "undefined") return;

   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;

   halfWindowWidth = windowWidth / 2;
   halfWindowHeight = windowHeight / 2;

   gl.viewport(0, 0, windowWidth, windowHeight);

   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;
   textCanvas.width = windowWidth;
   textCanvas.height = windowHeight;
}
window.addEventListener("resize", resizeCanvas);

window.addEventListener("contextmenu", clearPressedKeys);

const setupCanvas = (): void => {
   canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

   resizeCanvas();
}

let playerName: string;

export async function connect(): Promise<void> {
   await setGameState(GameState.connecting);
   
   // Attempt to connect to the server
   const serverResponse = await Client.connectToServer();
   if (serverResponse === null) {
      setGameState(GameState.error);
      return;
   }

   await setGameState(GameState.game);

   // Initialise the canvas and gl variables, and configure the canvas
   setupCanvas();
   setupTextCanvas();

   await loadTextures();
   
   createCircleShaders();
   createEntityShaders();

   Board.setup(serverResponse.tiles);
   const position = Game.spawnPlayer(playerName);
   Game.setup();
   Game.start();

   Client.sendPlayerData(playerName, [position.x, position.y]);
}

export async function loadGame(): Promise<void> {
   // Prompt the player name
   playerName = await getPlayerName();

   connect();
};