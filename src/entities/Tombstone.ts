import { DeathInfo, EntityData, Point, SETTINGS, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createDirtParticle, createRockParticle } from "../generic-particles";

class Tombstone extends Entity {
   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;

   public readonly type = "tombstone";
   
   private zombieSpawnProgress: number;
   private zombieSpawnX: number;
   private zombieSpawnY: number;
   public readonly deathInfo: DeathInfo | null;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tombstoneType: number, zombieSpawnProgress: number, zombieSpawnX: number, zombieSpawnY: number, deathInfo: DeathInfo | null) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            64,
            96,
            `entities/tombstone/tombstone${tombstoneType + 1}.png`,
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
         let spawnPositionX = randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         let spawnPositionY = randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
         moveDirection += randFloat(-1, 1);

         spawnPositionX += this.position.x;
         spawnPositionY += this.position.y;
         
         createRockParticle(spawnPositionX, spawnPositionY, moveDirection);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 8; i++) {
         const spawnPositionX = this.position.x + randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2);
         const spawnPositionY = this.position.y + randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random());
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