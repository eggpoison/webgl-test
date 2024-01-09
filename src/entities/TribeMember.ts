import { ArmourItemType, BowItemInfo, EntityData, EntityType, HitData, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, Inventory, InventoryData, ItemType, Point, SETTINGS, TileType, ToolItemInfo, TribeMemberAction, TribeType, lerp, randFloat, randInt, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { getFrameProgress } from "../GameObject";
import Particle from "../Particle";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../generic-particles";
import Board from "../Board";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
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
   // @Incomplete
   [ItemType.leather_armour]: {
      textureSource: "armour/leather-armour.png",
      pixelSize: 64
   },
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
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = 28;
   
   private static readonly HAND_RESTING_DIRECTION = Math.PI / 2.5;
   private readonly handRestingOffset: number;
   private static readonly HAND_RESTING_ROTATION = 0;
   private static readonly HAND_CHARGING_BOW_DIRECTION = Math.PI / 4.2;
   private static readonly HAND_CHARGING_BOW_OFFSET = 37;

   private static readonly SPEAR_ATTACK_LUNGE_TIME = 0.2;
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
   
   public readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourSlotInventory: Inventory;
   public backpackSlotInventory: Inventory;
   public backpackInventory: Inventory;

   private readonly handRenderParts: ReadonlyArray<RenderPart>;
   /** First element is right active item, second is left */
   private activeItemRenderParts: ReadonlyArray<RenderPart>;

   protected rightActiveItemType: ItemType | null;
   protected leftActiveItemType: ItemType | null;

   public rightAction: TribeMemberAction;
   public leftAction: TribeMemberAction;
   public rightFoodEatingType: ItemType | -1;
   public leftFoodEatingType: ItemType | -1;

   public rightLastActionTicks: number;
   public leftLastActionTicks: number;

   public hasFrostShield: boolean;

   private readonly handDirections = [TribeMember.HAND_RESTING_DIRECTION, -TribeMember.HAND_RESTING_DIRECTION];
   private readonly handOffsets: [number, number];
   private readonly handRotations = [TribeMember.HAND_RESTING_ROTATION, -TribeMember.HAND_RESTING_ROTATION];

   private readonly activeItemDirections = [TribeMember.HAND_RESTING_DIRECTION, -TribeMember.HAND_RESTING_DIRECTION];
   private readonly activeItemOffsets = [TribeMember.ITEM_RESTING_OFFSET, TribeMember.ITEM_RESTING_OFFSET];
   private readonly activeItemRotations = [TribeMember.ITEM_RESTING_ROTATION, -TribeMember.ITEM_RESTING_ROTATION];
   
   // @Cleanup: We shouldn't pass entityType through the constructor, just do the related logic in the subclasses
   constructor(position: Point, id: number, entityType: EntityType, renderDepth: number, tribeID: number | null, tribeType: TribeType, armourSlotInventory: InventoryData, backpackSlotInventory: InventoryData, backpackInventory: InventoryData, rightActiveItemType: ItemType | null, rightAction: TribeMemberAction, rightFoodEatingType: ItemType | -1, rightLastActionTicks: number, leftActiveItemType: ItemType | null, leftAction: TribeMemberAction, leftFoodEatingType: ItemType | -1, leftLastActionTicks: number, hasFrostShield: boolean, warPaintType: number) {
      super(position, id, entityType, renderDepth);

      this.tribeID = tribeID;
      this.tribeType = tribeType;
      this.leftAction = leftAction;
      this.rightAction = rightAction;
      this.leftActiveItemType = leftActiveItemType;
      this.rightActiveItemType = rightActiveItemType;
      this.leftLastActionTicks = leftLastActionTicks;
      this.rightLastActionTicks = rightLastActionTicks;
      this.rightFoodEatingType = rightFoodEatingType;
      this.leftFoodEatingType = leftFoodEatingType;
      this.hasFrostShield = hasFrostShield;

      this.armourSlotInventory = createInventoryFromData(armourSlotInventory);
      this.backpackSlotInventory = createInventoryFromData(backpackSlotInventory);
      this.backpackInventory = createInventoryFromData(backpackInventory);

      this.updateArmourRenderPart(armourSlotInventory.itemSlots.hasOwnProperty(1) ? armourSlotInventory.itemSlots[1].type : null);

      this.handRestingOffset = entityType === EntityType.player || entityType === EntityType.tribeWarrior ? 34 : 30;
      this.handOffsets = [this.handRestingOffset, this.handRestingOffset];

      let bodyTextureSource: string;
      let fistTextureSource: string;
      switch (tribeType) {
         case TribeType.plainspeople: {
            if (entityType === EntityType.player || entityType === EntityType.tribeWarrior) {
               bodyTextureSource = "entities/plainspeople/player.png";
            } else {
               bodyTextureSource = "entities/plainspeople/worker.png";
            }
            fistTextureSource = "entities/plainspeople/fist.png";
            break;
         }
         case TribeType.goblins: {
            if (entityType === EntityType.player || entityType === EntityType.tribeWarrior) {
               bodyTextureSource = "entities/goblins/player.png";
            } else {
               bodyTextureSource = "entities/goblins/worker.png";
            }
            fistTextureSource = "entities/goblins/fist.png";
            break;
         }
         case TribeType.frostlings: {
            if (entityType === EntityType.player || entityType === EntityType.tribeWarrior) {
               bodyTextureSource = "entities/frostlings/player.png";
            } else {
               bodyTextureSource = "entities/frostlings/worker.png";
            }
            fistTextureSource = "entities/frostlings/fist.png";
            break;
         }
         case TribeType.barbarians: {
            if (entityType === EntityType.player || entityType === EntityType.tribeWarrior) {
               bodyTextureSource = "entities/barbarians/player.png";
            } else {
               bodyTextureSource = "entities/barbarians/worker.png";
            }
            fistTextureSource = "entities/barbarians/fist.png";
            break;
         }
      }

      const radius = entityType === EntityType.player || entityType === EntityType.tribeWarrior ? 32 : 28;

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

      // Barbarians have larger fists
      const fistSize = tribeType === TribeType.barbarians ? 24 : 20;
      
      // Fist render parts
      const handRenderParts = new Array<RenderPart>();
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
            const offset = Point.fromVectorForm(this.handOffsets[i], this.handDirections[i]);
            return offset;
         }
         renderPart.getRotation = () => {
            return this.handRotations[i];
         }
         this.attachRenderPart(renderPart);
         handRenderParts.push(renderPart);
      }
      this.handRenderParts = handRenderParts;

      // Active item render parts
      const activeItemRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const activeItemType = i === 0 ? this.rightActiveItemType : this.leftActiveItemType;
         
         const renderPart = new RenderPart(
            this,
            TribeMember.TOOL_ACTIVE_ITEM_SIZE,
            TribeMember.TOOL_ACTIVE_ITEM_SIZE,
            activeItemType !== null ? getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].entityTextureSource) : -1,
            0,
            0
         );
         renderPart.offset = () => {
            return Point.fromVectorForm(this.activeItemOffsets[i], this.activeItemDirections[i]);
         }
         renderPart.getRotation = () => {
            return this.activeItemRotations[i];
         }
         
         if (activeItemType !== null) {
            this.attachRenderPart(renderPart);
         }
         activeItemRenderParts.push(renderPart);
      }
      this.activeItemRenderParts = activeItemRenderParts;
   }

   public updateHands(): void {
      this.handRenderParts[0].shakeAmount = 0;
      this.handRenderParts[1].shakeAmount = 0;

      for (let i = 0; i < 2; i++) {
         const handMult = i === 1 ? -1 : 1;
         
         let direction = Math.PI / 4;
   
         // @Cleanup: As the offset function is called in the RenderPart constructor, this.activeItemRenderPart will initially
         // be undefined and so we have to check for this case. Ideally this will not need to be done
         let itemSize: number;
         if (typeof this.activeItemRenderParts === "undefined") {
            const activeItemType = i === 0 ? this.leftActiveItemType! : this.rightActiveItemType!;
            itemSize = this.getActiveItemSize(activeItemType);
         } else {
            itemSize = this.activeItemRenderParts[i].width;
         }

         const lastActionTicks = i === 0 ? this.rightLastActionTicks : this.leftLastActionTicks;
         const secondsSinceLastAction = this.getSecondsSinceLastAction(lastActionTicks);

         const action = i === 0 ? this.rightAction : this.leftAction;
         switch (action) {
            case TribeMemberAction.chargeBow: {
               // 
               // Bow charge animation
               // 

               this.handDirections[i] = TribeMember.HAND_CHARGING_BOW_DIRECTION * handMult;
               this.handOffsets[i] = TribeMember.HAND_CHARGING_BOW_OFFSET;
               this.handRotations[i] = TribeMember.HAND_CHARGING_BOW_DIRECTION * handMult;

               this.activeItemOffsets[i] = 22 + itemSize / 2;
               this.activeItemDirections[i] = 0;
               this.activeItemRotations[i] = -Math.PI / 4;
               return;
            }
            case TribeMemberAction.chargeSpear: {
               // 
               // Spear charge animation
               // 
               const chargeProgress = secondsSinceLastAction < 3 ? 1 - Math.pow(secondsSinceLastAction / 3 - 1, 2) : 1;

               const handDirection = lerp(TribeMember.HAND_RESTING_DIRECTION, Math.PI / 1.5, chargeProgress) * handMult;
               
               this.handDirections[i] = handDirection;
               this.handOffsets[i] = this.handRestingOffset;
               this.handRotations[i] = TribeMember.HAND_CHARGING_BOW_DIRECTION * handMult;

               this.activeItemDirections[i] = (handDirection - Math.PI/14) * handMult;
               this.activeItemOffsets[i] = TribeMember.ITEM_RESTING_OFFSET + itemSize/2;
               this.activeItemRotations[i] = TribeMember.ITEM_RESTING_ROTATION * handMult;

               this.handRenderParts[i].shakeAmount = lerp(0, 1.5, chargeProgress);
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
               direction *= handMult;

               const insetAmount = lerp(0, 17, eatIntervalProgress);

               this.handDirections[i] = direction;
               this.handOffsets[i] = this.handRestingOffset - insetAmount;
               this.handRotations[i] = lerp(TribeMember.HAND_RESTING_ROTATION, TribeMember.HAND_RESTING_ROTATION - Math.PI/5, eatIntervalProgress) * handMult;

               this.activeItemOffsets[i] = TribeMember.ITEM_RESTING_OFFSET + itemSize/2 - insetAmount;
               this.activeItemDirections[i] = (direction - Math.PI/14) * handMult;
               this.activeItemRotations[i] = lerp(0, -Math.PI/3, eatIntervalProgress) * handMult;
               return;
            }
            case TribeMemberAction.none: {
               // 
               // Attack animation
               // 

               const activeItemType = i === 0 ? this.rightActiveItemType : this.leftActiveItemType;
               const attackProgress = this.calculateAttackProgress(activeItemType, secondsSinceLastAction);

               if (this.leftActiveItemType === ItemType.spear) {
                  let direction: number;
                  let attackHandRotation: number;
                  let extraOffset: number;
                  if (attackProgress < TribeMember.SPEAR_ATTACK_LUNGE_TIME) {
                     // Lunge part of the animation
                     direction = lerp(TribeMember.HAND_RESTING_DIRECTION, Math.PI / 4, attackProgress / TribeMember.SPEAR_ATTACK_LUNGE_TIME);
                     attackHandRotation = lerp(TribeMember.ITEM_RESTING_ROTATION, -Math.PI / 7, attackProgress / TribeMember.SPEAR_ATTACK_LUNGE_TIME);
                     extraOffset = lerp(0, 7, attackProgress / TribeMember.SPEAR_ATTACK_LUNGE_TIME);
                  } else {
                     // Return part of the animation
                     const returnProgress = (attackProgress - TribeMember.SPEAR_ATTACK_LUNGE_TIME) / (1 - TribeMember.SPEAR_ATTACK_LUNGE_TIME);
                     direction = lerp(Math.PI / 4, TribeMember.HAND_RESTING_DIRECTION, returnProgress);
                     attackHandRotation = lerp(-Math.PI / 7, TribeMember.ITEM_RESTING_ROTATION, returnProgress);
                     extraOffset = lerp(7, 0, returnProgress);
                  }

                  this.handDirections[i] = direction * handMult;
                  this.handOffsets[i] = this.handRestingOffset + extraOffset;
                  this.handRotations[i] = attackHandRotation * handMult;
      
                  this.activeItemOffsets[i] = TribeMember.ITEM_RESTING_OFFSET + itemSize/2 + extraOffset;
                  this.activeItemDirections[i] = (direction - Math.PI/14) * handMult;
                  this.activeItemRotations[i] = attackHandRotation * handMult;
               } else {
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
                  
                  this.handDirections[i] = direction * handMult;
                  this.handOffsets[i] = this.handRestingOffset;
                  this.handRotations[i] = attackHandRotation * handMult;
      
                  this.activeItemOffsets[i] = TribeMember.ITEM_RESTING_OFFSET + itemSize/2;
                  this.activeItemDirections[i] = (direction - Math.PI/14) * handMult;
                  this.activeItemRotations[i] = attackHandRotation * handMult;
               }
               return;
            }
         }
      }
   }

   public getSecondsSinceLastAction(lastActionTicks: number): number {
      const ticksSinceLastAction = Board.ticks - lastActionTicks;
      let secondsSinceLastAction = ticksSinceLastAction / SETTINGS.TPS;

      // Account for frame progress
      secondsSinceLastAction += getFrameProgress() / SETTINGS.TPS;

      return secondsSinceLastAction;
   }

   private calculateAttackProgress(activeItemType: ItemType | null, secondsSinceLastAttack: number): number {
      let attackDuration: number;
      if (activeItemType !== null && (ITEM_TYPE_RECORD[activeItemType] === "sword" || ITEM_TYPE_RECORD[activeItemType] === "axe" || ITEM_TYPE_RECORD[activeItemType] === "pickaxe" || ITEM_TYPE_RECORD[activeItemType] === "spear" || ITEM_TYPE_RECORD[activeItemType] === "hammer")) {
         attackDuration = (ITEM_INFO_RECORD[activeItemType] as ToolItemInfo).attackCooldown;
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
         case TribeType.plainspeople: {
            playSound(("plainsperson-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound(("barbarian-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
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
         case TribeType.plainspeople: {
            playSound("plainsperson-die-1.mp3", 0.4, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-die-1.mp3", 0.4, this.position.x, this.position.y);
            break;
         }
      }
   }

   public tick(): void {
      super.tick();

      // Create food eating particles
      if (this.leftFoodEatingType !== -1 && Board.tickIntervalHasPassed(0.25)) {
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

            const colour = randItem(FOOD_EATING_COLOURS[this.leftFoodEatingType as keyof typeof FOOD_EATING_COLOURS]);

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
      if (this.rightActiveItemType !== null && this.rightActiveItemType === ItemType.deepfrost_heart) {
         createDeepFrostHeartBloodParticles(this.activeItemRenderParts[0].renderPosition.x, this.activeItemRenderParts[0].renderPosition.y, this.velocity.x, this.velocity.y);
      }
      if (this.leftActiveItemType !== null && this.leftActiveItemType === ItemType.deepfrost_heart) {
         createDeepFrostHeartBloodParticles(this.activeItemRenderParts[1].renderPosition.x, this.activeItemRenderParts[1].renderPosition.y, this.velocity.x, this.velocity.y);
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

   private updateActiveItemRenderPart(i: number, activeItemType: ItemType | null): void {
      if (activeItemType === null) {
         this.removeRenderPart(this.activeItemRenderParts[i]);
      } else {
         const renderPart = this.activeItemRenderParts[i];
         this.attachRenderPart(renderPart);
         
         if (this.showLargeItemTexture(activeItemType)) {
            const textureArrayIndex = getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].toolTextureSource);
            
            renderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[textureArrayIndex];
            renderPart.textureWidth = getTextureWidth(textureArrayIndex);
            renderPart.textureHeight = getTextureHeight(textureArrayIndex);
            renderPart.width = getTextureWidth(textureArrayIndex) * 4;
            renderPart.height = getTextureHeight(textureArrayIndex) * 4;
         } else {
            renderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].entityTextureSource)];
            renderPart.textureWidth = 8;
            renderPart.textureHeight = 8;
            renderPart.width = TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
            renderPart.height = TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
         }
      }
   }

   private showLargeItemTexture(itemType: ItemType): boolean {
      const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
      return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe" || itemTypeInfo === "spear" || itemTypeInfo === "hammer";
   }

   private getActiveItemSize(activeItemType: ItemType) {
      if (this.showLargeItemTexture(activeItemType)) {
         return TribeMember.TOOL_ACTIVE_ITEM_SIZE;
      }
      return TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
   }

   public updateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribeWorker> | EntityData<EntityType.tribeWarrior>): void {
      super.updateFromData(entityData);

      this.genericUpdateFromData(entityData);

      // Do all the non-player-instance updates

      this.tribeID = entityData.clientArgs[0];

      updateInventoryFromData(this.armourSlotInventory, entityData.clientArgs[2]);
      updateInventoryFromData(this.backpackSlotInventory, entityData.clientArgs[3]);
      updateInventoryFromData(this.backpackInventory, entityData.clientArgs[4]);
      this.rightActiveItemType = entityData.clientArgs[5];
      this.rightAction = entityData.clientArgs[6];
      this.rightFoodEatingType = entityData.clientArgs[7];
      this.rightLastActionTicks = entityData.clientArgs[8];
      this.leftActiveItemType = entityData.clientArgs[9];
      this.leftAction = entityData.clientArgs[10];
      this.leftFoodEatingType = entityData.clientArgs[11];
      this.leftLastActionTicks = entityData.clientArgs[12];
      this.updateActiveItemRenderPart(0, this.rightActiveItemType);
      this.updateActiveItemRenderPart(1, this.leftActiveItemType);

      this.updateBowChargeTexture();

      this.updateArmourRenderPart(this.armourSlotInventory.itemSlots.hasOwnProperty(1) ? this.armourSlotInventory.itemSlots[1].type : null);
   }

   public genericUpdateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribeWorker> | EntityData<EntityType.tribeWarrior>): void {
      if (this.hasFrostShield && !entityData.clientArgs[9]) {
         this.createFrostShieldBreakParticles();
      }
      this.hasFrostShield = entityData.clientArgs[13];
      
      this.updateHands();
   }

   public createFrostShieldBreakParticles(): void {
      for (let i = 0; i < 17; i++) {
         createFrostShieldBreakParticle(this.position.x, this.position.y);
      }
   }

   public updateBowChargeTexture(): void {
      // Change the bow charging texture based on the charge progress
      if (this.leftAction === TribeMemberAction.chargeBow && this.leftActiveItemType !== null) {
         const bowInfo = ITEM_INFO_RECORD[this.leftActiveItemType] as BowItemInfo;
         
         const secondsSinceLastAction = this.getSecondsSinceLastAction(this.rightLastActionTicks);
         const chargeProgress = secondsSinceLastAction / (bowInfo.shotCooldownTicks / SETTINGS.TPS);

         let textureIdx = Math.floor(chargeProgress * TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length);
         if (textureIdx >= TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length) {
            textureIdx = TribeMember.BOW_CHARGE_TEXTURE_SOURCES.length - 1;
         }
         this.activeItemRenderParts[0].textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(TribeMember.BOW_CHARGE_TEXTURE_SOURCES[textureIdx])];
      }
   }

   public updateActiveItem(i: number, activeItemType: ItemType | null): void {
      this.updateActiveItemRenderPart(i, activeItemType);
      if (i === 0) {
         this.rightActiveItemType = activeItemType;
      } else {
         this.leftActiveItemType = activeItemType;
      }
   }
}

export default TribeMember;