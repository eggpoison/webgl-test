import { ServerComponentType, TunnelComponentData, angle, lerp } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 48 * 48) / 2;
const angleToCenter = angle(16, 48);

class TunnelComponent extends ServerComponent<ServerComponentType.tunnel> {
   private readonly doorRenderParts: Record<number, RenderPart> = {};
   public doorBitset: number;
   
   constructor(entity: Entity, data: TunnelComponentData) {
      super(entity);

      this.doorBitset = 0;
      this.updateFromData(data);
   }

   private addDoor(doorBit: number): void {
      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex("entities/tunnel/tunnel-door.png"),
         0,
         doorBit === 0b10 ? Math.PI : 0
      );
      renderPart.offset.y = doorBit === 0b10 ? -32 : 32;
      
      this.doorRenderParts[doorBit] = renderPart;
      this.entity.attachRenderPart(renderPart);
   }

   private updateDoor(doorBit: number, openProgress: number, isTopDoor: boolean): void {
      const doorRenderPart = this.doorRenderParts[doorBit];

      const baseRotation = isTopDoor ? -Math.PI/2 : Math.PI/2;
      const rotation = baseRotation + lerp(0, Math.PI/2 - 0.1, openProgress);
      
      // Rotate around the top left corner of the door
      const offsetDirection = rotation + angleToCenter;
      const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
      const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

      doorRenderPart.offset.x = xOffset;
      doorRenderPart.offset.y = yOffset + (isTopDoor ? 32 : -32);
      doorRenderPart.rotation = rotation - Math.PI/2 + (isTopDoor ? 0 : Math.PI);
   }

   public updateFromData(data: TunnelComponentData): void {
      if ((data.doorBitset & 0b01) !== (this.doorBitset & 0b01)) {
         this.addDoor(0b01);
      }
      if ((data.doorBitset & 0b10) !== (this.doorBitset & 0b10)) {
         this.addDoor(0b10);
      }
      
      this.doorBitset = data.doorBitset;

      // Update the doors
      if ((this.doorBitset & 0b01) !== 0) {
         this.updateDoor(0b01, data.topDoorOpenProgress, true);
      }
      if ((this.doorBitset & 0b10) !== 0) {
         this.updateDoor(0b10, data.bottomDoorOpenProgress, false);
      }
   }

   public hasTopDoor(): boolean {
      return (this.doorBitset & 0b01) !== 0;
   }

   public hasBottomDoor(): boolean {
      return (this.doorBitset & 0b10) !== 0;
   }
}

export default TunnelComponent;