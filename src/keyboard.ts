import { GameState, getGameState } from "./App";
import { chatboxIsFocused, focusChatbox } from "./components/ChatBox";

const pressedKeys: { [key: string]: boolean } = {};

const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

export function clearPressedKeys(): void {
   for (const key of Object.keys(pressedKeys)) {
      pressedKeys[key] = false;
   }
}

const handleCapsLockPress = (): void => {
   let letters!: Array<string>;
   let otherLetters!: Array<string>;

   const capsIsPressed = keyIsPressed("CapsLock");

   if (capsIsPressed) {
      letters = LOWERCASE_LETTERS;
      otherLetters = UPPERCASE_LETTERS;
   } else {
      letters = UPPERCASE_LETTERS;
      otherLetters = LOWERCASE_LETTERS;
   }

   for (let i = 0; i < 26; i++) {
      const letter = letters[i];
      const otherLetter = otherLetters[i];

      if (pressedKeys[letter]) {
         pressedKeys[otherLetter] = true;
      }
      pressedKeys[letter] = false;
   }
}

/**
 * Updates the chat message preview
 * @param key The pressed key
 * @returns Whether the keystroke affected the chat message or not
 */
const updateChatMessage = (event: KeyboardEvent, key: string): boolean => {
   if (chatboxIsFocused()) {
      return true;
   } else if (key === "t") {
      // Start a chat message
      event.preventDefault();
      focusChatbox();

      return true;
   }

   return false;
}

const updateKey = (e: KeyboardEvent, isKeyDown: boolean): void => {
   const gameState = getGameState();
   if (gameState !== GameState.game) return;

   const key = e.key;

   if (isKeyDown) {
      const didChangeMessage = updateChatMessage(e, key);

      if (!didChangeMessage) {
         pressedKeys[key] = true;
      } else {
         clearPressedKeys();
      }
   } else {
      pressedKeys[key] = false;
   }
   
   if (key === "CapsLock") {
      handleCapsLockPress();
   }
};

window.addEventListener("keydown", e => updateKey(e, true));
window.addEventListener("keyup", e => updateKey(e, false));