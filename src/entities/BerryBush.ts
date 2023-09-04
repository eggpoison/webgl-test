import { EntityData, EntityType, Point, Vector } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import TexturedParticle from "../particles/TexturedParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import Board from "../Board";

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

      this.renderPart = new RenderPart({
         width: BerryBush.RADIUS * 2,
         height: BerryBush.RADIUS * 2,
         textureSource: this.getTextureSourceFromNumBerries(numBerries),
         zIndex: 0
      });
      this.attachRenderParts([this.renderPart]);
   }

   public updateFromData(entityData: EntityData<"berry_bush">): void {
      super.updateFromData(entityData);

      const numBerries = entityData.clientArgs[0];
      this.renderPart.textureSource = this.getTextureSourceFromNumBerries(numBerries);
   }

   private getTextureSourceFromNumBerries(numBerries: number): string {
      return BerryBush.TEXTURE_SOURCES[numBerries];
   }

   protected onHit(): void {
      const spawnPosition = this.position.copy();

      const offset = new Vector(BerryBush.RADIUS, 2 * Math.PI * Math.random()).convertToPoint();
      spawnPosition.add(offset);
      
      const lifetime = 2;
      
      const particle = new TexturedParticle(
         null,
         5 * 4,
         3 * 4,
         spawnPosition,
         null,
         null,
         lifetime,
         "particles/leaf-small.png"
      );
      Board.addTexturedParticle(particle, ParticleRenderLayer.low);
   }
}

export default BerryBush;