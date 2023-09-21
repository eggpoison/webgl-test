import { Point, TreeSize, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../generic-particles";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

class Tree extends Entity {
   public readonly type = "tree";

   private readonly treeSize: TreeSize;
   private readonly radius: number;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, treeSize: TreeSize) {
      super(position, hitboxes, id);

      this.treeSize = treeSize;
      this.radius = 40 + treeSize * 10;
      
      this.attachRenderPart(
         new RenderPart(
            this.radius * 2,
            this.radius * 2,
            treeTextures[treeSize],
            0,
            0
         )
      );
   }

   protected onHit(): void {
      // Create leaf particles
      {
         const moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = this.position.x + this.radius * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + this.radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = this.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, this.radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }
   }

   public onDie(): void {
      let numLeaves: number;
      if (this.treeSize === TreeSize.small) {
         numLeaves = randInt(2, 3);
      } else {
         numLeaves = randInt(4, 5);
      }
      for (let i = 0; i < numLeaves; i++) {
         const spawnOffsetMagnitude = this.radius * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = this.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, this.radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }
   }
}

export default Tree;