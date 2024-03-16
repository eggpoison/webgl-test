import { ServerComponentType, TunnelComponentData } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

class TunnelComponent extends ServerComponent<ServerComponentType.tunnel> {
   private readonly doorRenderParts = new Array<RenderPart>();
   public doorBitset: number;
   
   constructor(entity: Entity, data: TunnelComponentData) {
      super(entity);

      this.doorBitset = data.doorBitset;
   }

   private addDoor(doorBit: number): void {
      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex("entities/tunnel/tunnel-door.png"),
         0,
         0
      );
      renderPart.offset.y = doorBit === 0b10 ? -22 : 22;
      
      this.doorRenderParts.push(renderPart);
      this.entity.attachRenderPart(renderPart);
   }

   public updateFromData(data: TunnelComponentData): void {
      if ((data.doorBitset & 0b01) !== (this.doorBitset & 0b01)) {
         this.addDoor(0b01);
      }
      if ((data.doorBitset & 0b10) !== (this.doorBitset & 0b10)) {
         this.addDoor(0b10);
      }
      
      this.doorBitset = data.doorBitset;
   }
}

export default TunnelComponent;