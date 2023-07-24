import { useEffect, useState } from "react";
import { toggleTerminalVisiblity } from "./Terminal";

export let setTerminalButtonOpened: (isOpened: boolean) => void;

const TerminalButton = () => {
   const [isOpened, setIsOpened] = useState(false);

   useEffect(() => {
      setTerminalButtonOpened = (isOpened: boolean): void => {
         setIsOpened(isOpened);
      }
   }, []);

   return <button id="terminal-button" onClick={() => toggleTerminalVisiblity()} className={isOpened ? "opened" : undefined}>
      Terminal
   </button>;
}

export default TerminalButton;