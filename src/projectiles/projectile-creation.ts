import { Point, ProjectileType } from "webgl-test-shared";
import Projectile from "./Projectile";
import IceShardsProjectile from "./IceShardsProjectile";
import WoodenArrowProjectile from "./WoodenArrowProjectile";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

type ProjectileClassType = new (position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number) => Projectile;

const PROJECTILE_CLASS_RECORD: Record<ProjectileType, () => ProjectileClassType> = {
   [ProjectileType.iceShards]: () => IceShardsProjectile,
   [ProjectileType.woodenArrow]: () => WoodenArrowProjectile
};

function createProjectile(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, projectileType: ProjectileType): Projectile {
   const projectileClass = PROJECTILE_CLASS_RECORD[projectileType]();
   return new projectileClass(position, hitboxes, id);
}
 
export default createProjectile;