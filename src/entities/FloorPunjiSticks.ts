import { EntityType, Point, SETTINGS, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";
import { createFlyParticle } from "../particles";

class FloorPunjiSticks extends Entity {
   private ticksSinceLastFly = 0;
   private ticksSinceLastFlySound = 0;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.floorPunjiSticks, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png"),
            0,
            0
         )
      );

      if (ageTicks === 0) {
         playSound("spike-place.mp3", 0.5, 1, this.position.x, this.position.y);
      }
   }

   public tick(): void {
      super.tick();

      this.ticksSinceLastFly++;
      const flyChance = ((this.ticksSinceLastFly / SETTINGS.TPS) - 0.25) * 0.2;
      if (Math.random() / SETTINGS.TPS < flyChance) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createFlyParticle(x, y);
         this.ticksSinceLastFly = 0;
      }

      this.ticksSinceLastFlySound++;
      const soundChance = ((this.ticksSinceLastFlySound / SETTINGS.TPS) - 0.3) * 2;
      if (Math.random() < soundChance / SETTINGS.TPS) {
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