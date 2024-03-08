import { EntityComponentsData, EntityType, Point, ServerComponentType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import HutComponent from "../entity-components/HutComponent";
import GameObject from "../GameObject";

class WarriorHut extends GameObject {
   public static readonly SIZE = 104;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.warriorHut>) {
      super(position, id, EntityType.warriorHut, ageTicks);
      
      // Hut
      const hutRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/warrior-hut/warrior-hut.png"),
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Doors
      const doorRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const doorRenderPart = new RenderPart(
            this,
            getTextureArrayIndex("entities/warrior-hut/warrior-hut-door.png"),
            1,
            0
         );
         this.attachRenderPart(doorRenderPart);
         doorRenderParts.push(doorRenderPart);
      }

      this.addServerComponent(ServerComponentType.hut, new HutComponent(this, componentsData[3], doorRenderParts));
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default WarriorHut;