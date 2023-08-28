import { EntityData, ITEM_TYPE_RECORD, ItemType, Point, SETTINGS, TribeType, Vector, lerp } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Game from "../Game";
import { getFrameProgress } from "../GameObject";

abstract class TribeMember extends Entity {
   private static readonly FOOD_EAT_INTERVAL = 0.2;
   
   private static readonly TOOL_ACTIVE_ITEM_SIZE = 48;
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = 32;
   
   private readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourType: ItemType | null;

   private activeItemRenderPart: RenderPart;

   protected activeItem: ItemType | null;
   public lastActionTicks: number;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, tribeType: TribeType, armour: ItemType | null, activeItem: ItemType | null, lastAttackTicks: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      this.tribeType = tribeType;

      this.updateArmourRenderPart(armour);
      this.armourType = armour;
      this.activeItem = activeItem;
      this.lastActionTicks = lastAttackTicks;
      
      this.activeItemRenderPart = new RenderPart({
         textureSource: activeItem !== null ? CLIENT_ITEM_INFO_RECORD[activeItem].textureSource : "",
         width: TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         height: TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         offset: () => {
            const secondsSinceLastAction = this.getSecondsSinceLastAction();
            
            let direction = Math.PI / 4;
   
            // TODO: This is kinda scuffed
            if (this.activeItem === null) {
               return new Point(0, 0);
            }

            // TODO: As the offset function is called in the RenderPart constructor, this.activeItemRenderPart will initially
            // be undefined and so we have to check for this case
            let itemSize: number;
            if (typeof this.activeItemRenderPart === "undefined") {
               itemSize = this.getActiveItemSize(this.activeItem);
            } else {
               itemSize = this.activeItemRenderPart.width;
            }

            if (Game.latencyGameState.playerIsEating) {
               // Food eating animation
               
               const eatIntervalProgress = (secondsSinceLastAction % TribeMember.FOOD_EAT_INTERVAL) / TribeMember.FOOD_EAT_INTERVAL;
               direction -= lerp(0, Math.PI/5, eatIntervalProgress);

               const insetAmount = lerp(0, 10, eatIntervalProgress);
   
               return new Vector(26 + itemSize / 2 - insetAmount, direction).convertToPoint();
            } else {
               // Attack animation
               
               if (secondsSinceLastAction < 0.5) {
                  direction -= lerp(Math.PI/2, 0, secondsSinceLastAction * 2);
               }
   
               return new Vector(26 + itemSize / 2, direction).convertToPoint();
            }
         },
         getRotation: () => {
            const secondsSinceLastAction = this.getSecondsSinceLastAction();
            
            let direction = Math.PI / 4;
            if (secondsSinceLastAction < 0.5) {
               direction -= lerp(Math.PI/2, 0, secondsSinceLastAction * 2);
            }
            return -Math.PI/4 + direction;
         },
         zIndex: 0
      }, this);
      this.attachRenderPart(this.activeItemRenderPart);
      
      if (activeItem === null) {
         this.activeItemRenderPart.isActive = false;
      }
   }

   private getSecondsSinceLastAction(): number {
      const ticksSinceLastAction = Game.ticks - this.lastActionTicks;
      let secondsSinceLastAction = ticksSinceLastAction / SETTINGS.TPS;

      // Account for frame progress
      secondsSinceLastAction += getFrameProgress() / SETTINGS.TPS;

      return secondsSinceLastAction;
   }

   protected overrideTileMoveSpeedMultiplier(): number | null {
      // If snow armour is equipped, move at normal speed on snow tiles
      if (this.armourType === ItemType.frost_armour) {
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
         case ItemType.frost_armour: {
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

   private updateActiveItemRenderPart(activeItemType: ItemType | null): void {
      if (activeItemType === null) {
         this.activeItemRenderPart.isActive = false;
      } else {
         this.activeItemRenderPart.textureSource = CLIENT_ITEM_INFO_RECORD[activeItemType].textureSource;
         this.activeItemRenderPart.isActive = true;

         const renderPartSize = this.getActiveItemSize(activeItemType);
         this.activeItemRenderPart.width = renderPartSize;
         this.activeItemRenderPart.height = renderPartSize;
      }
   }

   private getActiveItemSize(activeItemType: ItemType) {
      const itemTypeInfo = ITEM_TYPE_RECORD[activeItemType];
      if (itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe") {
         return TribeMember.TOOL_ACTIVE_ITEM_SIZE;
      }
      return TribeMember.DEFAULT_ACTIVE_ITEM_SIZE;
   }

   public updateFromData(entityData: EntityData<"player"> | EntityData<"tribesman">): void {
      super.updateFromData(entityData);

      this.activeItem = entityData.clientArgs[3];
      this.lastActionTicks = entityData.clientArgs[4];
      this.updateActiveItemRenderPart(this.activeItem);

      this.tribeID = entityData.clientArgs[0];
      this.armourType = entityData.clientArgs[2];

      this.updateArmourRenderPart(entityData.clientArgs[2]);
   }

   public updateActiveItem(activeItemType: ItemType | null): void {
      this.updateActiveItemRenderPart(activeItemType);
      this.activeItem = activeItemType;
   }
}

export default TribeMember;