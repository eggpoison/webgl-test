import { TRIBE_INFO_RECORD, TechID, TribeType } from "webgl-test-shared";

/** Stores information about the player's tribe */
class Tribe {
   public numHuts: number;

   public tribesmanCap: number;

   public unlockedTechs: ReadonlyArray<TechID> = new Array<TechID>();

   constructor(tribeType: TribeType, numHuts: number) {
      const tribeInfo = TRIBE_INFO_RECORD[tribeType];
      this.tribesmanCap = tribeInfo.baseTribesmanCap;
      
      this.numHuts = numHuts;
   }

   public hasUnlockedTech(tech: TechID): boolean {
      return this.unlockedTechs.includes(tech);
   }
}

export default Tribe;