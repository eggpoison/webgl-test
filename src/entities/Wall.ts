import { EntityComponentsData, EntityData, EntityType, HitData, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import HealthComponent from "../entity-components/HealthComponent";
import Entity from "../Entity";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";
import BuildingMaterialComponent from "../entity-components/BuildingMaterialComponent";

const TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"]

class Wall extends Entity {
   private static readonly NUM_DAMAGE_STAGES = 6;

   private readonly mainRenderPart: RenderPart;
   private damageRenderPart: RenderPart | null = null;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.wall>) {
      super(position, id, EntityType.wall, ageTicks);

      const buildingMaterialComponentData = componentsData[2];
      
      this.mainRenderPart = new RenderPart(
         this,
         getTextureArrayIndex(TEXTURE_SOURCES[buildingMaterialComponentData.material]),
         0,
         0
      );
      this.attachRenderPart(this.mainRenderPart);

      const healthComponentData = componentsData[0];

      this.updateDamageRenderPart(healthComponentData.health, healthComponentData.maxHealth);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, healthComponentData));
      this.addServerComponent(ServerComponentType.buildingMaterial, new BuildingMaterialComponent(this, buildingMaterialComponentData));

      if (this.ageTicks === 0) {
         for (let i = 0; i < 12; i++) {
            createLightWoodSpeckParticle(this.position.x, this.position.y, 32);
         }
         playSound("wooden-wall-place.mp3", 0.3, 1, this.position.x, this.position.y);
      }
   }

   private updateDamageRenderPart(health: number, maxHealth: number): void {
      const damageStage = Math.ceil((1 - health / maxHealth) * Wall.NUM_DAMAGE_STAGES);
      if (damageStage === 0) {
         if (this.damageRenderPart !== null) {
            this.removeRenderPart(this.damageRenderPart);
            this.damageRenderPart = null;
         }
         return;
      }
      
      const textureSource = "entities/wall/wooden-wall-damage-" + damageStage + ".png";
      console.log(damageStage, textureSource);
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
   public updateFromData(data: EntityData<EntityType.wall>): void {
      super.updateFromData(data);

      const healthComponent = this.getServerComponent(ServerComponentType.health);
      this.updateDamageRenderPart(healthComponent.health, healthComponent.maxHealth);

      const buildingMaterialComponentData = data.components[2];
      this.mainRenderPart.switchTextureSource(TEXTURE_SOURCES[buildingMaterialComponentData.material]);
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
         for (const entity of chunk.entities) {
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

export default Wall;