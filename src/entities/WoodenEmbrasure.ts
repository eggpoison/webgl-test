import { EntityComponentsData, EntityType, HitData, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../particles";

class WoodenEmbrasure extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.woodenEmbrasure>) {
      super(position, id, EntityType.woodenEmbrasure, ageTicks);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/wooden-embrasure/wooden-embrasure.png"),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
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

export default WoodenEmbrasure;