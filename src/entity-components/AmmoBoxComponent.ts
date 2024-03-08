import { AmmoBoxComponentData, BallistaAmmoType, ServerComponentType, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../entities/Ballista";
import Board from "../Board";

class AmmoBoxComponent extends ServerComponent<ServerComponentType.ammoBox> {
   public ammoType: BallistaAmmoType | null;
   public ammoRemaining: number;

   private ammoWarningRenderPart: RenderPart | null = null;
   
   constructor(entity: Entity, data: AmmoBoxComponentData) {
      super(entity);

      this.ammoType = data.ammoRemaining > 0 ? data.ammoType : null;
      this.ammoRemaining = data.ammoRemaining;
   }

   private updateAmmoType(ammoType: BallistaAmmoType | null): void {
      if (ammoType === null) {
         this.ammoType = null;

         if (this.ammoWarningRenderPart === null) {
            this.ammoWarningRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex("entities/ballista/ammo-warning.png"),
               999,
               0
            );
            this.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, this.entity.rotation);
            this.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, this.entity.rotation);
            this.ammoWarningRenderPart.inheritParentRotation = false;
            this.entity.attachRenderPart(this.ammoWarningRenderPart);
         }

         this.ammoWarningRenderPart.opacity = (Math.sin(Board.ticks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
         
         return;
      }

      if (this.ammoWarningRenderPart !== null) {
         this.entity.removeRenderPart(this.ammoWarningRenderPart);
         this.ammoWarningRenderPart = null;
      }
      
      this.ammoType = ammoType;
   }

   public updateFromData(data: AmmoBoxComponentData): void {
      const ammoType = data.ammoType;
      this.ammoRemaining = data.ammoRemaining;
      if (this.ammoRemaining === 0) {
         this.updateAmmoType(null);
      } else {
         this.updateAmmoType(ammoType);
      }
   }
}

export default AmmoBoxComponent;