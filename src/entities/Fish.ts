import { FishColour, HitData, Point, TileType, randFloat, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import Board from "../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../generic-particles";

class Fish extends Entity {
   private static readonly SPRITE_WIDTH = 9 * 4;
   private static readonly SPRITE_HEIGHT = 16 * 4;
   
   public readonly type = "fish";

   public readonly waterOpacityMultiplier = randFloat(0.6, 1);

   private static readonly TEXTURE_SOURCES: ReadonlyArray<string> = [
      "entities/fish/fish-blue.png",
      "entities/fish/fish-gold.png",
      "entities/fish/fish-red.png",
      "entities/fish/fish-lime.png"
   ];
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, colour: FishColour) {
      super(position, hitboxes, id, renderDepth);

      const textureSource = randItem(Fish.TEXTURE_SOURCES);
      this.attachRenderPart(
         new RenderPart(
            this,
            Fish.SPRITE_WIDTH, Fish.SPRITE_HEIGHT,
            getGameObjectTextureArrayIndex(textureSource),
            0,
            0
         )
      );
   }

   public tick(): void {
      super.tick();

      if (this.tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
         for (let i = 0; i < 8; i++) {
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.position.x + 8 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.position.y + 8 * Math.cos(spawnOffsetDirection);

            createWaterSplashParticle(spawnPositionX, spawnPositionY);
         }
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 5; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 16 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 16 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      createBloodParticleFountain(this, 0.1, 0.8);
   }
}

export default Fish;