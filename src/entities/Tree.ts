import { EntityType, HitData, Point, TreeSize, randFloat, randInt, randItem } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle } from "../generic-particles";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/game-object-texture-atlas";
import { AudioFilePath, playSound } from "../sound";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

const TREE_HIT_SOUNDS: ReadonlyArray<AudioFilePath> = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
const TREE_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath> = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

class Tree extends Entity {
   public readonly type = EntityType.tree;

   private readonly treeSize: TreeSize;
   private readonly radius: number;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   constructor(position: Point, id: number, renderDepth: number, treeSize: TreeSize) {
      super(position, id, renderDepth);

      this.treeSize = treeSize;
      this.radius = 40 + treeSize * 10;
      
      this.attachRenderPart(
         new RenderPart(
            this,
            this.radius * 2,
            this.radius * 2,
            getGameObjectTextureArrayIndex(treeTextures[treeSize]),
            0,
            0
         )
      );
   }

   protected onHit(hitData: HitData): void {
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
      // Create wood specks at the point of hit
      const spawnOffsetDirection = (hitData.angleFromAttacker || 2 * Math.PI * Math.random()) + Math.PI;
      const spawnPositionX = this.position.x + (this.radius + 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = this.position.y + (this.radius + 2) * Math.cos(spawnOffsetDirection);
      for (let i = 0; i < 4; i++) {
         createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
      }

      playSound(randItem(TREE_HIT_SOUNDS), 0.4, this.position.x, this.position.y);
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

      for (let i = 0; i < 10; i++) {
         createWoodSpeckParticle(this.position.x, this.position.y, this.radius * Math.random());
      }

      playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, this.position.x, this.position.y);
   }
}

export default Tree;