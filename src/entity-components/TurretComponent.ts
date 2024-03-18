import { BallistaAmmoType, EntityType, ItemType, ServerComponentType, TurretComponentData, lerp } from "webgl-test-shared";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import { playSound } from "../sound";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

type TurretType = EntityType.slingTurret | EntityType.ballista;

const NUM_SLING_TURRET_CHARGE_TEXTURES = 5;
const NUM_BALLISTA_CHARGE_TEXTURES = 11;

interface AmmoRenderInfo {
   readonly projectileTextureSource: string;
   readonly drawOffset: number;
}

const AMMO_RENDER_INFO_RECORD: Record<BallistaAmmoType, AmmoRenderInfo> = {
   [ItemType.wood]: {
      projectileTextureSource: "projectiles/wooden-bolt.png",
      drawOffset: 0
   },
   [ItemType.rock]: {
      projectileTextureSource: "projectiles/ballista-rock.png",
      drawOffset: -20
   },
   [ItemType.frostcicle]: {
      projectileTextureSource: "projectiles/ballista-frostcicle.png",
      drawOffset: -10
   },
   [ItemType.slimeball]: {
      projectileTextureSource: "projectiles/ballista-slimeball.png",
      drawOffset: -20
   }
};

const getSlingTurretChargeTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_SLING_TURRET_CHARGE_TEXTURES);
   if (textureIdx >= NUM_SLING_TURRET_CHARGE_TEXTURES) {
      textureIdx = NUM_SLING_TURRET_CHARGE_TEXTURES - 1;
   }

   if (textureIdx === 0) {
      return "entities/sling-turret/sling-turret-sling.png";
   }
   return "entities/sling-turret/sling-charge-" + textureIdx + ".png";
}

const getBallistaCrossbarTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_BALLISTA_CHARGE_TEXTURES);
   if (textureIdx >= NUM_BALLISTA_CHARGE_TEXTURES) {
      textureIdx = NUM_BALLISTA_CHARGE_TEXTURES - 1;
   }
   return "entities/ballista/crossbow-" + (textureIdx + 1) + ".png";
}

const getChargeTextureSource = (entityType: TurretType, chargeProgress: number): string => {
   switch (entityType) {
      case EntityType.slingTurret: return getSlingTurretChargeTextureSource(chargeProgress);
      case EntityType.ballista: return getBallistaCrossbarTextureSource(chargeProgress);
   }
}

const getProjectilePullbackAmount = (entity: Entity, chargeProgress: number): number => {
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         return lerp(0, -21, chargeProgress);
      }
      case EntityType.ballista: {
         const turretComponent = entity.getServerComponent(ServerComponentType.ammoBox);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[turretComponent.ammoType!];
         return lerp(48, 0, chargeProgress) + ammoRenderInfo.drawOffset;
      }
   }
}

const playFireSound = (entity: Entity): void => {
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         playSound("sling-turret-fire.mp3", 0.2, 1, entity.position.x, entity.position.y);
         break;
      }
      case EntityType.ballista: {
         playSound("sling-turret-fire.mp3", 0.25, 0.7, entity.position.x, entity.position.y);
         break;
      }
   }
}

const getProjectileTextureSource = (entity: Entity): string => {
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         return "projectiles/sling-rock.png";
      }
      case EntityType.ballista: {
         const turretComponent = entity.getServerComponent(ServerComponentType.ammoBox);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[turretComponent.ammoType!];
         return ammoRenderInfo.projectileTextureSource;
      }
   }
}

const getProjectileZIndex = (entityType: TurretType): number => {
   switch (entityType) {
      case EntityType.slingTurret: return 1.5;
      case EntityType.ballista: return 4;
   }
}

export class TurretComponent extends ServerComponent<ServerComponentType.turret> {
   /** The render part which changes texture as the turret charges */
   private readonly aimingRenderPart: RenderPart;
   /** The render part which pivots as the turret aims */
   private readonly pivotingRenderPart: RenderPart;
   private readonly gearRenderParts: ReadonlyArray<RenderPart>;
   private projectileRenderPart: RenderPart | null = null;
   
   // @Cleanup: Do we need to store this?
   private chargeProgress: number;
   
   constructor(entity: Entity, data: TurretComponentData, aimingRenderPart: RenderPart, pivotingRenderPart: RenderPart, gearRenderParts: ReadonlyArray<RenderPart>) {
      super(entity);

      this.chargeProgress = data.chargeProgress;

      this.aimingRenderPart = aimingRenderPart;
      this.pivotingRenderPart = pivotingRenderPart;
      this.gearRenderParts = gearRenderParts;

      this.updateAimDirection(data.aimDirection, data.chargeProgress);
   }

   private updateAimDirection(aimDirection: number, chargeProgress: number): void {
      this.pivotingRenderPart.rotation = aimDirection;

      for (let i = 0; i < this.gearRenderParts.length; i++) {
         const gearRenderPart = this.gearRenderParts[i];
         gearRenderPart.rotation = lerp(0, Math.PI * 2, chargeProgress) * (i === 0 ? 1 : -1);
      }
   }

   private updateProjectileRenderPart(aimDirection: number, chargeProgress: number, reloadProgress: number): void {
      // If the ballista has no ammo, then don't show the render part
      // @Speed: Would be easier on render part rendering if we remove the render part instead of setting its opacity to 0
      if (this.entity.type === EntityType.ballista) {
         const ammoBoxComponent = this.entity.getServerComponent(ServerComponentType.ammoBox);

         if (ammoBoxComponent.ammoType === null) {
            if (this.projectileRenderPart !== null) {
               this.entity.removeRenderPart(this.projectileRenderPart);
               this.projectileRenderPart = null;
            }
            return;
         } else if (reloadProgress === 0 && chargeProgress === 0) {
            // Update rotation for projectiles which have a random rotation each load
            if (ammoBoxComponent.ammoType === ItemType.rock || ammoBoxComponent.ammoType === ItemType.slimeball) {
               this.projectileRenderPart!.rotation = 2 * Math.PI * Math.random();
            } else {
               this.projectileRenderPart!.rotation = 0;
            }
         }
      }

      if (chargeProgress > 0 || reloadProgress > 0) {
         const textureSource = getProjectileTextureSource(this.entity);
         if (this.projectileRenderPart === null) {
            this.projectileRenderPart = new RenderPart(
               this.pivotingRenderPart,
               getTextureArrayIndex(textureSource),
               getProjectileZIndex(this.entity.type as TurretType),
               0
            );
            this.entity.attachRenderPart(this.projectileRenderPart);
         } else {
            this.projectileRenderPart.switchTextureSource(textureSource);
         }
      
         this.projectileRenderPart.offset.y = getProjectilePullbackAmount(this.entity, chargeProgress);

         if (reloadProgress > 0) {
            this.projectileRenderPart.opacity = reloadProgress;
         } else {
            this.projectileRenderPart.opacity = 1;
         }
      } else if (this.projectileRenderPart !== null) {
         this.entity.removeRenderPart(this.projectileRenderPart);
         this.projectileRenderPart = null;
      }
   }
   
   public updateFromData(data: TurretComponentData): void {
      const aimDirection = data.aimDirection;
      const chargeProgress = data.chargeProgress;
      const reloadProgress = data.reloadProgress;
      
      if (chargeProgress < this.chargeProgress) {
         playFireSound(this.entity);
      }
      this.chargeProgress = chargeProgress;

      this.aimingRenderPart.switchTextureSource(getChargeTextureSource(this.entity.type as TurretType, chargeProgress));
      
      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(aimDirection, chargeProgress, reloadProgress);
   }
}