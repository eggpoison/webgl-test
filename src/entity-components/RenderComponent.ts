import { SETTINGS } from "webgl-test-shared";
import Entity from "../entities/Entity";
import Player from "../entities/Player";
import { Point } from "../utils";
import { drawCircle } from "../webgl";
import Component from "./Component";
import TransformComponent from "./TransformComponent";

interface BaseRenderPart {
   readonly type: string;
   readonly offset?: Point | (() => Point);
}

interface CircleRenderPart extends BaseRenderPart {
   readonly type: "circle";
   readonly rgba: [number, number, number, number];
   readonly radius: number;
}

type RenderPart = CircleRenderPart;

const drawRenderPart = (part: RenderPart, entity: Entity, lagOffset: Point): void => {
   const transformComponent = entity.getComponent(TransformComponent)!;

   let position = transformComponent.position;

   // Account for frame progress
   position = position.add(lagOffset);

   switch (part.type) {
      case "circle": {
         drawCircle(position.x, position.y, part.radius, part.rgba);
         break;
      }
   }
}

class RenderComponent extends Component {
   private readonly renderParts: ReadonlyArray<RenderPart>;
   
   constructor(renderParts: Array<RenderPart>) {
      super();

      this.renderParts = renderParts;
   }

   // eslint-disable-next-line react/require-render-return
   public render(lagOffset: Point): void {
      const entity = this.getEntity();
      for (const renderPart of this.renderParts) {
         drawRenderPart(renderPart, entity, lagOffset);
      }
   }
}

export default RenderComponent;