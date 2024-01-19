import { EntityData, EntityType, FrozenYetiAttackType, HitData, Point, SETTINGS, lerp, randFloat, randInt } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import Player from "./Player";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import Board from "../Board";
import { BloodParticleSize, createRockParticle, createSnowParticle, createWhiteSmokeParticle } from "../generic-particles";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

const createBiteParticle = (spawnPositionX: number, spawnPositionY: number): void => {
   const lifetime = 0.4;

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 1.5);
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      Math.PI,
      0,
      0,
      0,
      8 * 3 + 4,
      0, 0, 0
   );

   Board.highTexturedParticles.push(particle);
}

const createBlueBloodPoolParticle = (originX: number, originY: number, spawnRange: number): void => {
   const lifetime = 11;

   const offsetMagnitude = spawnRange * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   const textureIndex = randInt(0, 2);
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
      textureIndex,
      randFloat(-1, -0.7), randFloat(0.3, 0.5), 1
   );
   Board.lowTexturedParticles.push(particle);
}

const createBlueBloodParticle = (size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void => {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const r = randFloat(0, 0.35);
   const g = randFloat(0.5, 0.65);
   const b = randFloat(0.75, 0.9);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

const BLOOD_FOUNTAIN_RAY_COUNT = 7;

const createBloodParticleFountain = (entity: Entity, interval: number, speedMultiplier: number): void => {
   const offset = 2 * Math.PI * Math.random();

   for (let i = 0; i < 6; i++) {
      Board.addTickCallback(interval * (i + 1), () => {
         for (let j = 0; j < BLOOD_FOUNTAIN_RAY_COUNT; j++) {
            let moveDirection = 2 * Math.PI / BLOOD_FOUNTAIN_RAY_COUNT * j + offset;
            moveDirection += randFloat(-0.3, 0.3);

            createBlueBloodParticle(BloodParticleSize.large, entity.position.x, entity.position.y, moveDirection, randFloat(100, 200) * speedMultiplier, false);
         }
      });
   }
}

class FrozenYeti extends Entity {
   private static readonly SIZE = 152;
   private static readonly HEAD_SIZE = 80;
   private static readonly HEAD_DISTANCE = 60;

   private static readonly PAW_SIZE = 32;
   private static readonly PAW_OFFSET = 80;
   private static readonly PAW_RESTING_ANGLE = Math.PI / 3.5;
   private static readonly PAW_HIGH_ANGLE = Math.PI / 6;

   private static readonly ROAR_ARC = Math.PI / 6;
   private static readonly ROAR_REACH = 450;
   private static readonly SNOWBALL_THROW_OFFSET = 150;

   private readonly headRenderPart: RenderPart;
   /** Index 0: left paw, index 1: right paw */
   private readonly pawRenderParts = new Array<RenderPart>();

   private attackType: FrozenYetiAttackType;
   private attackStage: number;
   private stageProgress: number;
   
   constructor(position: Point, id: number, renderDepth: number, attackType: FrozenYetiAttackType, attackStage: number, stageProgress: number) {
      super(position, id, EntityType.frozenYeti, renderDepth);

      this.attackType = attackType;
      this.attackStage = attackStage;
      this.stageProgress = stageProgress;

      this.attachRenderPart(new RenderPart(
         this,
         FrozenYeti.SIZE,
         FrozenYeti.SIZE,
         getEntityTextureArrayIndex("entities/frozen-yeti/frozen-yeti.png"),
         1,
         0
      ));

      this.headRenderPart = new RenderPart(
         this,
         FrozenYeti.HEAD_SIZE,
         FrozenYeti.HEAD_SIZE,
         getEntityTextureArrayIndex("entities/frozen-yeti/frozen-yeti-head.png"),
         2,
         0
      );
      this.headRenderPart.offset = new Point(0, FrozenYeti.HEAD_DISTANCE);
      this.attachRenderPart(this.headRenderPart);

      // Create paw render parts
      for (let i = 0; i < 2; i++) {
         const paw = new RenderPart(
            this,
            FrozenYeti.PAW_SIZE,
            FrozenYeti.PAW_SIZE,
            getEntityTextureArrayIndex("entities/frozen-yeti/frozen-yeti-paw.png"),
            0,
            0
         );
         paw.offset = Point.fromVectorForm(FrozenYeti.PAW_OFFSET, FrozenYeti.PAW_RESTING_ANGLE * (i === 0 ? -1 : 1));

         this.attachRenderPart(paw);
         this.pawRenderParts.push(paw);
      }
   }

   public tick(): void {
      super.tick();

      if (Player.instance === null) {
         return;
      }

      switch (this.attackType) {
         case FrozenYetiAttackType.stomp: {
            switch (this.attackStage) {
               // Windup
               case 0: {
                  this.headRenderPart.shakeAmount = lerp(1, 2, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     this.pawRenderParts[i].shakeAmount = lerp(1, 2, this.stageProgress);
                  }
                  break;
               }
               case 1: {
                  this.headRenderPart.shakeAmount = 0;
                  for (let i = 0; i < 2; i++) {
                     this.pawRenderParts[i].shakeAmount = 0;
                  }
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.snowThrow: {
            switch (this.attackStage) {
               // Windup
               case 0: {
                  // Push paws forward
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_HIGH_ANGLE, Math.pow(this.stageProgress, 1.2));
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     (paw.offset as Point).x = pawOffsetMagnitude * Math.sin(direction);
                     (paw.offset as Point).y = pawOffsetMagnitude * Math.cos(direction);

                     // Create snow particles near the paws
                     const offsetDirection = (pawOffsetDirection - 0.3) * (i === 0 ? -1 : 1) + this.rotation;
                     let spawnPositionX = this.position.x + pawOffsetMagnitude * Math.sin(offsetDirection);
                     let spawnPositionY = this.position.y + pawOffsetMagnitude * Math.cos(offsetDirection);

                     createSnowParticle(spawnPositionX, spawnPositionY, randFloat(40, 70));
                  }

                  break;
               }
               case 2: {
                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_HIGH_ANGLE, FrozenYeti.PAW_RESTING_ANGLE, Math.pow(this.stageProgress, 0.75));
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     (paw.offset as Point).x = pawOffsetMagnitude * Math.sin(direction);
                     (paw.offset as Point).y = pawOffsetMagnitude * Math.cos(direction);
                  }
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.roar: {
            switch (this.attackStage) {
               case 0: {
                  // Pull head back
                  (this.headRenderPart.offset as Point).y = FrozenYeti.HEAD_DISTANCE - lerp(0, 20, this.stageProgress);

                  this.headRenderPart.shakeAmount = lerp(0, 1, this.stageProgress);

                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, this.stageProgress);
                  this.setPawRotationAndOffset(pawOffsetDirection, pawOffsetMagnitude);
                  break;
               }
               case 1: {
                  // Push head forwards
                  (this.headRenderPart.offset as Point).y = FrozenYeti.HEAD_DISTANCE - lerp(20, 0, this.stageProgress);
                  
                  this.headRenderPart.shakeAmount = 2;
                  
                  // Return paws to original position
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE, this.stageProgress);
                  this.setPawRotationAndOffset(pawOffsetDirection, pawOffsetMagnitude);
                  
                  this.createRoarParticles();

                  const distanceToPlayer = this.position.calculateDistanceBetween(Player.instance.position);

                  // Check if the player is within the arc range of the attack
                  const angleToPlayer = this.position.calculateAngleBetween(Player.instance.position);
                  let angleDifference = this.rotation - angleToPlayer;
                  if (angleDifference >= Math.PI) {
                     angleDifference -= Math.PI * 2;
                  } else if (angleDifference < -Math.PI) {
                     angleDifference += Math.PI * 2;
                  }
                  if (Math.abs(angleDifference) <= FrozenYeti.ROAR_ARC / 2 && distanceToPlayer <= FrozenYeti.ROAR_REACH) {
                     Player.instance.velocity.x += 50 * Math.sin(angleToPlayer);
                     Player.instance.velocity.y += 50 * Math.cos(angleToPlayer);
                  }
                  
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.bite: {
            switch (this.attackStage) {
               // Charge
               case 0: {
                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     (paw.offset as Point).x = pawOffsetMagnitude * Math.sin(direction);
                     (paw.offset as Point).y = pawOffsetMagnitude * Math.cos(direction);
                  }
                  
                  break;
               }
               // Lunge
               case 1: {
                  const scaledProgress = Math.pow(this.stageProgress, 0.5);
                  
                  // Push paws forwards
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE - Math.PI / 10, scaledProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     (paw.offset as Point).x = pawOffsetMagnitude * Math.sin(direction);
                     (paw.offset as Point).y = pawOffsetMagnitude * Math.cos(direction);
                  }

                  break;
               }
               // Wind back
               case 2: {
                  // Return paws to normal position
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE - Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     (paw.offset as Point).x = pawOffsetMagnitude * Math.sin(direction);
                     (paw.offset as Point).y = pawOffsetMagnitude * Math.cos(direction);
                  }

                  break;
               }
            }

            break;
         }
         case FrozenYetiAttackType.none: {
            this.headRenderPart.shakeAmount = 0;
            for (let i = 0; i < 2; i++) {
               this.pawRenderParts[i].shakeAmount = 0;
            }
            
            break;
         }
      }
   }

   private setPawRotationAndOffset(rotation: number, offsetMagnitude: number): void {
      for (let i = 0; i < 2; i++) {
         const paw = this.pawRenderParts[i];
         const direction = rotation * (i === 0 ? -1 : 1);
         (paw.offset as Point).x = offsetMagnitude * Math.sin(direction);
         (paw.offset as Point).y = offsetMagnitude * Math.cos(direction);
      }
   }

   private createRoarParticles(): void {
      for (let i = 0; i < 2; i++) {
         const direction = randFloat(this.rotation - FrozenYeti.ROAR_ARC / 2, this.rotation + FrozenYeti.ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.position.x + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

         // const velocityMagnitude = randFloat(200, 300);
         const velocityMagnitude = randFloat(500, 700);
         const velocityX = velocityMagnitude * Math.sin(direction);
         const velocityY = velocityMagnitude * Math.cos(direction);

         const lifetime = randFloat(1, 1.3);

         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return 1 - Math.pow(particle.age / lifetime, 1.5);
         }

         const size = randInt(4, 7);
         const colour = randFloat(0.7, 1);

         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.high,
            size, size,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            velocityMagnitude / lifetime / 1.5,
            2 * Math.PI * Math.random(),
            Math.PI,
            0,
            Math.PI,
            colour, colour, colour
         );

         Board.highMonocolourParticles.push(particle);
      }

      {
         const direction = randFloat(this.rotation - FrozenYeti.ROAR_ARC / 2, this.rotation + FrozenYeti.ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.position.x + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

         // const velocityMagnitude = randFloat(200, 300);
         const velocityMagnitude = randFloat(500, 700);
         const velocityX = velocityMagnitude * Math.sin(direction);
         const velocityY = velocityMagnitude * Math.cos(direction);

         const lifetime = randFloat(1, 1.3);

         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return 1 - Math.pow(particle.age / lifetime, 1.5);
         }

         const size = 64;
         const darkenFactor = randFloat(-0.25, 0);

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.high,
            size, size,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            velocityMagnitude / lifetime / 1.5,
            2 * Math.PI * Math.random(),
            Math.PI,
            0,
            Math.PI,
            7,
            darkenFactor, darkenFactor, darkenFactor
         );

         Board.highTexturedParticles.push(particle);
      }
   }

   public updateFromData(data: EntityData<EntityType.frozenYeti>): void {
      super.updateFromData(data);

      // If the yeti did a bite attack, create a bite particle
      if (this.attackType === FrozenYetiAttackType.bite && data.clientArgs[1] === 2 && this.attackStage === 1) {
         const spawnPositionX = this.position.x + 140 * Math.sin(this.rotation);
         const spawnPositionY = this.position.y + 140 * Math.cos(this.rotation);
         
         createBiteParticle(spawnPositionX, spawnPositionY);
      }
      // If the yeti did a snow throw attack, create impact particles
      if (this.attackType === FrozenYetiAttackType.snowThrow && data.clientArgs[1] === 2 && this.attackStage === 1) {
         const offsetMagnitude = FrozenYeti.SNOWBALL_THROW_OFFSET + 20;
         const impactPositionX = this.position.x + offsetMagnitude * Math.sin(this.rotation);
         const impactPositionY = this.position.y + offsetMagnitude * Math.cos(this.rotation);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = 2 * Math.PI * Math.random();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }

      this.attackType = data.clientArgs[0];
      this.attackStage = data.clientArgs[1];
      this.stageProgress = data.clientArgs[2];

      for (const positionData of data.clientArgs[3]) {
         if (Math.random() < 5 / SETTINGS.TPS) {
            if (Math.random() < 0.5) {
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude / 2 * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude / 2 * Math.cos(spawnOffsetDirection);
               
               const lifetime = randFloat(1, 1.2);
            
               const velocityMagnitude = randFloat(30, 50);
               const velocityDirection = spawnOffsetDirection + randFloat(-0.5, 0.5);
               const velocityX = velocityMagnitude * Math.sin(velocityDirection);
               const velocityY = velocityMagnitude * Math.cos(velocityDirection);
               
               const particle = new Particle(lifetime);
               particle.getOpacity = (): number => {
                  return 1 - particle.age / lifetime;
               };
            
               const pixelSize = 4 * randInt(1, 2);
            
               const colour = randFloat(0.3, 0.5);
               
               addMonocolourParticleToBufferContainer(
                  particle,
                  ParticleRenderLayer.low,
                  pixelSize, pixelSize,
                  spawnPositionX, spawnPositionY,
                  velocityX, velocityY,
                  0, 0,
                  0,
                  2 * Math.PI * Math.random(),
                  0,
                  0,
                  0,
                  colour, colour, colour
               );
               Board.lowMonocolourParticles.push(particle);
            } else {
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
               createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125));
            }
         }
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + FrozenYeti.SIZE / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + FrozenYeti.SIZE / 2 * Math.cos(offsetDirection);
            createBlueBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      for (let i = 0; i < 4; i++) {
         createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      }

      createBloodParticleFountain(this, 0.15, 1.4);
   }
}

export default FrozenYeti;