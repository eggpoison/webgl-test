import { GameState, getGameState } from "./App";
import { chatboxIsFocused, focusChatbox } from "./components/ChatBox";

const pressedKeys: { [key: string]: boolean } = {};

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

const clearPressedKeys = (): void => {
   for (const key of Object.keys(pressedKeys)) {
      pressedKeys[key] = false;
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
};

window.addEventListener("keydown", e => updateKey(e, true));
window.addEventListener("keyup", e => updateKey(e, false));