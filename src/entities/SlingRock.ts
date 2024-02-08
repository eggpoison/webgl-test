import { EntityType, Point, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createRockParticle, createRockSpeckParticle } from "../particles";

class SlingRock extends Entity {
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number) {
      super(position, id, EntityType.slingRock, ageTicks, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            24, 24,
            getEntityTextureArrayIndex("entities/sling-rock/sling-rock.png"),
            0,
            0
         )
      );
   }

   public onDie(): void {
      for (let i = 0; i < 3; i++) {
         const spawnOffsetMagnitude = 16 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(60, 100));
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, 16, 0, 0);
      }
   }
}

export default SlingRock;