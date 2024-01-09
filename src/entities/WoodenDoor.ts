import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class WoodenDoor extends Entity {
   private static readonly WIDTH = 64;
   private static readonly HEIGHT = 16;

   public type = EntityType.woodenDoor;

   // @Temporary: Remove once reworked to not use server-side hack
   private readonly doorRenderPart: RenderPart;
   
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.woodenDoor, renderDepth);

      this.doorRenderPart = new RenderPart(
         this,
         WoodenDoor.WIDTH,
         WoodenDoor.HEIGHT,
         getGameObjectTextureArrayIndex("entities/wooden-door/wooden-door.png"),
         0,
         0
      );
      this.attachRenderPart(this.doorRenderPart);
   }

   public tick(): void {
      super.tick();

      // @Speed
      const hitbox = Array.from(this.hitboxes)[0] as RectangularHitbox;
      this.doorRenderPart.offset = hitbox.offset;
   }
}

export default WoodenDoor;