import { Point, Vector } from "webgl-test-shared";
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

   private static readonly RENDER_PARTS: ReadonlyArray<RenderPart> = [
      {
         type: "circle",
         radius: Player.RADIUS,
         rgba: [255, 0, 0, 1]
      }
   ]

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, displayName: string) {
      super(id, position, velocity, acceleration, terminalVelocity, Player.RENDER_PARTS);

      this.displayName = displayName;

      if (typeof Player.instance === "undefined") {
         Player.instance = this;

         Camera.position = this.position;
      }
   }

   public tick(): void {
      super.tick();

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
}

export default Player;