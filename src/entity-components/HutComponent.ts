import { EntityType, HutComponentData, Point, ServerComponentType, Settings, lerp } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import Board from "../Board";
import RenderPart from "../render-parts/RenderPart";
import WorkerHut from "../entities/WorkerHut";
import WarriorHut from "../entities/WarriorHut";

const DOOR_OPEN_TICKS = Math.floor(0.15 * Settings.TPS);
const DOOR_REMAIN_TICKS = Math.floor(0.175 * Settings.TPS);
const DOOR_CLOSE_TICKS = Math.floor(0.175 * Settings.TPS);

const calculateDoorSwingAmount = (lastDoorSwingTicks: number): number => {
   const ticksSinceLastSwing = Board.ticks - lastDoorSwingTicks;
   if (ticksSinceLastSwing <= DOOR_OPEN_TICKS) {
      return lerp(0, 1, ticksSinceLastSwing / DOOR_OPEN_TICKS);
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS) {
      return 1;
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS + DOOR_CLOSE_TICKS) {
      return lerp(1, 0, (ticksSinceLastSwing - DOOR_OPEN_TICKS - DOOR_REMAIN_TICKS) / DOOR_CLOSE_TICKS);
   } else {
      return 0;
   }
}

type HutType = EntityType.workerHut | EntityType.warriorHut;

const getHutSize = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return WorkerHut.SIZE;
      case EntityType.warriorHut: return WarriorHut.SIZE;
   }
}

const getDoorHeight = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return 48;
      case EntityType.warriorHut: return 44;
   }
}

const getDoorXOffset = (hutType: HutType, i: number): number => {
   switch (hutType) {
      case EntityType.workerHut: return -getDoorHeight(hutType) / 2;
      case EntityType.warriorHut: return -40 * (i === 0 ? 1 : -1);
   }
}

class HutComponent extends ServerComponent<ServerComponentType.hut> {
   private readonly doorRenderParts: ReadonlyArray<RenderPart>;
   
   // @Memory: Don't need to store
   /** Amount the door should swing outwards from 0 to 1 */
   private doorSwingAmount: number;

   constructor(entity: Entity, data: HutComponentData, doorRenderParts: ReadonlyArray<RenderPart>) {
      super(entity);
      
      this.doorSwingAmount = calculateDoorSwingAmount(data.lastDoorSwingTicks);
      this.doorRenderParts = doorRenderParts;

      this.updateDoors();
   }

   private updateDoors(): void {
      for (let i = 0; i < this.doorRenderParts.length; i++) {
         const renderPart = this.doorRenderParts[i];
         
         const hutType = this.entity.type as HutType;
         const hutSize = getHutSize(hutType);
         const doorHeight = getDoorHeight(hutType);
         const doorXOffset = getDoorXOffset(hutType, i);
         
         // @Speed: Garbage collection
         
         const offset = new Point(doorXOffset, hutSize/2);
   
         const doorRotation = lerp(Math.PI/2, 0, this.doorSwingAmount) * (i === 0 ? 1 : -1);
         const rotationOffset = new Point(0, doorHeight / 2 - 2).convertToVector();
         rotationOffset.direction = doorRotation;
         offset.add(rotationOffset.convertToPoint());
   
         renderPart.offset.x = offset.x;
         renderPart.offset.y = offset.y;
   
         renderPart.rotation = lerp(Math.PI/2, 0, this.doorSwingAmount) * (i === 0 ? 1 : -1);
      }
   }

   public updateFromData(data: HutComponentData): void {
      this.doorSwingAmount = calculateDoorSwingAmount(data.lastDoorSwingTicks);
      this.updateDoors();
   }
}

export default HutComponent;