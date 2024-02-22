import { RiverSteppingStoneData } from "webgl-test-shared";
import GameObject from "./GameObject";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   private readonly gameObjects = new Array<GameObject>();

   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addGameObject(gameObject: GameObject): void {
      this.gameObjects.push(gameObject);
   }

   public removeGameObject(gameObject: GameObject): void {
      const idx = this.gameObjects.indexOf(gameObject);
      this.gameObjects.splice(idx, 1);
   }

   public getGameObjects(): Array<GameObject> {
      return this.gameObjects;
   }
}

export default Chunk;