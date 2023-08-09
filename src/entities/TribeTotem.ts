import { Point, HitboxType, Vector, TribeTotemBanner, EntityData, TribeType } from "webgl-test-shared";
import Hitbox from "../hitboxes/Hitbox";
import RenderPart from "../render-parts/RenderPart";
import Entity from "./Entity";

class TribeTotem extends Entity {
   private static readonly RADIUS = 60;

   private static readonly BANNER_WIDTH = 40;
   private static readonly BANNER_HEIGHT = 16;

   private static readonly BANNER_LAYER_DISTANCES = [32, 52, 65];
   
   public type = "tribe_totem" as const;

   public tribeID: number;
   private tribeType: TribeType;

   private readonly banners = new Array<TribeTotemBanner>();

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
      
      this.attachRenderPart(
         new RenderPart({
            width: TribeTotem.BANNER_WIDTH,
            height: TribeTotem.BANNER_HEIGHT,
            textureSource: `entities/tribe-totem/${totemTextureSourceID}`,
            offset: () => new Vector(TribeTotem.BANNER_LAYER_DISTANCES[banner.layer], banner.direction).convertToPoint(),
            getRotation: () => banner.direction,
            zIndex: 2
         }, this)
      );
   }

   private updateBanners(banners: ReadonlyArray<TribeTotemBanner>): void {
      for (let i = this.banners.length; i < banners.length; i++) {
         const banner = banners[i];
         this.createBannerRenderPart(banner);
         this.banners.push(banner);
      }
   }

   public updateFromData(entityData: EntityData<"tribe_totem">): void {
      super.updateFromData(entityData);

      this.tribeType = entityData.clientArgs[1];
      this.updateBanners(entityData.clientArgs[2]);
   }
}

export default TribeTotem;