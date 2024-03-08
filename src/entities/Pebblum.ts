import { EntityType, Point } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import GameObject from "../GameObject";

class Pebblum extends GameObject {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.pebblum, ageTicks);

      // Nose
      const nose = new RenderPart(
         this,
         getTextureArrayIndex("entities/pebblum/pebblum-nose.png"),
         0,
         2 * Math.PI * Math.random()
      )
      nose.offset.y = 12;
      this.attachRenderPart(nose);

      // Body
      const body = new RenderPart(
         this,
         getTextureArrayIndex("entities/pebblum/pebblum-body.png"),
         1,
         2 * Math.PI * Math.random()
      )
      body.offset.y = -8;
      this.attachRenderPart(body);

      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.3, 20, 64, 5, 40));
   }
}

export default Pebblum;