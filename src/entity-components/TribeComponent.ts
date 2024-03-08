import { ServerComponentType, EnemyTribeData, TribeComponentData, TribeType } from "webgl-test-shared";
import GameObject from "../GameObject";
import ServerComponent from "./ServerComponent";
import Game from "../Game";

class TribeComponent extends ServerComponent<ServerComponentType.tribe> {
   public readonly tribeID: number;
   public readonly tribeType: TribeType;

   constructor(entity: GameObject, data: TribeComponentData) {
      super(entity);
      
      this.tribeID = data.tribeID;

      if (data.tribeID === Game.tribe.id) {
         this.tribeType = Game.tribe.tribeType;
      } else {
         let tribeData: EnemyTribeData | undefined;
         for (const currentTribeData of Game.enemyTribes) {
            if (currentTribeData.id === data.tribeID) {
               tribeData = currentTribeData;
               break;
            }
         }
         if (typeof tribeData === "undefined") {
            throw new Error("Tribe data is undefined!");
         }
         this.tribeType = tribeData.tribeType;
      }
   }

   public updateFromData(_data: TribeComponentData): void {}
}

export default TribeComponent;