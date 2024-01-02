import { BowItemInfo, EntityData, EntityType, HitData, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, Point, SETTINGS, ToolItemInfo, TribeMemberAction, lerp, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";
import { GAME_OBJECT_TEXTURE_SLOT_INDEXES, getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import { getFrameProgress } from "../GameObject";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";

const ZOMBIE_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/zombie1.png", "entities/zombie/zombie2.png", "entities/zombie/zombie3.png", "entities/zombie/zombie-golden.png"];
const ZOMBIE_HAND_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/fist-1.png", "entities/zombie/fist-2.png", "entities/zombie/fist-3.png", "entities/zombie/fist-4.png"];

// @Cleanup: So much copy and paste from TribeMember
// @Cleanup: So much copy and paste from TribeMember
// @Cleanup: So much copy and paste from TribeMember

class Zombie extends Entity {
   private static readonly RADIUS = 32;
   
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;
   
   private static readonly HAND_RESTING_ROTATION = 0;
   private static readonly HAND_RESTING_DIRECTION = Math.PI / 4;
   private static readonly HAND_RESTING_OFFSET = 32;
   
   private static readonly TOOL_ACTIVE_ITEM_SIZE = 48;
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = SETTINGS.ITEM_SIZE * 1.75;
   
   private static readonly ITEM_RESTING_OFFSET = 30;
   private static readonly ITEM_RESTING_ROTATION = 0;
   private static readonly ITEM_END_ROTATION = -Math.PI * 2/3;

   private static readonly HAND_CHARGING_BOW_DIRECTION = Math.PI / 4.2;
   private static readonly HAND_CHARGING_BOW_OFFSET = 37;

   /** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
   private static readonly ATTACK_LUNGE_TIME = 0.3;
   private static readonly ITEM_SWING_RANGE = Math.PI / 2.5;

   private static readonly BOW_CHARGE_TEXTURE_SOURCES: ReadonlyArray<string> = [
      "items/large/wooden-bow.png",
      "miscellaneous/wooden-bow-charge-1.png",
      "miscellaneous/wooden-bow-charge-2.png",
      "miscellaneous/wooden-bow-charge-3.png",
      "miscellaneous/wooden-bow-charge-4.png",
      "miscellaneous/wooden-bow-charge-5.png"
   ];

   private static readonly LUNGE_ANIMATION_TIME = 0.4;
   private static readonly HAND_LUNGE_DIRECTION = Math.PI / 5;

   public readonly type = EntityType.zombie;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;

   private rightHandDirection = Zombie.HAND_RESTING_DIRECTION;
   private rightHandOffset = Zombie.HAND_RESTING_OFFSET;
   private rightHandRotation = Zombie.HAND_RESTING_ROTATION;

   private leftHandDirection = -Zombie.HAND_RESTING_DIRECTION;
   private leftHandOffset = Zombie.HAND_RESTING_OFFSET;
   private leftHandRotation = -Zombie.HAND_RESTING_ROTATION;

   private activeItemDirection = Zombie.HAND_RESTING_DIRECTION;
   private activeItemOffset = Zombie.ITEM_RESTING_OFFSET;
   private activeItemRotation = Zombie.ITEM_RESTING_ROTATION;

   private activeItemRenderPart: RenderPart;

   private activeItemType: ItemType | null;

   public action: TribeMemberAction;
   private lastActionTicks: number;
   
   constructor(position: Point, id: number, renderDepth: number, zombieType: number, activeItemType: ItemType | null, lastActionTicks: number, action: TribeMemberAction) {
      super(position, id, EntityType.zombie, renderDepth);

      this.activeItemType = activeItemType;
      this.lastActionTicks = lastActionTicks;
      this.action = action;
      
      // Body render part
      this.attachRenderPart(
         new RenderPart(
            this,
            Zombie.RADIUS * 2,
            Zombie.RADIUS * 2,
            getGameObjectTextureArrayIndex(ZOMBIE_TEXTURE_SOURCES[zombieType]),
            2,
            0
         )
      );

      // Hand render parts
      for (let i = 0; i < 2; i++) {
         const renderPart = new RenderPart(
            this,
            20,
            20,
            getGameObjectTextureArrayIndex(ZOMBIE_HAND_TEXTURE_SOURCES[zombieType]),
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

      this.activeItemRenderPart = new RenderPart(
         this,
         Zombie.TOOL_ACTIVE_ITEM_SIZE,
         Zombie.TOOL_ACTIVE_ITEM_SIZE,
         activeItemType !== null ? getGameObjectTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[activeItemType].entityTextureSource) : -1,
         0,
         0
      );
      this.activeItemRenderPart.offset = () => {
         return Point.fromVectorForm(this.activeItemOffset, this.activeItemDirection);
      }
      this.activeItemRenderPart.getRotation = () => {
         return this.activeItemRotation;
      }
      
      if (activeItemType !== null) {
         this.attachRenderPart(this.activeItemRenderPart);
      }
   }

   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 4);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 45) {
         this.distanceTracker -= 45;
         this.createFootstepSound();
      }

      if (Math.random() < 0.1 / SETTINGS.TPS) {
         playSound(("zombie-ambient-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + Zombie.RADIUS * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + Zombie.RADIUS * Math.cos(offsetDirection);
         
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }

      playSound(("zombie-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, this.position.x, this.position.y);
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      createBloodParticleFountain(this, Zombie.BLOOD_FOUNTAIN_INTERVAL, 1);

      playSound("zombie-die-1.mp3", 0.4, this.position.x, this.position.y);
   }

   public getSecondsSinceLastAction(): number {
      const ticksSinceLastAction = Board.ticks - this.lastActionTicks;
      let secondsSinceLastAction = ticksSinceLastAction / SETTINGS.TPS;

      // Account for frame progress
      secondsSinceLastAction += getFrameProgress() / SETTINGS.TPS;

      return secondsSinceLastAction;
   }

   private getActiveItemSize(activeItemType: ItemType) {
      const itemTypeInfo = ITEM_TYPE_RECORD[activeItemType];
      if (itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe") {
         return Zombie.TOOL_ACTIVE_ITEM_SIZE;
      }
      return Zombie.DEFAULT_ACTIVE_ITEM_SIZE;
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

   private updateHands(): void {
      // Zombie lunge attack
      if (this.activeItemType === null) {
         const secondsSinceLastAction = this.getSecondsSinceLastAction();
         let attackProgress = secondsSinceLastAction / Zombie.LUNGE_ANIMATION_TIME;
         if (attackProgress > 1) {
            attackProgress = 1;
         }

         const direction = lerp(Math.PI / 7, Zombie.HAND_RESTING_DIRECTION, attackProgress);
         const rotation = lerp(-Math.PI/8, Zombie.HAND_RESTING_ROTATION, attackProgress);
         const offset = lerp(42, Zombie.HAND_RESTING_OFFSET, attackProgress);
         
         this.rightHandDirection = direction;
         this.rightHandOffset = offset;
         this.rightHandRotation = rotation;

         this.leftHandDirection = -direction;
         this.leftHandOffset = offset;
         this.leftHandRotation = -rotation;
         
         return;
      }
      
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
         case TribeMemberAction.chargeBow: {
            // 
            // Bow charge animation
            // 

            this.leftHandDirection = -Zombie.HAND_CHARGING_BOW_DIRECTION;
            this.leftHandOffset = Zombie.HAND_CHARGING_BOW_OFFSET;
            this.leftHandRotation = -Zombie.HAND_CHARGING_BOW_DIRECTION;
            this.rightHandDirection = Zombie.HAND_CHARGING_BOW_DIRECTION;
            this.rightHandOffset = Zombie.HAND_CHARGING_BOW_OFFSET;
            this.rightHandRotation = Zombie.HAND_CHARGING_BOW_DIRECTION;

            this.activeItemOffset = 22 + itemSize / 2;
            this.activeItemDirection = 0;
            this.activeItemRotation = -Math.PI / 4;
            return;
         }
         case TribeMemberAction.none: {
            // 
            // Attack animation
            // 
         
            const attackProgress = this.getAttackProgress(secondsSinceLastAction);

            let direction: number;
            let attackHandRotation: number;
            if (attackProgress < Zombie.ATTACK_LUNGE_TIME) {
               // Lunge part of the animation
               direction = lerp(Zombie.HAND_RESTING_DIRECTION, Zombie.HAND_RESTING_DIRECTION - Zombie.ITEM_SWING_RANGE, attackProgress / Zombie.ATTACK_LUNGE_TIME);
               attackHandRotation = lerp(Zombie.ITEM_RESTING_ROTATION, Zombie.ITEM_END_ROTATION, attackProgress / Zombie.ATTACK_LUNGE_TIME);
            } else {
               // Return part of the animation
               const returnProgress = (attackProgress - Zombie.ATTACK_LUNGE_TIME) / (1 - Zombie.ATTACK_LUNGE_TIME);
               direction = lerp(Zombie.HAND_RESTING_DIRECTION - Zombie.ITEM_SWING_RANGE, Zombie.HAND_RESTING_DIRECTION, returnProgress);
               attackHandRotation = lerp(Zombie.ITEM_END_ROTATION, Zombie.ITEM_RESTING_ROTATION, returnProgress);
            }
            
            this.leftHandDirection = -Zombie.HAND_RESTING_DIRECTION;
            this.leftHandOffset = Zombie.HAND_RESTING_OFFSET;
            this.leftHandRotation = -Zombie.HAND_RESTING_ROTATION;
            this.rightHandDirection = direction;
            this.rightHandOffset = Zombie.HAND_RESTING_OFFSET;
            this.rightHandRotation = attackHandRotation;

            if (this.activeItemType !== null && ITEM_TYPE_RECORD[this.activeItemType] === "bow") {
               this.activeItemOffset = Zombie.ITEM_RESTING_OFFSET + 7;
               this.activeItemDirection = direction;
               this.activeItemRotation = attackHandRotation + Math.PI/10;
            } else {
               this.activeItemOffset = Zombie.ITEM_RESTING_OFFSET + itemSize/2;
               this.activeItemDirection = direction;
               this.activeItemRotation = attackHandRotation;
            }
            return;
         }
      }
   }

   private showLargeItemTexture(itemType: ItemType): boolean {
      const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
      return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe";
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

   private updateBowChargeTexture(): void {
      // Change the bow charging texture based on the charge progress
      if (this.action === TribeMemberAction.chargeBow && this.activeItemType !== null) {
         const bowInfo = ITEM_INFO_RECORD[this.activeItemType] as BowItemInfo;
         
         const secondsSinceLastAction = this.getSecondsSinceLastAction();
         const chargeProgress = secondsSinceLastAction / (bowInfo.shotCooldownTicks / SETTINGS.TPS);

         let textureIdx = Math.floor(chargeProgress * Zombie.BOW_CHARGE_TEXTURE_SOURCES.length);
         if (textureIdx >= Zombie.BOW_CHARGE_TEXTURE_SOURCES.length) {
            textureIdx = Zombie.BOW_CHARGE_TEXTURE_SOURCES.length - 1;
         }
         this.activeItemRenderPart.textureSlotIndex = GAME_OBJECT_TEXTURE_SLOT_INDEXES[getGameObjectTextureArrayIndex(Zombie.BOW_CHARGE_TEXTURE_SOURCES[textureIdx])];
      }
   }

   public updateFromData(data: EntityData<EntityType.zombie>): void {
      super.updateFromData(data);
      
      this.activeItemType = data.clientArgs[1];
      this.lastActionTicks = data.clientArgs[2];
      
      this.updateHands();
      this.updateActiveItemRenderPart(this.activeItemType);
      this.updateBowChargeTexture();
   }
}

export default Zombie;