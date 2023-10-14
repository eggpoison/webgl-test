import { DeathInfo, EntityData, Point, SETTINGS, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createDirtParticle, createRockParticle, createRockSpeckParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Tombstone extends Entity {
   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;

   public readonly type = "tombstone";
   
   private zombieSpawnProgress: number;
   private zombieSpawnX: number;
   private zombieSpawnY: number;
   public readonly deathInfo: DeathInfo | null;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, tombstoneType: number, zombieSpawnProgress: number, zombieSpawnX: number, zombieSpawnY: number, deathInfo: DeathInfo | null) {
      super(position, hitboxes, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            64,
            96,
            getGameObjectTextureArrayIndex(`entities/tombstone/tombstone${tombstoneType + 1}.png`),
            0,
            0
         )
      );

      this.zombieSpawnProgress = zombieSpawnProgress;
      this.zombieSpawnX = zombieSpawnX;
      this.zombieSpawnY = zombieSpawnY;
      this.deathInfo = deathInfo;
   }

   public tick(): void {
      super.tick();

      if (this.zombieSpawnProgress !== -1) {
         // Create zombie digging particles
         if (this.zombieSpawnProgress < 0.8) {
            if (Math.random() < 7.5 / SETTINGS.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY);
            }
         } else {
            if (Math.random() < 20 / SETTINGS.TPS) {
               createDirtParticle(this.zombieSpawnX, this.zombieSpawnY);
            }
         }
      }
   }

   protected onHit(): void {
      for (let i = 0; i < 4; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
         moveDirection += randFloat(-1, 1);
         
         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125));
      }

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 8; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125));
      }

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0);
      }
   }

   public updateFromData(entityData: EntityData<"tombstone">): void {
      super.updateFromData(entityData);

      this.zombieSpawnProgress = entityData.clientArgs[1];
      this.zombieSpawnX = entityData.clientArgs[2];
      this.zombieSpawnY = entityData.clientArgs[3];
   }
}

export default Tombstone;