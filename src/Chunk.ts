import { RiverSteppingStoneData } from "webgl-test-shared";
import GameObject from "./GameObject";
import Entity from "./entities/Entity";

class Chunk {
   public readonly x: number;
   public readonly y: number;

   private readonly gameObjects = new Array<GameObject>();
   private readonly entities = new Array<Entity>();

   // @Cleanup: This is only used in creating the river info in render chunks, shouldn't
   // be stored here for the entire lifetime of the program if only used at start.
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