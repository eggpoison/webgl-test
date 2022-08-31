import { Point, Vector } from "webgl-test-shared";
import Camera from "../Camera";
import { keyIsPressed } from "../keyboard";
import Entity, { RenderPart, sortRenderParts } from "./Entity";

class Player extends Entity {
   public static instance: Player;

   public readonly displayName: string;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   private static readonly RENDER_PARTS: ReadonlyArray<RenderPart> = sortRenderParts([
      {
         type: "circle",
         radius: 1,
         rgba: [255, 0, 0, 1],
         zIndex: 1
      },
      {
         type: "image",
         width: 64,
         height: 64,
         textureSrc: "boulder.png",
         zIndex: 2
      }
   ]);

   protected readonly renderParts: ReadonlyArray<RenderPart> = Player.RENDER_PARTS;

   constructor(id: number, position: Point, velocity: Vector | null, acceleration: Vector | null, terminalVelocity: number, rotation: number, displayName: string) {
      super(id, "player", position, velocity, acceleration, terminalVelocity, rotation);

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
      let xAcceleration = 0;
      let yAcceleration = 0;

      if (wIsPressed) {
         yAcceleration += Player.ACCELERATION;
      }
      if (aIsPressed) {
         xAcceleration -= Player.ACCELERATION;
      }
      if (sIsPressed) {
         yAcceleration -= Player.ACCELERATION;
      }
      if (dIsPressed) {
         xAcceleration += Player.ACCELERATION;
      }

      if (xAcceleration === 0 && yAcceleration === 0) {
         this.acceleration = null;
         this.isMoving = false;
      } else {
         this.terminalVelocity = Player.TERMINAL_VELOCITY;
         const acceleration = new Point(xAcceleration, yAcceleration).convertToVector();
         this.acceleration = acceleration;
         this.isMoving = true;
      }
   }
}

export default Player;