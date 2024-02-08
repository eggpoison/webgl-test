import { EntityType, FishColour, HitData, Point, TileType, randFloat, randInt, randItem } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Board from "../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";

class Fish extends Entity {
   private static readonly SPRITE_WIDTH = 9 * 4;
   private static readonly SPRITE_HEIGHT = 16 * 4;
   
   public readonly waterOpacityMultiplier = randFloat(0.6, 1);

   private static readonly TEXTURE_SOURCES: ReadonlyArray<string> = [
      "entities/fish/fish-blue.png",
      "entities/fish/fish-gold.png",
      "entities/fish/fish-red.png",
      "entities/fish/fish-lime.png"
   ];
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, colour: FishColour) {
      super(position, id, EntityType.fish, ageTicks, renderDepth);

      const textureSource = randItem(Fish.TEXTURE_SOURCES);
      this.attachRenderPart(
         new RenderPart(
            this,
            Fish.SPRITE_WIDTH, Fish.SPRITE_HEIGHT,
            getEntityTextureArrayIndex(textureSource),
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

      playSound(("fish-hurt-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      createBloodParticleFountain(this, 0.1, 0.8);
      
      playSound("fish-die-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Fish;