import { DoorToggleType, EntityType, ServerComponentType, Settings, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared";
import CircularHitbox from "./hitboxes/CircularHitbox";
import Hitbox from "./hitboxes/Hitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Entity from "./Entity";

interface CollisionPushInfo {
   direction: number;
   amountIn: number;
}

const entityHasHardCollision = (entity: Entity, collidingEntity: Entity): boolean => {
   // Doors have hard collision when closing/closed
   if (entity.type === EntityType.door) {
      const doorComponent = entity.getServerComponent(ServerComponentType.door);
      return doorComponent.toggleType === DoorToggleType.close || doorComponent.openProgress === 0;
   }

   // Tunnels have hard collision outside and soft inside
   if (entity.type === EntityType.tunnel) {
      const projX = Math.sin(entity.rotation + Math.PI / 2);
      const projY = Math.cos(entity.rotation + Math.PI / 2);

      const o = 32 - (8 - 0.05); // @Cleanup
      const minX = entity.position.x - o * projX;
      const minY = entity.position.y - o * projY;
      const maxX = entity.position.x + o * projX;
      const maxY = entity.position.y + o * projY;

      const minProj = minX * projX + minY * projY;
      const maxProj = maxX * projX + maxY * projY;

      const centerProj = collidingEntity.position.x * projX + collidingEntity.position.y * projY;

      return centerProj <= minProj || centerProj >= maxProj;
   }
   
   return entity.type === EntityType.wall || entity.type === EntityType.embrasure;
}

const getCircleCircleCollisionPushInfo = (pushedHitbox: CircularHitbox, pushingHitbox: CircularHitbox): CollisionPushInfo => {
   const dist = pushedHitbox.position.calculateDistanceBetween(pushingHitbox.position);
   
   return {
      amountIn: pushedHitbox.radius + pushingHitbox.radius - dist,
      direction: pushingHitbox.position.calculateAngleBetween(pushedHitbox.position)
   };
}

const getCircleRectCollisionPushInfo = (pushedHitbox: CircularHitbox, pushingHitbox: RectangularHitbox): CollisionPushInfo => {
   const rectRotation = pushingHitbox.rotation + pushingHitbox.externalRotation;
   
   const circlePosX = rotateXAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, pushingHitbox.position.x, pushingHitbox.position.y, -rectRotation);
   const circlePosY = rotateYAroundPoint(pushedHitbox.position.x, pushedHitbox.position.y, pushingHitbox.position.x, pushingHitbox.position.y, -rectRotation);
   
   const distanceX = circlePosX - pushingHitbox.position.x;
   const distanceY = circlePosY - pushingHitbox.position.y;

   const absDistanceX = Math.abs(distanceX);
   const absDistanceY = Math.abs(distanceY);

   // Top and bottom collisions
   if (absDistanceX <= (pushingHitbox.width/2)) {
      return {
         amountIn: pushingHitbox.height/2 + pushedHitbox.radius - absDistanceY,
         direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
      };
   }

   // Left and right collisions
   if (absDistanceY <= (pushingHitbox.height/2)) {
      return {
         amountIn: pushingHitbox.width/2 + pushedHitbox.radius - absDistanceX,
         direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
      };
   }

   const cornerDistanceSquared = Math.pow(absDistanceX - pushingHitbox.width/2, 2) + Math.pow(absDistanceY - pushingHitbox.height/2, 2);
   if (cornerDistanceSquared <= pushedHitbox.radius * pushedHitbox.radius) {
      // @Cleanup: Whole lot of copy and paste
      const amountInX = absDistanceX - pushingHitbox.width/2 - pushedHitbox.radius;
      const amountInY = absDistanceY - pushingHitbox.height/2 - pushedHitbox.radius;
      if (Math.abs(amountInY) < Math.abs(amountInX)) {
         const closestRectBorderY = circlePosY < pushingHitbox.position.y ? pushingHitbox.position.y - pushingHitbox.height/2 : pushingHitbox.position.y + pushingHitbox.height/2;
         const closestRectBorderX = circlePosX < pushingHitbox.position.x ? pushingHitbox.position.x - pushingHitbox.width/2 : pushingHitbox.position.x + pushingHitbox.width/2;
         const xDistanceFromRectBorder = Math.abs(closestRectBorderX - circlePosX);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - xDistanceFromRectBorder * xDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderY - (circlePosY - len * Math.sign(distanceY))),
            direction: rectRotation + Math.PI + (distanceY > 0 ? Math.PI : 0)
         };
      } else {
         const closestRectBorderX = circlePosX < pushingHitbox.position.x ? pushingHitbox.position.x - pushingHitbox.width/2 : pushingHitbox.position.x + pushingHitbox.width/2;
         
         const closestRectBorderY = circlePosY < pushingHitbox.position.y ? pushingHitbox.position.y - pushingHitbox.height/2 : pushingHitbox.position.y + pushingHitbox.height/2;
         const yDistanceFromRectBorder = Math.abs(closestRectBorderY - circlePosY);
         const len = Math.sqrt(pushedHitbox.radius * pushedHitbox.radius - yDistanceFromRectBorder * yDistanceFromRectBorder);

         return {
            amountIn: Math.abs(closestRectBorderX - (circlePosX - len * Math.sign(distanceX))),
            direction: rectRotation + (distanceX > 0 ? Math.PI/2 : -Math.PI/2)
         };
      }
   }

   throw new Error();
}

const getCollisionPushInfo = (pushedHitbox: Hitbox, pushingHitbox: Hitbox): CollisionPushInfo => {
   if (pushedHitbox.hasOwnProperty("radius") && pushingHitbox.hasOwnProperty("radius")) {
      // Circle + Circle
      return getCircleCircleCollisionPushInfo(pushedHitbox as CircularHitbox, pushingHitbox as CircularHitbox);
   } else if (pushedHitbox.hasOwnProperty("radius") && !pushingHitbox.hasOwnProperty("radius")) {
      // Circle + Rectangle
      return getCircleRectCollisionPushInfo(pushedHitbox as CircularHitbox, pushingHitbox as RectangularHitbox);
   } else if (!pushedHitbox.hasOwnProperty("radius") && pushingHitbox.hasOwnProperty("radius")) {
      // Rectangle + Circle
      const pushInfo = getCircleRectCollisionPushInfo(pushingHitbox as CircularHitbox, pushedHitbox as RectangularHitbox);
      pushInfo.direction += Math.PI;
      return pushInfo;
   } else {
      // Rectangle + Rectangle
      // @Incomplete
      throw new Error();
   }
}

const resolveHardCollision = (entity: Entity, pushInfo: CollisionPushInfo): void => {
   // Transform the entity out of the hitbox
   entity.position.x += pushInfo.amountIn * Math.sin(pushInfo.direction);
   entity.position.y += pushInfo.amountIn * Math.cos(pushInfo.direction);

   // Kill all the velocity going into the hitbox
   const bx = Math.sin(pushInfo.direction + Math.PI/2);
   const by = Math.cos(pushInfo.direction + Math.PI/2);
   const projectionCoeff = entity.velocity.x * bx + entity.velocity.y * by;
   entity.velocity.x = bx * projectionCoeff;
   entity.velocity.y = by * projectionCoeff;
}

const resolveSoftCollision = (entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox, pushInfo: CollisionPushInfo): void => {
   // Force gets greater the further into each other the entities are
   const distMultiplier = Math.pow(pushInfo.amountIn, 1.1);
   const pushForce = Settings.ENTITY_PUSH_FORCE * Settings.I_TPS * distMultiplier * pushingHitbox.mass / pushedHitbox.mass;
   
   entity.velocity.x += pushForce * Math.sin(pushInfo.direction);
   entity.velocity.y += pushForce * Math.cos(pushInfo.direction);
}

export function collide(entity: Entity, pushingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   const pushInfo = getCollisionPushInfo(pushedHitbox, pushingHitbox);
   if (entityHasHardCollision(pushingEntity, entity)) {
      resolveHardCollision(entity, pushInfo);
   } else {
      resolveSoftCollision(entity, pushedHitbox, pushingHitbox, pushInfo);
   }
}