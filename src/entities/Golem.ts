import { EntityType, Point } from "webgl-test-shared";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

enum GolemRockSize {
   small,
   medium,
   large
}

const getHitboxSize = (hitbox: CircularHitbox): GolemRockSize => {
   if (Math.abs(hitbox.radius - 32) < 0.01) {
      return GolemRockSize.large;
   }
   if (Math.abs(hitbox.radius - 26) < 0.01) {
      return GolemRockSize.medium;
   }
   return GolemRockSize.small;
}

const getTextureSource = (size: GolemRockSize): string => {
   switch (size) {
      case GolemRockSize.large: {
         return "entities/golem/golem-body-large.png";
      }
      case GolemRockSize.medium: {
         return "entities/golem/golem-body-medium.png";
      }
      case GolemRockSize.small: {
         return "entities/golem/golem-body-small.png";
      }
   }
}

class Golem extends Entity {
   public type = EntityType.golem;

   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.golem, renderDepth);

      for (let i = 0; i < 2; i++) {
         const renderPart = new RenderPart(
            this,
            5 * 4,
            3 * 4,
            getGameObjectTextureArrayIndex("entities/golem/eye.png"),
            5,
            0
         );
         renderPart.offset = new Point(27 * (i === 0 ? -1 : 1), 30);
         this.attachRenderPart(renderPart);
      }
   }

   public addCircularHitbox(hitbox: CircularHitbox): void {
      super.addCircularHitbox(hitbox);

      const size = getHitboxSize(hitbox);

      const renderPart = new RenderPart(
         this,
         hitbox.radius * 2,
         hitbox.radius * 2,
         getGameObjectTextureArrayIndex(getTextureSource(size)),
         Math.random() * 5,
         0
      );
      renderPart.offset = new Point(hitbox.offset.x, hitbox.offset.y);
      this.attachRenderPart(renderPart);
   }
}

export default Golem;