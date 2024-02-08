import { EntityData, EntityType, Point, StructureShapeType, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { ENTITY_TEXTURE_SLOT_INDEXES, getEntityTextureArrayIndex, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { SHAPE_TYPE_TEXTURE_SOURCES } from "../rendering/placeable-item-rendering";
import Board from "../Board";
import Particle from "../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { playSound } from "../sound";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "./WoodenWall";

const createSawdustCloud = (x: number, y: number): void => {
   const lifetime = randFloat(0.4, 0.7);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = 2 * Math.PI * Math.random();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      2 * Math.PI * Math.random(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      6 * 8,
      0, 0, 0
   );
   Board.highTexturedParticles.push(particle);
}

const PARTIAL_TEXTURE_SOURCES: Record<StructureShapeType, ReadonlyArray<string>> = {
   [StructureShapeType.door]: ["entities/wooden-door/wooden-door-blueprint-1.png", "entities/wooden-door/wooden-door-blueprint-2.png"],
   [StructureShapeType.embrasure]: ["entities/wooden-embrasure/wooden-embrasure-blueprint-1.png", "entities/wooden-embrasure/wooden-embrasure-blueprint-2.png", "entities/wooden-embrasure/wooden-embrasure-blueprint-3.png"]
};

class BlueprintEntity extends Entity {
   private partialRenderPart: RenderPart | null = null;

   private lastBlueprintProgress: number;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, shapeType: StructureShapeType, blueprintProgress: number) {
      super(position, id, EntityType.woodenFloorSpikes, ageTicks, renderDepth);

      this.lastBlueprintProgress = blueprintProgress;
      
      const textureSource = SHAPE_TYPE_TEXTURE_SOURCES[shapeType];
      const textureArrayIndex = getEntityTextureArrayIndex(textureSource);

      const renderPart = new RenderPart(
         this,
         getTextureWidth(textureArrayIndex) * 4,
         getTextureHeight(textureArrayIndex) * 4,
         textureArrayIndex,
         0,
         0
      );
      renderPart.opacity = 0.5;
      renderPart.tintR = 0.2;
      renderPart.tintG = 0.1;
      renderPart.tintB = 0.8;
      this.attachRenderPart(renderPart);

      this.updatePartialTexture(shapeType, blueprintProgress);
   }

   public onDie(): void {
      playSound("blueprint-work.mp3", 0.4, 1, this.position.x, this.position.y);
      playSound("structure-shaping.mp3", 0.4, 1, this.position.x, this.position.y);

      for (let i = 0; i < 5; i++) {
         const x = this.position.x + randFloat(-32, 32);
         const y = this.position.y + randFloat(-32, 32);
         createSawdustCloud(x, y);
      }

      for (let i = 0; i < 8; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32);
      }
   }

   public updateFromData(data: EntityData<EntityType.blueprintEntity>): void {
      super.updateFromData(data);

      const shapeType = data.clientArgs[0];
      const blueprintProgress = data.clientArgs[1];

      this.updatePartialTexture(shapeType, blueprintProgress);

      if (blueprintProgress !== this.lastBlueprintProgress) {
         playSound("blueprint-work.mp3", 0.4, 1, this.position.x, this.position.y);
         
         for (let i = 0; i < 2; i++) {
            createWoodShardParticle(this.position.x, this.position.y, 24);
         }

         for (let i = 0; i < 3; i++) {
            createLightWoodSpeckParticle(this.position.x, this.position.y, 24 * Math.random());
         }

         for (let i = 0; i < 2; i++) {
            const x = this.position.x + randFloat(-24, 24);
            const y = this.position.y + randFloat(-24, 24);
            createSawdustCloud(x, y);
         }
      }
      this.lastBlueprintProgress = blueprintProgress;
   }

   private updatePartialTexture(shapeType: StructureShapeType, blueprintProgress: number): void {
      const textureSources = PARTIAL_TEXTURE_SOURCES[shapeType];
      const stage = Math.floor(blueprintProgress * (textureSources.length + 1));
      if (stage === 0) {
         return;
      }
      const textureSource = textureSources[stage - 1];
      const textureArrayIndex = getEntityTextureArrayIndex(textureSource);

      if (this.partialRenderPart === null) {
         this.partialRenderPart = new RenderPart(
            this,
            getTextureWidth(textureArrayIndex) * 4,
            getTextureHeight(textureArrayIndex) * 4,
            textureArrayIndex,
            1,
            0
         );
         this.attachRenderPart(this.partialRenderPart);
      } else {
         this.partialRenderPart.textureSlotIndex = ENTITY_TEXTURE_SLOT_INDEXES[textureArrayIndex];
      }
   }
}

export default BlueprintEntity;