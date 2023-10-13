import { Point } from "webgl-test-shared";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";
import Projectile from "./Projectile"

class RockSpikeProjectile extends Projectile {
   private static readonly SPRITE_SIZES = [12 * 4, 16 * 4, 24 * 4];
   private static readonly SPRITE_TEXTURE_SOURCES = [
      "projectiles/rock-spike-small.png",
      "projectiles/rock-spike-medium.png",
      "projectiles/rock-spike-large.png"
   ];
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, data: number) {
      super(position, hitboxes, id, renderDepth, data);

      const spriteSize = RockSpikeProjectile.SPRITE_SIZES[data];

      this.attachRenderPart(
         new RenderPart(
            this,
            spriteSize,
            spriteSize,
            getGameObjectTextureIndex(RockSpikeProjectile.SPRITE_TEXTURE_SOURCES[data]),
            0,
            0
         )
      );
   }
}

export default RockSpikeProjectile;