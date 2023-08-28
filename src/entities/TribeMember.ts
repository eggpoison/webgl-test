import { EntityData, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType, Point, SETTINGS, ToolItemInfo, TribeType, Vector, lerp } from "webgl-test-shared";
import Entity from "./Entity";
import RenderPart from "../render-parts/RenderPart";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Game from "../Game";
import { getFrameProgress } from "../GameObject";

abstract class TribeMember extends Entity {
   private static readonly FOOD_EAT_INTERVAL = 0.3;
   
   private static readonly TOOL_ACTIVE_ITEM_SIZE = 48;
   private static readonly DEFAULT_ACTIVE_ITEM_SIZE = 32;

   /** Decimal percentage of total attack animation time spent doing the lunge part of the animation */
   private static readonly ATTACK_LUNGE_TIME = 1/3;

   private static readonly ITEM_RESTING_ROTATION = 0;
   private static readonly ITEM_END_ROTATION = -Math.PI * 2/3;
   
   private static readonly ITEM_RESTING_DIRECTION = Math.PI / 4;
   private static readonly ITEM_SWING_RANGE = Math.PI / 2;
   
   private readonly tribeType: TribeType;

   public tribeID: number | null;

   private armourRenderPart: RenderPart | null = null;

   public armourType: ItemType | null;

   private activeItemRenderPart: RenderPart;

   protected activeItem: ItemType | null;

   public lastAttackTicks: number;
   public lastEatTicks: number;
   
   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, secondsSinceLastHit: number | null, tribeID: number | null, tribeType: TribeType, armour: ItemType | null, activeItem: ItemType | null, lastAttackTicks: number, lastEatTicks: number) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.tribeID = tribeID;
      this.tribeType = tribeType;

      this.updateArmourRenderPart(armour);
      this.armourType = armour;
      this.activeItem = activeItem;
      this.lastAttackTicks = lastAttackTicks;
      this.lastEatTicks = lastEatTicks;
      
      this.activeItemRenderPart = new RenderPart({
         textureSource: activeItem !== null ? CLIENT_ITEM_INFO_RECORD[activeItem].textureSource : "",
         width: TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         height: TribeMember.TOOL_ACTIVE_ITEM_SIZE,
         offset: () => {
            // TODO: This is kinda scuffed
            if (this.activeItem === null) {
               return new Point(0, 0);
            }

            let direction = Math.PI / 4;

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
               
               const secondsSinceLastEat = this.getSecondsSinceLastAction(this.lastEatTicks);

               let eatIntervalProgress = (secondsSinceLastEat % TribeMember.FOOD_EAT_INTERVAL) / TribeMember.FOOD_EAT_INTERVAL * 2;
               if (eatIntervalProgress > 1) {
                  eatIntervalProgress = 2 - eatIntervalProgress;
               }
               
               direction -= lerp(0, Math.PI/5, eatIntervalProgress);

               const insetAmount = lerp(0, 17, eatIntervalProgress);
   
               return new Vector(26 + itemSize / 2 - insetAmount, direction).convertToPoint();
            } else {
               // Attack animation
               
               const secondsSinceLastAttack = this.getSecondsSinceLastAction(this.lastAttackTicks);
               const attackProgress = this.getAttackProgress(secondsSinceLastAttack);

               let direction: number;
               if (attackProgress < TribeMember.ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(TribeMember.ITEM_RESTING_DIRECTION, TribeMember.ITEM_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - TribeMember.ATTACK_LUNGE_TIME) / (1 - TribeMember.ATTACK_LUNGE_TIME);
                  direction = lerp(TribeMember.ITEM_RESTING_DIRECTION - TribeMember.ITEM_SWING_RANGE, TribeMember.ITEM_RESTING_DIRECTION, returnProgress);
               }

               return new Vector(26 + itemSize / 2, direction).convertToPoint();
            }
         },
         getRotation: () => {
            if (Game.latencyGameState.playerIsEating) {
               // Eating animation

               const secondsSinceLastEat = this.getSecondsSinceLastAction(this.lastEatTicks);
               
               let eatIntervalProgress = (secondsSinceLastEat % TribeMember.FOOD_EAT_INTERVAL) / TribeMember.FOOD_EAT_INTERVAL * 2;
               if (eatIntervalProgress > 1) {
                  eatIntervalProgress = 2 - eatIntervalProgress;
               }
               
               const direction = lerp(0, -Math.PI/5, eatIntervalProgress);
               return direction;

            } else {
               // Attack animation

               const secondsSinceLastAttack = this.getSecondsSinceLastAction(this.lastAttackTicks);
               const attackProgress = this.getAttackProgress(secondsSinceLastAttack);

               let direction: number;
               if (attackProgress < TribeMember.ATTACK_LUNGE_TIME) {
                  // Lunge part of the animation
                  direction = lerp(TribeMember.ITEM_RESTING_ROTATION, TribeMember.ITEM_END_ROTATION, attackProgress / TribeMember.ATTACK_LUNGE_TIME);
               } else {
                  // Return part of the animation
                  const returnProgress = (attackProgress - TribeMember.ATTACK_LUNGE_TIME) / (1 - TribeMember.ATTACK_LUNGE_TIME);
                  direction = lerp(TribeMember.ITEM_END_ROTATION, TribeMember.ITEM_RESTING_ROTATION, returnProgress);
               }

               return direction;
            }
         },
         zIndex: 0
      }, this);
      this.attachRenderPart(this.activeItemRenderPart);
      
      if (activeItem === null) {
         this.activeItemRenderPart.isActive = false;
      }
   }

   private getSecondsSinceLastAction(lastActionTicks: number): number {
      const ticksSinceLastAction = Game.ticks - lastActionTicks;
      let secondsSinceLastAction = ticksSinceLastAction / SETTINGS.TPS;

      // Account for frame progress
      secondsSinceLastAction += getFrameProgress() / SETTINGS.TPS;

      return secondsSinceLastAction;
   }

   private getAttackProgress(secondsSinceLastAttack: number): number {
      let attackDuration: number;
      if (this.activeItem !== null && (ITEM_TYPE_RECORD[this.activeItem] === "sword" || ITEM_TYPE_RECORD[this.activeItem] === "axe" || ITEM_TYPE_RECORD[this.activeItem] === "pickaxe")) {
         attackDuration = (ITEM_INFO_RECORD[this.activeItem] as ToolItemInfo).attackCooldown;
      } else {
         attackDuration = SETTINGS.DEFAULT_ATTACK_COOLDOWN;
      }

      let attackProgress = secondsSinceLastAttack / attackDuration;
      if (attackProgress > 1) {
         attackProgress = 1;
      }

      return attackProgress;
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
      this.lastAttackTicks = entityData.clientArgs[4];
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