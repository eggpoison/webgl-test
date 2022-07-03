const pressedKeys: { [key: string]: boolean } = {};

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

const updateKey = (e: KeyboardEvent, isMouseDown: boolean): void => {
   const key = e.key;
   
   pressedKeys[key] = isMouseDown;
};

window.addEventListener("keydown", e => updateKey(e, true));
window.addEventListener("keyup", e => updateKey(e, false));