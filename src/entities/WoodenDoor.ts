import { DoorToggleType, EntityData, EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import Entity from "./Entity";
import { playSound } from "../sound";

class WoodenDoor extends Entity {
   private static readonly WIDTH = 64;
   private static readonly HEIGHT = 24;

   // @Temporary: Remove once reworked to not use server-side hack
   private readonly doorRenderPart: RenderPart;

   private toggleType: DoorToggleType;
   
   constructor(position: Point, id: number, renderDepth: number, toggleType: DoorToggleType) {
      super(position, id, EntityType.woodenDoor, renderDepth);

      this.toggleType = toggleType;

      this.doorRenderPart = new RenderPart(
         this,
         WoodenDoor.WIDTH,
         WoodenDoor.HEIGHT,
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
         playSound("door-open.mp3", 0.4, this.position.x, this.position.y);
      } else if (toggleType === DoorToggleType.close && this.toggleType === DoorToggleType.none) {
         playSound("door-close.mp3", 0.4, this.position.x, this.position.y);
      }
      this.toggleType = toggleType;
   }
}

export default WoodenDoor;