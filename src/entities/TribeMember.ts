import { EntityData, EntityType, HitData, ItemType, ServerComponentType, Settings, TileType, TribeMemberComponentData, TribeType, lerp, randFloat, randInt, randItem } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity, { getFrameProgress } from "../Entity";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle } from "../particles";
import Board from "../Board";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import Game from "../Game";

const GOBLIN_EAR_OFFSET = 4;
const GOBLIN_EAR_ANGLE = Math.PI / 3;

const GOBLIN_HURT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

export function getSecondsSinceLastAction(lastActionTicks: number): number {
   const ticksSinceLastAction = Board.ticks - lastActionTicks;
   let secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;

   // Account for frame progress
   secondsSinceLastAction += getFrameProgress() / Settings.TPS;

   return secondsSinceLastAction;
}

export function addTribeMemberRenderParts(entity: Entity, tribeMemberComponentData: TribeMemberComponentData): void {
   const tribeComponent = entity.getServerComponent(ServerComponentType.tribe);

   let bodyTextureSource: string;
   switch (tribeComponent.tribeType) {
      case TribeType.plainspeople: {
         if (entity.type === EntityType.tribeWarrior) {
            bodyTextureSource = "entities/plainspeople/warrior.png";
         } else if (entity.type === EntityType.player) {
            bodyTextureSource = "entities/plainspeople/player.png";
         } else {
            bodyTextureSource = "entities/plainspeople/worker.png";
         }
         break;
      }
      case TribeType.goblins: {
         if (entity.type === EntityType.tribeWarrior) {
            bodyTextureSource = "entities/goblins/warrior.png";
         } else if (entity.type === EntityType.player) {
            bodyTextureSource = "entities/goblins/player.png";
         } else {
            bodyTextureSource = "entities/goblins/worker.png";
         }
         break;
      }
      case TribeType.frostlings: {
         if (entity.type === EntityType.tribeWarrior) {
            bodyTextureSource = "entities/frostlings/warrior.png";
         } else if (entity.type === EntityType.player) {
            bodyTextureSource = "entities/frostlings/player.png";
         } else {
            bodyTextureSource = "entities/frostlings/worker.png";
         }
         break;
      }
      case TribeType.barbarians: {
         if (entity.type === EntityType.tribeWarrior) {
            bodyTextureSource = "entities/barbarians/warrior.png";
         } else if (entity.type === EntityType.player) {
            bodyTextureSource = "entities/barbarians/player.png";
         } else {
            bodyTextureSource = "entities/barbarians/worker.png";
         }
         break;
      }
   }

   const radius = entity.type === EntityType.player || entity.type === EntityType.tribeWarrior ? 32 : 28;

   // 
   // Body render part
   // 
   
   entity.attachRenderPart(new RenderPart(
      entity,
      getTextureArrayIndex(bodyTextureSource),
      2,
      0
   ));

   if (tribeComponent.tribeType === TribeType.goblins) {
      let textureSource: string;
      if (entity.type === EntityType.tribeWarrior) {
         textureSource = `entities/goblins/warrior-warpaint-${tribeMemberComponentData.warPaintType}.png`;
      } else {
         textureSource = `entities/goblins/goblin-warpaint-${tribeMemberComponentData.warPaintType}.png`;
      }
      
      // Goblin warpaint
      entity.attachRenderPart(
         new RenderPart(
            entity,
            getTextureArrayIndex(textureSource),
            4,
            0
         )
      );

      // Left ear
      const leftEarRenderPart = new RenderPart(
         entity,
         getTextureArrayIndex("entities/goblins/goblin-ear.png"),
         3,
         Math.PI/2 - GOBLIN_EAR_ANGLE,
      );
      leftEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(-GOBLIN_EAR_ANGLE);
      leftEarRenderPart.flipX = true;
      entity.attachRenderPart(leftEarRenderPart);

      // Right ear
      const rightEarRenderPart = new RenderPart(
         entity,
         getTextureArrayIndex("entities/goblins/goblin-ear.png"),
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
      );
      rightEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE);
      rightEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE);
      entity.attachRenderPart(rightEarRenderPart);
   }
}

abstract class TribeMember extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   // @Cleanup: Move to TribeMember client component
   private lowHealthMarker: RenderPart | null = null;
   
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

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.plainspeople: {
            playSound(("plainsperson-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound(("barbarian-hurt-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }
   }

   public onDie(): void {
      createBloodPoolParticle(this.position.x, this.position.y, 20);
      createBloodParticleFountain(this, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);

      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.plainspeople: {
            playSound("plainsperson-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      const inventoryComponent = this.getServerComponent(ServerComponentType.inventory);
      const armourSlotInventory = inventoryComponent.getInventory("armourSlot");

      if (armourSlotInventory.itemSlots.hasOwnProperty(1)) {
         // If snow armour is equipped, move at normal speed on snow tiles
         if ((armourSlotInventory.itemSlots[1].type === ItemType.frost_armour || armourSlotInventory.itemSlots[1].type === ItemType.deepfrost_armour) && this.tile.type === TileType.snow) {
            return 1;
         }
         // If fishlord suit is equipped, move at normal speed on snow tiles
         if (armourSlotInventory.itemSlots[1].type === ItemType.fishlord_suit && this.tile.type === TileType.water) {
            return 1;
         }
      }
      return null;
   }

   private updateLowHealthMarker(shouldShow: boolean): void {
      if (shouldShow) {
         if (this.lowHealthMarker === null) {
            this.lowHealthMarker = new RenderPart(
               this,
               getTextureArrayIndex("entities/low-health-marker.png"),
               9,
               0
            );
            this.lowHealthMarker.inheritParentRotation = false;
            this.lowHealthMarker.offset.x = 20;
            this.lowHealthMarker.offset.y = 20;
            this.attachRenderPart(this.lowHealthMarker);
         }

         let opacity = Math.sin(this.ageTicks / Settings.TPS * 5) * 0.5 + 0.5;
         this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
      } else {
         if (this.lowHealthMarker !== null) {
            this.removeRenderPart(this.lowHealthMarker);
            this.lowHealthMarker = null;
         }
      }
   }

   public updateFromData(data: EntityData<EntityType>): void {
      super.updateFromData(data);

      // Show low health marker for friendly tribe members
      const tribeComponent = this.getServerComponent(ServerComponentType.tribe);
      if (tribeComponent.tribeID === Game.tribe.id) {
         const healthComponent = this.getServerComponent(ServerComponentType.health);
         this.updateLowHealthMarker(healthComponent.health <= healthComponent.maxHealth / 2);
      }
   }
}

export default TribeMember;