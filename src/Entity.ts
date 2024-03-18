import { EntityData, EntityType, HitData, HitFlags, Point, RIVER_STEPPING_STONE_SIZES, Settings, TILE_FRICTIONS, TILE_MOVE_SPEED_MULTIPLIERS, TileType, distance, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, lerp, EntityComponents, HitboxCollisionType } from "webgl-test-shared";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import { Tile } from "./Tile";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Board from "./Board";
import { createHealingParticle, createSlimePoolParticle, createWaterSplashParticle } from "./particles";
import { AudioFilePath, playSound } from "./sound";
import ServerComponent from "./entity-components/ServerComponent";
import { calculateEntityRenderDepth } from "./render-layers";
import { ClientComponentClass, ClientComponentType, ClientComponents, ServerComponentClass, ServerComponents } from "./entity-components/components";
import Component from "./entity-components/Component";
import Particle from "./Particle";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer } from "./rendering/particle-rendering";

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

// @Cleanup: Move frame progress stuff to a different file

let frameProgress = Number.EPSILON;
export function setFrameProgress(newFrameProgress: number): void {
   frameProgress = newFrameProgress;
}

export function getFrameProgress(): number {
   return frameProgress;
}

export function getRandomPointInEntity(entity: Entity): Point {
   const hitbox = entity.hitboxes[randInt(0, entity.hitboxes.length - 1)];

   if (hitbox.hasOwnProperty("radius")) {
      const offsetMagnitude = (hitbox as CircularHitbox).radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(entity.position.x + offsetMagnitude * Math.sin(offsetDirection), entity.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = (hitbox as RectangularHitbox).width / 2;
      const halfHeight = (hitbox as RectangularHitbox).height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const hitboxRotation = (hitbox as RectangularHitbox).rotation;
      const x = entity.position.x + rotateXAroundOrigin(xOffset, yOffset, entity.rotation + hitboxRotation);
      const y = entity.position.y + rotateYAroundOrigin(xOffset, yOffset, entity.rotation + hitboxRotation);
      return new Point(x, y);
   }
}

type ServerComponentsType = Partial<{
   [T in keyof typeof ServerComponents]: ServerComponentClass<T>;
}>;
type ClientComponentsType = Partial<{
   [T in keyof typeof ClientComponents]: ClientComponentClass<T>;
}>;

abstract class Entity extends RenderObject {
   public readonly id: number;

   public readonly type: EntityType;

   public position: Point;
   public velocity = new Point(0, 0);
   public acceleration = new Point(0, 0);

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public ageTicks: number;

   public tile!: Tile;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderParts = new Array<RenderPart>();

   public hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   public readonly hitboxHalfDiagonalLength?: number;
   
   public chunks = new Set<Chunk>();

   /** Visual depth of the game object while being rendered */
   public readonly renderDepth: number;

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   public collisionBit = 0;
   public collisionMask = 0;

   private readonly serverComponents: ServerComponentsType = {};
   private readonly clientComponents: ClientComponentsType = {};
   private readonly tickableComponents = new Array<Component>();
   private readonly updateableComponents = new Array<Component>();

   constructor(position: Point, id: number, type: EntityType, ageTicks: number) {
      super();
      
      this.position = position;
      this.renderPosition.x = position.x;
      this.renderPosition.y = position.y;
      this.id = id;
      this.type = type;
      this.ageTicks = ageTicks;
      this.renderDepth = calculateEntityRenderDepth(type);

      this.updateCurrentTile();

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   protected addServerComponent<T extends keyof typeof ServerComponents>(componentType: T, component: ServerComponentClass<T>): void {
      // @Cleanup: Remove cast
      this.serverComponents[componentType] = component as any;
      if (typeof (component as ServerComponent).tick !== "undefined") {
         this.tickableComponents.push(component as ServerComponent);
      }
      if (typeof (component as ServerComponent).update !== "undefined") {
         this.updateableComponents.push(component as ServerComponent);
      }
   }

   protected addClientComponent<T extends ClientComponentType>(componentType: T, component: ClientComponentClass<T>): void {
      // @Cleanup: Remove cast
      this.clientComponents[componentType] = component as any;
      if (typeof (component as Component).tick !== "undefined") {
         this.tickableComponents.push(component as Component);
      }
      if (typeof (component as Component).update !== "undefined") {
         this.updateableComponents.push(component as Component);
      }
   }

   public getServerComponent<T extends keyof typeof ServerComponents>(componentType: T): ServerComponentClass<T> {
      return this.serverComponents[componentType]!;
   }

   public getClientComponent<T extends ClientComponentType>(componentType: T): ClientComponentClass<T> {
      return this.clientComponents[componentType]!;
   }

   public hasServerComponent(componentType: keyof typeof ServerComponents): boolean {
      return this.serverComponents.hasOwnProperty(componentType);
   }
   
   public attachRenderPart(renderPart: RenderPart): void {
      // Don't add if already attached
      if (this.allRenderParts.indexOf(renderPart) !== -1) {
         return;
      }

      // Add to the root array
      let idx = this.allRenderParts.length;
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const currentRenderPart = this.allRenderParts[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderParts.splice(idx, 0, renderPart);

      renderPart.parent.children.push(renderPart);
      
      Board.numVisibleRenderParts++;
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderParts.indexOf(renderPart);
      if (idx === -1) {
         return;
      }
      
      Board.numVisibleRenderParts--;
      
      // Remove from the root array
      this.allRenderParts.splice(this.allRenderParts.indexOf(renderPart), 1);
   }

   public addCircularHitbox(hitbox: CircularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromEntity(this);
      hitbox.updateHitboxBounds();
   }

   public addRectangularHitbox(hitbox: RectangularHitbox): void {
      this.hitboxes.push(hitbox);
      hitbox.updateFromEntity(this);
      hitbox.updateHitboxBounds(this.rotation);
   }

   public remove(): void {
      if (typeof this.onRemove !== "undefined") {
         this.onRemove();
      }

      // @Cleanup: Components shouldn't have this function, should just be on the entity (maybe??)
      for (const component of Object.values(this.serverComponents) as ReadonlyArray<ServerComponent>) {
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }
      for (const component of Object.values(this.clientComponents) as ReadonlyArray<Component>) {
         if (typeof component.onRemove !== "undefined") {
            component.onRemove();
         }
      }
   }

   protected onRemove?(): void;

   protected overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;
      
      // Water droplet particles
      // @Cleanup: Don't hardcode fish condition
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.05) && (this.type !== EntityType.fish)) {
         createWaterSplashParticle(this.position.x, this.position.y);
      }

      // Water splash particles
      // @Cleanup: Move to particles file
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.15) && this.acceleration !== null && this.type !== EntityType.fish) {
         const lifetime = 2.5;

         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            return lerp(0.75, 0, Math.sqrt(particle.age / lifetime));
         }
         particle.getScale = (): number => {
            return 1 + particle.age / lifetime * 1.4;
         }

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.low,
            64, 64,
            this.position.x, this.position.y,
            0, 0,
            0, 0,
            0,
            2 * Math.PI * Math.random(),
            0,
            0,
            0,
            8 * 1 + 5,
            0, 0, 0
         );
         Board.lowTexturedParticles.push(particle);

         playSound(("water-splash-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.25, 1, this.position.x, this.position.y);
      }

      for (let i = 0; i < this.tickableComponents.length; i++) {
         const component = this.tickableComponents[i];
         component.tick!();
      }
   };

   public update(): void {
      this.applyPhysics();
      this.resolveBorderCollisions();
      this.updateCurrentTile();
      this.updateHitboxes();
      this.updateContainingChunks();

      for (let i = 0; i < this.updateableComponents.length; i++) {
         const component = this.updateableComponents[i];
         component.update!();
      }
   }

   public isInRiver(): boolean {
      if (this.tile.type !== TileType.water) {
         return false;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const dist = distance(this.position.x, this.position.y, steppingStone.positionX, steppingStone.positionY);
            if (dist <= size/2) {
               return false;
            }
         }
      }

      return true;
   }

   private applyPhysics(): void {
      // Apply acceleration
      if (this.acceleration.x !== 0 || this.acceleration.y !== 0) {
         let tileMoveSpeedMultiplier = TILE_MOVE_SPEED_MULTIPLIERS[this.tile.type];
         if (this.tile.type === TileType.water && !this.isInRiver()) {
            tileMoveSpeedMultiplier = 1;
         }

         const friction = TILE_FRICTIONS[this.tile.type];
         
         this.velocity.x += this.acceleration.x * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
         this.velocity.y += this.acceleration.y * friction * tileMoveSpeedMultiplier * Settings.I_TPS;
      }

      // If the game object is in a river, push them in the flow direction of the river
      const moveSpeedIsOverridden = typeof this.overrideTileMoveSpeedMultiplier !== "undefined" && this.overrideTileMoveSpeedMultiplier() !== null;
      if (this.isInRiver() && !moveSpeedIsOverridden) {
         const flowDirection = Board.getRiverFlowDirection(this.tile.x, this.tile.y);
         this.velocity.x += 240 / Settings.TPS * Math.sin(flowDirection);
         this.velocity.y += 240 / Settings.TPS * Math.cos(flowDirection);
      }

      // Apply velocity
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
         const friction = TILE_FRICTIONS[this.tile.type];

         // Apply a friction based on the tile type to simulate air resistance (???)
         this.velocity.x *= 1 - friction * Settings.I_TPS * 2;
         this.velocity.y *= 1 - friction * Settings.I_TPS * 2;

         // Apply a constant friction based on the tile type to simulate ground friction
         const velocityMagnitude = this.velocity.length();
         if (velocityMagnitude > 0) {
            const groundFriction = Math.min(friction, velocityMagnitude);
            this.velocity.x -= groundFriction * this.velocity.x / velocityMagnitude;
            this.velocity.y -= groundFriction * this.velocity.y / velocityMagnitude;
         }
         
         this.position.x += this.velocity.x * Settings.I_TPS;
         this.position.y += this.velocity.y * Settings.I_TPS;
      }

      if (isNaN(this.position.x)) {
         throw new Error("Position was NaN.");
      }
   }

   // @Cleanup: Should this be protected?
   protected resolveBorderCollisions(): void {
      if (this.position.x < 0) {
         this.position.x = 0;
      } else if (this.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
         this.position.x = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
      }
      if (this.position.y < 0) {
         this.position.y = 0;
      } else if (this.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
         this.position.y = Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
      }
   }

   private updateCurrentTile(): void {
      const tileX = Math.floor(this.position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(this.position.y / Settings.TILE_SIZE);
      this.tile = Board.getTile(tileX, tileY);
   }

   /** Recalculates which chunks the game object is contained in */
   private updateContainingChunks(): void {
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
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
            chunk.removeEntity(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this);
            this.chunks.add(chunk);
         }
      }
   }

   public updateRenderPosition(): void {
      this.renderPosition.x = this.position.x + this.velocity.x * frameProgress / Settings.TPS;
      this.renderPosition.y = this.position.y + this.velocity.y * frameProgress / Settings.TPS;

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }
   }

   private updateHitboxes(): void {
      for (const hitbox of this.hitboxes) {
         hitbox.updateFromEntity(this);
         hitbox.updateHitboxBounds(this.rotation);
      }
   }

   public updateFromData(data: EntityData): void {
      this.position.x = data.position[0];
      this.position.y = data.position[1];
      this.velocity.x = data.velocity[0];
      this.velocity.y = data.velocity[1];

      this.updateCurrentTile();

      this.rotation = data.rotation;
      this.ageTicks = data.ageTicks;

      // 
      // Update hitboxes
      // 

      // Remove hitboxes which are no longer exist
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];

         // @Speed
         let localIDExists = false;
         for (let j = 0; j < data.circularHitboxes.length; j++) {
            const hitboxData = data.circularHitboxes[j];
            if (hitboxData.localID === hitbox.localID) {
               localIDExists = true;
               break;
            }
         }
         for (let j = 0; j < data.rectangularHitboxes.length; j++) {
            const hitboxData = data.rectangularHitboxes[j];
            if (hitboxData.localID === hitbox.localID) {
               localIDExists = true;
               break;
            }
         }

         if (!localIDExists) {
            this.hitboxes.splice(i, 1);
            i--;
         }
      }

      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (!hitbox.hasOwnProperty("radius")) {
               continue;
            }
            
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: CircularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as CircularHitbox;
            hitbox.radius = hitboxData.radius;
         } else {
            // Create new hitbox
            hitbox = new CircularHitbox(hitboxData.mass, hitboxData.collisionType as unknown as HitboxCollisionType, hitboxData.localID, hitboxData.radius);
            this.addCircularHitbox(hitbox);
         }

         hitbox.offset.x = hitboxData.offsetX;
         hitbox.offset.y = hitboxData.offsetY;
      }
      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (hitbox.hasOwnProperty("radius")) {
               continue;
            }
            
            if (hitbox.localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: RectangularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as RectangularHitbox;
            hitbox.width = hitboxData.width;
            hitbox.height = hitboxData.height;
         } else {
            // Create new hitbox
            hitbox = new RectangularHitbox(hitboxData.mass, hitboxData.collisionType as unknown as HitboxCollisionType, hitboxData.localID, hitboxData.width, hitboxData.height, hitboxData.rotation);
            this.addRectangularHitbox(hitbox);
         }

         hitbox.offset.x = hitboxData.offsetX;
         hitbox.offset.y = hitboxData.offsetY;
      }

      // Update containing chunks

      // @Speed
      // @Speed
      // @Speed

      const containingChunks = new Set<Chunk>();

      for (const hitbox of this.hitboxes) {
         // Recalculate the game object's containing chunks based on the new hitbox bounds
         const minChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[0] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(hitbox.bounds[1] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[2] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(hitbox.bounds[3] / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
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
            chunk.removeEntity(this);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this);
            this.chunks.add(chunk);
         }
      }

      // @Speed @Cleanup
      const entityComponents = EntityComponents[this.type];
      for (let i = 0; i < data.components.length; i++) {
         const componentType = entityComponents[i];
         if (this.serverComponents.hasOwnProperty(componentType)) {
            const componentData = data.components[i];
            const component = this.getServerComponent(componentType as keyof typeof ServerComponents);
            component.updateFromData(componentData as any);
         }
      }
   }

   public die(): void {
      if (typeof this.onDie !== "undefined") {
         this.onDie();
      }

      // @Cleanup: component shouldn't be typed as any!!
      for (const component of Object.values(this.serverComponents)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
   }

   protected onDie?(): void;

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         for (let i = 0; i < 2; i++) {
            createSlimePoolParticle(this.position.x, this.position.y, 32);
         }
      }

      // a bit @Hacky
      if (Board.entityRecord.hasOwnProperty(hitData.attackerID)) {
         const attacker = Board.entityRecord[hitData.attackerID];
         switch (attacker.type) {
            case EntityType.spikes:
            case EntityType.punjiSticks: {
               playSound("spike-stab.mp3", 0.3, 1, attacker.position.x, attacker.position.y);
               break;
            }
         }
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      // @Cleanup
      for (const component of Object.values(this.serverComponents)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit();
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit();
         }
      }
   }

   public createHealingParticles(amountHealed: number): void {
      // Create healing particles depending on the amount the entity was healed
      let remainingHealing = amountHealed;
      for (let size = 2; size >= 0;) {
         if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
            createHealingParticle(this, size);
            remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
         } else {
            size--;
         }
      }
   }
}

export default Entity;