import { ItemType } from "webgl-test-shared";
import Item from "./Item";
import Game from "../Game";

type PlaceableEntityInfo = {
   readonly textureSource: string;
   readonly width: number;
   readonly height: number;
   /** Optionally defines extra criteria for being placed */
   canPlace?(): boolean;
}

export const PLACEABLE_ENTITY_INFO_RECORD: Partial<Record<ItemType, PlaceableEntityInfo>> = {
   [ItemType.workbench]: {
      textureSource: "workbench/workbench.png",
      width: 80,
      height: 80
   },
   [ItemType.tribe_totem]: {
      textureSource: "tribe-totem/tribe-totem.png",
      width: 120,
      height: 120,
      canPlace: (): boolean => {
         // The player can only place a tribe totem if they aren't in a tribe
         return Game.tribe === null;
      }
   },
   [ItemType.tribe_hut]: {
      textureSource: "tribe-hut/tribe-hut.png",
      width: 88,
      height: 88,
      canPlace: (): boolean => {
         // The player can't place huts if they aren't in a tribe
         if (Game.tribe === null) return false;

         return Game.tribe.numHuts < Game.tribe.tribesmanCap;
      }
   },
   [ItemType.barrel]: {
      textureSource: "barrel/barrel.png",
      width: 80,
      height: 80
   },
   [ItemType.campfire]: {
      textureSource: "campfire/campfire.png",
      width: 104,
      height: 104
   },
   [ItemType.furnace]: {
      textureSource: "furnace/furnace.png",
      width: 80,
      height: 80
   }
};

class PlaceableItem extends Item {
   public onRightMouseButtonDown(): void {
      if (PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(this.type)) {
         const placeableInfo = PLACEABLE_ENTITY_INFO_RECORD[this.type]!;
         if (typeof placeableInfo.canPlace !== "undefined" && !placeableInfo.canPlace()) {
            return;
         }
      }
      
      super.sendUsePacket();

      // If the item would be consumed when used, clear the isPlacingEntity flag
      if (this.count === 1) {
         Game.latencyGameState.playerIsPlacingEntity = false;
      }
   }

   protected onSelect(): void {
      Game.latencyGameState.playerIsPlacingEntity = true;
   }

   protected onDeselect(): void {
      Game.latencyGameState.playerIsPlacingEntity = false;
   }
}

export default PlaceableItem;