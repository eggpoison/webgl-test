import { EntityType, Point, Settings, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { createFlyParticle } from "../particles";
import Entity from "../Entity";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

export function punjiSticksAreAttachedToWall(entity: Entity): boolean {
   const hitbox = entity.hitboxes[0] as RectangularHitbox;
   return Math.abs(hitbox.height - (32 - 0.05)) < 0.01;
}

class FloorPunjiSticks extends Entity {
   private ticksSinceLastFly = 0;
   private ticksSinceLastFlySound = 0;

   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.punjiSticks, ageTicks);

      if (ageTicks === 0) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   // @Hack
   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      super.addRectangularHitbox(hitbox);

      let textureArrayIndex: number;
      if (punjiSticksAreAttachedToWall(this)) {
         textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
      } else {
         textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
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

   public tick(): void {
      super.tick();

      this.ticksSinceLastFly++;
      const flyChance = ((this.ticksSinceLastFly / Settings.TPS) - 0.25) * 0.2;
      if (Math.random() / Settings.TPS < flyChance) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createFlyParticle(x, y);
         this.ticksSinceLastFly = 0;
      }

      this.ticksSinceLastFlySound++;
      const soundChance = ((this.ticksSinceLastFlySound / Settings.TPS) - 0.3) * 2;
      if (Math.random() < soundChance / Settings.TPS) {
         playSound("flies.mp3", 0.15, randFloat(0.9, 1.1), this.position.x, this.position.y);
         this.ticksSinceLastFlySound = 0;
      }
   }

   protected onHit(): void {
      playSound("wooden-spikes-hit.mp3", 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("wooden-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default FloorPunjiSticks;