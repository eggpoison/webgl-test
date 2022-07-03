import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { loadTextures } from './textures';
import Game from './Game';
import { connectToServer } from './client';

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
   // Update the size of the canvas
   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;
   windowWidth = window.innerWidth;
   windowHeight = window.innerHeight;
   gl.viewport(0, 0, window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resizeCanvas)

export async function loadGame(): Promise<void> {
   canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      return;
   }
   gl = glAttempt;

   resizeCanvas();
   
   await loadTextures();

   const serverResponse = await connectToServer();
   if (serverResponse === null) {
      alert("Failed to connect to the server!");
      return;
   }

   Game.setup();
};