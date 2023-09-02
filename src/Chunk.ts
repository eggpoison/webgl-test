import { WaterRockData } from "webgl-test-shared";
import GameObject from "./GameObject";
import Entity from "./entities/Entity";
import { RiverSteppingStone } from "./Board";

class Chunk {
   private readonly gameObjects = new Array<GameObject>();
   private readonly entities = new Array<Entity>();

   public readonly waterRocks = new Array<WaterRockData>();
   public readonly riverSteppingStones = new Array<RiverSteppingStone>();

   public readonly x: number;
   public readonly y: number;

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addGameObject(gameObject: GameObject): void {
      this.gameObjects.push(gameObject);
      
      if (gameObject instanceof Entity) {
         this.entities.push(gameObject);
      }
   }

   public removeGameObject(gameObject: GameObject): void {
      const idx = this.gameObjects.indexOf(gameObject);
      this.gameObjects.splice(idx, 1);

      if (gameObject instanceof Entity) {
         const entityIdx = this.entities.indexOf(gameObject);
         this.entities.splice(entityIdx, 1);
      }
   }

   public getGameObjects(): Array<GameObject> {
      return this.gameObjects;
   }

   public getEntities(): Array<Entity> {
      return this.entities;
   }
}

export default Chunk;