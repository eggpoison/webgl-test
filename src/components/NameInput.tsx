import { KeyboardEvent, useEffect, useRef } from "react";

const nameIsValid = (name: string): string | true => {
   if (name.length > 15) return "Name cannot be more than 15 characters long!";

   if (name.length === 0) return "Name cannot be empty!";

   return true;
}

let playerNameResolve: (value: string | PromiseLike<string>) => void;
export function getPlayerName(): Promise<string> {
   return new Promise(resolve => {
      playerNameResolve = resolve;
   });
}

const NameInput = () => {
   const nameInputBoxRef = useRef<HTMLInputElement | null>(null);

   useEffect(() => {
      nameInputBoxRef.current!.focus();
   }, []);

   const enterName = (): void => {
      // Get the inputted name
      const nameInputBox = nameInputBoxRef.current!;
      const inputName = nameInputBox.value;

      const inputNameValidityResult = nameIsValid(inputName);
      if (inputNameValidityResult === true) {
         if (typeof playerNameResolve !== "undefined") {
            playerNameResolve(inputName);
         }
      } else {
         alert(inputNameValidityResult);
      }
   }

   const pressEnter = (e: KeyboardEvent): void => {
      if (e.code === "Enter") {
         enterName();
      }
   }

   return (
      <div id="name-input">
         <input ref={nameInputBoxRef} onKeyDown={e => pressEnter(e)} type="text" placeholder="Enter name here" />
         <button onClick={enterName}>Play</button>
      </div>
   );
}

export default NameInput;