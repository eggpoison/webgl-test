import { RiverSteppingStoneData } from "webgl-test-shared";
import Entity from "./Entity";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   private readonly gameObjects = new Array<Entity>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addGameObject(gameObject: Entity): void {
      this.gameObjects.push(gameObject);
   }

   public removeGameObject(gameObject: Entity): void {
      const idx = this.gameObjects.indexOf(gameObject);
      this.gameObjects.splice(idx, 1);
   }

   public getGameObjects(): Array<Entity> {
      return this.gameObjects;
   }
}

export default Chunk;