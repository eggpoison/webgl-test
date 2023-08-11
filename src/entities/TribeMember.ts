import { EntityData, HitboxType, ItemType, Point, TribeType } from "webgl-test-shared";
import Entity from "./Entity";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";

abstract class TribeMember extends Entity {
   private readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourType: ItemType | null;
   
   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, tribeType: TribeType, armour: ItemType | null) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      this.tribeType = tribeType;

      this.updateArmourRenderPart(armour);
      this.armourType = armour;
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // If snow armour is equipped, move at normal speed on snow tiles
   if (this.armourType === "frost_armour") {
         if (this.findCurrentTile().type === "snow") {
            return 1;
         }
      }
      return null;
   }

   protected getTextureSource(tribeType: TribeType): string {
      switch (tribeType) {
         case TribeType.plainspeople: {
            return "entities/human/human1.png";
         }
         case TribeType.goblins: {
            return "entities/human/goblin.png";
         }
         case TribeType.frostlings: {
            return "entities/human/frostling.png"
         }
         case TribeType.barbarians: {
            return "entities/human/barbarian.png"
         }
      }
   }

   private getArmourTextureSource(armour: ItemType): string {
      switch (armour) {
         case "frost_armour": {
            return "armour/frost-armour.png";
         }
         default: {
            throw new Error("Can't find armour texture source");
         }
      }
   }

   public updateArmourRenderPart(armour: ItemType | null): void {
      if (armour !== null) {
         if (this.armourRenderPart === null) {
            this.armourRenderPart = new RenderPart({
               textureSource: this.getArmourTextureSource(armour),
               width: 72,
               height: 72,
               zIndex: 2
            }, this);
            
            this.attachRenderPart(this.armourRenderPart);
         } else {
            this.armourRenderPart.textureSource = this.getArmourTextureSource(armour);
         }
      } else if (this.armourRenderPart !== null) {
         this.removeRenderPart(this.armourRenderPart);
         this.armourRenderPart = null;
      }
   }

   public updateFromData(entityData: EntityData<"player"> | EntityData<"tribesman">): void {
      super.updateFromData(entityData);

      this.tribeID = entityData.clientArgs[0];
      this.armourType = entityData.clientArgs[2];

      this.updateArmourRenderPart(entityData.clientArgs[2]);
   }
}

export default TribeMember;