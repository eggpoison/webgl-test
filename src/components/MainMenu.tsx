import { useCallback, useRef, useState } from "react";
import { isDev } from "../utils";
import { setGameState } from "./App";

/** Checks whether a given username is valid or not */
const usernameIsValid = (username: string): [warning: string, isValid: false] | [warning: null, isValid: true] => {
   if (username.length > 15) return ["Name cannot be more than 15 characters long!", false];
   if (username.length === 0) return ["Name cannot be empty!", false];

   return [null, true];
}

interface MainMenuProps {
   readonly existingUsername: string | null;
   passUsername: (username: string) => void;
}
const MainMenu = ({ existingUsername, passUsername }: MainMenuProps) => {
   const startButtonRef = useRef<HTMLButtonElement | null>(null);
   const nameInputBoxRef = useRef<HTMLInputElement | null>(null);
   const [username, setUsername] = useState(existingUsername);

   // Handles username input
   const enterName = (): void => {
      // Get the inputted name
      const nameInputBox = nameInputBoxRef.current!;
      const inputUsername = nameInputBox.value;

      // If valid, set it as the username
      const [warning, isValid] = usernameIsValid(inputUsername);
      if (isValid) {
         setUsername(inputUsername);
      } else {
         alert(warning);
      }
   }
   // When the name is entered
   const pressEnter = (e: KeyboardEvent): void => {
      if (e.code === "Enter") {
         enterName();
         e.preventDefault();
      }
   }

   const startGame = useCallback(() => {
      passUsername(username!);
      setGameState("loading");
   }, [username, passUsername]);

   return <div id="main-menu">
      {username === null ? <>
         <div id="name-input-container">
            <input ref={nameInputBoxRef} name="name-input" onKeyDown={e => pressEnter(e.nativeEvent)} type="text" placeholder="Enter name here" autoFocus />
            <button onClick={enterName}>Play</button>
         </div>
      </> : <>
         <div className="content">
            <button onClick={startGame} ref={startButtonRef} autoFocus={isDev()}>Start</button>
         </div>
      </>}
   </div>;
}

export default MainMenu;