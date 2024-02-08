import { BallistaAmmoType, EntityData, EntityType, Inventory, InventoryData, ItemType, Point, lerp, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createInventoryFromData, inventoryHasItems, updateInventoryFromData } from "../inventory-manipulation";
import { playSound } from "../sound";

export const BALLISTA_GEAR_X = -12;
export const BALLISTA_GEAR_Y = 25;

export const BALLISTA_AMMO_BOX_OFFSET_X = 35;
export const BALLISTA_AMMO_BOX_OFFSET_Y = -20;

const NUM_CHARGE_TEXTURES = 9;

export function getBallistaCrossbarTextureSource(chargeProgress: number): string {
   let textureIdx = Math.floor(chargeProgress * NUM_CHARGE_TEXTURES);
   if (textureIdx >= NUM_CHARGE_TEXTURES) {
      textureIdx = NUM_CHARGE_TEXTURES - 1;
   }
   return "entities/ballista/crossbow-" + (textureIdx + 1) + ".png";
}

interface AmmoInfo {
   readonly projectileTextureSource: string;
}

const AMMO_INFO_RECORD: Record<BallistaAmmoType, AmmoInfo> = {
   [ItemType.wood]: {
      projectileTextureSource: "projectiles/wooden-bolt.png"
   },
   [ItemType.rock]: {
      projectileTextureSource: "projectiles/ballista-rock.png"
   },
   [ItemType.frostcicle]: {
      projectileTextureSource: "projectiles/ballista-frostcicle.png"
   },
   [ItemType.slimeball]: {
      projectileTextureSource: "projectiles/ballista-slimeball.png"
   }
};

class Ballista extends Entity {
   private readonly shaftRenderPart: RenderPart;
   private readonly crossbowRenderPart: RenderPart;
   private readonly gearRenderParts: ReadonlyArray<RenderPart>;

   public readonly ammoBoxInventory: Inventory;

   private projectileRenderPart: RenderPart;

   private chargeProgress: number;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, aimDirection: number, chargeProgress: number, reloadProgress: number, ammoBoxInventoryData: InventoryData) {
      super(position, id, EntityType.ballista, ageTicks, renderDepth);

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
            2 + i * 0.1,
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
         this,
         getEntityTextureArrayIndex("projectiles/wooden-bolt.png"),
         4,
         0
      );
      this.attachRenderPart(this.projectileRenderPart);

      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(aimDirection, chargeProgress, reloadProgress);
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

   private getAmmoType(): BallistaAmmoType {
      for (let itemSlot = 1; itemSlot <= this.ammoBoxInventory.width * this.ammoBoxInventory.height; itemSlot++) {
         if (!this.ammoBoxInventory.itemSlots.hasOwnProperty(itemSlot)) {
            continue;
         }

         return this.ammoBoxInventory.itemSlots[itemSlot].type as BallistaAmmoType;
      }

      throw new Error();
   }

   private updateProjectileRenderPart(aimDirection: number, chargeProgress: number, reloadProgress: number): void {
      // If the ballista has no ammo, then don't show the render part
      // @Speed: Would be easier on render part rendering if we remove the render part instead of setting its opacity to 0
      if (!this.hasAmmo()) {
         this.projectileRenderPart.opacity = 0;
         return;
      }

      const ammoType = this.getAmmoType();
      const textureSource = AMMO_INFO_RECORD[ammoType].projectileTextureSource;
      this.projectileRenderPart.switchTextureSource(textureSource);
      
      this.projectileRenderPart.rotation = aimDirection;

      if (chargeProgress > 0) {
         const pullbackOffset = lerp(40, -5, chargeProgress);
         this.projectileRenderPart.offset = Point.fromVectorForm(pullbackOffset, aimDirection);
      } else {
         this.projectileRenderPart.opacity = 1;
         this.projectileRenderPart.offset = Point.fromVectorForm(40, aimDirection);
      }

      if (reloadProgress > 0) {
         this.projectileRenderPart.opacity = reloadProgress;
      } else {
         this.projectileRenderPart.opacity = 1;
      }
   }

   public updateFromData(data: EntityData<EntityType.ballista>): void {
      super.updateFromData(data);

      const aimDirection = data.clientArgs[0];
      
      const chargeProgress = data.clientArgs[1];
      if (chargeProgress < this.chargeProgress) {
         playSound("sling-turret-fire.mp3", 0.25, 0.7, this.position.x, this.position.y);
      }
      this.chargeProgress = chargeProgress;

      this.crossbowRenderPart.switchTextureSource(getBallistaCrossbarTextureSource(chargeProgress));
      
      const reloadProgress = data.clientArgs[2];
      
      const ammoBoxInventoryData = data.clientArgs[3];
      updateInventoryFromData(this.ammoBoxInventory, ammoBoxInventoryData);
      
      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(aimDirection, chargeProgress, reloadProgress);
   }
}

export default Ballista;