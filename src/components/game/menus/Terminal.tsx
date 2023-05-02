import { useEffect, useState } from "react";

const Terminal = () => {
   const [isInFocus, setIsInFocus] = useState(false);
   
   const focusTerminal = (): void => {
      setIsInFocus(true);
   }

   const unfocusTerminal = (): void => {
      setIsInFocus(false);
   }

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
         {isInFocus ? <div className="caret"></div> : null}
      </div>
   </div>;
}

export default Terminal;