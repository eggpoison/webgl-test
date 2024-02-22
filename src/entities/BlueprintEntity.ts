import { EntityData, EntityType, Point, BlueprintBuildingType, randFloat } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import Board from "../Board";
import Particle from "../Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { playSound } from "../sound";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "./WoodenWall";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "./Ballista";

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

interface ProgressTextureInfo {
   readonly progressTextureSources: ReadonlyArray<string>;
   // @Cleanup: Just use the last element of the progress textures
   readonly completedTextureSource: string;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly zIndex: number;
}

// @Robustness: Do something better than hand-writing 'blueprint-1', 'blueprint-2', etc. in an array.
export const BLUEPRINT_PROGRESS_TEXTURE_SOURCES: Record<BlueprintBuildingType, ReadonlyArray<ProgressTextureInfo>> = {
   [BlueprintBuildingType.door]: [
      {
         progressTextureSources: ["entities/wooden-door/wooden-door-blueprint-1.png", "entities/wooden-door/wooden-door-blueprint-2.png"],
         completedTextureSource: "entities/wooden-door/wooden-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintBuildingType.embrasure]: [
      {
         progressTextureSources: ["entities/wooden-embrasure/wooden-embrasure-blueprint-1.png", "entities/wooden-embrasure/wooden-embrasure-blueprint-2.png", "entities/wooden-embrasure/wooden-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/wooden-embrasure/wooden-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintBuildingType.ballista]: [
      // Base
      {
         progressTextureSources: ["entities/ballista/base-blueprint-1.png", "entities/ballista/base-blueprint-2.png", "entities/ballista/base-blueprint-3.png", "entities/ballista/base-blueprint-4.png", "entities/ballista/base-blueprint-5.png", "entities/ballista/base-blueprint-6.png", "entities/ballista/base.png"],
         completedTextureSource: "entities/ballista/base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureSources: ["entities/ballista/plate-blueprint-1.png", "entities/ballista/plate-blueprint-2.png", "entities/ballista/plate.png"],
         completedTextureSource: "entities/ballista/plate.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      },
      // Shaft
      {
         progressTextureSources: ["entities/ballista/shaft-blueprint-1.png", "entities/ballista/shaft-blueprint-2.png", "entities/ballista/shaft-blueprint-3.png", "entities/ballista/shaft-blueprint-4.png", "entities/ballista/shaft.png"],
         completedTextureSource: "entities/ballista/shaft.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 3
      },
      // Crossbow
      {
         progressTextureSources: ["entities/ballista/crossbow-blueprint-1.png", "entities/ballista/crossbow-blueprint-2.png", "entities/ballista/crossbow-blueprint-3.png", "entities/ballista/crossbow-blueprint-4.png", "entities/ballista/crossbow.png"],
         completedTextureSource: "entities/ballista/crossbow.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 5
      },
      // Left gear
      {
         progressTextureSources: ["entities/ballista/gear.png"],
         completedTextureSource: "entities/ballista/gear.png",
         offsetX: BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.5
      },
      // Right gear
      {
         progressTextureSources: ["entities/ballista/gear.png"],
         completedTextureSource: "entities/ballista/gear.png",
         offsetX: -BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.6
      },
      // Ammo box
      {
         progressTextureSources: ["entities/ballista/ammo-box-blueprint-1.png", "entities/ballista/ammo-box-blueprint-2.png", "entities/ballista/ammo-box.png"],
         completedTextureSource: "entities/ballista/ammo-box.png",
         offsetX: BALLISTA_AMMO_BOX_OFFSET_X,
         offsetY: BALLISTA_AMMO_BOX_OFFSET_Y,
         rotation: Math.PI / 2,
         zIndex: 1
      }
   ],
   [BlueprintBuildingType.slingTurret]: [
      // Base
      {
         progressTextureSources: ["entities/sling-turret/base-blueprint-1.png", "entities/sling-turret/base-blueprint-2.png", "entities/sling-turret/base-blueprint-3.png", "entities/sling-turret/base-blueprint-4.png", "entities/sling-turret/sling-turret-base.png"],
         completedTextureSource: "entities/sling-turret/sling-turret-base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureSources: ["entities/sling-turret/plate-blueprint-1.png", "entities/sling-turret/plate-blueprint-2.png", "entities/sling-turret/sling-turret-plate.png"],
         completedTextureSource: "entities/sling-turret/sling-turret-plate.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      // Sling
      {
         progressTextureSources: ["entities/sling-turret/sling-blueprint-1.png", "entities/sling-turret/sling-blueprint-2.png"],
         completedTextureSource: "entities/sling-turret/sling-blueprint-2.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      }
   ]
};

const countProgressTextures = (buildingType: BlueprintBuildingType): number => {
   let numTextures = 0;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[buildingType];
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];
      numTextures += progressTextureInfo.progressTextureSources.length;
   }
   return numTextures;
}

/*
10 work:
base: 5
plate: 3
sling: 2
*/

class BlueprintEntity extends Entity {
   private readonly partialRenderParts = new Array<RenderPart>();

   private lastBlueprintProgress: number;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, buildingType: BlueprintBuildingType, blueprintProgress: number) {
      super(position, id, EntityType.woodenFloorSpikes, ageTicks, renderDepth);

      this.lastBlueprintProgress = blueprintProgress;
      
      // Create completed render parts
      const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[buildingType];
      for (let i = 0; i < progressTextureInfoArray.length; i++) {
         const progressTextureInfo = progressTextureInfoArray[i];

         const renderPart = new RenderPart(
            this,
            getTextureArrayIndex(progressTextureInfo.completedTextureSource),
            progressTextureInfo.zIndex,
            progressTextureInfo.rotation
         );
         renderPart.offset = new Point(progressTextureInfo.offsetX, progressTextureInfo.offsetY);
         renderPart.opacity = 0.5;
         renderPart.tintR = 0.2;
         renderPart.tintG = 0.1;
         renderPart.tintB = 0.8;
         this.attachRenderPart(renderPart);
      }

      this.updatePartialTexture(buildingType, blueprintProgress);

      if (ageTicks === 0) {
         playSound("blueprint-place.mp3", 0.4, 1, this.position.x, this.position.y);
      }
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
         playSound("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), this.position.x, this.position.y);
         
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

   private updatePartialTexture(buildingType: BlueprintBuildingType, blueprintProgress: number): void {
      const numTextures = countProgressTextures(buildingType);
      const stage = Math.floor(blueprintProgress * (numTextures + 1));
      if (stage === 0) {
         return;
      }
      
      const lastTextureIndex = stage - 1;
      const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[buildingType];

      let currentIndexStart = 0;
      for (let i = 0; i < progressTextureInfoArray.length; i++) {
         const progressTextureInfo = progressTextureInfoArray[i];

         let localTextureIndex = lastTextureIndex - currentIndexStart;
         if (localTextureIndex >= progressTextureInfo.progressTextureSources.length) {
            localTextureIndex = progressTextureInfo.progressTextureSources.length - 1;
         }

         const textureSource = progressTextureInfo.progressTextureSources[localTextureIndex];
         if (this.partialRenderParts.length <= i) {
            // New render part
            const renderPart = new RenderPart(
               this,
               getTextureArrayIndex(textureSource),
               progressTextureInfo.zIndex + 0.01,
               progressTextureInfo.rotation
            );
            renderPart.offset = new Point(progressTextureInfo.offsetX, progressTextureInfo.offsetY);
            this.attachRenderPart(renderPart);
            this.partialRenderParts.push(renderPart);
         } else {
            // Existing render part
            this.partialRenderParts[i].switchTextureSource(textureSource);
         }

         currentIndexStart += progressTextureInfo.progressTextureSources.length;

         // If the last texture index hasn't reached the next set of progress textures, then break
         if (lastTextureIndex < currentIndexStart) {
            break;
         }
      }
   }
}

export default BlueprintEntity;