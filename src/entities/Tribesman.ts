import { EntityType, Point } from "webgl-test-shared";
import TribeMember from "./TribeMember";
import { playSound } from "../sound";

abstract class Tribesman extends TribeMember {
   constructor(position: Point, id: number, entityType: EntityType, ageTicks: number) {
      super(position, id, entityType, ageTicks);

      playSound("door-open.mp3", 0.4, 1, this.position.x, this.position.y);
   }
}

export default Tribesman;