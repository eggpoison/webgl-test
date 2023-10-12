import { EntityType, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createRockParticle, createRockSpeckParticle } from "../generic-particles";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";

class Boulder extends Entity {
   private static readonly RADIUS = 40;

   public type: EntityType = "boulder";

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, boulderType: number) {
      super(position, hitboxes, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Boulder.RADIUS * 2,
            Boulder.RADIUS * 2,
            getGameObjectTextureIndex(Boulder.TEXTURE_SOURCES[boulderType]),
            0,
            0
         )
      );
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         let moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = this.position.x + Boulder.RADIUS * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + Boulder.RADIUS * Math.cos(moveDirection);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         const spawnOffsetMagnitude = Boulder.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random());
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS);
      }
   }
}

export default Boulder;