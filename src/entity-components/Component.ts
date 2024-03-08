import Entity from "../Entity";

abstract class Component {
   protected readonly entity: Entity;

   constructor(entity: Entity) {
      this.entity = entity;
   }

   public tick?(): void;
   public update?(): void;

   public onHit?(): void;
   public onDie?(): void;
   public onRemove?(): void;
}

export default Component;