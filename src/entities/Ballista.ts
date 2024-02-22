import { BallistaAmmoType, EntityData, EntityType, Inventory, InventoryData, ItemType, Point, lerp, randItem } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS, playSound } from "../sound";
import Board from "../Board";

export const BALLISTA_GEAR_X = -12;
export const BALLISTA_GEAR_Y = 30;

export const BALLISTA_AMMO_BOX_OFFSET_X = 35;
export const BALLISTA_AMMO_BOX_OFFSET_Y = -20;

const NUM_CHARGE_TEXTURES = 11;

export function getBallistaCrossbarTextureSource(chargeProgress: number): string {
   let textureIdx = Math.floor(chargeProgress * NUM_CHARGE_TEXTURES);
   if (textureIdx >= NUM_CHARGE_TEXTURES) {
      textureIdx = NUM_CHARGE_TEXTURES - 1;
   }
   return "entities/ballista/crossbow-" + (textureIdx + 1) + ".png";
}

interface AmmoInfo {
   readonly projectileTextureSource: string;
   readonly drawOffset: number;
}

const AMMO_INFO_RECORD: Record<BallistaAmmoType, AmmoInfo> = {
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

class Ballista extends Entity {
   private readonly plateRenderPart: RenderPart;
   private readonly shaftRenderPart: RenderPart;
   private readonly crossbowRenderPart: RenderPart;
   private readonly gearRenderParts: ReadonlyArray<RenderPart>;

   public readonly tribeID: number | null;

   public readonly ammoBoxInventory: Inventory;

   private projectileRenderPart: RenderPart;

   private chargeProgress: number;

   public ammoType: BallistaAmmoType | null;
   public ammoRemaining: number;

   private ammoWarningRenderPart: RenderPart | null = null;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, aimDirection: number, chargeProgress: number, reloadProgress: number, ammoBoxInventoryData: InventoryData, ammoType: BallistaAmmoType, ammoRemaining: number) {
      super(position, id, EntityType.ballista, ageTicks, renderDepth);

      this.tribeID = tribeID;
      this.chargeProgress = chargeProgress;
      
      this.ammoBoxInventory = createInventoryFromData(ammoBoxInventoryData);

      this.ammoType = ammoRemaining > 0 ? ammoType : null;
      this.ammoRemaining = ammoRemaining;

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/ballista/base.png"),
            0,
            0
         )
      );

      // Ammo box
      const ammoBoxRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/ammo-box.png"),
         1,
         Math.PI / 2
      );
      ammoBoxRenderPart.offset = new Point(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y);
      this.attachRenderPart(ammoBoxRenderPart);

      // Plate
      this.plateRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/plate.png"),
         2,
         0
      );
      this.attachRenderPart(this.plateRenderPart);

      // Shaft
      const shaftRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/ballista/shaft.png"),
         3,
         0
      );
      this.shaftRenderPart = shaftRenderPart;
      this.attachRenderPart(shaftRenderPart);

      // Gears
      const gearRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const renderPart = new RenderPart(
            this.shaftRenderPart,
            getTextureArrayIndex("entities/ballista/gear.png"),
            2.5 + i * 0.1,
            0
         );
         renderPart.offset = new Point(i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X, BALLISTA_GEAR_Y)
         this.attachRenderPart(renderPart);
         gearRenderParts.push(renderPart);
      }
      this.gearRenderParts = gearRenderParts;

      // Crossbow
      const crossbowRenderPart = new RenderPart(
         this.shaftRenderPart,
         getTextureArrayIndex(getBallistaCrossbarTextureSource(chargeProgress)),
         5,
         0
      );
      this.attachRenderPart(crossbowRenderPart);
      this.crossbowRenderPart = crossbowRenderPart;

      this.projectileRenderPart = new RenderPart(
         this.shaftRenderPart,
         getTextureArrayIndex("projectiles/wooden-bolt.png"),
         4,
         0
      );
      this.attachRenderPart(this.projectileRenderPart);

      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(chargeProgress, reloadProgress);
   }

   private updateAimDirection(aimDirection: number, chargeProgress: number): void {
      this.shaftRenderPart.rotation = aimDirection;

      for (let i = 0; i < 2; i++) {
         const gearRenderPart = this.gearRenderParts[i];
         gearRenderPart.rotation = lerp(0, Math.PI * 2, chargeProgress) * (i === 0 ? 1 : -1);
      }
   }

   private updateAmmoType(ammoType: BallistaAmmoType | null): void {
      if (ammoType === null) {
         this.ammoType = null;

         if (this.ammoWarningRenderPart === null) {
            this.ammoWarningRenderPart = new RenderPart(
               this,
               getTextureArrayIndex("entities/ballista/ammo-warning.png"),
               999,
               0
            );
            this.ammoWarningRenderPart.offset = new Point(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y);
            this.ammoWarningRenderPart.inheritParentRotation = false;
            this.attachRenderPart(this.ammoWarningRenderPart);
         }

         this.ammoWarningRenderPart.opacity = (Math.sin(Board.ticks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
         
         return;
      }

      if (this.ammoWarningRenderPart !== null) {
         this.removeRenderPart(this.ammoWarningRenderPart);
         this.ammoWarningRenderPart = null;
      }
      
      const ammoInfo = AMMO_INFO_RECORD[ammoType];
      const textureSource = ammoInfo.projectileTextureSource;
      this.projectileRenderPart.switchTextureSource(textureSource);

      this.ammoType = ammoType;
   }

   private updateProjectileRenderPart(chargeProgress: number, reloadProgress: number): void {
      // If the ballista has no ammo, then don't show the render part
      // @Speed: Would be easier on render part rendering if we remove the render part instead of setting its opacity to 0
      if (this.ammoType === null) {
         this.projectileRenderPart.opacity = 0;
         return;
      }

      // @Cleanup: Do we need this?
      if (reloadProgress === 0 && chargeProgress === 0) {
         // Update rotation for projectiles which have a random rotation each load
         if (this.ammoType === ItemType.rock || this.ammoType === ItemType.slimeball) {
            this.projectileRenderPart.rotation = 2 * Math.PI * Math.random();
         } else {
            this.projectileRenderPart.rotation = 0;
         }
      }
      
      const ammoInfo = AMMO_INFO_RECORD[this.ammoType];
      if (chargeProgress > 0) {
         const pullbackOffset = lerp(48, 0, chargeProgress) + ammoInfo.drawOffset;
         this.projectileRenderPart.offset = Point.fromVectorForm(pullbackOffset, 0);
      } else {
         this.projectileRenderPart.opacity = 1;
         this.projectileRenderPart.offset = Point.fromVectorForm(48 + ammoInfo.drawOffset, 0);
      }

      if (reloadProgress > 0) {
         this.projectileRenderPart.opacity = reloadProgress;
      } else {
         this.projectileRenderPart.opacity = 1;
      }
   }

   public updateFromData(data: EntityData<EntityType.ballista>): void {
      super.updateFromData(data);

      const aimDirection = data.clientArgs[1];
      
      const chargeProgress = data.clientArgs[2];
      if (chargeProgress < this.chargeProgress) {
         playSound("sling-turret-fire.mp3", 0.25, 0.7, this.position.x, this.position.y);
      }
      this.chargeProgress = chargeProgress;

      this.crossbowRenderPart.switchTextureSource(getBallistaCrossbarTextureSource(chargeProgress));
      
      const reloadProgress = data.clientArgs[3];
      
      const ammoBoxInventoryData = data.clientArgs[4];
      updateInventoryFromData(this.ammoBoxInventory, ammoBoxInventoryData);

      const ammoType = data.clientArgs[5];
      this.ammoRemaining = data.clientArgs[6];
      if (this.ammoRemaining === 0) {
         this.updateAmmoType(null);
      } else {
         this.updateAmmoType(ammoType);
      }
      
      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(chargeProgress, reloadProgress);
   }

   protected onHit(): void {
      // @Temporary
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, this.position.x, this.position.y);
   }

   public onDie(): void {
      // @Temporary
      playSound(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, this.position.x, this.position.y);
   }
}

export default Ballista;