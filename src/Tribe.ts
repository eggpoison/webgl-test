import { TribeType } from "webgl-test-shared";
import TRIBE_INFO_RECORD from "webgl-test-shared/lib/tribes";

/** Stores information about the player's tribe */
class Tribe {
   public numHuts: number;

   public tribesmanCap: number;

   constructor(tribeType: TribeType, numHuts: number) {
      const tribeInfo = TRIBE_INFO_RECORD[tribeType];
      this.tribesmanCap = tribeInfo.baseTribesmanCap;
      
      this.numHuts = numHuts;
   }
}

export default Tribe;