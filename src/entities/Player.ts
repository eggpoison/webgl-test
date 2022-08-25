import { Point, SETTINGS, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import Client from "../client/Client";
import { keyIsPressed } from "../keyboard";
import Entity, { RenderPart } from "./Entity";

const generateMovementHash = (wIsPressed: boolean, aIsPressed: boolean, sIsPressed: boolean, dIsPressed: boolean): number => {
   let movementHash = 0;

   if (wIsPressed) movementHash |= 1;
   if (aIsPressed) movementHash |= 2;
   if (sIsPressed) movementHash |= 4;
   if (dIsPressed) movementHash |= 8;

   return movementHash;
}

const parseMovementHash = (movementHash: number): [boolean, boolean, boolean, boolean] => {
   const wIsPressed = (movementHash & 1) > 0;
   const aIsPressed = (movementHash & 2) > 0;
   const sIsPressed = (movementHash & 4) > 0;
   const dIsPressed = (movementHash & 8) > 0;

   return [wIsPressed, aIsPressed, sIsPressed, dIsPressed];
}

class Player extends Entity {
   public static instance: Player;

   public readonly displayName: string;

   private previousMovementHash: number = 0;

   public static readonly RADIUS = 32;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   protected readonly renderParts: ReadonlyArray<RenderPart> = [
      {
         type: "circle",
         radius: Player.RADIUS,
         rgba: [255, 0, 0, 1]
      }
   ]

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, displayName: string) {
      super(id, position, velocity, acceleration, terminalVelocity);

      this.displayName = displayName;

      if (typeof Player.instance === "undefined") {
         Player.instance = this;

         Camera.position = this.position;
      }
   }

   public tick(): void {
      if (this === Player.instance) {
         this.detectMovement();
      }

      super.tick();

      this.resolveWallCollisions();
   }

   private detectMovement(): void {
      // Get pressed keys
      const wIsPressed = keyIsPressed("w") || keyIsPressed("W") || keyIsPressed("ArrowUp");
      const aIsPressed = keyIsPressed("a") || keyIsPressed("A") || keyIsPressed("ArrowLeft");
      const sIsPressed = keyIsPressed("s") || keyIsPressed("S") || keyIsPressed("ArrowDown");
      const dIsPressed = keyIsPressed("d") || keyIsPressed("D") || keyIsPressed("ArrowRight");

      const movementHash = generateMovementHash(wIsPressed, aIsPressed, sIsPressed, dIsPressed);

      if (movementHash !== this.previousMovementHash) {
         // Send the movement hash to the server
         Client.sendMovementPacket(movementHash);
         this.updateMovementFromHash(movementHash);
      }

      this.previousMovementHash = movementHash;
   }

   public receiveMovementHash(movementHash: number): void {
      this.updateMovementFromHash(movementHash);
   }

   private updateMovementFromHash(movementHash: number): void {
      const [wIsPressed, aIsPressed, sIsPressed, dIsPressed] = parseMovementHash(movementHash);

      let xVel = 0;
      let yVel = 0;

      if (wIsPressed) {
         yVel += Player.ACCELERATION;
      }
      if (aIsPressed) {
         xVel -= Player.ACCELERATION;
      }
      if (sIsPressed) {
         yVel -= Player.ACCELERATION;
      }
      if (dIsPressed) {
         xVel += Player.ACCELERATION;
      }

      if (xVel === 0 && yVel === 0) {
         this.acceleration = null;
         this.isMoving = false;
      } else {
         this.terminalVelocity = Player.TERMINAL_VELOCITY;
         const velocity = new Point(xVel, yVel).convertToVector();
         this.acceleration = velocity;
         this.isMoving = true;
      }
   }

   private stopXVelocity(): void {
      if (this.velocity !== null) {
         const pointVelocity = this.velocity.convertToPoint();
         pointVelocity.x = 0;
         this.velocity = pointVelocity.convertToVector();
      }
   }

   private stopYVelocity(): void {
      if (this.velocity !== null) {
         // Stop y velocity
         const pointVelocity = this.velocity.convertToPoint();
         pointVelocity.y = 0;
         this.velocity = pointVelocity.convertToVector();
      }
   }
   
   private resolveWallCollisions(): void {
      const boardUnits = SETTINGS.DIMENSIONS * SETTINGS.TILE_SIZE;

      // Left wall
      if (this.position.x - Player.RADIUS < 0) {
         this.stopXVelocity();
         this.position.x = Player.RADIUS;
      // Right wall
      } else if (this.position.x + Player.RADIUS > boardUnits) {
         this.position.x = boardUnits - Player.RADIUS;
         this.stopXVelocity();
      }

      // Bottom wall
      if (this.position.y - Player.RADIUS < 0) {
         this.position.y = Player.RADIUS;
         this.stopYVelocity();
      // Top wall
      } else if (this.position.y + Player.RADIUS > boardUnits) {
         this.position.y = boardUnits - Player.RADIUS;
         this.stopYVelocity();
      }
   }
}

export default Player;