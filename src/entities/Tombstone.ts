import { DeathInfo, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createRockParticle } from "../generic-particles";

class Tombstone extends Entity {
   public readonly type = "tombstone";
   
   public readonly deathInfo: DeathInfo | null;

   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tombstoneType: number, deathInfo: DeathInfo | null) {
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

      this.deathInfo = deathInfo;
   }
   
   protected onHit(): void {
      for (let i = 0; i < 4; i++) {
         const spawnPosition = new Point(randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2), randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2));
         spawnPosition.add(this.position);

         let moveDirection = this.position.calculateAngleBetween(spawnPosition);
         moveDirection += randFloat(-1, 1);
         
         createRockParticle(spawnPosition, moveDirection);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 8; i++) {
         const spawnPosition = new Point(randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2), randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2));
         spawnPosition.add(this.position);

         createRockParticle(spawnPosition, 2 * Math.PI * Math.random());
      }
   }
}

export default Tombstone;