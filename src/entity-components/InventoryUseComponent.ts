import { BowItemInfo, ServerComponentType, EntityType, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, InventoryUseComponentData, InventoryUseInfoData, Item, ItemType, Settings, ToolItemInfo, TribeMemberAction, TribeType, lerp, randFloat, randItem } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { getSecondsSinceLastAction } from "../entities/TribeMember";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Particle from "../Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { createDeepFrostHeartBloodParticles } from "../items/ItemEntity";

/** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
const ATTACK_LUNGE_TIME = 0.3;

const FOOD_EAT_INTERVAL = 0.3;

const ZOMBIE_HAND_RESTING_ROTATION = 0;
const ZOMBIE_HAND_RESTING_DIRECTION = Math.PI / 4;
const ZOMBIE_HAND_RESTING_OFFSET = 32;
   
const HAND_RESTING_DIRECTION = Math.PI / 2.5;
const HAND_RESTING_ROTATION = 0;

const SPEAR_ATTACK_LUNGE_TIME = 0.2;
const ITEM_SWING_RANGE = Math.PI / 2.5;

const ITEM_RESTING_OFFSET = 30;
const ITEM_RESTING_ROTATION = 0;
const ITEM_END_ROTATION = -Math.PI * 2/3;

const ZOMBIE_HAND_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/fist-1.png", "entities/zombie/fist-2.png", "entities/zombie/fist-3.png", "entities/zombie/fist-4.png"];

const BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/wooden-bow.png",
   "miscellaneous/wooden-bow-charge-1.png",
   "miscellaneous/wooden-bow-charge-2.png",
   "miscellaneous/wooden-bow-charge-3.png",
   "miscellaneous/wooden-bow-charge-4.png",
   "miscellaneous/wooden-bow-charge-5.png"
];

const REINFORCED_BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/reinforced-bow.png",
   "miscellaneous/reinforced-bow-charge-1.png",
   "miscellaneous/reinforced-bow-charge-2.png",
   "miscellaneous/reinforced-bow-charge-3.png",
   "miscellaneous/reinforced-bow-charge-4.png",
   "miscellaneous/reinforced-bow-charge-5.png"
];

const ICE_BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/ice-bow.png",
   "miscellaneous/ice-bow-charge-1.png",
   "miscellaneous/ice-bow-charge-2.png",
   "miscellaneous/ice-bow-charge-3.png",
   "miscellaneous/ice-bow-charge-4.png",
   "miscellaneous/ice-bow-charge-5.png"
];

const CROSSBOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "items/large/crossbow.png",
   "miscellaneous/crossbow-charge-1.png",
   "miscellaneous/crossbow-charge-2.png",
   "miscellaneous/crossbow-charge-3.png",
   "miscellaneous/crossbow-charge-4.png",
   "miscellaneous/crossbow-charge-5.png"
];

type FilterFoodItemTypes<T extends ItemType> = (typeof ITEM_TYPE_RECORD)[T] extends "food" ? never : T;

const FOOD_EATING_COLOURS: { [T in ItemType as Exclude<T, FilterFoodItemTypes<T>>]: Array<ParticleColour> } = {
   [ItemType.berry]: [
      [222/255, 57/255, 42/255],
      [181/255, 12/255, 9/255],
      [217/255, 26/255, 20/255],
      [227/255, 137/255, 129/255]
   ],
   [ItemType.raw_beef]: [
      [117/255, 25/255, 40/255],
      [153/255, 29/255, 37/255],
      [217/255, 41/255, 41/255],
      [222/255, 58/255, 58/255],
      [222/255, 87/255, 87/255],
      [217/255, 124/255, 124/255],
      [217/255, 173/255, 173/255]
   ],
   [ItemType.cooked_beef]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.raw_fish]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ],
   [ItemType.cooked_fish]: [
      [33/255, 24/255, 12/255],
      [92/255, 55/255, 43/255],
      [123/255, 78/255, 54/255],
      [150/255, 106/255, 73/255],
      [159/255, 124/255, 86/255],
      [164/255, 131/255, 96/255]
   ]
};

type InventoryUseEntityType = EntityType.player | EntityType.tribeWorker | EntityType.tribeWarrior | EntityType.zombie;

const createLimb = (entity: Entity, limbIdx: number): RenderPart => {
   switch (entity.type as InventoryUseEntityType) {
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: {
         const tribeComponent = entity.getServerComponent(ServerComponentType.tribe);
         
         let fistTextureSource: string;
         switch (tribeComponent.tribeType) {
            case TribeType.plainspeople: {
               fistTextureSource = "entities/plainspeople/fist.png";
               break;
            }
            case TribeType.goblins: {
               fistTextureSource = "entities/goblins/fist.png";
               break;
            }
            case TribeType.frostlings: {
               fistTextureSource = "entities/frostlings/fist.png";
               break;
            }
            case TribeType.barbarians: {
               fistTextureSource = "entities/barbarians/fist.png";
               break;
            }
         }
         return new RenderPart(
            entity,
            getTextureArrayIndex(fistTextureSource),
            1,
            limbIdx === 0 ? HAND_RESTING_ROTATION : -HAND_RESTING_ROTATION
         );
      }
      case EntityType.zombie: {
         const zombieComponent = entity.getServerComponent(ServerComponentType.zombie);
         
         return new RenderPart(
            entity,
            getTextureArrayIndex(ZOMBIE_HAND_TEXTURE_SOURCES[zombieComponent.zombieType]),
            1,
            limbIdx === 0 ? HAND_RESTING_ROTATION : -HAND_RESTING_ROTATION
         );
      }
   }
}

const getLastActionTicks = (useInfo: InventoryUseInfoData): number => {
   switch (useInfo.currentAction) {
      case TribeMemberAction.chargeBow: {
         return useInfo.lastBowChargeTicks;
      }
      case TribeMemberAction.chargeSpear: {
         return useInfo.lastSpearChargeTicks;
      }
      case TribeMemberAction.chargeBattleaxe: {
         return useInfo.lastBattleaxeChargeTicks;
      }
      case TribeMemberAction.loadCrossbow: {
         return useInfo.lastCrossbowLoadTicks;
      }
      case TribeMemberAction.eat: {
         return useInfo.lastEatTicks;
      }
      case TribeMemberAction.none: {
         return useInfo.lastAttackTicks;
      }
      case TribeMemberAction.researching: {
         // @Incomplete
         return Board.ticks;
      }
   }
}

const getHandRestingOffset = (entityType: InventoryUseEntityType): number => {
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior: {
         return 34;
      }
      case EntityType.tribeWorker: {
         return 30;
      }
      case EntityType.zombie: {
         return 32;
      }
   }
}

const showLargeItemTexture = (itemType: ItemType): boolean => {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe" || itemTypeInfo === "crossbow";
}

const getLimbRestingDirection = (entityType: InventoryUseEntityType): number => {
   switch (entityType) {
      case EntityType.player:
      case EntityType.tribeWarrior:
      case EntityType.tribeWorker: return HAND_RESTING_DIRECTION;
      case EntityType.zombie: return ZOMBIE_HAND_RESTING_DIRECTION;
   }
}

class InventoryUseComponent extends ServerComponent<ServerComponentType.inventoryUse> {
   public useInfos: ReadonlyArray<InventoryUseInfoData>;
   public readonly limbRenderParts = new Array<RenderPart>();
   private readonly activeItemRenderParts: Record<number, RenderPart> = {};
   private readonly inactiveCrossbowArrowRenderParts: Record<number, RenderPart> = {};
   private readonly arrowRenderParts: Record<number, RenderPart> = {};
   
   constructor(entity: Entity, data: InventoryUseComponentData) {
      super(entity);
      
      this.useInfos = data.inventoryUseInfos;

      for (let limbIdx = 0; limbIdx < data.inventoryUseInfos.length; limbIdx++) {
         const limb = createLimb(this.entity, limbIdx);
         this.entity.attachRenderPart(limb);
         this.limbRenderParts.push(limb);

         this.updateLimb(limbIdx, data.inventoryUseInfos[limbIdx]);
      }
   }

   public tick(): void {
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      for (let limbIdx = 0; limbIdx < this.useInfos.length; limbIdx++) {
         const useInfo = this.useInfos[limbIdx];
         const inventory = inventoryComponent.getInventory(useInfo.inventoryName);

         // @Incomplete: If eating multiple foods at once, shouldn't be on the same tick interval
         if (!Board.tickIntervalHasPassed(0.25)) {
            continue;
         }
   
         if (!inventory.itemSlots.hasOwnProperty(useInfo.selectedItemSlot)) {
            continue;
         }
         
         const item = inventory.itemSlots[useInfo.selectedItemSlot];

         // Make the deep frost heart item spew blue blood particles
         if (item.type === ItemType.deepfrost_heart) {
            const activeItemRenderPart = this.activeItemRenderParts[limbIdx];
            createDeepFrostHeartBloodParticles(activeItemRenderPart.renderPosition.x, activeItemRenderPart.renderPosition.y, this.entity.velocity.x, this.entity.velocity.y);
         }

         if (useInfo.currentAction === TribeMemberAction.eat && ITEM_TYPE_RECORD[item.type] === "food") {
            // Create food eating particles
            for (let i = 0; i < 3; i++) {
               let spawnPositionX = this.entity.position.x + 37 * Math.sin(this.entity.rotation);
               let spawnPositionY = this.entity.position.y + 37 * Math.cos(this.entity.rotation);
   
               const spawnOffsetMagnitude = randFloat(0, 6);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
               let velocityMagnitude = randFloat(130, 170);
               const velocityDirection = 2 * Math.PI * Math.random();
               const velocityX = velocityMagnitude * Math.sin(velocityDirection) + this.entity.velocity.x;
               const velocityY = velocityMagnitude * Math.cos(velocityDirection) + this.entity.velocity.y;
               velocityMagnitude += this.entity.velocity.length();
               
               const lifetime = randFloat(0.3, 0.4);
   
               const particle = new Particle(lifetime);
               particle.getOpacity = () => {
                  return 1 - Math.pow(particle.age / lifetime, 3);
               }
   
               const colour = randItem(FOOD_EATING_COLOURS[item.type as keyof typeof FOOD_EATING_COLOURS]);
   
               // @Cleanup @Incomplete: move to particles file
               addMonocolourParticleToBufferContainer(
                  particle,
                  ParticleRenderLayer.low,
                  6, 6,
                  spawnPositionX, spawnPositionY,
                  velocityX, velocityY,
                  0, 0,
                  velocityMagnitude / lifetime / 1.3,
                  2 * Math.PI * Math.random(),
                  0,
                  0,
                  0,
                  colour[0], colour[1], colour[2]
               );
               Board.lowMonocolourParticles.push(particle);
            }
         }
      }
   }

   private updateActiveItemRenderPart(limbIdx: number, useInfo: InventoryUseInfoData, activeItem: Item | null, shouldShow: boolean): void {
      if (activeItem === null || !shouldShow) {
         if (this.activeItemRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.activeItemRenderParts[limbIdx]);
            delete this.activeItemRenderParts[limbIdx];
         }

         if (this.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.inactiveCrossbowArrowRenderParts[limbIdx]);
            delete this.inactiveCrossbowArrowRenderParts[limbIdx];
         }

         if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
            this.entity.removeRenderPart(this.arrowRenderParts[limbIdx]);
            delete this.arrowRenderParts[limbIdx];
         }
      } else {
         if (!this.activeItemRenderParts.hasOwnProperty(limbIdx)) {
            const renderPart = new RenderPart(
               this.limbRenderParts[limbIdx],
               activeItem !== null ? getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource) : -1,
               limbIdx === 0 ? 0.5 : 0,
               0
            );
            this.entity.attachRenderPart(renderPart);
            this.activeItemRenderParts[limbIdx] = renderPart;
         }

         const activeItemRenderPart = this.activeItemRenderParts[limbIdx];
         activeItemRenderPart.flipX = limbIdx === 1;
         
         if (showLargeItemTexture(activeItem.type)) {
            // Change the bow charging texture based on the charge progress
            if (useInfo.currentAction === TribeMemberAction.chargeBow || useInfo.currentAction === TribeMemberAction.loadCrossbow) {
               const bowInfo = ITEM_INFO_RECORD[activeItem.type] as BowItemInfo;
               
               const lastActionTicks = useInfo.currentAction === TribeMemberAction.chargeBow ? useInfo.lastBowChargeTicks : useInfo.lastCrossbowLoadTicks;
               const secondsSinceLastAction = getSecondsSinceLastAction(lastActionTicks);
               const chargeProgress = secondsSinceLastAction / bowInfo.shotCooldownTicks * Settings.TPS;

               let textureSourceArray: ReadonlyArray<string>;
               let arrowTextureSource: string;
               switch (activeItem.type) {
                  case ItemType.wooden_bow: {
                     textureSourceArray = BOW_CHARGE_TEXTURE_SOURCES;
                     arrowTextureSource = "projectiles/wooden-arrow.png";
                     break;
                  }
                  case ItemType.reinforced_bow: {
                     textureSourceArray = REINFORCED_BOW_CHARGE_TEXTURE_SOURCES;
                     arrowTextureSource = "projectiles/wooden-arrow.png";
                     break;
                  }
                  case ItemType.ice_bow: {
                     textureSourceArray = ICE_BOW_CHARGE_TEXTURE_SOURCES;
                     arrowTextureSource = "projectiles/ice-arrow.png";
                     break;
                  }
                  case ItemType.crossbow: {
                     textureSourceArray = CROSSBOW_CHARGE_TEXTURE_SOURCES;
                     arrowTextureSource = "projectiles/wooden-arrow.png";
                     break;
                  }
                  default: {
                     const tribesmanComponent = this.entity.getServerComponent(ServerComponentType.tribesman);
                     console.log(tribesmanComponent.aiType);
                     console.log(limbIdx);
                     console.log(activeItem);
                     throw new Error("Not bow");
                  }
               }

               if (!this.arrowRenderParts.hasOwnProperty(limbIdx)) {
                  this.arrowRenderParts[limbIdx] = new RenderPart(
                     this.activeItemRenderParts[limbIdx],
                     getTextureArrayIndex(arrowTextureSource),
                     this.activeItemRenderParts[limbIdx].zIndex + 0.1,
                     Math.PI/4
                  );
                  this.entity.attachRenderPart(this.arrowRenderParts[limbIdx]);
               }

               let textureIdx = Math.floor(chargeProgress * textureSourceArray.length);
               if (textureIdx >= textureSourceArray.length) {
                  textureIdx = textureSourceArray.length - 1;
               }
               this.activeItemRenderParts[limbIdx].switchTextureSource(textureSourceArray[textureIdx]);
            } else if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
               this.entity.removeRenderPart(this.arrowRenderParts[limbIdx]);
               delete this.arrowRenderParts[limbIdx];
            }

            // if (useInfo.currentAction === TribeMemberAction.none && )
            // @Incomplete: Only works for player
            // @Incomplete
            // if (limbIdx === 0 && this.rightAction === TribeMemberAction.none && activeItem.type === ItemType.crossbow && definiteGameState.hotbarCrossbowLoadProgressRecord.hasOwnProperty(latencyGameState.selectedHotbarItemSlot) && definiteGameState.hotbarCrossbowLoadProgressRecord[latencyGameState.selectedHotbarItemSlot] === 1) {
            //    renderPart.switchTextureSource("miscellaneous/crossbow-charge-5.png");

            //    if (this.inactiveCrossbowArrowRenderPart === null) {
            //       const arrowTextureSource = "projectiles/wooden-arrow.png";

            //       this.inactiveCrossbowArrowRenderPart = new RenderPart(
            //          this.activeItemRenderParts[0],
            //          getTextureArrayIndex(arrowTextureSource),
            //          this.activeItemRenderParts[0].zIndex + 0.1,
            //          Math.PI/4
            //       );
            //       this.attachRenderPart(this.inactiveCrossbowArrowRenderPart);
            //    }
            // } else {
               activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].toolTextureSource);
            
            if (this.inactiveCrossbowArrowRenderParts.hasOwnProperty(limbIdx)) {
               this.entity.removeRenderPart(this.inactiveCrossbowArrowRenderParts[limbIdx]);
               delete this.inactiveCrossbowArrowRenderParts[limbIdx];
            }
            // }
         } else {
            activeItemRenderPart.switchTextureSource(CLIENT_ITEM_INFO_RECORD[activeItem.type].entityTextureSource);
         }
      }
   }

   private updateLimb(limbIdx: number, useInfo: InventoryUseInfoData): void {
      // @Bug: The itemSize variable will be one tick too slow as it gets the size of the item before it has been updated
      
      const limb = this.limbRenderParts[limbIdx];
      limb.shakeAmount = 0;

      const handMult = limbIdx === 0 ? 1 : -1;
      
      // @Speed: Has exactly the same switch statement as the switch (useInfo.currentAction). Doing same switch twice!!
      const lastActionTicks = getLastActionTicks(useInfo);
      const secondsSinceLastAction = getSecondsSinceLastAction(lastActionTicks)

      // Special case if the entity is drawing a bow
      // Two hands are needed to draw a bow, one from each side of the entity

      if (this.useInfos.length > 1) {
         const otherUseInfo = this.useInfos[limbIdx === 0 ? 1 : 0];
         if (otherUseInfo.currentAction === TribeMemberAction.chargeBow || otherUseInfo.currentAction === TribeMemberAction.loadCrossbow) {
            const otherLastActionTicks = getLastActionTicks(otherUseInfo);
            const otherSecondsSinceLastAction = getSecondsSinceLastAction(otherLastActionTicks);
   
            let chargeProgress = otherSecondsSinceLastAction;
            if (chargeProgress > 1) {
               chargeProgress = 1;
            }
   
            const pullbackOffset = lerp(50, 30, chargeProgress);
            
            this.limbRenderParts[limbIdx].offset.x = -3;
            this.limbRenderParts[limbIdx].offset.y = pullbackOffset;
            this.limbRenderParts[limbIdx].rotation = 0;
            return;
         }
      }

      
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const inventory = inventoryComponent.getInventory(useInfo.inventoryName);
      
      const item = inventory.itemSlots.hasOwnProperty(useInfo.selectedItemSlot) ? inventory.itemSlots[useInfo.selectedItemSlot] : null;
      const itemSize = item !== null && showLargeItemTexture(item.type) ? 8 * 4 : 4 * 4;
      
      const shouldShowActiveItemRenderPart = item !== null && useInfo.thrownBattleaxeItemID === item.id ? false : true;
      this.updateActiveItemRenderPart(limbIdx, useInfo, item, shouldShowActiveItemRenderPart);

      // Zombie lunge attack
      if (this.entity.type === EntityType.zombie) {
         const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
         const heldItemInventory = inventoryComponent.getInventory("handSlot");
         if (!heldItemInventory.itemSlots.hasOwnProperty(1)) {
            let attackProgress = secondsSinceLastAction / ATTACK_LUNGE_TIME;
            if (attackProgress > 1) {
               attackProgress = 1;
            }
   
            const direction = lerp(Math.PI / 7, ZOMBIE_HAND_RESTING_DIRECTION, attackProgress) * handMult;
            const offset = lerp(42, ZOMBIE_HAND_RESTING_OFFSET, attackProgress);
            
            limb.offset.x = offset * Math.sin(direction);
            limb.offset.y = offset * Math.cos(direction);
            limb.rotation = lerp(-Math.PI/8, ZOMBIE_HAND_RESTING_ROTATION, attackProgress) * handMult;
            return;
         }
      }

      switch (useInfo.currentAction) {
         // Bow charge animation
         case TribeMemberAction.loadCrossbow:
         case TribeMemberAction.chargeBow: {
            // @Incomplete
            if (this.arrowRenderParts.hasOwnProperty(limbIdx)) {
               let chargeProgress = secondsSinceLastAction;
               if (chargeProgress > 1) {
                  chargeProgress = 1;
               }

               const pullbackOffset = lerp(10, -8, chargeProgress);
               this.arrowRenderParts[limbIdx].offset.x = pullbackOffset;
               this.arrowRenderParts[limbIdx].offset.y = pullbackOffset;
            }

            limb.offset.x = 10 * handMult;
            limb.offset.y = 60;
            limb.rotation = 0;

            this.activeItemRenderParts[limbIdx].offset.x = -10 * handMult;
            this.activeItemRenderParts[limbIdx].offset.y = -10;
            this.activeItemRenderParts[limbIdx].rotation = -Math.PI / 4;
            break;
         }
         case TribeMemberAction.chargeBattleaxe:
         case TribeMemberAction.chargeSpear: {
            // 
            // Spear charge animation
            // 
            const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

            const handRestingDirection = getLimbRestingDirection(this.entity.type as InventoryUseEntityType);
            const handDirection = lerp(handRestingDirection, Math.PI / 1.5, chargeProgress) * handMult;

            let itemDirection: number;
            if (useInfo.currentAction === TribeMemberAction.chargeSpear) {
               itemDirection = handDirection - Math.PI/14 * handMult;
            } else {
               itemDirection = lerp(handRestingDirection - Math.PI/14, Math.PI / 2.2, chargeProgress) * handMult
            }
            
            const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
            limb.offset.x = handRestingOffset * Math.sin(handDirection);
            limb.offset.y = handRestingOffset * Math.cos(handDirection);
            limb.rotation = lerp(Math.PI / 4.2, Math.PI / 2.5, chargeProgress) * handMult;

            itemDirection = 0;
            if (useInfo.currentAction === TribeMemberAction.chargeSpear) {
               this.activeItemRenderParts[limbIdx].offset.x = (ITEM_RESTING_OFFSET + itemSize/2) * Math.sin(itemDirection);
               this.activeItemRenderParts[limbIdx].offset.y = (ITEM_RESTING_OFFSET + itemSize/2) * Math.cos(itemDirection);
               this.activeItemRenderParts[limbIdx].rotation = ITEM_RESTING_ROTATION * handMult;
            } else {
               this.activeItemRenderParts[limbIdx].offset.x = (ITEM_RESTING_OFFSET + itemSize/2) * Math.sin(itemDirection);
               this.activeItemRenderParts[limbIdx].offset.y = (ITEM_RESTING_OFFSET + itemSize/2) * Math.cos(itemDirection);
               // this.activeItemRenderParts[limbIdx].rotation = ITEM_RESTING_ROTATION * handMult;
               this.activeItemRenderParts[limbIdx].offset.x = 12;
               this.activeItemRenderParts[limbIdx].offset.y = 36;
               this.activeItemRenderParts[limbIdx].rotation = -Math.PI/6 * handMult;
            }

            limb.shakeAmount = lerp(0, 1.5, chargeProgress);
            break;
         }
         case TribeMemberAction.eat: {
            // 
            // Eating animation
            // 
         
            let eatIntervalProgress = (secondsSinceLastAction % FOOD_EAT_INTERVAL) / FOOD_EAT_INTERVAL * 2;
            if (eatIntervalProgress > 1) {
               eatIntervalProgress = 2 - eatIntervalProgress;
            }
            
            let activeItemDirection = Math.PI / 4;
            activeItemDirection -= lerp(0, Math.PI/5, eatIntervalProgress);

            const insetAmount = lerp(0, 17, eatIntervalProgress);

            const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
            const handOffsetAmount = handRestingOffset - insetAmount;
            limb.offset.x = handOffsetAmount * Math.sin(activeItemDirection);
            limb.offset.y = handOffsetAmount * Math.cos(activeItemDirection);
            limb.rotation = lerp(HAND_RESTING_ROTATION, HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress) * handMult;

            const activeItemOffsetAmount = ITEM_RESTING_OFFSET + itemSize/2 - insetAmount;
            const activeItemOffsetDirection = (activeItemDirection - Math.PI/14) * handMult;
            limb.offset.x = activeItemOffsetAmount * Math.sin(activeItemOffsetDirection);
            limb.offset.y = activeItemOffsetAmount * Math.cos(activeItemOffsetDirection);
            limb.rotation = lerp(0, -Math.PI/3, eatIntervalProgress) * handMult;
            break;
         }
         case TribeMemberAction.none: {
            // 
            // Attack animation
            // 

            const handRestingDirection = getLimbRestingDirection(this.entity.type as InventoryUseEntityType);

            if (item !== null && useInfo.thrownBattleaxeItemID === item.id) {
               // @Incomplete: Make hand follow thrown battleaxe
               const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
               const handOffsetDirection = handRestingDirection * handMult;
               limb.offset.x = handRestingOffset * Math.sin(handOffsetDirection);
               limb.offset.y = handRestingOffset * Math.cos(handOffsetDirection);
               limb.rotation = ITEM_RESTING_ROTATION * handMult;
               break;
            }


            // 
            // Calculate attack progress
            // 

            let attackDuration: number;
            if (item !== null && (ITEM_TYPE_RECORD[item.type] === "sword" || ITEM_TYPE_RECORD[item.type] === "axe" || ITEM_TYPE_RECORD[item.type] === "pickaxe" || ITEM_TYPE_RECORD[item.type] === "spear" || ITEM_TYPE_RECORD[item.type] === "hammer" || ITEM_TYPE_RECORD[item.type] === "battleaxe")) {
               attackDuration = (ITEM_INFO_RECORD[item.type] as ToolItemInfo).attackCooldown;
            } else {
               attackDuration = Settings.DEFAULT_ATTACK_COOLDOWN;
            }
      
            let attackProgress = secondsSinceLastAction / attackDuration;
            if (attackProgress > 1) {
               attackProgress = 1;
            }

            // @Cleanup: Copy and paste
            if (item !== null && item.type === ItemType.spear) {
               let direction: number;
               let attackHandRotation: number;
               let extraOffset: number;
               if (attackProgress < SPEAR_ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(handRestingDirection, Math.PI / 4, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
                  attackHandRotation = lerp(ITEM_RESTING_ROTATION, -Math.PI / 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
                  extraOffset = lerp(0, 7, attackProgress / SPEAR_ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - SPEAR_ATTACK_LUNGE_TIME) / (1 - SPEAR_ATTACK_LUNGE_TIME);
                  direction = lerp(Math.PI / 4, handRestingDirection, returnProgress);
                  attackHandRotation = lerp(-Math.PI / 7, ITEM_RESTING_ROTATION, returnProgress);
                  extraOffset = lerp(7, 0, returnProgress);
               }

               const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
               const handOffsetDirection = direction * handMult;
               const handOffsetAmount = handRestingOffset + extraOffset;
               limb.offset.x = handOffsetAmount * Math.sin(handOffsetDirection);
               limb.offset.y = handOffsetAmount * Math.cos(handOffsetDirection);
               limb.rotation = attackHandRotation * handMult;
   
               const activeItemOffsetAmount = ITEM_RESTING_OFFSET + itemSize/2 + extraOffset;
               const activeItemOffsetDirection = (direction - Math.PI/14) * handMult;
               this.activeItemRenderParts[limbIdx].offset.x = activeItemOffsetAmount * Math.sin(activeItemOffsetDirection);
               this.activeItemRenderParts[limbIdx].offset.y = activeItemOffsetAmount * Math.cos(activeItemOffsetDirection);
               this.activeItemRenderParts[limbIdx].rotation = attackHandRotation * handMult;
            } else {
               let direction: number;
               let attackHandRotation: number;
               if (attackProgress < ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(handRestingDirection, handRestingDirection - ITEM_SWING_RANGE, attackProgress / ATTACK_LUNGE_TIME);
                  attackHandRotation = lerp(ITEM_RESTING_ROTATION, ITEM_END_ROTATION, attackProgress / ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - ATTACK_LUNGE_TIME) / (1 - ATTACK_LUNGE_TIME);
                  direction = lerp(handRestingDirection - ITEM_SWING_RANGE, handRestingDirection, returnProgress);
                  attackHandRotation = lerp(ITEM_END_ROTATION, ITEM_RESTING_ROTATION, returnProgress);
               }
               
               const handRestingOffset = getHandRestingOffset(this.entity.type as InventoryUseEntityType);
               const handOffsetDirection = direction * handMult;
               limb.offset.x = handRestingOffset * Math.sin(handOffsetDirection);
               limb.offset.y = handRestingOffset * Math.cos(handOffsetDirection);
               limb.rotation = attackHandRotation * handMult;

               if (item !== null && ITEM_TYPE_RECORD[item.type] === "bow") {
                  this.activeItemRenderParts[limbIdx].rotation = 0;
                  this.activeItemRenderParts[limbIdx].offset.x = 4 * handMult;
                  this.activeItemRenderParts[limbIdx].offset.y = 4;
               } else if (item !== null && showLargeItemTexture(item.type)) {
                  this.activeItemRenderParts[limbIdx].rotation = 0;
                  this.activeItemRenderParts[limbIdx].offset.x = (itemSize - 8) * handMult;
                  this.activeItemRenderParts[limbIdx].offset.y = itemSize - 8;
               } else if (item !== null) {
                  this.activeItemRenderParts[limbIdx].rotation = 0;
                  this.activeItemRenderParts[limbIdx].offset.x = itemSize/2 * handMult;
                  this.activeItemRenderParts[limbIdx].offset.y = itemSize/2;
               }
            }
            break;
         }
      }
   }

   public update(): void {
      for (let i = 0; i < this.useInfos.length; i++) {
         const useInfo = this.useInfos[i];
         this.updateLimb(i, useInfo);
      }
   }
   
   public updateFromData(data: InventoryUseComponentData): void {
      for (let i = 0; i < data.inventoryUseInfos.length; i++) {
         const useInfo = data.inventoryUseInfos[i];
         this.updateLimb(i, useInfo);

         this.useInfos[i].bowCooldownTicks = useInfo.bowCooldownTicks;
         this.useInfos[i].selectedItemSlot = useInfo.selectedItemSlot;
         this.useInfos[i].bowCooldownTicks = useInfo.bowCooldownTicks;
         this.useInfos[i].itemAttackCooldowns = useInfo.itemAttackCooldowns;
         this.useInfos[i].spearWindupCooldowns = useInfo.spearWindupCooldowns;
         this.useInfos[i].crossbowLoadProgressRecord = useInfo.crossbowLoadProgressRecord;
         this.useInfos[i].foodEatingTimer = useInfo.foodEatingTimer;
         this.useInfos[i].currentAction = useInfo.currentAction;
         this.useInfos[i].lastAttackTicks = useInfo.lastAttackTicks;
         this.useInfos[i].lastEatTicks = useInfo.lastEatTicks;
         this.useInfos[i].lastBowChargeTicks = useInfo.lastBowChargeTicks;
         this.useInfos[i].lastSpearChargeTicks = useInfo.lastSpearChargeTicks;
         this.useInfos[i].lastBattleaxeChargeTicks = useInfo.lastBattleaxeChargeTicks;
         this.useInfos[i].lastCrossbowLoadTicks = useInfo.lastCrossbowLoadTicks;
         this.useInfos[i].thrownBattleaxeItemID = useInfo.thrownBattleaxeItemID;
      }
   }

   public getUseInfo(inventoryName: string): InventoryUseInfoData {
      for (let i = 0; i < this.useInfos.length; i++) {
         const useInfo = this.useInfos[i];
         if (useInfo.inventoryName === inventoryName) {
            return useInfo;
         }
      }

      throw new Error();
   }
}

export default InventoryUseComponent;