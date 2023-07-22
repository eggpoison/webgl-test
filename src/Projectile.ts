import { HitboxType, Point, ProjectileType } from "webgl-test-shared";
import GameObject from "./GameObject";
import Hitbox from "./hitboxes/Hitbox";
import Game from "./Game";
import RenderPart from "./render-parts/RenderPart";

class Projectile extends GameObject {
   private static readonly PROJECTILE_TEXTURE_SOURCES: Record<ProjectileType, string> = {
      ice_shards: "items/frostcicle.png"
   };
   
   public readonly type: ProjectileType;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, type: ProjectileType) {
      super(position, hitboxes, id);

      this.type = type;
      
      Game.board.projectiles[this.id] = this;

      this.attachRenderPart(
         new RenderPart({
            width: 32,
            height: 32,
            textureSource: Projectile.PROJECTILE_TEXTURE_SOURCES[type],
            zIndex: 0
         }, this)
      );
      // console.log("made projectile!");
      // console.log(position);
   }

   public remove(): void {
      delete Game.board.projectiles[this.id];
   }
}

export default Projectile;