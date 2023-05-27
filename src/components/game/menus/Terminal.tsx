import { useEffect, useRef, useState } from "react";

/**
 * Checks whether the player is using the terminal or not.
 */
export let playerIsUsingTerminal: () => boolean = () => false;

const Terminal = () => {
   const lineInputRef = useRef<HTMLInputElement | null>(null);
   const [isInFocus, setIsInFocus] = useState(false);
   
   const focusTerminal = (e: MouseEvent): void => {
      setIsInFocus(true);

      // Focus the line input
      if (lineInputRef.current !== null) {
         // Stop the click from registering so the focus is given to the line input
         e.preventDefault();
         
         lineInputRef.current.focus();
      }
   }

   const unfocusTerminal = (): void => {
      setIsInFocus(false);
   }

   const updateLineInputLength = (): void => {
      if (lineInputRef.current === null) return;

      setTimeout(() => {
         if (lineInputRef.current === null) return;

         const numCharacters = lineInputRef.current.value.length;
         lineInputRef.current.style.width = numCharacters + "ch";
      }, 5);
   }

   const enterCommand = (): void => {
      if (lineInputRef.current === null) return;

      // Execute the command
      const command = lineInputRef.current.value;
      console.log(command);

      // Clear the line input
      lineInputRef.current.value = "";
   }

   const enterLineCharacter = (e: KeyboardEvent): void => {
      if (e.key === "Enter") {
         enterCommand();
      }

      updateLineInputLength();
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

   return <div id="terminal" className={isInFocus ? "focused" : undefined} onMouseDown={e => focusTerminal(e.nativeEvent)}>
      <div className="lines">

      </div>

      <div className="line-reader">
         <span>&gt;</span>
         <input ref={lineInputRef} type="text" className="line-input" onKeyDown={e => enterLineCharacter(e.nativeEvent)} />
         {isInFocus ? <div className="caret"></div> : null}
      </div>
   </div>;
}

export default Terminal;