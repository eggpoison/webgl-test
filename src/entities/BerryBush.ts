import { EntityData, EntityType, HitboxType, Point } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import Hitbox from "../hitboxes/Hitbox";

class BerryBush extends Entity {
   private static readonly WIDTH = 80;
   private static readonly HEIGHT = 80;

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

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, numBerries: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.renderPart = new RenderPart({
         width: BerryBush.WIDTH,
         height: BerryBush.HEIGHT,
         textureSource: this.getTextureSourceFromNumBerries(numBerries),
         zIndex: 0
      }, this);
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
}

export default BerryBush;