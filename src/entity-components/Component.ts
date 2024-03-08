import GameObject from "../GameObject";

abstract class Component {
   protected readonly entity: GameObject;

   constructor(entity: GameObject) {
      this.entity = entity;
   }

   public tick?(): void;
   public update?(): void;

   public onHit?(): void;
   public onDie?(): void;
   public onRemove?(): void;
}

export default Component;