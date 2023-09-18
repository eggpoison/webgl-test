import { Point, TreeSize, lerp, randFloat, randInt } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Particle from "../Particle";
import { LeafParticleSize, createLeafParticle } from "../generic-particles";
import Board from "../Board";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer } from "../rendering/particle-rendering";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

class Tree extends Entity {
   public readonly type = "tree";

   private readonly treeSize: TreeSize;
   private readonly radius: number;

   private static readonly LEAF_SPECK_COLOUR_LOW = [23/255, 173/255, 30/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [81/255, 245/255, 66/255] as const;
   
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
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + this.radius * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + this.radius * Math.cos(spawnOffsetDirection);

         const velocityMagnitude = randFloat(60, 80);
         const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);

         const lifetime = randFloat(0.3, 0.5);
         
         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return Math.pow(1 - particle.age / lifetime, 0.3);
         }
         
         const colourLerp = Math.random();
         const r = lerp(Tree.LEAF_SPECK_COLOUR_LOW[0], Tree.LEAF_SPECK_COLOUR_HIGH[0], colourLerp);
         const g = lerp(Tree.LEAF_SPECK_COLOUR_LOW[1], Tree.LEAF_SPECK_COLOUR_HIGH[1], colourLerp);
         const b = lerp(Tree.LEAF_SPECK_COLOUR_LOW[2], Tree.LEAF_SPECK_COLOUR_HIGH[2], colourLerp);

         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            6, 6,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            0,
            2 * Math.PI * Math.random(),
            0,
            0,
            0,
            r, g, b
         );
         Board.lowMonocolourParticles.push(particle);
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
   }
}

export default Tree;