import { EntityData, lerp, Point, SETTINGS, Tile, TILE_TYPE_INFO_RECORD, Vector } from "webgl-test-shared";
import Board from "../Board";
import { drawCircle } from "../webgl";

interface BaseRenderPart {
   readonly type: string;
   readonly offset?: Point | (() => Point);
}

interface CircleRenderPart extends BaseRenderPart {
   readonly type: "circle";
   readonly rgba: [number, number, number, number];
   readonly radius: number;
}

export type RenderPart = CircleRenderPart;

abstract class Entity {
   public readonly id: number;

   /** Position of the entity */
   public position: Point;
   /** Velocity of the entity */
   public velocity: Vector | null = null;
   /** Acceleration of the entity */
   public acceleration: Vector | null = null;

   /** Limit to how many units the entity can move in a second */
   public terminalVelocity: number = 0;

   private readonly renderParts: ReadonlyArray<RenderPart>;

   public isMoving: boolean = true;

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, renderParts: ReadonlyArray<RenderPart>) {
      this.id = id;
      
      this.position = position;
      this.velocity = velocity;
      this.acceleration = acceleration;
      this.terminalVelocity = terminalVelocity;

      this.renderParts = renderParts;
   }

   public tick(): void {
      this.applyPhysics();
   }

   private applyPhysics(): void {
      const tile = this.findCurrentTile();
      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      // Apply acceleration
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude /= SETTINGS.TPS;

         // Apply friction to acceleration
         const REDUCTION_FACTOR = 0.3;
         acceleration.magnitude *= lerp(REDUCTION_FACTOR, 1, tileTypeInfo.friction);

         // Add acceleration to velocity
         if (this.velocity === null) {
            this.velocity = acceleration;
         } else {
            this.velocity = this.velocity.add(acceleration);
         }
      }
      else if (!this.isMoving && this.velocity !== null) {
         // Apply friction
         this.velocity.magnitude -= this.terminalVelocity * tileTypeInfo.friction * SETTINGS.FRICTION_CONSTANT / SETTINGS.TPS;
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
      // this.resolveWallCollisions();
   }

   private findCurrentTile(): Tile {
      const tileX = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      return Board.getTile(tileX, tileY);
   }

   
   // private resolveWallCollisions(): void {
   //    const boardUnits = SETTINGS.DIMENSIONS * SETTINGS.TILE_SIZE;

   //    const hitboxComponent = this.getEntity().getComponent(HitboxComponent)!;
   //    if (hitboxComponent === null) return;

   //    const hitbox = hitboxComponent.hitbox;

   //    let width!: number;
   //    let height!: number;
   //    switch (hitbox.type) {
   //       case "circular": {
   //          width = hitbox.radius * 2;
   //          height = hitbox.radius * 2;
   //          break;
   //       }
   //       case "rectangular": {
   //          width = hitbox.width;
   //          height = hitbox.height;
   //          break;
   //       }
   //    }

   //    if (this.position.x - width / 2 < 0) {
   //       this.position.x = width / 2;

   //       if (this.velocity !== null) {
   //          const pointVelocity = this.velocity.convertToPoint();
   //          pointVelocity.x = 0;
   //          this.velocity = pointVelocity.convertToVector();
   //       }
   //    } else if (this.position.x + width / 2 > boardUnits) {
   //       this.position.x = boardUnits - width / 2;
         
   //       if (this.velocity !== null) {
   //          const pointVelocity = this.velocity.convertToPoint();
   //          pointVelocity.x = 0;
   //          this.velocity = pointVelocity.convertToVector();
   //       }
   //    }

   //    if (this.position.y - height / 2 < 0) {
   //       this.position.y = height / 2;
         
   //       if (this.velocity !== null) {
   //          const pointVelocity = this.velocity.convertToPoint();
   //          pointVelocity.y = 0;
   //          this.velocity = pointVelocity.convertToVector();
   //       }
   //    } else if (this.position.y + height / 2 > boardUnits) {
   //       this.position.y = boardUnits - height / 2;
         
   //       if (this.velocity !== null) {
   //          const pointVelocity = this.velocity.convertToPoint();
   //          pointVelocity.y = 0;
   //          this.velocity = pointVelocity.convertToVector();
   //       }
   //    }
   // }

   public render(frameProgress: number): void {
      for (const renderPart of this.renderParts) {
         this.drawRenderPart(renderPart, frameProgress);
      }
   }

   private drawRenderPart(part: RenderPart, frameProgress: number): void {
      let drawPosition = this.position.copy();
      
      // Account for frame progress
      if (this.velocity !== null) {
         const frameVelocity = this.velocity?.copy();
         frameVelocity.magnitude *= frameProgress / SETTINGS.TPS;
         drawPosition = drawPosition.add(frameVelocity.convertToPoint());
      }
   
      switch (part.type) {
         case "circle": {
            drawCircle(drawPosition.x, drawPosition.y, part.radius, part.rgba);
            break;
         }
      }
   }

   public updateFromData(entityData: EntityData): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
   }
}

export default Entity;