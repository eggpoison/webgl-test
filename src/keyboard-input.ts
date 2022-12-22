import { chatboxIsFocused, focusChatbox } from "./components/ChatBox";

const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

/** Flips all letters to their alternate case */
const flipPressedKeys = (flipCase: "uppercase" | "lowercase"): void => {
   if (flipCase === "uppercase") {
      for (let i = 0; i < 26; i++) {
         const lowercaseKey = LOWERCASE_LETTERS[i];
         if (pressedKeys.hasOwnProperty(lowercaseKey) && pressedKeys[lowercaseKey]) {
            pressedKeys[lowercaseKey] = false;
            
            const uppercaseKey = UPPERCASE_LETTERS[i];
            pressedKeys[uppercaseKey] = true;
         }
      }
   } else {
      for (let i = 0; i < 26; i++) {
         const uppercaseKey = UPPERCASE_LETTERS[i];
         if (pressedKeys.hasOwnProperty(uppercaseKey) && pressedKeys[uppercaseKey]) {
            pressedKeys[uppercaseKey] = false;
            
            const lowercaseKey = LOWERCASE_LETTERS[i];
            pressedKeys[lowercaseKey] = true;
         }
      }
   }
}

const onKeyDown = (e: KeyboardEvent): void => {
   // Don't do anything special if a chat message is being typed
   if (chatboxIsFocused()) {
      return;
   }

   const key = e.key;

   callKeyListeners(key);

   // Start a chat message
   if (key === "t" || key === "T") {
      focusChatbox();
      e.preventDefault();
      clearPressedKeys();
      return;
   }

   pressedKeys[key] = true;

   // Start a chat message
   if (key === "Shift") {
      const capsLockIsOn = e.getModifierState("CapsLock");
      if (capsLockIsOn) {
         flipPressedKeys("lowercase");
      } else {
         flipPressedKeys("uppercase");
      }
   } else if (key === "CapsLock") {
      const capsLockIsOn = e.getModifierState("CapsLock");
      if ((capsLockIsOn && !e.shiftKey) || (!capsLockIsOn && e.shiftKey)) {
         flipPressedKeys("uppercase");
      } else {
         flipPressedKeys("lowercase");
      }
   }
}

const onKeyUp = (e: KeyboardEvent): void => {
   const key = e.key;
   pressedKeys[key] = false;
   
   if (key === "Shift") {
      const capsLockIsOn = e.getModifierState("CapsLock");
      if (capsLockIsOn) {
         flipPressedKeys("uppercase");
      } else {
         flipPressedKeys("lowercase");
      }
   }
}

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);