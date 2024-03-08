import { EntityComponentsData, EntityData, EntityType, HitData, Point, ServerComponentType, lerp, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Board from "../Board";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import HealthComponent from "../entity-components/HealthComponent";
import GameObject from "../GameObject";

export function createWoodShardParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(80, 140);
   const velocityDirection = 2 * Math.PI * Math.random();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(3.5, 5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(197/255, 215/255, colourLerp);
   const g = lerp(151/255, 180/255, colourLerp);
   const b = lerp(68/255, 97/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const width = randFloat(10, 18);
   const height = randFloat(4, 8);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      width, height,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity),
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createLightWoodSpeckParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.4);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   }
   
   const colourLerp = Math.random();
   const r = lerp(197/255, 215/255, colourLerp);
   const g = lerp(151/255, 180/255, colourLerp);
   const b = lerp(68/255, 97/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.8);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      4 * scale, 4 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   Board.lowMonocolourParticles.push(particle);
}

export function createWoodenWallSpawnParticles(originX: number, originY: number): void {
   for (let i = 0; i < 12; i++) {
      createLightWoodSpeckParticle(originX, originY, 32);
   }
}

class WoodenWall extends GameObject {
   private static readonly NUM_DAMAGE_STAGES = 7;
   private static readonly MAX_HEALTH = 25;

   private damageRenderPart: RenderPart | null = null;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.woodenWall>) {
      super(position, id, EntityType.woodenWall, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/wooden-wall/wooden-wall.png"),
            0,
            0
         )
      );

      const healthComponentData = componentsData[0];

      this.updateDamageRenderPart(healthComponentData.health);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, healthComponentData));

      if (this.ageTicks === 0) {
         createWoodenWallSpawnParticles(this.position.x, this.position.y);
         playSound("wooden-wall-place.mp3", 0.3, 1, this.position.x, this.position.y);
      }
   }

   private updateDamageRenderPart(health: number): void {
      const damageStage = Math.floor((1 - health / WoodenWall.MAX_HEALTH) * WoodenWall.NUM_DAMAGE_STAGES);
      if (damageStage === 0) {
         if (this.damageRenderPart !== null) {
            this.removeRenderPart(this.damageRenderPart);
            this.damageRenderPart = null;
         }
         return;
      }

      const textureSource = "entities/wooden-wall/wooden-wall-damage-" + damageStage + ".png";
      if (this.damageRenderPart === null) {
         this.damageRenderPart = new RenderPart(
            this,
            getTextureArrayIndex(textureSource),
            1,
            0
         );
         this.attachRenderPart(this.damageRenderPart);
      } else {
         this.damageRenderPart.switchTextureSource(textureSource);
      }
   }
   public updateFromData(data: EntityData<EntityType.woodenWall>): void {
      super.updateFromData(data);

      const healthComponent = this.getServerComponent(ServerComponentType.health);
      this.updateDamageRenderPart(healthComponent.health);
   }

   protected onHit(hitData: HitData): void {
      playSound("wooden-wall-hit.mp3", 0.3, 1, this.position.x, this.position.y);

      for (let i = 0; i < 6; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32);
      }
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 32 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 32 * Math.cos(offsetDirection);
            createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
         }
      }
   }
   
   public onDie(): void {
      // @Speed @Hack
      // Don't play death effects if the wall was replaced by a blueprint
      for (const chunk of this.chunks) {
         for (const entity of chunk.getGameObjects()) {
            if (entity.type !== EntityType.blueprintEntity) {
               continue;
            }

            const dist = this.position.calculateDistanceBetween(entity.position);
            if (dist < 1) {
               return;
            }
         }
      }

      playSound("wooden-wall-break.mp3", 0.4, 1, this.position.x, this.position.y);

      for (let i = 0; i < 16; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 8; i++) {
         createWoodShardParticle(this.position.x, this.position.y, 32);
      }
   }
}

export default WoodenWall;