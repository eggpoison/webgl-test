import { EntityData, EntityType, Point, randFloat } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { LeafParticleSize, createLeafParticle, createLeafSpeck } from "../generic-particles";

class BerryBush extends Entity {
   private static readonly RADIUS = 40;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

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
      const moveDirection = 2 * Math.PI * Math.random();
      
      const spawnPositionX = this.position.x + BerryBush.RADIUS * Math.sin(moveDirection);
      const spawnPositionY = this.position.y + BerryBush.RADIUS * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
      
      // Create leaf specks
      for (let i = 0; i < 5; i++) {
         createLeafSpeck(this.position.x, this.position.y, BerryBush.RADIUS, BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 6; i++) {
         const offsetMagnitude = BerryBush.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), LeafParticleSize.small);
      }
      
      // Create leaf specks
      for (let i = 0; i < 5; i++) {
         createLeafSpeck(this.position.x, this.position.y, BerryBush.RADIUS, BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }
   }
}

export default BerryBush;