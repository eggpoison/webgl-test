import { Point, TreeSize, Vector, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import MonocolourParticle, { interpolateColours } from "../particles/MonocolourParticle";
import { ParticleRenderLayer } from "../particles/Particle";
import { LeafParticleSize, createLeafParticle } from "../generic-particles";
import Board from "../Board";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

class Tree extends Entity {
   public readonly type = "tree";

   private readonly treeSize: TreeSize;

   private static readonly LEAF_SPECK_COLOUR_LOW = [23/255, 173/255, 30/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [81/255, 245/255, 66/255] as const;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, treeSize: TreeSize) {
      super(position, hitboxes, id);

      this.treeSize = treeSize;
      
      const size = this.getRadius() * 2;
      this.attachRenderParts([
         new RenderPart({
            width: size,
            height: size,
            textureSource: treeTextures[treeSize],
            zIndex: 0
         })
      ]);
   }

   private getRadius(): number {
      return 40 + this.treeSize * 10;
   }

   protected onHit(): void {
      // Create leaf particles
      {
         const spawnPosition = this.position.copy();
         const offset = new Vector(this.getRadius(), 2 * Math.PI * Math.random()).convertToPoint();
         spawnPosition.add(offset);

         createLeafParticle(spawnPosition, Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      let numLeaves: number;
      if (this.treeSize === TreeSize.small) {
         numLeaves = randInt(2, 3);
      } else {
         numLeaves = randInt(4, 5);
      }
      for (let i = 0; i < numLeaves; i++) {
         const spawnPosition = this.position.copy();

         const offset = new Vector(this.getRadius(), 2 * Math.PI * Math.random()).convertToPoint();
         spawnPosition.add(offset);

         const lifetime = randFloat(0.3, 0.5);
         
         const particle = new MonocolourParticle(
            null,
            6,
            6,
            spawnPosition,
            new Vector(randFloat(60, 80), 2 * Math.PI * Math.random()),
            null,
            lifetime,
            interpolateColours(Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH, Math.random())
         );
         particle.drag = 30;
         particle.rotation = 2 * Math.PI * Math.random();
         particle.getOpacity = (age: number): number => {
            return Math.pow(1 - age / lifetime, 0.3);
         }
         Board.addMonocolourParticle(particle, ParticleRenderLayer.low);
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
         const spawnPosition = this.position.copy();
         const offset = new Vector(this.getRadius() * Math.random(), 2 * Math.PI * Math.random()).convertToPoint();
         spawnPosition.add(offset);

         createLeafParticle(spawnPosition, Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
   }
}

export default Tree;