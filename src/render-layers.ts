import { EntityType, lerp, randFloat } from "webgl-test-shared";

const MIN_RENDER_DEPTH = -0.95;
const MAX_RENDER_DEPTH = 0.95;

enum RenderLayer {
   droppedItems,
   lowEntities,
   projectiles,
   highEntities
}
const NUM_RENDER_LAYERS = Object.keys(RenderLayer).length / 2;

/*
 * Each render layer is split into a distinct chunk of the -1 -> 1 period of render depths.
*/

const calculateRenderDepthFromLayer = (renderLayer: RenderLayer): number => {
   let min = lerp(-1, 1, renderLayer / NUM_RENDER_LAYERS);
   let max = min + 1 / NUM_RENDER_LAYERS;

   // Account for the bounds
   min = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (min + 1) / 2);
   max = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (max + 1) / 2);

   return randFloat(min, max);
}

export function calculateEntityRenderDepth(entityType: EntityType): number {
   let renderLayer: RenderLayer;
   if (entityType === "tree" || entityType === "cactus" || entityType === "berry_bush") {
      renderLayer = RenderLayer.highEntities;
   } else {
      renderLayer = RenderLayer.lowEntities;
   }
   return calculateRenderDepthFromLayer(renderLayer);
}

export function calculateDroppedItemRenderDepth(): number {
   return calculateRenderDepthFromLayer(RenderLayer.droppedItems);
}

export function calculateProjectileRenderDepth(): number {
   return calculateRenderDepthFromLayer(RenderLayer.projectiles);
}