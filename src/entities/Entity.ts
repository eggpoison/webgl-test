import Chunk from "../Chunk";
import Component from "../components/Component";

abstract class Entity {
   private readonly components = new Map<(abstract new (...args: any[]) => any), Component>();

   public previousChunk?: Chunk;

   constructor(components: Array<Component>) {
      for (const component of components) {
         this.components.set(component.constructor as (new (...args: any[]) => any), component);

         component.setEntity(this);
      }
   }

   public onLoad?(): void;

   public abstract render(): void;

   public loadComponents(): void {
      this.components.forEach(component => {
         if (typeof component.onLoad !== "undefined") component.onLoad();
      });
   }

   public tick(): void {
      this.components.forEach(component => {
         if (typeof component.tick !== "undefined") {
            component.tick();
         }
      });
   }

   public getComponent<C extends Component>(constr: { new(...args: any[]): C }): C | null {
      const component = this.components.get(constr);
      return typeof component !== "undefined" ? (component as C) : null;
   }
}

export default Entity;