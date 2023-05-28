import { useEffect, useRef, useState } from "react";
import { COMMANDS, CommandPermissions, CommandSpecifications, commandIsValid, parseCommand } from "webgl-test-shared";
import { isDev } from "../../../utils";
import Client from "../../../client/Client";

/**
 * Checks whether the player is using the terminal or not.
 */
export let playerIsUsingTerminal: () => boolean = () => false;

export let writeLineToTerminal: (line: string) => void = () => {};

const getCommandErrorMessage = (command: string): string => {
   const commandComponents = parseCommand(command);

   // Check if the command type exists
   let commandSpecifications: CommandSpecifications | null = null;
   for (const currentCommandSpecifications of COMMANDS) {
      if (currentCommandSpecifications.name === commandComponents[0]) {
         commandSpecifications = currentCommandSpecifications;
         break;
      }
   }
   if (commandSpecifications === null) {
      return `Invalid command! Unable to find command '${commandComponents[0]}'.`;
   }

   return "Invalid command! Mismatch of parameters.";
   // See if there is a configuration of parameters which matches the command
   // for (const configuration of commandSpecifications.configurations) {
   //    // Skip if the user doesn't have the required permissions
   //    if (!userHasCommandPermissions(configuration.permissions, CommandPermissions.dev)) continue;

   //    let isValid = true;
      
   //    // Check each parameter in the command
   //    for (const parameterID of configuration.parameterConfigurations) {
   //       const parameterSpecifications = findParameterSpecifications(commandSpecifications, parameterID);
   //       if (parameterSpecifications === null) throw new Error("Couldn't find the corresponding parameter!");

   //       if (!commandComponentMatchesParameter(commandComponents[parameterID], parameterSpecifications)) {
   //          isValid = false;
   //          break;
   //       }
   //    }

   //    if (isValid) return true;
}

const Terminal = () => {
   const lineInputRef = useRef<HTMLInputElement | null>(null);
   const caretRef = useRef<HTMLDivElement | null>(null);
   const [isInFocus, setIsInFocus] = useState(false);
   const [lines, setLines] = useState<Array<string>>([]);

   useEffect(() => {
      writeLineToTerminal = (line: string): void => {
         setLines(previousLines => previousLines.concat(line));
      }
   }, [lines]);
   
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

   const resetCaretFlicker = (): void => {
      if (caretRef.current === null) return;

      caretRef.current.style.animation = "none";
      void(caretRef.current.offsetHeight); // Trigger reflow
      caretRef.current.style.animation = "";
   }

   const resetCaretPosition = (): void => {
      if (lineInputRef.current !== null) {
         lineInputRef.current.style.width = "0";
      }

      resetCaretFlicker();
   }

   const updateCaretPosition = (): void => {
      if (lineInputRef.current === null) return;

      lineInputRef.current.style.width = lineInputRef.current.value.length + "ch";

      resetCaretFlicker();
   }

   const enterCommand = (): void => {
      if (lineInputRef.current === null) return;

      // Execute the command
      const command = lineInputRef.current.value;
      if (commandIsValid(command, isDev() ? CommandPermissions.dev : CommandPermissions.player)) {
         Client.sendCommand(command);
      } else {
         const errorMessage = getCommandErrorMessage(command);
         writeLineToTerminal(errorMessage);
      }

      // Clear the line input
      lineInputRef.current.value = "";
   }

   const enterLineCharacter = (): void => {
      updateCaretPosition();
   }

   const enterKey = (e: KeyboardEvent): void => {
      if (e.key === "Enter") {
         enterCommand();
         resetCaretPosition();
      }
   }

   useEffect(() => {
      playerIsUsingTerminal = (): boolean => {
         return isInFocus;
      }
   }, [isInFocus]);

   // When the terminal is closed, set isInFocus to false
   useEffect(() => {
      return () => {
         playerIsUsingTerminal = () => false;
      }
   }, []);

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
         {lines.map((line: string, i: number) => {
            return <div className="line" key={i}>
               {line}
            </div>;
         })}
      </div>

      <div className="line-reader">
         <span>&gt;</span>

         <div className="line-input-wrapper">
            <input ref={lineInputRef} type="text" className="line-input" onInput={enterLineCharacter} onKeyDown={e => enterKey(e.nativeEvent)} />
            <div className="dummy-line-input"></div>
         </div>

         {isInFocus ? <div ref={caretRef} className="caret"></div> : null}
      </div>
   </div>;
}

export default Terminal;