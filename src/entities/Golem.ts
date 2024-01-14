import { EntityData, EntityType, Point } from "webgl-test-shared";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getGameObjectTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createRockSpeckParticle } from "../generic-particles";
import Board, { Light } from "../Board";

enum GolemRockSize {
   massive,
   small,
   medium,
   large
}

const getHitboxSize = (hitbox: CircularHitbox): GolemRockSize => {
   if (Math.abs(hitbox.radius - 36) < 0.01) {
      return GolemRockSize.massive;
   }
   if (Math.abs(hitbox.radius - 32) < 0.01) {
      return GolemRockSize.large;
   }
   if (Math.abs(hitbox.radius - 26) < 0.01) {
      return GolemRockSize.medium;
   }
   return GolemRockSize.small;
}

const getTextureSource = (size: GolemRockSize): string => {
   switch (size) {
      case GolemRockSize.massive: {
         return "entities/golem/golem-body-massive.png";
      }
      case GolemRockSize.large: {
         return "entities/golem/golem-body-large.png";
      }
      case GolemRockSize.medium: {
         return "entities/golem/golem-body-medium.png";
      }
      case GolemRockSize.small: {
         return "entities/golem/golem-body-small.png";
      }
   }
}

class Golem extends Entity {
   public type = EntityType.golem;

   private readonly rockRenderParts = new Array<RenderPart>();
   private readonly eyeRenderParts = new Array<RenderPart>();

   private readonly eyeLights = new Array<Light>();

   private wakeProgress: number;

   constructor(position: Point, id: number, renderDepth: number, wakeProgress: number) {
      super(position, id, EntityType.golem, renderDepth);

      this.wakeProgress = wakeProgress;
   }

   public addCircularHitbox(hitbox: CircularHitbox): void {
      super.addCircularHitbox(hitbox);

      const size = getHitboxSize(hitbox);

      const renderPart = new RenderPart(
         this,
         hitbox.radius * 2,
         hitbox.radius * 2,
         getGameObjectTextureArrayIndex(getTextureSource(size)),
         size === GolemRockSize.massive ? 0 : (size === GolemRockSize.large ? 5.5 : Math.random() * 4.5 + 0.5),
         0
      );
      renderPart.offset = new Point(hitbox.offset.x, hitbox.offset.y);
      this.attachRenderPart(renderPart);
      this.rockRenderParts.push(renderPart);

      if (size === GolemRockSize.massive) {
         for (let i = 0; i < 2; i++) {
            const eyeRenderPart = new RenderPart(
               renderPart,
               5 * 4,
               3 * 4,
               getGameObjectTextureArrayIndex("entities/golem/eye.png"),
               6,
               0
            );
            eyeRenderPart.opacity = 0;
            eyeRenderPart.offset = new Point(20 * (i === 0 ? -1 : 1), 17);
            this.attachRenderPart(eyeRenderPart);
            this.eyeRenderParts.push(eyeRenderPart);

            // Create eye light
            const light: Light = {
               position: new Point(this.position.x + (eyeRenderPart.offset as Point).x, this.position.y + (eyeRenderPart.offset as Point).y),
               intensity: 0.1,
               strength: 1,
               radius: 0.2,
               r: 1,
               g: 0,
               b: 0
            };
            Board.lights.push(light);
            this.eyeLights.push(light);
         }
      }
   }

   public tick(): void {
      super.tick();

      if (this.wakeProgress > 0 && this.wakeProgress < 1) {
         for (let i = 0; i < this.hitboxes.length; i++) {
            const hitbox = this.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = this.position.x + hitbox.offset.x + hitbox.radius * Math.sin(offsetDirection);
            const y = this.position.y + hitbox.offset.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0);
         }
      }

      for (let i = 0; i < 2; i++) {
         const eyeRenderPart = this.eyeRenderParts[i];
         const light = this.eyeLights[i];
         light.position.x = eyeRenderPart.renderPosition.x;
         light.position.y = eyeRenderPart.renderPosition.y;
      }
   }

   public updateFromData(data: EntityData<EntityType.golem>): void {
      super.updateFromData(data);

      this.wakeProgress = data.clientArgs[0];

      // @Incomplete: Make eyes fade in smoothly
      const eyeOpacity = this.wakeProgress;
      for (let i = 0; i < 2; i++) {
         this.eyeRenderParts[i].opacity = eyeOpacity;
      }
      
      const shakeAmount = this.wakeProgress > 0 && this.wakeProgress < 1 ? 1 : 0;
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
         const renderPart = this.rockRenderParts[i];

         (renderPart.offset as Point).x = hitbox.offset.x;
         (renderPart.offset as Point).y = hitbox.offset.y;
         renderPart.shakeAmount = shakeAmount;
      }
   }
}

export default Golem;