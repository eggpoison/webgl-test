import { Point, TribeTotemBanner, EntityData, TribeType } from "webgl-test-shared";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RectangularHitbox from "../hitboxes/RectangularHitbox";

class TribeTotem extends Entity {
   private static readonly RADIUS = 60;

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
         TribeTotem.RADIUS * 2,
         TribeTotem.RADIUS * 2,
         `entities/tribe-totem/tribe-totem.png`,
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
         TribeTotem.BANNER_WIDTH,
         TribeTotem.BANNER_HEIGHT,
         `entities/tribe-totem/${totemTextureSourceID}`,
         2,
         banner.direction
      );
      renderPart.offset = Point.fromVectorForm(TribeTotem.BANNER_LAYER_DISTANCES[banner.layer], banner.direction);
      this.attachRenderPart(renderPart);
      this.bannerRenderParts[banner.hutNum] = renderPart;
   }

   private removeBanner(bannerNum: number): void {
      this.removeRenderPart(this.bannerRenderParts[bannerNum]);
      delete this.bannerRenderParts[bannerNum];
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
         this.removeBanner(hutNum);
      }
   }

   public updateFromData(entityData: EntityData<"tribe_totem">): void {
      super.updateFromData(entityData);

      this.tribeType = entityData.clientArgs[1];
      this.updateBanners(entityData.clientArgs[2]);
   }
}

export default TribeTotem;