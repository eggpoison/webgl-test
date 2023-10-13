import { Point, ProjectileType } from "webgl-test-shared";
import Projectile from "./Projectile";
import IceShardsProjectile from "./IceShardsProjectile";
import WoodenArrowProjectile from "./WoodenArrowProjectile";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import RockSpikeProjectile from "./RockSpikeProjectile";

type ProjectileClassType = new (position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, data: any) => Projectile;

const PROJECTILE_CLASS_RECORD: Record<ProjectileType, () => ProjectileClassType> = {
   [ProjectileType.iceShards]: () => IceShardsProjectile,
   [ProjectileType.woodenArrow]: () => WoodenArrowProjectile,
   [ProjectileType.rockSpike]: () => RockSpikeProjectile
};

function createProjectile(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, renderDepth: number, data: any, projectileType: ProjectileType): Projectile {
   const projectileClass = PROJECTILE_CLASS_RECORD[projectileType]();
   return new projectileClass(position, hitboxes, id, renderDepth, data);
}
 
export default createProjectile;