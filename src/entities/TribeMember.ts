import { ArmourItemType, BowItemInfo, EntityData, EntityType, HitData, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, InventoryData, ItemType, Point, SETTINGS, TileType, ToolItemInfo, TribeMemberAction, TribeType, lerp, randFloat, randInt, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getFrameProgress } from "../GameObject";
import Particle from "../Particle";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../generic-particles";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { Inventory } from "../items/Item";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import OPTIONS from "../options";
import { createDeepFrostHeartBloodParticles } from "../items/DroppedItem";
import { AudioFilePath, playSound } from "../sound";

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

interface ArmourInfo {
   readonly textureSource: string;
   readonly pixelSize: number;
}

const ARMOUR_WORN_INFO: Record<ArmourItemType, ArmourInfo> = {
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
   },
   [ItemType.fishlord_suit]: {
      textureSource: "armour/fishlord-suit.png",
      pixelSize: 80
   }
};

const FROST_PARTICLE_LOW: ParticleColour = [102/255, 165/255, 205/255];
const FROST_PARTICLE_HIGH: ParticleColour = [202/255, 239/255, 255/255];
const createFrostShieldBreakParticle = (positionX: number, positionY: number): void => {
   const offsetDirection = 2 * Math.PI * Math.random();
   positionX += 32 * Math.sin(offsetDirection);
   positionY += 32 * Math.cos(offsetDirection);

   const lifetime = randFloat(0.2, 0.3);
   
   const moveSpeed = randFloat(200, 280);
   const moveDirection = offsetDirection + randFloat(-0.5, 0.5);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   const colourLerp = Math.random();
   const r = lerp(FROST_PARTICLE_LOW[0], FROST_PARTICLE_HIGH[0], colourLerp);
   const g = lerp(FROST_PARTICLE_LOW[1], FROST_PARTICLE_HIGH[1], colourLerp);
   const b = lerp(FROST_PARTICLE_LOW[2], FROST_PARTICLE_HIGH[2], colourLerp);

   const size = randInt(7, 10);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      size / 2, size,
      positionX, positionY,
      velocityX, velocityY,
      0, 0,
      0,
      moveDirection,
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

const GOBLIN_HURT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

abstract class TribeMember extends Entity {
   protected static readonly RADIUS = 32;

   private static readonly GOBLIN_EAR_WIDTH = 20;
   private static readonly GOBLIN_EAR_HEIGHT = 16;
   private static readonly GOBLIN_EAR_OFFSET = 4;
   private static readonly GOBLIN_EAR_ANGLE = Math.PI / 3;
   
   private static readonly FOOD_EAT_INTERVAL = 0.3;
   
   private static readonly TOOL_ACTIVE_ITEM_SIZE = 48;
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = SETTINGS.ITEM_SIZE * 1.75;
   
   private static readonly HAND_RESTING_DIRECTION = Math.PI / 2.5;
   private readonly handRestingOffset: number;
   private static readonly HAND_RESTING_ROTATION = 0;
   private static readonly HAND_CHARGING_BOW_DIRECTION = Math.PI / 4.2;
   private static readonly HAND_CHARGING_BOW_OFFSET = 37;

   /** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
   private static readonly ATTACK_LUNGE_TIME = 0.3;
   private static readonly ITEM_SWING_RANGE = Math.PI / 2.5;
   
   private static readonly ITEM_RESTING_OFFSET = 30;
   private static readonly ITEM_RESTING_ROTATION = 0;
   private static readonly ITEM_END_ROTATION = -Math.PI * 2/3;

   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   private static readonly BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
      "items/large/wooden-bow.png",
      "miscellaneous/wooden-bow-charge-1.png",
      "miscellaneous/wooden-bow-charge-2.png",
      "miscellaneous/wooden-bow-charge-3.png",
      "miscellaneous/wooden-bow-charge-4.png",
      "miscellaneous/wooden-bow-charge-5.png"
   ];
   
   protected readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourSlotInventory: Inventory;
   public backpackSlotInventory: Inventory;
   public backpackInventory: Inventory;

   private activeItemRenderPart: RenderPart;

   protected activeItemType: ItemType | null;

   public action: TribeMemberAction;
   public foodEatingType: ItemType | -1;

   public lastActionTicks: number;

   public hasFrostShield: boolean;

   private rightHandDirection = TribeMember.HAND_RESTING_DIRECTION;
   private rightHandOffset: number;
   private rightHandRotation = TribeMember.HAND_RESTING_ROTATION;

   private leftHandDirection = -TribeMember.HAND_RESTING_DIRECTION;
   private leftHandOffset: number;
   private leftHandRotation = -TribeMember.HAND_RESTING_ROTATION;

   private activeItemDirection = TribeMember.HAND_RESTING_DIRECTION;
   private activeItemOffset = TribeMember.ITEM_RESTING_OFFSET;
   private activeItemRotation = TribeMember.ITEM_RESTING_ROTATION;
   
   // @Cleanup: We shouldn't pass entityType through the constructor, just do the related logic in the subclasses
   constructor(position: Point, id: number, renderDepth: number, entityType: EntityType, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, activeItem: ItemType | null, action: TribeMemberAction, foodEatingType: ItemType | -1, lastActionTicks: number, hasFrostShield: boolean, warPaintType: number) {
      super(position, id, renderDepth);

      this.tribeID = tribeID;
      this.tribeType = tribeType;
      this.action = action;

      this.activeItemType = activeItem;
      this.lastActionTicks = lastActionTicks;
      this.foodEatingType = foodEatingType;
      this.hasFrostShield = hasFrostShield;

      this.armourSlotInventory = createInventoryFromData(armourSlotInventory);
      this.backpackSlotInventory = createInventoryFromData(backpackSlotInventory);
      this.backpackInventory = createInventoryFromData(backpackInventory);

      this.updateArmourRenderPart(armourSlotInventory.itemSlots.hasOwnProperty(1) ? armourSlotInventory.itemSlots[1].type : null);

      this.handRestingOffset = entityType === EntityType.player ? 34 : 30;
      this.rightHandOffset = this.handRestingOffset;
      this.leftHandOffset = this.handRestingOffset;

      let bodyTextureSource: string;
      let fistTextureSource: string;
      switch (tribeType) {
         case TribeType.plainspeople: {
            if (entityType === EntityType.player) {
               bodyTextureSource = "entities/plainspeople/player.png";
            } else {
               bodyTextureSource = "entities/plainspeople/worker.png";
            }
            fistTextureSource = "entities/plainspeople/fist.png";
            break;
         }
         case TribeType.goblins: {
            if (entityType === EntityType.player) {
               bodyTextureSource = "entities/goblins/player.png";
            } else {
               bodyTextureSource = "entities/goblins/worker.png";
            }
            fistTextureSource = "entities/goblins/fist.png";
            break;
         }
         case TribeType.frostlings: {
            if (entityType === EntityType.player) {
               bodyTextureSource = "entities/frostlings/player.png";
            } else {
               bodyTextureSource = "entities/frostlings/worker.png";
            }
            fistTextureSource = "entities/frostlings/fist.png";
            break;
         }
         case TribeType.barbarians: {
            if (entityType === EntityType.player) {
               bodyTextureSource = "entities/barbarians/player.png";
            } else {
               bodyTextureSource = "entities/barbarians/worker.png";
            }
            fistTextureSource = "entities/barbarians/fist.png";
            break;
         }
      }

      const radius = entityType === EntityType.player ? 32 : 28;

      // 
      // Body render part
      // 
      
      this.attachRenderPart(new RenderPart(
         this,
         radius * 2,
         radius * 2,
         getGameObjectTextureArrayIndex(bodyTextureSource),
         2,
         0
      ));

      if (tribeType === TribeType.goblins) {
         // Goblin warpaint
         this.attachRenderPart(
            new RenderPart(
               this,
               radius * 2,
               radius * 2,
               getGameObjectTextureArrayIndex(`entities/goblins/goblin-warpaint-${warPaintType}.png`),
               4,
               0
            )
         );

         // Left ear
         const leftEarRenderPart = new RenderPart(
            this,
            TribeMember.GOBLIN_EAR_WIDTH,
            TribeMember.GOBLIN_EAR_HEIGHT,
            getGameObjectTextureArrayIndex("entities/goblins/goblin-ear.png"),
            3,
            Math.PI/2 - TribeMember.GOBLIN_EAR_ANGLE,
         );
         leftEarRenderPart.offset = Point.fromVectorForm(radius + TribeMember.GOBLIN_EAR_OFFSET, -TribeMember.GOBLIN_EAR_ANGLE);
         leftEarRenderPart.flipX = true;
         this.attachRenderPart(leftEarRenderPart);

         // Right ear
         const rightEarRenderPart = new RenderPart(
            this,
            TribeMember.GOBLIN_EAR_WIDTH,
            TribeMember.GOBLIN_EAR_HEIGHT,
            getGameObjectTextureArrayIndex("entities/goblins/goblin-ear.png"),
            3,
            -Math.PI/2 + TribeMember.GOBLIN_EAR_ANGLE,
         );
         rightEarRenderPart.offset = Point.fromVectorForm(radius + TribeMember.GOBLIN_EAR_OFFSET, TribeMember.GOBLIN_EAR_ANGLE);
         this.attachRenderPart(rightEarRenderPart);
      }

      // Fist render parts
      if (OPTIONS.showTribeMemberHands) {
         // Barbarians have larger fists
         const fistSize = tribeType === TribeType.barbarians ? 24 : 20;

         for (let i = 0; i < 2; i++) {
            const renderPart = new RenderPart(
               this,
               fistSize,
               fistSize,
               getGameObjectTextureArrayIndex(fistTextureSource),
               1,
               0
            );
            renderPart.offset = () => {
               const direction = i === 0 ? this.leftHandDirection : this.rightHandDirection;
               const offset = i === 0 ? this.leftHandOffset : this.rightHandOffset;
               return Point.fromVectorForm(offset, direction);
            }
            renderPart.getRotation = () => {
               return i === 0 ? this.leftHandRotation : this.rightHandRotation;
            }
            this.attachRenderPart(renderPart);
         }
      }

      this.activeItemRenderPart = new RenderPart(
         this,
         TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         activeItem !== null ? getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItem].entityTextureSource) : -1,
         0,
         0
      );
      this.activeItemRenderPart.offset = () => {
         return Point.fromVectorForm(this.activeItemOffset, this.activeItemDirection);
      }
      this.activeItemRenderPart.getRotation = () => {
         return this.activeItemRotation;
      }
      
      if (activeItem !== null && OPTIONS.showTribeMemberHands) {
         this.attachRenderPart(this.activeItemRenderPart);
      }
   }

   public updateHandDirections(): void {
      let direction = Math.PI / 4;

      // @Cleanup: As the offset function is called in the RenderPart constructor, this.activeItemRenderPart will initially
      // be undefined and so we have to check for this case. Ideally this will not need to be done
      let itemSize: number;
      if (typeof this.activeItemRenderPart === "undefined") {
         itemSize = this.getActiveItemSize(this.activeItemType!);
      } else {
         itemSize = this.activeItemRenderPart.width;
      }

      const secondsSinceLastAction = this.getSecondsSinceLastAction();
      switch (this.action) {
         case TribeMemberAction.charge_bow: {
            // 
            // Bow charge animation
            // 

            this.leftHandDirection = -TribeMember.HAND_CHARGING_BOW_DIRECTION;
            this.leftHandOffset = TribeMember.HAND_CHARGING_BOW_OFFSET;
            this.leftHandRotation = -TribeMember.HAND_CHARGING_BOW_DIRECTION;
            this.rightHandDirection = TribeMember.HAND_CHARGING_BOW_DIRECTION;
            this.rightHandOffset = TribeMember.HAND_CHARGING_BOW_OFFSET;
            this.rightHandRotation = TribeMember.HAND_CHARGING_BOW_DIRECTION;

            this.activeItemOffset = 22 + itemSize / 2;
            this.activeItemDirection = 0;
            this.activeItemRotation = -Math.PI / 4;
            return;
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

            const eatingHandRotation = lerp(TribeMember.HAND_RESTING_ROTATION, TribeMember.HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress);

            this.leftHandDirection = -TribeMember.HAND_RESTING_DIRECTION;
            this.leftHandOffset = this.handRestingOffset;
            this.leftHandRotation = -TribeMember.HAND_RESTING_ROTATION;
            this.rightHandDirection = direction;
            this.rightHandOffset = this.handRestingOffset - insetAmount;
            this.rightHandRotation = eatingHandRotation;

            this.activeItemOffset = TribeMember.ITEM_RESTING_OFFSET + itemSize/2 - insetAmount;
            this.activeItemDirection = direction - Math.PI/14;
            this.activeItemRotation = lerp(0, -Math.PI/3, eatIntervalProgress);
            return;
         }
         case TribeMemberAction.none: {
            // 
            // Attack animation
            // 
         
            const attackProgress = this.getAttackProgress(secondsSinceLastAction);

            let direction: number;
            let attackHandRotation: number;
            if (attackProgress < TribeMember.ATTACK_LUNGE_TIME) {
               // Lunge part of the animation
               direction = lerp(TribeMember.HAND_RESTING_DIRECTION, TribeMember.HAND_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
               attackHandRotation = lerp(TribeMember.ITEM_RESTING_ROTATION, TribeMember.ITEM_END_ROTATION, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
            } else {
               // Return part of the animation
               const returnProgress = (attackProgress - TribeMember.ATTACK_LUNGE_TIME) / (1 - TribeMember.ATTACK_LUNGE_TIME);
               direction = lerp(TribeMember.HAND_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, TribeMember.HAND_RESTING_DIRECTION, returnProgress);
               attackHandRotation = lerp(TribeMember.ITEM_END_ROTATION, TribeMember.ITEM_RESTING_ROTATION, returnProgress);
            }
            
            this.leftHandDirection = -TribeMember.HAND_RESTING_DIRECTION;
            this.leftHandOffset = this.handRestingOffset;
            this.leftHandRotation = -TribeMember.HAND_RESTING_ROTATION;
            this.rightHandDirection = direction;
            this.rightHandOffset = this.handRestingOffset;
            this.rightHandRotation = attackHandRotation;

            if (this.activeItemType !== null && ITEM_TYPE_RECORD[this.activeItemType] === "bow") {
               this.activeItemOffset = TribeMember.ITEM_RESTING_OFFSET + 7;
               this.activeItemDirection = direction;
               this.activeItemRotation = attackHandRotation + Math.PI/10;
            } else {
               this.activeItemOffset = TribeMember.ITEM_RESTING_OFFSET + itemSize/2;
               this.activeItemDirection = direction - Math.PI/14;
               this.activeItemRotation = attackHandRotation;
            }
            return;
         }
      }
   }

   public getSecondsSinceLastAction(): number {
      const ticksSinceLastAction = Board.ticks - this.lastActionTicks;
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

      switch (this.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_HURT_SOUNDS), 0.4, this.position.x, this.position.y);
            break;
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);

      createBloodParticleFountain(this, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);

      switch (this.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_DIE_SOUNDS), 0.4, this.position.x, this.position.y);
            break;
         }
      }
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

      // Make the deep frost heart item spew blue blood particles
      if (this.activeItemType !== null && this.activeItemType === ItemType.deepfrost_heart) {
         createDeepFrostHeartBloodParticles(this.activeItemRenderPart.renderPosition.x, this.activeItemRenderPart.renderPosition.y, this.velocity.x, this.velocity.y);
      }
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      if (this.armourSlotInventory.itemSlots.hasOwnProperty(1)) {
         // If snow armour is equipped, move at normal speed on snow tiles
         if ((this.armourSlotInventory.itemSlots[1].type === ItemType.frost_armour || this.armourSlotInventory.itemSlots[1].type === ItemType.deepfrost_armour) && this.tile.type === TileType.snow) {
            return 1;
         }
         // If fishlord suit is equipped, move at normal speed on snow tiles
         if (this.armourSlotInventory.itemSlots[1].type === ItemType.fishlord_suit && this.tile.type === TileType.water) {
            return 1;
         }
      }
      return null;
   }

   private getArmourTextureIndex(armourType: ItemType): number {
      if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
         console.warn("Can't find armour info for item type '" + ItemType[armourType] + ".");
         return -1;
      }

      return getGameObjectTextureArrayIndex(ARMOUR_WORN_INFO[armourType as ArmourItemType].textureSource);
   }

   private getArmourPixelSize(armourType: ItemType): number {
      if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
         console.warn("Can't find armour info for item type '" + ItemType[armourType] + ".");
         return -1;
      }

      return ARMOUR_WORN_INFO[armourType as ArmourItemType].pixelSize;
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
               3,
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
         this.attachRenderPart(this.activeItemRenderPart);
         
         if (this.showLargeItemTexture(activeItemType)) {
            this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].textureSource)];
            this.activeItemRenderPart.textureWidth = 16;
            this.activeItemRenderPart.textureHeight = 16;
         } else {
            this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].entityTextureSource)];
            this.activeItemRenderPart.textureWidth = 8;
            this.activeItemRenderPart.textureHeight = 8;
         }
         const renderPartSize = this.getActiveItemSize(activeItemType);
         this.activeItemRenderPart.width = renderPartSize;
         this.activeItemRenderPart.height = renderPartSize;
      }
   }

   private getActiveItemSize(activeItemType: ItemType) {
      const itemTypeInfo = ITEM_TYPE_RECORD[activeItemType];
      if (itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe") {
         return TribeMember.TOOL_ACTIVE_ITEM_SIZE;
      }
      return TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
   }

   private showLargeItemTexture(itemType: ItemType): boolean {
      const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
      return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe";
   }

   public updateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribesman>): void {
      super.updateFromData(entityData);

      this.genericUpdateFromData(entityData);

      // Do all the non-player-instance updates

      this.tribeID = entityData.clientArgs[0];

      updateInventoryFromData(this.armourSlotInventory, entityData.clientArgs[2]);
      updateInventoryFromData(this.backpackSlotInventory, entityData.clientArgs[3]);
      updateInventoryFromData(this.backpackInventory, entityData.clientArgs[4]);
      this.activeItemType = entityData.clientArgs[5];
      this.action = entityData.clientArgs[6];
      this.foodEatingType = entityData.clientArgs[7]
      this.lastActionTicks = entityData.clientArgs[8];
      if (OPTIONS.showTribeMemberHands) {
         this.updateActiveItemRenderPart(this.activeItemType);
      }

      this.updateBowChargeTexture();

      this.updateArmourRenderPart(this.armourSlotInventory.itemSlots.hasOwnProperty(1) ? this.armourSlotInventory.itemSlots[1].type : null);
   }

   public genericUpdateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribesman>): void {
      if (this.hasFrostShield && !entityData.clientArgs[9]) {
         this.createFrostShieldBreakParticles();
      }
      this.hasFrostShield = entityData.clientArgs[9];
      
      this.updateHandDirections();
   }

   public createFrostShieldBreakParticles(): void {
      for (let i = 0; i < 17; i++) {
         createFrostShieldBreakParticle(this.position.x, this.position.y);
      }
   }

   public updateBowChargeTexture(): void {
      // Change the bow charging texture based on the charge progress
      if (this.action === TribeMemberAction.charge_bow && this.activeItemType !== null) {
         const bowInfo = ITEM_INFO_RECORD[this.activeItemType] as BowItemInfo;
         
         const secondsSinceLastAction = this.getSecondsSinceLastAction();
         const chargeProgress = secondsSinceLastAction / (bowInfo.shotCooldownTicks / SETTINGS.TPS);

         let textureIdx = Math.floor(chargeProgress * TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length);
         if (textureIdx >= TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length) {
            textureIdx = TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length - 1;
         }
         this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(TribeMember.BOW_CHARGE_TEXTURE_SOURCES[textureIdx])];
      }
   }

   public updateActiveItem(activeItemType: ItemType | null): void {
      if (OPTIONS.showTribeMemberHands) {
         this.updateActiveItemRenderPart(activeItemType);
      }
      this.activeItemType = activeItemType;
   }
}

export default TribeMember;