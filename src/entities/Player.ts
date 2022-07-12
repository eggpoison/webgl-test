import Client from "../client/Client";
import HitboxComponent from "../entity-components/HitboxComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { keyIsPressed } from "../keyboard";
import { Point } from "../utils";
import { drawCircle } from "../webgl";
import Entity from "./Entity";

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

   public readonly name: string;

   private previousMovementHash: number = 0;

   public static readonly RADIUS = 32;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   constructor(position: Point, name: string, isCurrentPlayer: boolean) {
      super([
         new TransformComponent(position),
         new HitboxComponent({
            type: "circular",
            radius: Player.RADIUS
         })
      ]);

      this.name = name;

      if (isCurrentPlayer) {
         if (typeof Player.instance !== "undefined") {
            throw new Error("Tried to create more than one current player!");
         }

         Player.instance = this;
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
      const wIsPressed = keyIsPressed("w");
      const aIsPressed = keyIsPressed("a");
      const sIsPressed = keyIsPressed("s");
      const dIsPressed = keyIsPressed("d");

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

      const transformComponent = this.getComponent(TransformComponent)!;
      if (xVel === 0 && yVel === 0) {
         transformComponent.acceleration = null;
         transformComponent.isMoving = false;
      } else {
         transformComponent.terminalVelocity = Player.TERMINAL_VELOCITY;
         const velocity = new Point(xVel, yVel).convertToVector();
         transformComponent.acceleration = velocity;
         transformComponent.isMoving = true;
      }
   }

   public render(): void {
      const position = this.getComponent(TransformComponent)!.position;
      drawCircle(position.x, position.y, Player.RADIUS, [255, 0, 0, 1]);
   }
}

export default Player;