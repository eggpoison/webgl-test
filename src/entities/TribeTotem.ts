import { Point, TribeTotemBanner, EntityData, TribeType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import { getGameObjectTextureIndex } from "../texture-atlases/game-object-texture-atlas";

class TribeTotem extends Entity {
   public static readonly SIZE = 120;

   private static readonly BANNER_WIDTH = 40;
   private static readonly BANNER_HEIGHT = 16;

   private static readonly BANNER_LAYER_DISTANCES = [34, 52, 65];
   
   public type = "tribe_totem" as const;

   public tribeID: number;
   private tribeType: TribeType;

   private readonly banners: Record<number, TribeTotemBanner> = {};
   private readonly bannerRenderParts: Record<number, RenderPart> = {};

   constructor(position: Point, hitboxes: ReadonlySet<CircularHitbox | RectangularHitbox>, id: number, tribeID: number, tribeType: TribeType, banners: Array<TribeTotemBanner>) {
      super(position, hitboxes, id);

      const renderPart = new RenderPart(
         this,
         TribeTotem.SIZE,
         TribeTotem.SIZE,
         getGameObjectTextureIndex(`entities/tribe-totem/tribe-totem.png`),
         1,
         0
      );
      this.attachRenderPart(renderPart);

      this.tribeID = tribeID;
      this.tribeType = tribeType;
      this.updateBanners(banners);
   }

   private createBannerRenderPart(banner: TribeTotemBanner): void {
      let totemTextureSourceID: string;
      switch (this.tribeType) {
         case TribeType.plainspeople: {
            totemTextureSourceID = "plainspeople-banner.png";
            break;
         }
         case TribeType.goblins: {
            totemTextureSourceID = "goblin-banner.png";
            break;
         }
         case TribeType.barbarians: {
            totemTextureSourceID = "barbarian-banner.png";
            break;
         }
         case TribeType.frostlings: {
            totemTextureSourceID = "frostling-banner.png";
            break;
         }
      }

      const renderPart = new RenderPart(
         this,
         TribeTotem.BANNER_WIDTH,
         TribeTotem.BANNER_HEIGHT,
         getGameObjectTextureIndex(`entities/tribe-totem/${totemTextureSourceID}`),
         2,
         banner.direction
      );
      renderPart.offset = Point.fromVectorForm(TribeTotem.BANNER_LAYER_DISTANCES[banner.layer], banner.direction);
      this.attachRenderPart(renderPart);
      this.bannerRenderParts[banner.hutNum] = renderPart;
   }

   private updateBanners(banners: ReadonlyArray<TribeTotemBanner>): void {
      const removedBannerNums = Object.keys(this.banners).map(num => Number(num));
      
      // Add new banners
      for (const banner of banners) {
         if (!this.banners.hasOwnProperty(banner.hutNum)) {
            this.createBannerRenderPart(banner);
            this.banners[banner.hutNum] = banner;
         }

         const idx = removedBannerNums.indexOf(banner.hutNum);
         if (idx !== -1) {
            removedBannerNums.splice(idx, 1);
         }
      }
      
      // Remove banners which are no longer there
      for (const hutNum of removedBannerNums) {
         this.removeRenderPart(this.bannerRenderParts[hutNum]);
         delete this.bannerRenderParts[hutNum];
         delete this.banners[hutNum];
      }
   }

   public updateFromData(entityData: EntityData<"tribe_totem">): void {
      super.updateFromData(entityData);

      this.tribeType = entityData.clientArgs[1];
      this.updateBanners(entityData.clientArgs[2]);
   }
}

export default TribeTotem;