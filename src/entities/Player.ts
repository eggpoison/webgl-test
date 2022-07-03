import HitboxComponent from "../components/HitboxComponent";
import TransformComponent from "../components/TransformComponent";
import { keyIsPressed } from "../keyboard";
import { Point } from "../utils";
import { drawCircle } from "../webgl";
import Entity from "./Entity";

class Player extends Entity {
   public static instance: Player;

   private static readonly RADIUS = 32;

   private static readonly ACCELERATION = 1000;
   private static readonly TERMINAL_VELOCITY = 300;

   constructor(position: Point) {
      // Ensure that only one player is created
      if (typeof Player.instance !== "undefined") {
         throw new Error("Tried to create a player when one already existed")
      }

      super([
         new TransformComponent(position),
         new HitboxComponent({
            type: "circular",
            radius: Player.RADIUS
         })
      ]);

      Player.instance = this;
   }

   public tick(): void {
      super.tick();

      this.updateMovement();
   }

   private updateMovement(): void {
      let xVel = 0;
      let yVel = 0;

      if (keyIsPressed("w")) {
         yVel += Player.ACCELERATION;
      }
      if (keyIsPressed("a")) {
         xVel -= Player.ACCELERATION;
      }
      if (keyIsPressed("s")) {
         yVel -= Player.ACCELERATION;
      }
      if (keyIsPressed("d")) {
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