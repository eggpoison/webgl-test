import { useRef } from "react";
import { randItem } from "webgl-test-shared";

// :)
const FLAVOUR_TEXTS: ReadonlyArray<string> = [
   "Eat your vegetables do drugs",
   "Eat your drugs do vegetables",
   "I am part of a pause menu.",
   "Water is fast and sneaky and I do not trust it"
];

const getRandomFlavourText = (): string => {
   return randItem(FLAVOUR_TEXTS);
}

const PauseScreen = () => {
   const flavourText = useRef<string>(getRandomFlavourText());

   return <div id="pause-screen">
      <div className="main">
         <h1><span className="left">&gt;&gt;</span> Paused <span className="right">&lt;&lt;</span></h1>

         <p>{flavourText.current}</p>
      </div>
      
      <div className="bg"></div>
   </div>;
}

export default PauseScreen;