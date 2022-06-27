import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Board from './Board';
import { loadTextures } from './textures';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export let gl: WebGLRenderingContext;

export async function loadGame(): Promise<void> {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      return;
   }
   gl = glAttempt;

   canvas.width = window.innerWidth;
   canvas.height = window.innerHeight;

   gl.viewport(0, 0, window.innerWidth, window.innerHeight);
   
   await loadTextures();
   Board.setup();

   // Main render loop
   const loop = (): void => {
      Board.update();
      Board.render();

      requestAnimationFrame(loop);
   }
   requestAnimationFrame(loop);
};