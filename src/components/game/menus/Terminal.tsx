import { useEffect, useState } from "react";

/**
 * Checks whether the player is using the terminal or not.
 */
export let playerIsUsingTerminal: () => boolean = () => false;

const Terminal = () => {
   const [isInFocus, setIsInFocus] = useState(false);
   
   const focusTerminal = (): void => {
      setIsInFocus(true);
   }

   const unfocusTerminal = (): void => {
      setIsInFocus(false);
   }

   useEffect(() => {
      playerIsUsingTerminal = (): boolean => {
         return isInFocus;
      }
   }, [isInFocus]);

   useEffect(() => {
      const checkForTerminalUnfocus = (e: MouseEvent): void => {
         let hasClickedOffTerminal = true;
         for (const element of e.composedPath()) {
            if ((element as HTMLElement).id === "terminal") {
               hasClickedOffTerminal = false;
               break;
            }
         }
   
         if (hasClickedOffTerminal) {
            unfocusTerminal();
         }
      }

      window.addEventListener("mousedown", e => checkForTerminalUnfocus(e));

      return () => {
         window.removeEventListener("mousedown", checkForTerminalUnfocus);
      }
   }, []);

   return <div id="terminal" className={isInFocus ? "focused" : undefined} onMouseDown={focusTerminal}>
      <div className="lines">

      </div>

      <div className="line-reader">
         <span>&gt;</span>
         <input type="text" className="line-input" />
         {isInFocus ? <div className="caret"></div> : null}
      </div>
   </div>;
}

export default Terminal;