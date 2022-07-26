import { GameState, getGameState } from "./App";
import { focusChatbox } from "./components/ChatBox";

const CHAT_CHARACTER_BLACKLIST: ReadonlyArray<string> = ["Shift"];

let isSendingChatMessage = false;
const pressedKeys: { [key: string]: boolean } = {};

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

const clearPressedKeys = (): void => {
   for (const key of Object.keys(pressedKeys)) {
      pressedKeys[key] = false;
   }
}

export function endChatMessage(): void {
   isSendingChatMessage = false;
}

/**
 * Updates the chat message preview
 * @param key The pressed key
 * @returns Whether the keystroke affected the chat message or not
 */
const updateChatMessage = (event: KeyboardEvent, key: string): boolean => {
   if (isSendingChatMessage) {
      return true;
   } else if (key === "t") {
      // Start a chat message
      isSendingChatMessage = true;

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

   if (isKeyDown && !CHAT_CHARACTER_BLACKLIST.includes(key)) {
      const didChangeMessage = updateChatMessage(e, key);

      if (!didChangeMessage) {
         pressedKeys[key] = isKeyDown;
      } else {
         clearPressedKeys();
      }
   } else {
      pressedKeys[key] = isKeyDown;
   }
};

window.addEventListener("keydown", e => updateKey(e, true));
window.addEventListener("keyup", e => updateKey(e, false));