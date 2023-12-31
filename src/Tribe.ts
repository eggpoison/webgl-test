import { TRIBE_INFO_RECORD, TechID, TechTreeUnlockProgress, TribeType } from "webgl-test-shared";

/** Stores information about the player's tribe */
class Tribe {
   public readonly tribeType: TribeType;
   
   public hasTotem = false;
   public numHuts: number;

   public tribesmanCap: number;

   public selectedTechID: TechID | null = null;
   public unlockedTechs: ReadonlyArray<TechID> = new Array<TechID>();
   public techTreeUnlockProgress: TechTreeUnlockProgress = {};

   constructor(tribeType: TribeType, numHuts: number) {
      this.tribeType = tribeType;
      
      const tribeInfo = TRIBE_INFO_RECORD[tribeType];
      this.tribesmanCap = tribeInfo.baseTribesmanCap;
      
      this.numHuts = numHuts;
   }

   public hasUnlockedTech(tech: TechID): boolean {
      return this.unlockedTechs.includes(tech);
   }
}

export default Tribe;