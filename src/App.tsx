import { useEffect, useRef } from "react";
import { loadGame } from ".";

function App() {
   const hasLoaded = useRef<boolean>(false);

   useEffect(() => {
      if (!hasLoaded.current) {
         hasLoaded.current = true;
         loadGame();
      }
   }, []);

   return (
      <canvas id="game-canvas" width="800" height="600"></canvas>
   );
}

export default App;
