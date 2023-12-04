import { RiverSteppingStoneData, WaterRockData } from "webgl-test-shared";
import GameObject from "./GameObject";
import Entity from "./entities/Entity";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   private readonly gameObjects = new Array<GameObject>();
   private readonly entities = new Array<Entity>();

   public readonly waterRocks = new Array<WaterRockData>();
   public readonly riverSteppingStones = new Array<RiverSteppingStoneData>();

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public addGameObject(gameObject: GameObject): void {
      this.gameObjects.push(gameObject);
      
      if (gameObject.hasOwnProperty("statusEffects")) {
         this.entities.push(gameObject as Entity);
      }
   }

   public removeGameObject(gameObject: GameObject): void {
      const idx = this.gameObjects.indexOf(gameObject);
      this.gameObjects.splice(idx, 1);

      if (gameObject.hasOwnProperty("statusEffects")) {
         const entityIdx = this.entities.indexOf(gameObject as Entity);
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