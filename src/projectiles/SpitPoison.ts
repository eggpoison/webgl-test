import { EntityType, Point, SETTINGS, randFloat } from "webgl-test-shared";
import GameObject from "../GameObject";
import CircularHitbox from "../hitboxes/CircularHitbox";
import Board from "../Board";
import { ParticleRenderLayer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import Particle from "../Particle";

const createParticle = (spawnPositionX: number, spawnPositionY: number): void => {
   const lifetime = randFloat(0.5, 0.7);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      5 * 8 + 0,
      0, 0, 0
   );
   Board.lowTexturedParticles.push(particle);
}

class SpitPoison extends GameObject {
   constructor(position: Point, id: number, renderDepth: number) {
      super(position, id, EntityType.spitPoison, renderDepth);
   }

   public tick(): void {
      this.createSpeckParticle();
      
      // @Speed
      const hitbox = Array.from(this.hitboxes)[0] as CircularHitbox;
      
      if (Math.random() >= hitbox.radius * hitbox.radius / SETTINGS.TPS / 5) {
         return;
      }

      const offsetMagnitude = hitbox.radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);

      createParticle(x, y);
   }

   private createSpeckParticle(): void {

   }
}

export default SpitPoison;