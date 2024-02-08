import { DoorToggleType, EntityData, EntityType, HitData, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "./WoodenWall";

class WoodenDoor extends Entity {
   // @Temporary: Remove once reworked to not use server-side hack
   private readonly doorRenderPart: RenderPart;

   public toggleType: DoorToggleType;
   public openProgress: number;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, toggleType: DoorToggleType, openProgress: number) {
      super(position, id, EntityType.woodenDoor, ageTicks, renderDepth);

      this.toggleType = toggleType;
      this.openProgress = openProgress;

      this.doorRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/wooden-door/wooden-door.png"),
         0,
         0
      );
      this.attachRenderPart(this.doorRenderPart);
   }

   public updateFromData(data: EntityData<EntityType.woodenDoor>): void {
      super.updateFromData(data);

      const toggleType = data.clientArgs[0];
      if (toggleType === DoorToggleType.open && this.toggleType === DoorToggleType.none) {
         playSound("door-open.mp3", 0.4, 1, this.position.x, this.position.y);
      } else if (toggleType === DoorToggleType.close && this.toggleType === DoorToggleType.none) {
         playSound("door-close.mp3", 0.4, 1, this.position.x, this.position.y);
      }
      this.toggleType = toggleType;

      this.openProgress = data.clientArgs[1];
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

export default WoodenDoor;