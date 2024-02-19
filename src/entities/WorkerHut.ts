import { EntityData, EntityType, Point, SETTINGS, lerp } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playBuildingHitSound, playSound } from "../sound";
import Board from "../Board";

// @Cleanup: Copy and paste from WarriorHut

const DOOR_OPEN_TICKS = Math.floor(0.15 * SETTINGS.TPS);
const DOOR_REMAIN_TICKS = Math.floor(0.175 * SETTINGS.TPS);
const DOOR_CLOSE_TICKS = Math.floor(0.175 * SETTINGS.TPS);

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

class WorkerHut extends Entity {
   public static readonly SIZE = 88;

   private static readonly DOOR_HEIGHT = 48;

   public tribeID: number | null;

   /** Amount the door should swing outwards from 0 to 1 */
   private doorSwingAmount: number;

   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, lastDoorSwingTicks: number) {
      super(position, id, EntityType.workerHut, ageTicks, renderDepth);

      this.tribeID = tribeID;
      this.doorSwingAmount = calculateDoorSwingAmount(lastDoorSwingTicks);
      
      // Hut
      const hutRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/worker-hut/worker-hut.png"),
         2,
         0
      );
      this.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/worker-hut/worker-hut-door.png"),
         1,
         0
      );
      doorRenderPart.offset = (): Point => {
         const offset = new Point(-WorkerHut.DOOR_HEIGHT / 2, WorkerHut.SIZE/2);

         const doorRotation = lerp(Math.PI/2, 0, this.doorSwingAmount);
         const rotationOffset = new Point(0, WorkerHut.DOOR_HEIGHT / 2 - 2).convertToVector();
         rotationOffset.direction = doorRotation;
         offset.add(rotationOffset.convertToPoint());

         return offset;
      }
      doorRenderPart.getRotation = (): number => {
         return lerp(Math.PI/2, 0, this.doorSwingAmount);
      }
      this.attachRenderPart(doorRenderPart);
   }

   protected onHit(): void {
      playBuildingHitSound(this.position.x, this.position.y);
   }

   public onDie(): void {
      playSound("building-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
   }

   public updateFromData(data: EntityData<EntityType.warriorHut>): void {
      super.updateFromData(data);
      this.doorSwingAmount = calculateDoorSwingAmount(data.clientArgs[1]);
   }
}

export default WorkerHut;