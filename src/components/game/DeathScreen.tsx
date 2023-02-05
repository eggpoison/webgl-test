import { useEffect, useState } from "react";
import { randItem } from "webgl-test-shared";
import Client from "../../client/Client";
import Game from "../../Game";
import { resetUsername, setGameState, setLoadingScreenInitialStatus } from "../App";

const DEATH_TIPS: ReadonlyArray<string> = [
   "Always make sure your monitor is on, as otherwise it will not be on.",
   "Cyberbullying is a quick and effective way to get back at people after losing.",
   "Have you tried not dying?"
];

interface DeathScreenProps {
   readonly isDead: boolean;
}

const respawnPlayer = (): void => {
   Client.sendRespawnRequest();
}

const quitGame = (): void => {
   resetUsername();
   setLoadingScreenInitialStatus("establishing_connection");
   setGameState("main_menu");
   Game.stop();
   Client.disconnect();
}

const DeathScreen = ({ isDead }: DeathScreenProps) => {
   const [tip, setTip] = useState<string>("");

   const randomiseTip = (): void => {
      const newTip = randItem(DEATH_TIPS);
      setTip(newTip);
   }

   useEffect(() => {
      randomiseTip();
   }, []);

   if (!isDead) return null;
   
   return <div id="death-screen">
      <div className="content">
         <h1 className="title">YOU DIED</h1>

         <p className="tip">Tip: {tip}</p>

         <div className="button-container">
            <button onClick={respawnPlayer}>Respawn</button>
            <button onClick={quitGame}>Quit</button>
         </div>
      </div>

      <div className="bg"></div>
   </div>;
}

export default DeathScreen;