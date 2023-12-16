import { EntityType, Point, randFloat, randItem } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { createRockParticle, createRockSpeckParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";

class Boulder extends Entity {
   private static readonly RADIUS = 40;

   public type = EntityType.boulder;

   private static readonly TEXTURE_SOURCES = [
      "entities/boulder/boulder1.png",
      "entities/boulder/boulder2.png"
   ];

   constructor(position: Point, id: number, renderDepth: number, boulderType: number) {
      super(position, id, renderDepth);

      this.attachRenderPart(
         new RenderPart(
            this,
            Boulder.RADIUS * 2,
            Boulder.RADIUS * 2,
            getGameObjectTextureArrayIndex(Boulder.TEXTURE_SOURCES[boulderType]),
            0,
            0
         )
      );
   }

   protected onHit(): void {
      for (let i = 0; i < 2; i++) {
         let moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = this.position.x + Boulder.RADIUS * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + Boulder.RADIUS * Math.cos(moveDirection);

         moveDirection += randFloat(-1, 1);

         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125));
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS);
      }

      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, this.position.x, this.position.y);
   }

   public onDie(): void {
      for (let i = 0; i < 5; i++) {
         const spawnOffsetMagnitude = Boulder.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(80, 125));
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(this.position.x, this.position.y, Boulder.RADIUS);
      }

      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, this.position.x, this.position.y);
   }
}

export default Boulder;