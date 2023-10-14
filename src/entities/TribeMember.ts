import { BowItemInfo, EntityData, HitData, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, InventoryData, ItemType, Point, SETTINGS, TileType, ToolItemInfo, TribeMemberAction, TribeType, lerp, randFloat, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getFrameProgress } from "../GameObject";
import Particle from "../Particle";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../generic-particles";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { Inventory } from "../items/Item";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

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
   ]
};

// @Cleanup: Maybe make this automatically require all armour types

interface ArmourInfo {
   readonly textureSource: string;
   readonly pixelSize: number;
}

const ARMOUR_WORN_INFO: Partial<Record<ItemType, ArmourInfo>> = {
   [ItemType.frost_armour]: {
      textureSource: "armour/frost-armour.png",
      pixelSize: 72
   },
   [ItemType.deepfrost_armour]: {
      textureSource: "armour/deepfrost-armour.png",
      pixelSize: 72
   },
   [ItemType.meat_suit]: {
      textureSource: "armour/meat-suit.png",
      pixelSize: 64
   }
};

abstract class TribeMember extends Entity {
   private static readonly FOOD_EAT_INTERVAL = 0.3;
   
   private static readonly TOOL_ACTIVE_ITEM_SIZE = 48;
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = 32;

   /** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
   private static readonly ATTACK_LUNGE_TIME = 0.3;

   private static readonly ITEM_RESTING_ROTATION = 0;
   private static readonly ITEM_END_ROTATION = -Math.PI * 2/3;
   
   private static readonly ITEM_RESTING_DIRECTION = Math.PI / 4;
   private static readonly ITEM_SWING_RANGE = Math.PI / 2;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   private static readonly BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
      "items/wooden-bow.png",
      "items/wooden-bow-charge-1.png",
      "items/wooden-bow-charge-2.png",
      "items/wooden-bow-charge-3.png",
      "items/wooden-bow-charge-4.png",
      "items/wooden-bow-charge-5.png"
   ];
   
   private readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourSlotInventory: Inventory;
   public backpackSlotInventory: Inventory;
   public backpackInventory: Inventory;

   private activeItemRenderPart: RenderPart;

   protected activeItemType: ItemType | null;

   public action: TribeMemberAction
   public foodEatingType: ItemType | -1;

   public lastActionTicks: number;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number) {
      super(position, hitboxes, id, renderDepth);

      this.tribeID = tribeID;
      this.tribeType = tribeType;
      this.action = action;

      // @Cleanup: Too verbose
      this.updateArmourRenderPart(armourSlotInventory.itemSlots.hasOwnProperty(1) ? armourSlotInventory.itemSlots[1].type : null);
      this.activeItemType = activeItem;
      this.lastActionTicks = lastActionTicks;
      this.foodEatingType = foodEatingType;

      this.armourSlotInventory = createInventoryFromData(armourSlotInventory);
      this.backpackSlotInventory = createInventoryFromData(backpackSlotInventory);
      this.backpackInventory = createInventoryFromData(backpackInventory);
      
      this.activeItemRenderPart = new RenderPart(
         this,
         TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         activeItem !== null ? getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem].textureSource) : -1,
         0,
         0
      );
      // @Cleanup (?): Merge most of the getOffset and getRotation functions into some logic in the tick/updateFromData functions
      this.activeItemRenderPart.offset = () => {
         let direction = Math.PI / 4;

         // @Cleanup: As the offset function is called in the RenderPart constructor, this.activeItemRenderPart will initially
         // be undefined and so we have to check for this case. Ideally this will not need to be done
         let itemSize: number;
         if (typeof this.activeItemRenderPart === "undefined") {
            itemSize = this.getActiveItemSize(this.activeItemType!);
         } else {
            itemSize = this.activeItemRenderPart.width;
         }

         const secondsSinceLastAction = this.getSecondsSinceLastAction(this.lastActionTicks);
         switch (this.action) {
            case TribeMemberAction.charge_bow: {
               // 
               // Bow charge animation
               // 

               return new Point(0, 26 + itemSize / 2);
            }
            case TribeMemberAction.eat: {
               // 
               // Eating animation
               // 
            

               let eatIntervalProgress = (secondsSinceLastAction % TribeMember.FOOD_EAT_INTERVAL) / TribeMember.FOOD_EAT_INTERVAL * 2;
               if (eatIntervalProgress > 1) {
                  eatIntervalProgress = 2 - eatIntervalProgress;
               }
               
               direction -= lerp(0, Math.PI/5, eatIntervalProgress);

               const insetAmount = lerp(0, 17, eatIntervalProgress);

               return Point.fromVectorForm(26 + itemSize / 2 - insetAmount, direction);
            }
            case TribeMemberAction.none: {
               // 
               // Attack animation
               // 
            
               const attackProgress = this.getAttackProgress(secondsSinceLastAction);

               let direction: number;
               if (attackProgress < TribeMember.ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(TribeMember.ITEM_RESTING_DIRECTION, TribeMember.ITEM_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - TribeMember.ATTACK_LUNGE_TIME) / (1 - TribeMember.ATTACK_LUNGE_TIME);
                  direction = lerp(TribeMember.ITEM_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, TribeMember.ITEM_RESTING_DIRECTION, returnProgress);
               }

               return Point.fromVectorForm(26 + itemSize / 2, direction);
            }
         }
      };
      this.activeItemRenderPart.getRotation = () => {
         const secondsSinceLastEat = this.getSecondsSinceLastAction(this.lastActionTicks);

         // @Cleanup: Make into case statement
         if (this.action === TribeMemberAction.charge_bow) {
            return -Math.PI/4;
         } else if (this.action === TribeMemberAction.eat) {
            // Eating animation

            let eatIntervalProgress = (secondsSinceLastEat % TribeMember.FOOD_EAT_INTERVAL) / TribeMember.FOOD_EAT_INTERVAL * 2;
            if (eatIntervalProgress > 1) {
               eatIntervalProgress = 2 - eatIntervalProgress;
            }
            
            const direction = lerp(0, -Math.PI/5, eatIntervalProgress);
            return direction;
         } else {
            // Attack animation

            const secondsSinceLastAttack = this.getSecondsSinceLastAction(this.lastActionTicks);
            const attackProgress = this.getAttackProgress(secondsSinceLastAttack);

            let direction: number;
            if (attackProgress < TribeMember.ATTACK_LUNGE_TIME) {
               // Lunge part of the animation
               direction = lerp(TribeMember.ITEM_RESTING_ROTATION, TribeMember.ITEM_END_ROTATION, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
            } else {
               // Return part of the animation
               const returnProgress = (attackProgress - TribeMember.ATTACK_LUNGE_TIME) / (1 - TribeMember.ATTACK_LUNGE_TIME);
               direction = lerp(TribeMember.ITEM_END_ROTATION, TribeMember.ITEM_RESTING_ROTATION, returnProgress);
            }

            return direction;
         }
      };
      // @Temporary
      if (activeItem !== null && false) {
         this.attachRenderPart(this.activeItemRenderPart);
      }
   }

   public getSecondsSinceLastAction(lastActionTicks: number): number {
      const ticksSinceLastAction = Board.ticks - lastActionTicks;
      let secondsSinceLastAction = ticksSinceLastAction / SETTINGS.TPS;

      // Account for frame progress
      secondsSinceLastAction += getFrameProgress() / SETTINGS.TPS;

      return secondsSinceLastAction;
   }

   private getAttackProgress(secondsSinceLastAttack: number): number {
      let attackDuration: number;
      if (this.activeItemType !== null && (ITEM_TYPE_RECORD[this.activeItemType] === "sword" || ITEM_TYPE_RECORD[this.activeItemType] === "axe" || ITEM_TYPE_RECORD[this.activeItemType] === "pickaxe")) {
         attackDuration = (ITEM_INFO_RECORD[this.activeItemType] as ToolItemInfo).attackCooldown;
      } else {
         attackDuration = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
      }

      let attackProgress = secondsSinceLastAttack / attackDuration;
      if (attackProgress > 1) {
         attackProgress = 1;
      }

      return attackProgress;
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);

      createBloodParticleFountain(this, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);
   }

   public tick(): void {
      super.tick();

      // Create food eating particles
      if (this.foodEatingType !== -1 && Board.tickIntervalHasPassed(0.25)) {
         for (let i = 0; i < 3; i++) {
            let spawnPositionX = this.position.x + 37 * Math.sin(this.rotation);
            let spawnPositionY = this.position.y + 37 * Math.cos(this.rotation);

            const spawnOffsetMagnitude = randFloat(0, 6);
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            let velocityMagnitude = randFloat(130, 170);
            const velocityDirection = 2 * Math.PI * Math.random();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection) + this.velocity.x;
            const velocityY = velocityMagnitude * Math.cos(velocityDirection) + this.velocity.y;
            velocityMagnitude += this.velocity.length();
            
            const lifetime = randFloat(0.3, 0.4);

            const particle = new Particle(lifetime);
            particle.getOpacity = () => {
               return 1 - Math.pow(particle.age / lifetime, 3);
            }

            const colour = randItem(FOOD_EATING_COLOURS[this.foodEatingType as keyof typeof FOOD_EATING_COLOURS]);

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

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // If snow armour is equipped, move at normal speed on snow tiles
      if (this.armourSlotInventory.itemSlots.hasOwnProperty(1) && this.armourSlotInventory.itemSlots[1].type === ItemType.frost_armour && this.tile.type === TileType.snow) {
         return 1;
      }
      return null;
   }

   protected getTextureSource(tribeType: TribeType): string {
      switch (tribeType) {
         case TribeType.plainspeople: {
            return "entities/human/human1.png";
         }
         case TribeType.goblins: {
            return "entities/human/goblin.png";
         }
         case TribeType.frostlings: {
            return "entities/human/frostling.png"
         }
         case TribeType.barbarians: {
            return "entities/human/barbarian.png"
         }
      }
   }

   private getArmourTextureIndex(armourType: ItemType): number {
      if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
         throw new Error("Can't find armour info for item type '" + ItemType[armourType] + ".");
      }

      return getGameObjectTextureArrayIndex(ARMOUR_WORN_INFO[armourType]!.textureSource);
   }

   private getArmourPixelSize(armourType: ItemType): number {
      if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
         throw new Error("Can't find armour info for item type '" + ItemType[armourType] + ".");
      }

      return ARMOUR_WORN_INFO[armourType]!.pixelSize;
   }

   public updateArmourRenderPart(armourType: ItemType | null): void {
      if (armourType !== null) {
         if (this.armourRenderPart === null) {
            const pixelSize = this.getArmourPixelSize(armourType);
            this.armourRenderPart = new RenderPart(
               this,
               pixelSize,
               pixelSize,
               this.getArmourTextureIndex(armourType),
               2,
               0
            );
            this.attachRenderPart(this.armourRenderPart);
         } else {
            this.armourRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[this.getArmourTextureIndex(armourType)];
         }
      } else if (this.armourRenderPart !== null) {
         this.removeRenderPart(this.armourRenderPart);
         this.armourRenderPart = null;
      }
   }

   private updateActiveItemRenderPart(activeItemType: ItemType | null): void {
      if (activeItemType === null) {
         this.removeRenderPart(this.activeItemRenderPart);
      } else {
         this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].textureSource)];
         this.attachRenderPart(this.activeItemRenderPart);

         const renderPartSize = this.getActiveItemSize(activeItemType);
         this.activeItemRenderPart.width = renderPartSize;
         this.activeItemRenderPart.height = renderPartSize;
         this.activeItemRenderPart.textureWidth = 16;
         this.activeItemRenderPart.textureHeight = 16;
      }
   }

   private getActiveItemSize(activeItemType: ItemType) {
      const itemTypeInfo = ITEM_TYPE_RECORD[activeItemType];
      if (itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe") {
         return TribeMember.TOOL_ACTIVE_ITEM_SIZE;
      }
      return TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
   }

   public updateFromData(entityData: EntityData<"player"> | EntityData<"tribesman">): void {
      super.updateFromData(entityData);

      // Do all the non-player-instance specific updates

      this.tribeID = entityData.clientArgs[0];

      updateInventoryFromData(this.armourSlotInventory, entityData.clientArgs[2]);
      updateInventoryFromData(this.backpackSlotInventory, entityData.clientArgs[3]);
      updateInventoryFromData(this.backpackInventory, entityData.clientArgs[4]);
      this.activeItemType = entityData.clientArgs[5];
      this.action = entityData.clientArgs[6];
      this.foodEatingType = entityData.clientArgs[7]
      this.lastActionTicks = entityData.clientArgs[8];
      // @Temporary
      this.updateActiveItemRenderPart(this.activeItemType);
      this.updateBowChargeTexture();

      // @Cleanup
      this.updateArmourRenderPart(this.armourSlotInventory.itemSlots.hasOwnProperty(1) ? this.armourSlotInventory.itemSlots[1].type : null);
   }

   public updateBowChargeTexture(): void {
      // Change the bow charging texture based on the charge progress
      if (this.action === TribeMemberAction.charge_bow && this.activeItemType !== null) {
         const bowInfo = ITEM_INFO_RECORD[this.activeItemType] as BowItemInfo;
         
         const secondsSinceLastAction = this.getSecondsSinceLastAction(this.lastActionTicks);
         const chargeProgress = secondsSinceLastAction / bowInfo.shotCooldown;

         let textureIdx = Math.floor(chargeProgress * TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length);
         if (textureIdx >= TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length) {
            textureIdx = TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length - 1;
         }
         this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(TribeMember.BOW_CHARGE_TEXTURE_SOURCES[textureIdx])];
      }
   }

   public updateActiveItem(activeItemType: ItemType | null): void {
      // @Temporary
      this.updateActiveItemRenderPart(activeItemType);
      this.activeItemType = activeItemType;
   }
}

export default TribeMember;