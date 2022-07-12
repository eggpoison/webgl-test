import SETTINGS from "webgl-test-shared/lib/settings";
import { TILE_TYPE_INFO_RECORD } from "webgl-test-shared/lib/Tile";
import Board from "../Board";
import Chunk from "../Chunk";
import { Coordinates, Point, Vector } from "../utils";
import Component from "./Component";
import HitboxComponent from "./HitboxComponent";

class TransformComponent extends Component {
   /** How much an entity's velocity gets decreased each second */
   private static readonly FRICTION_CONSTANT = 4;

   /** Position of the entity */
   public position: Point;
   /** Velocity of the entity */
   public velocity: Vector | null = null;
   /** Acceleration of the entity */
   public acceleration: Vector | null = null;
   /** Rotation of the entity (radians) */
   public rotation: number = 0;

   /** Limit to how fast the entity can go */
   public terminalVelocity: number = 0;

   private readonly isStatic: boolean = false;

   public isMoving: boolean = false;

   constructor(position: Point) {
      super();

      this.position = position;
   }

   public tick(): void {
      if (this.isStatic) return;

      const tile = Board.getTile(...this.getTileCoordinates());
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      // Apply acceleration
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude /= SETTINGS.TPS; 

         // Add acceleration to velocity
         if (this.velocity === null) {
            this.velocity = acceleration;
         } else {
            this.velocity = this.velocity.add(acceleration);
         }
      }
      else if (!this.isMoving && this.velocity !== null) {
         // Apply friction
         this.velocity.magnitude -= this.terminalVelocity * tileTypeInfo.friction * TransformComponent.FRICTION_CONSTANT / SETTINGS.TPS;
         if (this.velocity.magnitude < 0) this.velocity = null;
      }

      // Terminal velocity
      if (this.velocity !== null && this.velocity.magnitude > this.terminalVelocity) {
         this.velocity.magnitude = this.terminalVelocity;
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
          
         // // Apply tile slowness to velocity
         if (typeof tileTypeInfo.effects?.moveSpeedMultiplier !== "undefined") {
            velocity.magnitude *= tileTypeInfo.effects.moveSpeedMultiplier;
         }
         
         this.position = this.position.add(velocity.convertToPoint());
      }

      // // Apply status effects
      // if (typeof tileInfo.effects?.statusEffectOnWalk !== "undefined") {
      //    const { type, duration } = tileInfo.effects.statusEffectOnWalk;

      //    const statusEffectComponent = this.getEntity().getComponent(StatusEffectComponent);
      //    if (statusEffectComponent !== null) {
      //       statusEffectComponent.applyStatusEffect(type, duration);
      //    }
      // }

      // if (this.knockbackTime > 0) {
      //    // Add knockback
      //    this.position = this.position.add(this.knockback);

      //    this.knockbackTime -= 1 / SETTINGS.tps;
      // }

      // const hitboxComponent = this.getEntity().getComponent(HitboxComponent);
      // if (hitboxComponent !== null) {
      //    // If the entity is intersecting with a wall tile, move it out of the collision
      //    const tileCollisions = this.getTileCollisions();
      //    if (tileCollisions.length > 0) this.resolveTileCollisions(tileCollisions);
      // }

      // Resolve wall collisions
      this.resolveWallCollisions();
   }

   public getChunk(): Chunk | null {
      const chunkX = Math.floor(this.position.x / (SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE));
      const chunkY = Math.floor(this.position.y / (SETTINGS.TILE_SIZE * SETTINGS.CHUNK_SIZE));

      return Board.getChunk(chunkX, chunkY);
   }

   public getTileCoordinates(): Coordinates {
      const x = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const y = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      
      return [x, y];
   }

   private resolveWallCollisions(): void {
      const boardUnits = SETTINGS.DIMENSIONS * SETTINGS.TILE_SIZE;

      const hitboxComponent = this.getEntity().getComponent(HitboxComponent)!;
      if (hitboxComponent === null) return;

      const hitbox = hitboxComponent.hitbox;

      let width!: number;
      let height!: number;
      switch (hitbox.type) {
         case "circular": {
            width = hitbox.radius * 2;
            height = hitbox.radius * 2;
            break;
         }
         case "rectangular": {
            width = hitbox.width;
            height = hitbox.height;
            break;
         }
      }

      if (this.position.x - width / 2 < 0) {
         this.position.x = width / 2;

         if (this.velocity !== null) {
            const pointVelocity = this.velocity.convertToPoint();
            pointVelocity.x = 0;
            this.velocity = pointVelocity.convertToVector();
         }
      } else if (this.position.x + width / 2 > boardUnits) {
         this.position.x = boardUnits - width / 2;
         
         if (this.velocity !== null) {
            const pointVelocity = this.velocity.convertToPoint();
            pointVelocity.x = 0;
            this.velocity = pointVelocity.convertToVector();
         }
      }

      if (this.position.y - height / 2 < 0) {
         this.position.y = height / 2;
         
         if (this.velocity !== null) {
            const pointVelocity = this.velocity.convertToPoint();
            pointVelocity.y = 0;
            this.velocity = pointVelocity.convertToVector();
         }
      } else if (this.position.y + height / 2 > boardUnits) {
         this.position.y = boardUnits - height / 2;
         
         if (this.velocity !== null) {
            const pointVelocity = this.velocity.convertToPoint();
            pointVelocity.y = 0;
            this.velocity = pointVelocity.convertToVector();
         }
      }
   }
}

export default TransformComponent;