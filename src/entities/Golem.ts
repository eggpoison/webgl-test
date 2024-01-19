import { EntityData, EntityType, Point, SETTINGS } from "webgl-test-shared";
import Entity from "./Entity";
import CircularHitbox from "../hitboxes/CircularHitbox";
import RenderPart from "../render-parts/RenderPart";
import { getEntityTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { createFootprintParticle, createRockSpeckParticle } from "../generic-particles";
import Board, { Light } from "../Board";

enum GolemRockSize {
   massive,
   small,
   medium,
   large,
   tiny
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
   if (Math.abs(hitbox.radius - 12) < 0.01) {
      return GolemRockSize.tiny;
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
      case GolemRockSize.tiny: {
         return "entities/golem/golem-body-tiny.png";
      }
   }
}

const getZIndex = (size: GolemRockSize): number => {
   switch (size) {
      case GolemRockSize.massive: {
         return 5.5;
      }
      case GolemRockSize.large: {
         return 0.1;
      }
      case GolemRockSize.medium:
      case GolemRockSize.small: {
         return Math.random() * 4.5 + 0.5;
      }
      case GolemRockSize.tiny: {
         return 0;
      }
   }
}

class Golem extends Entity {
   private readonly rockRenderParts = new Array<RenderPart>();
   private readonly eyeRenderParts = new Array<RenderPart>();

   private readonly eyeLights = new Array<Light>();

   private wakeProgress: number;

   private numFootstepsTaken = 0;
   private distanceTracker = 0;

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
         getEntityTextureArrayIndex(getTextureSource(size)),
         getZIndex(size),
         2 * Math.PI * Math.random()
      );
      renderPart.offset = new Point(hitbox.offset.x, hitbox.offset.y);
      this.attachRenderPart(renderPart);
      this.rockRenderParts.push(renderPart);

      if (size === GolemRockSize.large) {
         for (let i = 0; i < 2; i++) {
            const eyeRenderPart = new RenderPart(
               renderPart,
               5 * 4,
               3 * 4,
               getEntityTextureArrayIndex("entities/golem/eye.png"),
               6,
               0
            );
            eyeRenderPart.opacity = 0;
            eyeRenderPart.inheritParentRotation = false;
            eyeRenderPart.offset = new Point(20 * (i === 0 ? -1 : 1), 17);
            this.attachRenderPart(eyeRenderPart);
            this.eyeRenderParts.push(eyeRenderPart);

            // Create eye light
            const light: Light = {
               position: new Point(this.position.x + (eyeRenderPart.offset as Point).x, this.position.y + (eyeRenderPart.offset as Point).y),
               intensity: 0,
               strength: 0.5,
               radius: 0.15,
               r: 0.75,
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

      // Create footsteps
      if (this.velocity.lengthSquared() >= 2500 && !this.isInRiver() && Board.tickIntervalHasPassed(0.3)) {
         createFootprintParticle(this, this.numFootstepsTaken, 20, 96, 5);
         this.numFootstepsTaken++;
      }
      this.distanceTracker += this.velocity.length() / SETTINGS.TPS;
      if (this.distanceTracker > 50) {
         this.distanceTracker -= 50;
         this.createFootstepSound();
      }

      if (this.wakeProgress > 0 && this.wakeProgress < 1) {
         for (let i = 0; i < this.hitboxes.length; i++) {
            const hitbox = this.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, this.velocity.x, this.velocity.y);
         }
      } else if (this.wakeProgress === 1) {
         for (let i = 0; i < this.hitboxes.length; i++) {
            if (Math.random() >= 6 / SETTINGS.TPS) {
               continue;
            }

            const hitbox = this.hitboxes[i] as CircularHitbox;

            const offsetDirection = 2 * Math.PI * Math.random();
            const x = hitbox.position.x + hitbox.radius * Math.sin(offsetDirection);
            const y = hitbox.position.y + hitbox.radius * Math.cos(offsetDirection);
            createRockSpeckParticle(x, y, 0, this.velocity.x, this.velocity.y);
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

      for (let i = 0; i < 2; i++) {
         this.eyeRenderParts[i].opacity = this.wakeProgress;
         this.eyeLights[i].intensity = this.wakeProgress;
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

   public onRemove(): void {
      super.onRemove();
      
      for (let i = 0; i < 2; i++) {
         const light = this.eyeLights[i];
         const idx = Board.lights.indexOf(light);
         if (idx !== -1) {
            Board.lights.splice(idx, 1);
         }
      }
   }
}

export default Golem;