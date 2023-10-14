import { EntityType, Point, TileType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";

class Slimewisp extends Entity {
   private static readonly RADIUS = 16;

   public type: EntityType = "slimewisp";

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number) {
      super(position, hitboxes, id, renderDepth);

      const renderPart = new RenderPart(
         this,
         Slimewisp.RADIUS * 2,
         Slimewisp.RADIUS * 2,
         getGameObjectTextureArrayIndex(`entities/slimewisp/slimewisp.png`),
         0,
         0
      );
      renderPart.opacity = 0.8;
      this.attachRenderPart(renderPart);
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // Slimewisps move at normal speed on slime blocks
      if (this.tile.type === TileType.slime) {
         return 1;
      }
      return null;
   }

   protected onHit(): void {
      createSlimePoolParticle(this.position.x, this.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 2; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, Slimewisp.RADIUS * Math.random());
      }
   }

   public onDie(): void {
      createSlimePoolParticle(this.position.x, this.position.y, Slimewisp.RADIUS);

      for (let i = 0; i < 3; i++) {
         createSlimeSpeckParticle(this.position.x, this.position.y, Slimewisp.RADIUS * Math.random());
      }
   }
}

export default Slimewisp;