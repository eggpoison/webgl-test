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

// @Incomplete: there needs to be some padding between render layers so render parts don't leak into higher render layers

const calculateRenderDepthFromLayer = (renderLayer: RenderLayer): number => {
   let min = lerp(-1, 1, renderLayer / NUM_RENDER_LAYERS);
   let max = min + 1 / NUM_RENDER_LAYERS;

   // Account for the bounds
   min = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (min + 1) / 2);
   max = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (max + 1) / 2);

   return randFloat(min, max);
}

const getEntityRenderLayer = (entityType: EntityType): RenderLayer => {
   switch (entityType) {
      // Item entities
      case EntityType.itemEntity: {
         return RenderLayer.droppedItems;
      }
      // High entities
      case EntityType.cactus:
      case EntityType.berryBush:
      case EntityType.tree:
      case EntityType.woodenTunnel:
      case EntityType.workerHut:
      case EntityType.warriorHut: {
         return RenderLayer.highEntities;
      }
      // Projectiles
      case EntityType.woodenArrowProjectile: {
         return RenderLayer.projectiles;
      }
      // Low entities (default)
      default: {
         return RenderLayer.lowEntities;
      }
   }
}

export function calculateEntityRenderDepth(entityType: EntityType): number {
   return calculateRenderDepthFromLayer(getEntityRenderLayer(entityType));
}