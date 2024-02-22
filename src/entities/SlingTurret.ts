import { EntityData, EntityType, Point, lerp } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";

const CHARGE_TEXTURE_SOURCES = ["entities/sling-turret/sling-turret-sling.png", "entities/sling-turret/sling-charge-1.png", "entities/sling-turret/sling-charge-2.png", "entities/sling-turret/sling-charge-3.png", "entities/sling-turret/sling-charge-4.png", "entities/sling-turret/sling-charge-5.png"];

class SlingTurret extends Entity {
   public readonly tribeID: number | null;
   
   private chargeProgress: number;
   
   private readonly plateRenderPart: RenderPart;
   private slingRenderPart: RenderPart;
   private rockRenderPart: RenderPart | null = null;
   
   constructor(position: Point, id: number, ageTicks: number, renderDepth: number, tribeID: number | null, aimDirection: number, chargeProgress: number, reloadProgress: number) {
      super(position, id, EntityType.slingTurret, ageTicks, renderDepth);

      this.tribeID = tribeID;
      this.chargeProgress = chargeProgress;

      // Base
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("entities/sling-turret/sling-turret-base.png"),
            0,
            0
         )
      );

      // Plate
      this.plateRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/sling-turret/sling-turret-plate.png"),
         1,
         0
      );
      this.attachRenderPart(this.plateRenderPart);

      // Sling
      this.slingRenderPart = new RenderPart(
         this.plateRenderPart,
         getTextureArrayIndex("entities/sling-turret/sling-turret-sling.png"),
         2,
         0
      );
      this.attachRenderPart(this.slingRenderPart);

      this.updateAimDirection(aimDirection);
      this.updateSlingChargeProgress(aimDirection, chargeProgress, reloadProgress);
   }

   private updateAimDirection(aimDirection: number): void {
      this.plateRenderPart.rotation = aimDirection;
   }

   private updateSlingChargeProgress(aimDirection: number, chargeProgress: number, reloadProgress: number): void {
      let stage = Math.floor(chargeProgress * CHARGE_TEXTURE_SOURCES.length);
      if (stage >= CHARGE_TEXTURE_SOURCES.length) {
         stage = CHARGE_TEXTURE_SOURCES.length - 1;
      }

      this.slingRenderPart.switchTextureSource(CHARGE_TEXTURE_SOURCES[stage]);

      // Update rock render part
      if (chargeProgress > 0 || reloadProgress > 0) {
         if (this.rockRenderPart === null) {
            this.rockRenderPart = new RenderPart(
               this,
               getTextureArrayIndex("projectiles/sling-rock.png"),
               1.5,
               0
            );
            this.attachRenderPart(this.rockRenderPart);
         }

         const pullbackOffset = lerp(0, -21, chargeProgress);
         this.rockRenderPart.offset = Point.fromVectorForm(pullbackOffset, aimDirection);

         if (reloadProgress > 0) {
            this.rockRenderPart.opacity = reloadProgress;
         } else {
            this.rockRenderPart.opacity = 1;
         }
      } else {
         if (this.rockRenderPart !== null) {
            this.removeRenderPart(this.rockRenderPart);
            this.rockRenderPart = null;
         }
      }
   }

   public updateFromData(data: EntityData<EntityType.slingTurret>): void {
      super.updateFromData(data);

      const aimDirection = data.clientArgs[1];
      this.updateAimDirection(aimDirection);

      const chargeProgress = data.clientArgs[2];
      if (chargeProgress < this.chargeProgress) {
         playSound("sling-turret-fire.mp3", 0.2, 1, this.position.x, this.position.y);
      }

      const reloadProgress = data.clientArgs[3];
      
      this.updateSlingChargeProgress(aimDirection, chargeProgress, reloadProgress);
      this.chargeProgress = chargeProgress;
   }
}

export default SlingTurret;