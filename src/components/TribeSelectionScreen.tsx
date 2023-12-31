import { useRef } from "react";
import { TribeType } from "webgl-test-shared";
import { setGameState } from "./App";

interface TribeSelectionScreenProps {
   passTribeType: (tribeType: TribeType) => void;
}

const TribeSelectionScreen = ({ passTribeType }: TribeSelectionScreenProps) => {
   const plainspeopleInputRef = useRef<HTMLInputElement | null>(null);
   const barbariansInputRef = useRef<HTMLInputElement | null>(null);
   const frostlingsInputRef = useRef<HTMLInputElement | null>(null);
   const goblinsInputRef = useRef<HTMLInputElement | null>(null);
   
   const getSelectedTribe = (): TribeType => {
      if (plainspeopleInputRef.current !== null && plainspeopleInputRef.current.checked) {
         return TribeType.plainspeople;
      } else if (barbariansInputRef.current !== null && barbariansInputRef.current.checked) {
         return TribeType.barbarians;
      } else if (frostlingsInputRef.current !== null && frostlingsInputRef.current.checked) {
         return TribeType.frostlings
      } else if (goblinsInputRef.current !== null && goblinsInputRef.current.checked) {
         return TribeType.goblins
      }
      throw new Error("Not selected");
   }
   
   const submit = (): void => {
      const tribeType = getSelectedTribe();
      passTribeType(tribeType);
      setGameState("loading");
   }
   
   return <div id="tribe-selection-screen">
      <form>
         <input ref={plainspeopleInputRef} type="radio" id="tribe-selection-plainspeople" name="tribe-selection" defaultChecked />
         <label htmlFor="tribe-selection-plainspeople">Plainspeople</label>
         <input ref={barbariansInputRef} type="radio" id="tribe-selection-barbarians" name="tribe-selection" />
         <label htmlFor="tribe-selection-barbarians">Barbarians</label>
         <input ref={frostlingsInputRef} type="radio" id="tribe-selection-frostlings" name="tribe-selection" />
         <label htmlFor="tribe-selection-frostlings">Frostlings</label>
         <input ref={goblinsInputRef} type="radio" id="tribe-selection-goblins" name="tribe-selection"/>
         <label htmlFor="tribe-selection-goblins">Goblins</label>
      </form>
      <button onClick={submit}>Submit</button>
   </div>;
}

export default TribeSelectionScreen;