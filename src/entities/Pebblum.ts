import { EntityType, Point, SETTINGS } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createFootprintParticle } from "../particles";
import Board from "../Board";

class Pebblum extends Entity {
   private numFootstepsTaken = 0;
   private distanceTracker = 0;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.pebblum, ageTicks, renderDepth);

      // Nose
      const nose = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/pebblum/pebblum-nose.png"),
         0,
         2 * Math.PI * Math.random()
      )
      nose.offset = new Point(0, 12);
      this.attachRenderPart(nose);

      // Body
      const body = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/pebblum/pebblum-body.png"),
         1,
         2 * Math.PI * Math.random()
      )
      body.offset = new Point(0, -8);
      this.attachRenderPart(body);
   }

   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 5);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 40) {
         this.distanceTracker -= 40;
         this.createFootstepSound();
      }
   }
}

export default Pebblum;