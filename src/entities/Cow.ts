import { CowSpecies, EntityData, HitData, Point, SETTINGS, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { BloodParticleSize, createBloodParticle, createBloodPoolParticle, createDirtParticle, createFootprintParticle } from "../generic-particles";
import Board from "../Board";

class Cow extends Entity {
   private static readonly HEAD_SIZE = 64;
   private static readonly HEAD_IMAGE_WIDTH = 18 * 4;
   private static readonly HEAD_IMAGE_HEIGHT = 16 * 4;
   /** How far the head overlaps the body */
   private static readonly HEAD_OVERLAP = 24;
   private static readonly BODY_WIDTH = 64;
   private static readonly BODY_HEIGHT = 96;

   public readonly type = "cow";

   private grazeProgress: number;

   private numFootstepsTaken = 0;

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, species: CowSpecies, grazeProgress: number) {
      super(position, hitboxes, id);

      this.grazeProgress = grazeProgress;

      const cowNum = species === CowSpecies.brown ? 1 : 2;

      // Body
      const bodyRenderPart = new RenderPart(
         Cow.BODY_WIDTH,
         Cow.BODY_HEIGHT,
         `entities/cow/cow-body-${cowNum}.png`,
         0,
         0
      );
      bodyRenderPart.offset = new Point(0, -(Cow.HEAD_SIZE - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(bodyRenderPart);

      // Head
      const headRenderPart = new RenderPart(
         Cow.HEAD_IMAGE_WIDTH,
         Cow.HEAD_IMAGE_HEIGHT,
         `entities/cow/cow-head-${cowNum}.png`,
         1,
         0
      );
      headRenderPart.offset = new Point(0, (Cow.BODY_HEIGHT - Cow.HEAD_OVERLAP) / 2);
      this.attachRenderPart(headRenderPart);
   }
   
   public tick(): void {
      super.tick();

      // Create footsteps
      if (this.velocity !== null && !this.isInRiver(this.findCurrentTile()) && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 64, 5);

         this.numFootstepsTaken++;
      }

      if (this.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createDirtParticle(spawnPositionX, spawnPositionY);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(this.position.x, this.position.y, 20);
      }
      
      // Blood particles
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public updateFromData(entityData: EntityData<"cow">): void {
      super.updateFromData(entityData);

      // When the cow has finished grazing, create a bunch of dirt particles
      if (entityData.clientArgs[1] < this.grazeProgress) {
         const tile = this.findCurrentTile();
         for (let i = 0; i < 15; i++) {
            const x = (tile.x + Math.random()) * SETTINGS.TILE_SIZE;
            const y = (tile.y + Math.random()) * SETTINGS.TILE_SIZE;
            createDirtParticle(x, y);
         }
      }
      this.grazeProgress = entityData.clientArgs[1];
   }
}

export default Cow;