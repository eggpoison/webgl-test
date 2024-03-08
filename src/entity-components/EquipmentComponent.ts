import { ArmourItemType, GloveItemType, ItemType, ServerComponentType } from "webgl-test-shared";
import GameObject from "../GameObject";
import RenderPart from "../render-parts/RenderPart";
import Component from "./Component";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createFrostShieldBreakParticle } from "../particles";

// @Incomplete
// public genericUpdateFromData(entityData: EntityData<EntityType.player> | EntityData<EntityType.tribeWorker> | EntityData<EntityType.tribeWarrior>): void {
//    const hasFrostShield = entityData.clientArgs[15];
//    if (this.hasFrostShield && !hasFrostShield) {
//       this.createFrostShieldBreakParticles();
//    }
//    this.hasFrostShield = hasFrostShield;
// }

interface ArmourInfo {
   readonly textureSource: string;
   readonly pixelSize: number;
}

const ARMOUR_WORN_INFO: Record<ArmourItemType, ArmourInfo> = {
   [ItemType.leather_armour]: {
      textureSource: "armour/leather-armour.png",
      pixelSize: 64
   },
   [ItemType.frost_armour]: {
      textureSource: "armour/frost-armour.png",
      pixelSize: 72
   },
   [ItemType.deepfrost_armour]: {
      textureSource: "armour/deepfrost-armour.png",
      pixelSize: 72
   },
   [ItemType.meat_suit]: {
      textureSource: "armour/meat-suit.png",
      pixelSize: 64
   },
   [ItemType.fishlord_suit]: {
      textureSource: "armour/fishlord-suit.png",
      pixelSize: 80
   }
};

interface GloveInfo {
   readonly textureSource: string;
   readonly pixelSize: number;
}

const GLOVE_WORN_INFO: Record<GloveItemType, GloveInfo> = {
   [ItemType.gathering_gloves]: {
      textureSource: "gloves/gathering-gloves.png",
      pixelSize: 64
   }
};

const getArmourTextureSource = (armourType: ItemType): string => {
   if (!ARMOUR_WORN_INFO.hasOwnProperty(armourType)) {
      console.warn("Can't find armour info for item type '" + ItemType[armourType] + ".");
      return "";
   }

   return ARMOUR_WORN_INFO[armourType as ArmourItemType].textureSource;
}

const getGloveTextureSource = (gloveType: ItemType): string => {
   if (!GLOVE_WORN_INFO.hasOwnProperty(gloveType)) {
      console.warn("Can't find glove info for item type '" + ItemType[gloveType] + ".");
      return "";
   }

   return GLOVE_WORN_INFO[gloveType as GloveItemType].textureSource;
}

class EquipmentComponent extends Component {
   private armourRenderPart: RenderPart | null = null;
   private gloveRenderParts = new Array<RenderPart>();
   
   // @Incomplete
   public hasFrostShield: boolean;

   constructor(entity: GameObject) {
      super(entity);

      this.hasFrostShield = false;

      this.updateArmourRenderPart();
      this.updateGloveRenderParts();
   }

   public tick(): void {
      this.updateArmourRenderPart();
      this.updateGloveRenderParts();
   }

   /** Updates the current armour render part based on the entity's inventory component */
   public updateArmourRenderPart(): void {
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const armourInventory = inventoryComponent.getInventory("armourSlot");
      
      if (armourInventory.itemSlots.hasOwnProperty(1)) {
         const armour = armourInventory.itemSlots[1];
         
         if (this.armourRenderPart === null) {
            this.armourRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex(getArmourTextureSource(armour.type)),
               3,
               0
            );
            this.entity.attachRenderPart(this.armourRenderPart);
         } else {
            this.armourRenderPart.switchTextureSource(getArmourTextureSource(armour.type));
         }
      } else if (this.armourRenderPart !== null) {
         this.entity.removeRenderPart(this.armourRenderPart);
         this.armourRenderPart = null;
      }
   }

   // @Cleanup: Copy and paste from armour
   private updateGloveRenderParts(): void {
      const inventoryComponent = this.entity.getServerComponent(ServerComponentType.inventory);
      const gloveInventory = inventoryComponent.getInventory("gloveSlot");
      
      // @Incomplete: Make a glove for every hand
      if (gloveInventory.itemSlots.hasOwnProperty(1)) {
         const glove = gloveInventory.itemSlots[1];
         const inventoryUseComponent = this.entity.getServerComponent(ServerComponentType.inventoryUse);

         if (this.gloveRenderParts.length === 0) {
            for (let limbIdx = 0; limbIdx < inventoryUseComponent.useInfos.length; limbIdx++) {
               const gloveRenderPart = new RenderPart(
                  inventoryUseComponent.limbRenderParts[limbIdx],
                  getTextureArrayIndex(getGloveTextureSource(glove.type)),
                  1.1,
                  0
               );
               this.entity.attachRenderPart(gloveRenderPart);
               this.gloveRenderParts.push(gloveRenderPart);
            }
         } else {
            for (let limbIdx = 0; limbIdx < inventoryUseComponent.useInfos.length; limbIdx++) {
               this.gloveRenderParts[limbIdx].switchTextureSource(getGloveTextureSource(glove.type));
            }
         }
      } else {
         while (this.gloveRenderParts.length > 0) {
            this.entity.removeRenderPart(this.gloveRenderParts[0]);
            this.gloveRenderParts.splice(0, 1);
         }
      }
   }

   public createFrostShieldBreakParticles(): void {
      for (let i = 0; i < 17; i++) {
         createFrostShieldBreakParticle(this.entity.position.x, this.entity.position.y);
      }
   }
}

export default EquipmentComponent;