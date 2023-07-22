import { HitboxType, Point, ProjectileType } from "webgl-test-shared";
import Projectile from "./Projectile";
import IceShardsProjectile from "./IceShardsProjectile";
import Hitbox from "../hitboxes/Hitbox";

type ProjectileClassType = new (position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) => Projectile;

const PROJECTILE_CLASS_RECORD: Record<ProjectileType, () => ProjectileClassType> = {
   ice_shards: () => IceShardsProjectile
};

function createProjectile(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, projectileType: ProjectileType): Projectile {
   const projectileClass = PROJECTILE_CLASS_RECORD[projectileType]();
   return new projectileClass(position, hitboxes, id);
}

export default createProjectile;