import { EntityData, EntityType, Point, SETTINGS, Tile, TILE_TYPE_INFO_RECORD, Vector } from "webgl-test-shared";
import Board from "../Board";
import { drawCircle } from "../webgl";

interface BaseRenderPart {
   readonly type: string;
   readonly offset?: Point | (() => Point);
   readonly zIndex: number;
}

export interface CircleRenderPart extends BaseRenderPart {
   readonly type: "circle";
   readonly rgba: [number, number, number, number];
   readonly radius: number;
}

export interface ImageRenderPart extends BaseRenderPart {
   readonly type: "image";
   readonly width: number;
   readonly height: number;
   readonly textureSrc: string;
}

export type RenderPart = CircleRenderPart | ImageRenderPart;

// Sort render parts from lowest z-index to highest z-index
export function sortRenderParts(unsortedRenderParts: ReadonlyArray<RenderPart>): ReadonlyArray<RenderPart> {
   const sortedRenderParts = unsortedRenderParts.slice();
   for (let i = 0; i < unsortedRenderParts.length - 1; i++) {
      for (let j = i; j < unsortedRenderParts.length - 1; j++) {
         if (sortedRenderParts[j].zIndex > sortedRenderParts[j + 1].zIndex) {
            const temp = sortedRenderParts[j + 1];
            sortedRenderParts[j + 1] = sortedRenderParts[j];
            sortedRenderParts[j] = temp;
         }
      }
   }

   return sortedRenderParts;
}

abstract class Entity {
   public readonly id: number;

   /** Position of the entity */
   public position: Point;
   /** Velocity of the entity */
   public velocity: Vector | null = null;
   /** Acceleration of the entity */
   public acceleration: Vector | null = null;

   /** Direction the entity is facing (radians) */
   public rotation: number;
   
   /** Limit to how many units the entity can move in a second */
   public terminalVelocity: number = 0;

   protected readonly abstract renderParts: ReadonlyArray<RenderPart>;

   public isMoving: boolean = true;

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, rotation: number) {
      this.id = id;
      
      this.position = position;
      this.velocity = velocity;
      this.acceleration = acceleration;
      this.terminalVelocity = terminalVelocity;
      this.rotation = rotation;
   }

   public tick(): void {
      this.applyPhysics();
   }

   private applyPhysics(): void {
      const tile = this.findCurrentTile();
      if (typeof tile === "undefined") {
         console.log(this);
         throw new Error("Couldnt' find a tile for an entity!");
      }

      const tileTypeInfo = TILE_TYPE_INFO_RECORD[tile.type];

      // Apply acceleration
      if (this.acceleration !== null) {
         const acceleration = this.acceleration.copy();
         acceleration.magnitude /= SETTINGS.TPS;

         // Reduce acceleration due to friction
         const friction = tileTypeInfo.friction;
         acceleration.magnitude *= friction;
          
         // Apply tile speed multiplier
         if (typeof tileTypeInfo.moveSpeedMultiplier !== "undefined") {
            acceleration.magnitude *= tileTypeInfo.moveSpeedMultiplier;
         }

         // Add acceleration to velocity
         this.velocity = this.velocity !== null ? this.velocity.add(acceleration) : acceleration;
      }
      // Apply friction if the entity isn't accelerating
      else if (this.velocity !== null) { 
         const friction = tileTypeInfo.friction * SETTINGS.GLOBAL_FRICTION_CONSTANT / SETTINGS.TPS;
         this.velocity.magnitude /= 1 + friction;
      }

      // Restrict the entity's velocity to their terminal velocity
      const terminalVelocity = this.terminalVelocity * (tileTypeInfo.moveSpeedMultiplier || 1);
      if (this.velocity !== null && this.velocity.magnitude > terminalVelocity) {
         this.velocity.magnitude = terminalVelocity;
      }

      // Apply velocity
      if (this.velocity !== null) {
         const velocity = this.velocity.copy();
         velocity.magnitude /= SETTINGS.TPS;
         
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
   }

   private findCurrentTile(): Tile {
      const tileX = Math.floor(this.position.x / SETTINGS.TILE_SIZE);
      const tileY = Math.floor(this.position.y / SETTINGS.TILE_SIZE);
      return Board.getTile(tileX, tileY);
   }

   public render(frameProgress: number): void {
      for (const renderPart of this.renderParts) {
         this.drawRenderPart(renderPart, frameProgress);
      }
   }

   public getRenderParts(): ReadonlyArray<RenderPart> {
      return this.renderParts;
   }

   private drawRenderPart(part: RenderPart, frameProgress: number): void {
      let drawPosition = this.position.copy();
      
      // Account for frame progress
      if (this.velocity !== null) {
         const frameVelocity = this.velocity.copy();
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

   public updateFromData(entityData: EntityData<EntityType>): void {
      this.position = Point.unpackage(entityData.position);
      this.velocity = entityData.velocity !== null ? Vector.unpackage(entityData.velocity) : null;
      this.acceleration = entityData.acceleration !== null ? Vector.unpackage(entityData.acceleration) : null;
      this.terminalVelocity = entityData.terminalVelocity;
   }
}

export default Entity;