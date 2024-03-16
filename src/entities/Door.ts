import { EntityComponentsData, EntityType, HitData, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import DoorComponent from "../entity-components/DoorComponent";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import BuildingMaterialComponent from "../entity-components/BuildingMaterialComponent";

class Door extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.door>) {
      super(position, id, EntityType.door, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/door/wooden-door.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.door, new DoorComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, componentsData[4]));
   }

   protected onHit(hitData: HitData): void {
      playSound("wooden-wall-hit.mp3", 0.3, 1, this.position.x, this.position.y);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 20);
      }
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 7; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + 20 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + 20 * Math.cos(offsetDirection);
            createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
         }
      }
   }
   
   public onDie(): void {
      playSound("wooden-wall-break.mp3", 0.4, 1, this.position.x, this.position.y);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(this.position.x, this.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(this.position.x, this.position.y, 32);
      }
   }
}

export default Door;