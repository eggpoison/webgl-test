import { DeathInfo, Point, Vector, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import TexturedParticle from "../particles/TexturedParticle";
import Board from "../Board";
import { ParticleRenderLayer } from "../particles/Particle";
import { ParticleTextureSource } from "../rendering/particle-rendering";

class Tombstone extends Entity {
   public readonly type = "tombstone";
   
   public readonly deathInfo: DeathInfo | null;

   private static readonly HITBOX_WIDTH = 48;
   private static readonly HITBOX_HEIGHT = 88;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tombstoneType: number, deathInfo: DeathInfo | null) {
      super(position, hitboxes, id);

      this.attachRenderPart(
         new RenderPart(
            64,
            96,
            `entities/tombstone/tombstone${tombstoneType + 1}.png`,
            0,
            0
         )
      );

      this.deathInfo = deathInfo;
   }
   
   protected onHit(): void {
      for (let i = 0; i < 4; i++) {
         const spawnPosition = new Point(randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2), randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2));
         spawnPosition.add(this.position);

         let moveDirection = this.position.calculateAngleBetween(spawnPosition);
         moveDirection += randFloat(-1, 1);
         
         this.createRockParticle(spawnPosition, moveDirection);
      }
   }

   public onDie(): void {
      for (let i = 0; i < 8; i++) {
         const spawnPosition = new Point(randFloat(-Tombstone.HITBOX_WIDTH/2, Tombstone.HITBOX_WIDTH/2), randFloat(-Tombstone.HITBOX_HEIGHT/2, Tombstone.HITBOX_HEIGHT/2));
         spawnPosition.add(this.position);

         this.createRockParticle(spawnPosition, 2 * Math.PI * Math.random());
      }
   }
   
   private createRockParticle(spawnPosition: Point, moveDirection: number): void {
      const lifetime = randFloat(0.3, 0.6);

      let size: number;
      let textureSource: ParticleTextureSource;
      if (Math.random() < 0.5) {
         // Large rock
         size = 16;
         textureSource = "particles/rock-large.png";
      } else {
         // Small rock
         size = 12;
         textureSource = "particles/rock.png";
      }

      const velocityMagnitude = randFloat(80, 125);
      
      const particle = new TexturedParticle(
         null,
         size,
         size,
         spawnPosition,
         new Vector(velocityMagnitude, moveDirection),
         new Vector(velocityMagnitude / lifetime / 1.25, moveDirection + Math.PI),
         lifetime,
         textureSource
      );
      particle.rotation = 2 * Math.PI * Math.random();
      particle.angularVelocity = 2 * Math.PI * randFloat(-1, 1);
      particle.angularDrag = Math.PI;
      particle.getOpacity = (age: number): number => {
         return 1 - age/lifetime;
      };
      Board.addTexturedParticle(particle, ParticleRenderLayer.low);
   }
}

export default Tombstone;