import { GameObjectData, Point, RIVER_STEPPING_STONE_SIZES, SETTINGS, TILE_TYPE_INFO_RECORD, Vector, lerp, randFloat, randSign } from "webgl-test-shared";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Particle, { ParticleRenderLayer } from "./Particle";
import Board from "./Board";
import { addMonocolourParticleToBufferContainer, interpolateColours } from "./rendering/particle-rendering";

const WATER_DROPLET_COLOUR_LOW = [8/255, 197/255, 255/255] as const;
const WATER_DROPLET_COLOUR_HIGH = [94/255, 231/255, 255/255] as const;

let frameProgress: number;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
}

abstract class GameObject extends RenderObject {
   public readonly id: number;

   /** Position of the object */
   public position: Point;
   /** Velocity of the object */
   public velocity: Vector | null = null;
   /** Acceleration of the object */
   public acceleration: Vector | null = null;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public mass = 1;

   /** Stores all render parts attached to the object, in ascending order of their z-indexes. */
   public readonly renderParts = new Array<RenderPart>();

   public readonly hitboxes!: ReadonlySet<CircularHitbox | RectangularHitbox>;
   public readonly hitboxHalfDiagonalLength?: number;
   
   /** Limit to how many units the object can move in a second */
   public terminalVelocity: number = 0;

   public chunks = new Set<Chunk>();

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) {
      super();
      
      this.position = position;
      this.renderPosition.x = position.x;
      this.renderPosition.y = position.y;

      this.id = id;

      // Create hitbox using hitbox info
      this.hitboxes = hitboxes;
      
      for (const hitbox of this.hitboxes) {
         hitbox.setObject(this); 
         if (hitbox.hasOwnProperty("width")) {
            (hitbox as RectangularHitbox).computeVertexPositions();
            (hitbox as RectangularHitbox).computeSideAxes();
         }
         hitbox.updateHitboxBounds();
         hitbox.updatePosition();
      }

      // Calculate initial containing chunks
      this.recalculateContainingChunks();
   }

   protected overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      // Water droplet particles
      if (this.isInRiver(this.findCurrentTile()) && Board.tickIntervalHasPassed(0.05)) {
         // @Speed garbage collection
         
         const lifetime = 1;

         const position = this.position.copy();

         const velocity = Point.fromVectorForm(randFloat(40, 60), 2 * Math.PI * Math.random());
            
         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return lerp(0.75, 0, particle.age / lifetime);
         };

         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            6, 6,
            position.x, position.y,
            velocity.x, velocity.y,
            0, 0,
            0,
            2 * Math.PI * Math.random(),
            randFloat(2, 3) * randSign(),
            0,
            0,
            interpolateColours(WATER_DROPLET_COLOUR_LOW, WATER_DROPLET_COLOUR_HIGH, Math.random())
         );
         Board.lowMonocolourParticles.push(particle);
      }
   };

   protected isInRiver(tile: Tile): boolean {
      if (tile.type !== "water") {
         return false;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const dist = this.position.calculateDistanceBetween(steppingStone.position);
            if (dist <= size/2) {
               return false;
            }
         }
      }

      return true;
   }

   public applyPhysics(): void {
      const tile = this.findCurrentTile();
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      let tileMoveSpeedMultiplier = tileTypeInfo.moveSpeedMultiplier || 1;
      if (tile.type === "water" && !this.isInRiver(tile)) {
         tileMoveSpeedMultiplier = 1;
      }

      // TODO: This is scuffed
      if (typeof this.overrideTileMoveSpeedMultiplier !== "undefined") {
         const speed = this.overrideTileMoveSpeedMultiplier();
         if (speed !== null) {
            tileMoveSpeedMultiplier = speed;
         }
      }

      const terminalVelocity = this.terminalVelocity * tileMoveSpeedMultiplier;

      let tileFrictionReduceAmount: number;
      
      // Friction
      if (this.velocity !== null) {
         const amountBefore = this.velocity.magnitude
         this.velocity.magnitude /= 1 + 3 / SETTINGS.TPS * tileTypeInfo.friction;
         tileFrictionReduceAmount = amountBefore - this.velocity.magnitude;
      } else {
         tileFrictionReduceAmount = 0;
      }
      
      if (this.acceleration !== null) {
         // Accelerate

         const acceleration = this.acceleration.copy();
         acceleration.magnitude *= tileTypeInfo.friction * tileMoveSpeedMultiplier / SETTINGS.TPS;

         // Make acceleration slow as the game object reaches its terminal velocity
         if (this.velocity !== null) {
            const progressToTerminalVelocity = this.velocity.magnitude / terminalVelocity;
            if (progressToTerminalVelocity < 1) {
               acceleration.magnitude *= 1 - Math.pow(progressToTerminalVelocity * 1.1, 2);
            }
         }

         acceleration.magnitude += tileFrictionReduceAmount;

         const magnitudeBeforeAdd = this.velocity?.magnitude || 0;

         // Add acceleration to velocity
         if (this.velocity !== null) {
            this.velocity.add(acceleration);
         } else {
            this.velocity = acceleration;
         }
         
         // Don't accelerate past terminal velocity
         if (this.velocity.magnitude > terminalVelocity && this.velocity.magnitude > magnitudeBeforeAdd) {
            if (magnitudeBeforeAdd < terminalVelocity) {
               this.velocity.magnitude = terminalVelocity;
            } else {
               this.velocity.magnitude = magnitudeBeforeAdd;
            }
         }
      } else if (this.velocity !== null) {
         // If the game object isn't accelerating, apply friction
         this.velocity.magnitude -= 3 * SETTINGS.FRICTION_CONSTANT / SETTINGS.TPS * tileTypeInfo.friction;
         if (this.velocity.magnitude <= 0) {
            this.velocity = null;
         }
      }

      // If the game object is in a river, push them in the flow direction of the river
      if (this.isInRiver(tile)) {
         const flowDirection = Board.getRiverFlowDirection(tile.x, tile.y);
         const pushVector = new Vector(240 / SETTINGS.TPS, flowDirection);
         if (this.velocity === null) {
            this.velocity = pushVector;
         } else {
            this.velocity.add(pushVector);
         }
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
         
         this.position.add(velocity.convertToPoint());

         // Clamp the position
         if (this.position.x < 0) {
            this.position.x = 0;
         } else if (this.position.x >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
            this.position.x = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
         }
         if (this.position.y < 0) {
            this.position.y = 0;
         } else if (this.position.y >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
            this.position.y = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
         }
      }
   }

   // @Cleanup this is pretty bad
   public findCurrentTile(): Tile {
      const tileX = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      return Board.getTile(tileX, tileY);
   }

   /** Recalculates which chunks the game object is contained in */
   public recalculateContainingChunks(): void {
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / SETTINGS.TILE_SIZE / SETTINGS.CHUNK_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeGameObject(this as unknown as GameObject);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addGameObject(this as unknown as GameObject);
            this.chunks.add(chunk);
         }
      }
   }

   public updateRenderPosition(): void {
      // Start the render position at the known position
      this.renderPosition.x = this.position.x;
      this.renderPosition.y = this.position.y;
      
      // Account for frame progress
      if (this.velocity !== null) {
         // 
         // Calculate the change in position that has occurred since the start of the frame
         // 
         let frameVelocity: Vector | null = this.velocity.copy();
   
         // Apply the frame velocity to the object's position
         if (frameVelocity !== null) {
            frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;
   
            const offset = frameVelocity.convertToPoint();
            this.renderPosition.add(offset);
         }
      }
   
      // Clamp the render position
      if (this.renderPosition.x < 0) {
         this.renderPosition.x = 0;
      } else if (this.renderPosition.x >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
         this.renderPosition.x = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
      }
      if (this.renderPosition.y < 0) {
         this.renderPosition.y = 0;
      } else if (this.renderPosition.y >= SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE) {
         this.renderPosition.y = SETTINGS.BOARD_DIMENSIONS * SETTINGS.TILE_SIZE - 1;
      }
   }

   public updateHitboxes(): void {
      for (const hitbox of this.hitboxes) {
         if (hitbox.hasOwnProperty("width")) {
            (hitbox as RectangularHitbox).computeVertexPositions();
            (hitbox as RectangularHitbox).computeSideAxes();
         }
         hitbox.updateHitboxBounds();
         hitbox.updatePosition();
      }
   }

   public updateFromData(data: GameObjectData): void {
      this.position = Point.unpackage(data.position);
      this.velocity = data.velocity !== null ? Vector.unpackage(data.velocity) : null;
      this.rotation = data.rotation;
      this.mass = data.mass;

      this.updateHitboxes();

      // Recalculate the game object's containing chunks to account for the new position
      this.recalculateContainingChunks();
   }
}

export default GameObject;