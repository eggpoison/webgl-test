import { EntityData, EntityType, Point, randFloat } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { LeafParticleSize, createLeafParticle } from "../generic-particles";

class BerryBush extends Entity {
   private static readonly RADIUS = 40;

   public readonly type: EntityType = "berry_bush";

   private static readonly TEXTURE_SOURCES = [
      "entities/berry-bush1.png",
      "entities/berry-bush2.png",
      "entities/berry-bush3.png",
      "entities/berry-bush4.png",
      "entities/berry-bush5.png",
      "entities/berry-bush6.png"
   ];

   private readonly renderPart: RenderPart;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, numBerries: number) {
      super(position, hitboxes, id);

      this.renderPart = new RenderPart(
         BerryBush.RADIUS * 2,
         BerryBush.RADIUS * 2,
         BerryBush.TEXTURE_SOURCES[numBerries],
         0,
         0
      );
      this.attachRenderPart(this.renderPart);
   }

   public updateFromData(entityData: EntityData<"berry_bush">): void {
      super.updateFromData(entityData);

      const numBerries = entityData.clientArgs[0];
      this.renderPart.textureSource = BerryBush.TEXTURE_SOURCES[numBerries];
   }

   protected onHit(): void {
      const spawnPosition = this.position.copy();
      const moveDirection = 2 * Math.PI * Math.random();
      const offset = Point.fromVectorForm(BerryBush.RADIUS, moveDirection);
      spawnPosition.add(offset);

      createLeafParticle(spawnPosition, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
   }

   public onDie(): void {
      for (let i = 0; i < 6; i++) {
         const spawnPosition = this.position.copy();
         const offset = Point.fromVectorForm(BerryBush.RADIUS * Math.random(), 2 * Math.PI * Math.random());
         spawnPosition.add(offset);

         createLeafParticle(spawnPosition, 2 * Math.PI * Math.random(), LeafParticleSize.small);
      }
   }
}

export default BerryBush;