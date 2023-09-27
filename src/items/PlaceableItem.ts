import { ItemType, PlaceableItemType } from "webgl-test-shared";
import Item from "./Item";
import Game from "../Game";
import { latencyGameState } from "../game-state/game-states";
import Workbench from "../entities/Workbench";
import TribeTotem from "../entities/TribeTotem";
import TribeHut from "../entities/TribeHut";
import Barrel from "../entities/Barrel";
import Campfire from "../entities/Campfire";
import Furnace from "../entities/Furnace";

type PlaceableEntityInfo = {
   readonly textureSource: string;
   readonly width: number;
   readonly height: number;
   readonly placeOffset: number;
   /** Optionally defines extra criteria for being placed */
   canPlace?(): boolean;
}

export const PLACEABLE_ENTITY_INFO_RECORD: Record<PlaceableItemType, PlaceableEntityInfo> = {
   [ItemType.workbench]: {
      textureSource: "workbench/workbench.png",
      width: Workbench.SIZE,
      height: Workbench.SIZE,
      placeOffset: Workbench.SIZE / 2
   },
   [ItemType.tribe_totem]: {
      textureSource: "tribe-totem/tribe-totem.png",
      width: TribeTotem.SIZE,
      height: TribeTotem.SIZE,
      placeOffset: TribeTotem.SIZE / 2,
      canPlace: (): boolean => {
         // The player can only place a tribe totem if they aren't in a tribe
         return Game.tribe === null;
      }
   },
   [ItemType.tribe_hut]: {
      textureSource: "tribe-hut/tribe-hut.png",
      width: TribeHut.SIZE,
      height: TribeHut.SIZE,
      placeOffset: TribeHut.SIZE / 2,
      canPlace: (): boolean => {
         // The player can't place huts if they aren't in a tribe
         if (Game.tribe === null) return false;

         return Game.tribe.numHuts < Game.tribe.tribesmanCap;
      }
   },
   [ItemType.barrel]: {
      textureSource: "barrel/barrel.png",
      width: Barrel.SIZE,
      height: Barrel.SIZE,
      placeOffset: Barrel.SIZE / 2
   },
   [ItemType.campfire]: {
      textureSource: "campfire/campfire.png",
      width: Campfire.SIZE,
      height: Campfire.SIZE,
      placeOffset: Campfire.SIZE / 2
   },
   [ItemType.furnace]: {
      textureSource: "furnace/furnace.png",
      width: Furnace.SIZE,
      height: Furnace.SIZE,
      placeOffset: Furnace.SIZE / 2
   }
};

class PlaceableItem extends Item {
   public onRightMouseButtonDown(): void {
      if (PLACEABLE_ENTITY_INFO_RECORD.hasOwnProperty(this.type)) {
         const placeableInfo = PLACEABLE_ENTITY_INFO_RECORD[this.type as PlaceableItemType];
         if (typeof placeableInfo.canPlace !== "undefined" && !placeableInfo.canPlace()) {
            return;
         }
      }
      
      super.sendUsePacket();

      // If the item would be consumed when used, clear the isPlacingEntity flag
      if (this.count === 1) {
         latencyGameState.playerIsPlacingEntity = false;
      }
   }

   protected onSelect(): void {
      latencyGameState.playerIsPlacingEntity = true;
   }

   protected onDeselect(): void {
      latencyGameState.playerIsPlacingEntity = false;
   }
}

export default PlaceableItem;