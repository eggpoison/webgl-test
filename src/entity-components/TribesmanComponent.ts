import { ServerComponentType, Settings, TribeType, TribesmanAIType, TribesmanComponentData, randInt, randItem } from "webgl-test-shared";
import ServerComponent from "./ServerComponent";
import GameObject from "../GameObject";
import { AudioFilePath, playSound } from "../sound";

const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

class TribesmanComponent extends ServerComponent<ServerComponentType.tribesman> {
   private aiType: TribesmanAIType;

   constructor(entity: GameObject, data: TribesmanComponentData) {
      super(entity);

      this.aiType = data.aiType;
   }

   public tick(): void {
      const tribeComponent = this.entity.getServerComponent(ServerComponentType.tribe);

      // Sounds
      switch (this.aiType) {
         case TribesmanAIType.attacking: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound("barbarian-angry-1.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanAIType.escaping: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
               }
            }
            break;
         }
         default: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound(("barbarian-ambient-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
               }
            }
            break;
         }
      }
   }

   public updateFromData(data: TribesmanComponentData): void {
      this.aiType = data.aiType;
   }
}

export default TribesmanComponent;