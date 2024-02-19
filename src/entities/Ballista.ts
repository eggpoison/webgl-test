import { BallistaAmmoType, EntityData, EntityType, Inventory, InventoryData, ItemType, Point, lerp, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createInventoryFromData, inventoryHasItems, updateInventoryFromData } from "../inventory-manipulation";
import { playSound } from "../sound";

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

   private ammoType: BallistaAmmoType | null = null;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, aimDirection: number, chargeProgress: number, reloadProgress: number, ammoBoxInventoryData: InventoryData) {
      super(position, id, EntityType.ballista, ageTicks, renderDepth);

      this.tribeID = tribeID;
      this.chargeProgress = chargeProgress;
      
      this.ammoBoxInventory = createInventoryFromData(ammoBoxInventoryData);

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/ballista/base.png"),
            0,
            0
         )
      );

      // Gears
      const gearRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const renderPart = new RenderPart(
            this,
            getEntityTextureArrayIndex("entities/ballista/gear.png"),
            2.5 + i * 0.1,
            0
         );
         this.attachRenderPart(renderPart);
         gearRenderParts.push(renderPart);
      }
      this.gearRenderParts = gearRenderParts;

      // Ammo box
      const ammoBoxRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/ballista/ammo-box.png"),
         1,
         Math.PI / 2
      );
      ammoBoxRenderPart.offset = new Point(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y);
      this.attachRenderPart(ammoBoxRenderPart);

      // Plate
      this.plateRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/ballista/plate.png"),
         2,
         0
      );
      this.attachRenderPart(this.plateRenderPart);

      // Shaft
      const shaftRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex("entities/ballista/shaft.png"),
         3,
         0
      );
      this.shaftRenderPart = shaftRenderPart;
      this.attachRenderPart(shaftRenderPart);

      // Crossbow
      const crossbowRenderPart = new RenderPart(
         this,
         getEntityTextureArrayIndex(getBallistaCrossbarTextureSource(chargeProgress)),
         5,
         0
      );
      this.attachRenderPart(crossbowRenderPart);
      this.crossbowRenderPart = crossbowRenderPart;

      this.projectileRenderPart = new RenderPart(
         this.shaftRenderPart,
         getEntityTextureArrayIndex("projectiles/wooden-bolt.png"),
         4,
         0
      );
      this.attachRenderPart(this.projectileRenderPart);

      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(chargeProgress, reloadProgress);
   }

   private updateAimDirection(aimDirection: number, chargeProgress: number): void {
      this.shaftRenderPart.rotation = aimDirection;
      this.crossbowRenderPart.rotation = aimDirection;

      for (let i = 0; i < 2; i++) {
         const gearRenderPart = this.gearRenderParts[i];

         gearRenderPart.rotation = aimDirection;

         const x = i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X;
         const y = BALLISTA_GEAR_Y;

         const offsetX = rotateXAroundOrigin(x, y, aimDirection);
         const offsetY = rotateYAroundOrigin(x, y, aimDirection);
         // @Speed: garbage collection
         gearRenderPart.offset = new Point(offsetX, offsetY);

         gearRenderPart.rotation = lerp(0, Math.PI * 2, chargeProgress) * (i === 0 ? 1 : -1);
      }
   }

   private hasAmmo(): boolean {
      return inventoryHasItems(this.ammoBoxInventory);
   }

   private getAmmoType(): BallistaAmmoType | null {
      for (let itemSlot = 1; itemSlot <= this.ammoBoxInventory.width * this.ammoBoxInventory.height; itemSlot++) {
         if (!this.ammoBoxInventory.itemSlots.hasOwnProperty(itemSlot)) {
            continue;
         }

         return this.ammoBoxInventory.itemSlots[itemSlot].type as BallistaAmmoType;
      }

      return null;
   }

   private switchAmmo(ammoType: BallistaAmmoType): void {
      const ammoInfo = AMMO_INFO_RECORD[ammoType];
      const textureSource = ammoInfo.projectileTextureSource;
      this.projectileRenderPart.switchTextureSource(textureSource);

      if (ammoType === ItemType.rock || ammoType === ItemType.slimeball) {
         this.projectileRenderPart.rotation = 2 * Math.PI * Math.random();
      } else {
         this.projectileRenderPart.rotation = 0;
      }
      this.ammoType = ammoType;
   }

   private updateProjectileRenderPart(chargeProgress: number, reloadProgress: number): void {
      // If the ballista has no ammo, then don't show the render part
      // @Speed: Would be easier on render part rendering if we remove the render part instead of setting its opacity to 0
      if (!this.hasAmmo()) {
         this.projectileRenderPart.opacity = 0;
         return;
      }

      const ammoType = this.getAmmoType()!;

      if (reloadProgress === 0 && chargeProgress === 0) {
         this.switchAmmo(ammoType);
      }
      
      const ammoInfo = AMMO_INFO_RECORD[ammoType];
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

      const ammoType = this.getAmmoType();
      if (ammoType !== null && ammoType !== this.ammoType) {
         this.switchAmmo(ammoType);
      }
      
      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(chargeProgress, reloadProgress);
   }
}

export default Ballista;