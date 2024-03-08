import { BerryBushComponentData, ServerComponentType } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import BerryBush from "../entities/BerryBush";

class BerryBushComponent extends ServerComponent<ServerComponentType.berryBush> {
   private readonly renderPart: RenderPart;
   
   constructor(entity: GameObject, data: BerryBushComponentData, renderPart: RenderPart) {
      super(entity);

      this.renderPart = renderPart;

      this.updateFromData(data);
   }

   public updateFromData(data: BerryBushComponentData): void {
      const numBerries = data.numBerries;
      this.renderPart.switchTextureSource(BerryBush.TEXTURE_SOURCES[numBerries]);
   }
}

export default BerryBushComponent