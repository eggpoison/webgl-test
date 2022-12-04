import { AttackPacket, HitData, Point, SETTINGS, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import Client from "../client/Client";
import { updateHealthBar } from "../components/game/HealthBar";
import Game from "../Game";
import { keyIsPressed } from "../keyboard-input";
import CircleRenderPart from "../render-parts/CircleRenderPart";
import RenderPart, { RenderPartInfo } from "../render-parts/RenderPart";
import Entity from "./Entity";

class Player extends Entity {
   public static instance: Player | null = null;

   /** Health of the instance player */
   public static health = 20;

   public readonly displayName: string;

   /** How far away from the entity the attack is done */
   private static readonly ATTACK_OFFSET = 80;
   /** Max distance from the attack position that the attack will be registered from */
   private static readonly ATTACK_TEST_RADIUS = 48;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   private static readonly RENDER_PARTS: ReadonlyArray<RenderPart<RenderPartInfo>> = [
      new CircleRenderPart({
         type: "circle",
         radius: 32,
         rgba: [255, 0, 0, 1]
      })
   ];

   constructor(position: Point, id: number, secondsSinceLastHit: number | null, displayName: string) {
      super(position, id, "player", secondsSinceLastHit, Player.RENDER_PARTS);

      this.displayName = displayName;

      if (Player.instance === null) {
         Player.instance = this;

         Camera.position = this.position;
      }
   }

   public static attack(): void {
      if (typeof this.instance === "undefined") return;

      const targets = this.getAttackTargets();
      if (targets.length > 0) {
         // Send attack packet
         const attackPacket: AttackPacket = {
            targetEntities: targets.map(target => target.id),
            heldItem: null
         }
         Client.sendAttackPacket(attackPacket);
      }
   }

   private static getAttackTargets(): ReadonlyArray<Entity> {
      const offset = new Vector(this.ATTACK_OFFSET, Player.instance!.rotation);
      const attackPosition = Player.instance!.position.add(offset.convertToPoint());

      const minChunkX = Math.max(Math.min(Math.floor((attackPosition.x - this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((attackPosition.x + this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((attackPosition.y - this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((attackPosition.y + this.ATTACK_TEST_RADIUS) / SETTINGS.CHUNK_SIZE / SETTINGS.TILE_SIZE), SETTINGS.BOARD_SIZE - 1), 0);

      // Find all attacked entities
      const attackedEntities = new Array<Entity>();
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Game.board.getChunk(chunkX, chunkY);

            for (const entity of chunk.getEntities()) {
               // Skip entities that are already in the array
               if (attackedEntities.includes(entity)) continue;

               const dist = Game.board.calculateDistanceBetweenPointAndEntity(attackPosition, entity);
               if (dist <= Player.ATTACK_TEST_RADIUS) attackedEntities.push(entity);
            }
         }
      }
      
      // Don't attack yourself
      while (true) {
         const idx = attackedEntities.indexOf(this.instance!);
         if (idx !== -1) {
            attackedEntities.splice(idx, 1);
         } else {
            break;
         }
      }

      return attackedEntities;
   }

   public tick(): void {
      if (this === Player.instance) {
         this.detectMovement();
      }
   }

   private detectMovement(): void {
      // Get pressed keys
      const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
      const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
      const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
      const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

      this.updateMovement(wIsPressed, aIsPressed, sIsPressed, dIsPressed);
   }

   private updateMovement(wIsPressed: boolean, aIsPressed: boolean, sIsPressed: boolean, dIsPressed: boolean): void {
      const hash = (wIsPressed ? 1 : 0) + (aIsPressed ? 2 : 0) + (sIsPressed ? 4 : 0) + (dIsPressed ? 8 : 0)
      
      // Update rotation
      let rotation!: number | null;
      switch (hash) {
         case 0:  rotation = null;          break;
         case 1:  rotation = Math.PI / 2;   break;
         case 2:  rotation = Math.PI;       break;
         case 3:  rotation = Math.PI * 3/4; break;
         case 4:  rotation = Math.PI * 3/2; break;
         case 5:  rotation = null;          break;
         case 6:  rotation = Math.PI * 5/4; break;
         case 7:  rotation = Math.PI;       break;
         case 8:  rotation = 0;             break;
         case 9:  rotation = Math.PI / 4;   break;
         case 10: rotation = null;          break;
         case 11: rotation = Math.PI / 2;   break;
         case 12: rotation = Math.PI * 7/4; break;
         case 13: rotation = 0;             break;
         case 14: rotation = Math.PI * 3/2; break;
         case 15: rotation = null;          break;
      }

      if (rotation !== null) {
         this.rotation = rotation;
      } else {
          this.acceleration = null;
         this.isMoving = false;
         return;
      }

      this.acceleration = new Vector(Player.ACCELERATION, this.rotation);
      this.terminalVelocity = Player.TERMINAL_VELOCITY;
      this.isMoving = true;
   }

   /** Registers a server-side hit for the client */
   public static registerHit(hitData: HitData) {
      if (this.instance === null) return;

      this.health -= hitData.damage;
      
      updateHealthBar(this.health);

      // Add force
      if (hitData.angleFromDamageSource !== null) {
         if (this.instance.velocity !== null) {
            this.instance.velocity.magnitude *= 0.5;
         }
         this.instance.addVelocity(200, hitData.angleFromDamageSource);
      }
   }
}

export default Player;