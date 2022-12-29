import { useEffect, useState } from "react";
import { randItem } from "webgl-test-shared";

const DEATH_TIPS: ReadonlyArray<string> = [
   "Always make sure your monitor is on, as otherwise it will not be on.",
   "Cyberbullying is a quick and effective way to get back at people after losing.",
   "Water is fast and sneaky, do not trust it.",
   "Press the Alt + f3 keys together to open the help menu.",
   "Have you tried not dying?"
];

export let showDeathScreen: () => void;

const DeathScreen = () => {
   const [isVisible, setIsVisible] = useState<boolean>(false);
   const [tip, setTip] = useState<string>("");

   const randomiseTip = (): void => {
      const newTip = randItem(DEATH_TIPS);
      setTip(newTip);
   }

   useEffect(() => {
      randomiseTip();

      showDeathScreen = (): void => {
         setIsVisible(true);
      }
   }, []);

   if (!isVisible) return null;
   
   return <div id="death-screen">
      <div className="content">
         <h1 className="title">YOU DIED</h1>

         <p className="tip">Tip: {tip}</p>

         <div className="button-container">
            <button>Respawn</button>
            <button>Quit</button>
         </div>
      </div>

      <div className="bg"></div>
   </div>;
}

export default DeathScreen;