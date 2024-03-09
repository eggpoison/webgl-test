import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Entity from "../Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

export function spikesAreAttachedToWall(entity: Entity): boolean {
   const hitbox = entity.hitboxes[0] as RectangularHitbox;
   return Math.abs(hitbox.height - (28 - 0.05)) < 0.01;
}

class WoodenSpikes extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.woodenSpikes, ageTicks);

      if (ageTicks === 0) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   // @Hack
   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      super.addRectangularHitbox(hitbox);

      let textureArrayIndex: number;
      if (spikesAreAttachedToWall(this)) {
         textureArrayIndex = getTextureArrayIndex("entities/wooden-wall-spikes/wooden-wall-spikes.png");
      } else {
         textureArrayIndex = getTextureArrayIndex("entities/wooden-floor-spikes/wooden-floor-spikes.png");
      }

      this.attachRenderPart(
         new RenderPart(
            this,
            textureArrayIndex,
            0,
            0
         )
      );
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.2, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default WoodenSpikes;