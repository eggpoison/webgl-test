import { GameState, getGameState } from "./App";
import Client from "./client/Client";
import { addChatMessage, setChatMessagePreview } from "./components/ChatBox";
import Player from "./entities/Player";

const CHAT_CHARACTER_BLACKLIST: ReadonlyArray<string> = ["Shift"];

let isSendingChatMessage = false;
let chatMessage: string = "";
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
const updateChatMessage = (key: string): boolean => {
   if (isSendingChatMessage) {
      switch (key) {
         // Cancel the chat message
         case "Escape": {
            isSendingChatMessage = false;
            setChatMessagePreview(null);
            break;
         }
         // Remove a character from the chat message
         case "Backspace": {
            chatMessage = chatMessage.substring(0, chatMessage.length - 1);
            setChatMessagePreview(chatMessage);
            break;
         }
         // Send the chat message
         case "Enter": {
            Client.sendChatMessage(chatMessage);
            addChatMessage(Player.instance.name, chatMessage);

            // Reset the chat preview
            setChatMessagePreview(null);
            isSendingChatMessage = false;
            break;
         }
         // Add the character to the chat message preview
         default: {
            chatMessage += key;
            setChatMessagePreview(chatMessage);
         }
      }

      return true;
   } else if (key === "t") {
      // Start a chat message
      isSendingChatMessage = true;
      setChatMessagePreview("");
      chatMessage = "";

      return true;
   }

   return false;
}

const updateKey = (e: KeyboardEvent, isKeyDown: boolean): void => {
   const gameState = getGameState();
   if (gameState !== GameState.game) return;
   
   const key = e.key;

   if (isKeyDown && !CHAT_CHARACTER_BLACKLIST.includes(key)) {
      const didChangeMessage = updateChatMessage(key);

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