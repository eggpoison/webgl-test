import { chatboxIsFocused, focusChatbox } from "./components/ChatBox";
import { playerIsUsingTerminal } from "./components/game/menus/Terminal";

const keyListeners: { [key: string]: Array<() => void> } = {};

type IDKeyListener = {
   readonly key: string;
   readonly callback: () => void;
}

const idKeyListeners: { [id: string]: IDKeyListener } = {}; 

/** Stores whether a key is pressed or not */
const pressedKeys: { [key: string]: boolean } = {};

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

/** Sets all keys to be unpressed */
export function clearPressedKeys(): void {
   for (const key of Object.keys(pressedKeys)) {
      pressedKeys[key] = false;
   }
}

export function addKeyListener(key: string, callback: () => void, id?: string): void {
   if (typeof id !== "undefined") {
      idKeyListeners[id] = { key: key, callback: callback };
      return;
   }
   
   if (!keyListeners.hasOwnProperty(key)) {
      keyListeners[key] = new Array<() => void>();
   }
   keyListeners[key].push(callback);
}

const callKeyListeners = (key: string): void => {
   if (keyListeners.hasOwnProperty(key)) {
      for (const callback of keyListeners[key]) {
         callback();
      }
   }

   for (const { key: currentKey, callback } of Object.values(idKeyListeners)) {
      if (currentKey === key) {
         callback();
      }
   }
}

/**
 * Gets the key associated with a keyboard event in lowercase form if applicable.
 */
const getKey = (e: KeyboardEvent): string => {
   return e.key.toLowerCase();
}

const onKeyDown = (e: KeyboardEvent): void => {
   if (chatboxIsFocused() || playerIsUsingTerminal()) {
      return;
   }

   const key = getKey(e);

   callKeyListeners(key);

   // Start a chat message
   if (key === "t") {
      focusChatbox();
      e.preventDefault();
      clearPressedKeys();
      return;
   }

   pressedKeys[key] = true;
}

const onKeyUp = (e: KeyboardEvent): void => {
   const key = getKey(e);
   pressedKeys[key] = false;
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);