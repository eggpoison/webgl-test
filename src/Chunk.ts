import GameObject from "./GameObject";
import Entity from "./entities/Entity";

class Chunk {
   private readonly gameObjects = new Array<GameObject>();
   private readonly entities = new Array<Entity>();

   public readonly x: number;
   public readonly y: number;

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

   public addEntity(entity: Entity): void {
      this.gameObjects.push(entity);
   }

   public removeEntity(entity: Entity): void {
      const idx = this.gameObjects.indexOf(entity);
      this.gameObjects.splice(idx, 1);
   }

   public getEntities(): Array<Entity> {
      return this.entities;
   }
}

export default Chunk;