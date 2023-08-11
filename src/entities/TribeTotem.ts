import { Point, HitboxType, Vector, TribeTotemBanner, EntityData, TribeType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

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

   constructor(position: Point, hitboxes: ReadonlySet<Hitbox<HitboxType>>, id: number, secondsSinceLastHit: number | null, tribeID: number, tribeType: TribeType, banners: Array<TribeTotemBanner>) {
      super(position, hitboxes, id, secondsSinceLastHit);

      this.attachRenderParts([
         new RenderPart({
            width: TribeTotem.RADIUS * 2,
            height: TribeTotem.RADIUS * 2,
            textureSource: `entities/tribe-totem/tribe-totem.png`,
            zIndex: 1
         }, this)
      ]);

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

      const renderPart = new RenderPart({
         width: TribeTotem.BANNER_WIDTH,
         height: TribeTotem.BANNER_HEIGHT,
         textureSource: `entities/tribe-totem/${totemTextureSourceID}`,
         offset: () => new Vector(TribeTotem.BANNER_LAYER_DISTANCES[banner.layer], banner.direction).convertToPoint(),
         getRotation: () => banner.direction,
         zIndex: 2
      }, this);
      
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