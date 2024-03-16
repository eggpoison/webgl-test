import { EntityData, EntityType, Point, BlueprintType, randFloat, ServerComponentType, EntityComponentsData } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../utils";
import { createLightWoodSpeckParticle, createSawdustCloud } from "../particles";
import BlueprintComponent from "../entity-components/BlueprintComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";

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
export const BLUEPRINT_PROGRESS_TEXTURE_SOURCES: Record<BlueprintType, ReadonlyArray<ProgressTextureInfo>> = {
   [BlueprintType.woodenDoor]: [
      {
         progressTextureSources: ["entities/door/wooden-door-blueprint-1.png", "entities/door/wooden-door-blueprint-2.png"],
         completedTextureSource: "entities/door/wooden-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Incomplete
   [BlueprintType.stoneDoor]: [
      {
         progressTextureSources: ["entities/door/wooden-door-blueprint-1.png", "entities/door/wooden-door-blueprint-2.png"],
         completedTextureSource: "entities/door/stone-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenEmbrasure]: [
      {
         progressTextureSources: ["entities/embrasure/wooden-embrasure-blueprint-1.png", "entities/embrasure/wooden-embrasure-blueprint-2.png", "entities/embrasure/wooden-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/embrasure/wooden-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Incomplete
   [BlueprintType.stoneEmbrasure]: [
      {
         progressTextureSources: ["entities/embrasure/wooden-embrasure-blueprint-1.png", "entities/embrasure/wooden-embrasure-blueprint-2.png", "entities/embrasure/wooden-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/embrasure/stone-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenTunnel]: [
      {
         progressTextureSources: ["entities/tunnel/tunnel-blueprint-1.png", "entities/tunnel/tunnel-blueprint-2.png"],
         completedTextureSource: "entities/tunnel/wooden-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Incomplete
   [BlueprintType.stoneTunnel]: [
      {
         progressTextureSources: ["entities/tunnel/tunnel-blueprint-1.png", "entities/tunnel/tunnel-blueprint-2.png"],
         completedTextureSource: "entities/tunnel/stone-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.ballista]: [
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
   [BlueprintType.slingTurret]: [
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
   ],
   [BlueprintType.stoneWall]: [
      // @Incomplete
      {
         progressTextureSources: ["entities/sling-turret/sling-blueprint-1.png", "entities/sling-turret/sling-blueprint-2.png"],
         completedTextureSource: "entities/wall/stone-wall.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ]
};

const countProgressTextures = (buildingType: BlueprintType): number => {
   let numTextures = 0;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[buildingType];
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];
      numTextures += progressTextureInfo.progressTextureSources.length;
   }
   return numTextures;
}

class BlueprintEntity extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.blueprintEntity>) {
      super(position, id, EntityType.blueprintEntity, ageTicks);

      const blueprintComponentData = componentsData[1];
      
      // Create completed render parts
      const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponentData.blueprintType];
      for (let i = 0; i < progressTextureInfoArray.length; i++) {
         const progressTextureInfo = progressTextureInfoArray[i];

         const renderPart = new RenderPart(
            this,
            getTextureArrayIndex(progressTextureInfo.completedTextureSource),
            progressTextureInfo.zIndex,
            progressTextureInfo.rotation
         );
         renderPart.offset.x = progressTextureInfo.offsetX;
         renderPart.offset.y = progressTextureInfo.offsetY;
         renderPart.opacity = 0.5;
         renderPart.tintR = 0.2;
         renderPart.tintG = 0.1;
         renderPart.tintB = 0.8;
         this.attachRenderPart(renderPart);
      }

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.blueprint, new BlueprintComponent(this, blueprintComponentData));

      this.updatePartialTexture();

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

      this.updatePartialTexture();
   }

   private updatePartialTexture(): void {
      const blueprintComponent = this.getServerComponent(ServerComponentType.blueprint);
      const blueprintType = blueprintComponent.blueprintType;
      const blueprintProgress = blueprintComponent.lastBlueprintProgress;
      
      const numTextures = countProgressTextures(blueprintType);
      const stage = Math.floor(blueprintProgress * (numTextures + 1));
      if (stage === 0) {
         return;
      }
      
      const lastTextureIndex = stage - 1;
      const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];

      let currentIndexStart = 0;
      for (let i = 0; i < progressTextureInfoArray.length; i++) {
         const progressTextureInfo = progressTextureInfoArray[i];

         let localTextureIndex = lastTextureIndex - currentIndexStart;
         if (localTextureIndex >= progressTextureInfo.progressTextureSources.length) {
            localTextureIndex = progressTextureInfo.progressTextureSources.length - 1;
         }

         const textureSource = progressTextureInfo.progressTextureSources[localTextureIndex];
         if (blueprintComponent.partialRenderParts.length <= i) {
            // New render part
            const renderPart = new RenderPart(
               this,
               getTextureArrayIndex(textureSource),
               progressTextureInfo.zIndex + 0.01,
               progressTextureInfo.rotation
            );
            renderPart.offset.x = progressTextureInfo.offsetX
            renderPart.offset.y = progressTextureInfo.offsetY;
            this.attachRenderPart(renderPart);
            blueprintComponent.partialRenderParts.push(renderPart);
         } else {
            // Existing render part
            blueprintComponent.partialRenderParts[i].switchTextureSource(textureSource);
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