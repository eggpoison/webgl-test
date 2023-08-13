import { HitboxType, Point, ProjectileType } from "webgl-test-shared";
import Projectile from "./Projectile";
import IceShardsProjectile from "./IceShardsProjectile";
import Hitbox from "../hitboxes/Hitbox";
import WoodenArrowProjectile from "./WoodenArrowProjectile";

type ProjectileClassType = new (position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number) => Projectile;

const PROJECTILE_CLASS_RECORD: Record<ProjectileType, () => ProjectileClassType> = {
   [ProjectileType.iceShards]: () => IceShardsProjectile,
   [ProjectileType.woodenArrow]: () => WoodenArrowProjectile
};

function createProjectile(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, projectileType: ProjectileType): Projectile {
   const projectileClass = PROJECTILE_CLASS_RECORD[projectileType]();
   return new projectileClass(position, hitboxes, id);
}

export default createProjectile;