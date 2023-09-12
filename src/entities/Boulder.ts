import { EntityType, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createRockParticle } from "../generic-particles";

class Boulder extends Entity {
   private static readonly RADIUS = 40;

   public type: EntityType = "boulder";

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, boulderType: number) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            Boulder.RADIUS * 2,
            Boulder.RADIUS * 2,
            Boulder.TEXTURE_SOURCES[boulderType],
            0,
            0
         )
      );
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         // @Speed garbage collection

         let moveDirection = 2 * Math.PI * Math.random();

         const spawnPosition = this.position.copy();
         const offset = Point.fromVectorForm(Boulder.RADIUS, moveDirection);
         spawnPosition.add(offset);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPosition, moveDirection);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         // @Speed garbage collection

         const spawnPosition = this.position.copy();
         const offset = Point.fromVectorForm(Boulder.RADIUS * Math.random(), 2 * Math.PI * Math.random());
         spawnPosition.add(offset);
         createRockParticle(spawnPosition, 2 * Math.PI * Math.random());
      }
   }
}

export default Boulder;