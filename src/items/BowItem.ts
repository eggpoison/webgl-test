import { TribeMemberAction } from "webgl-test-shared";
import Item from "./Item";
import { latencyGameState } from "../game-state/game-states";
import Player from "../entities/Player";
import Board from "../Board";
import { showChargeMeter } from "../components/game/ChargeMeter";

class BowItem extends Item {
   // @Cleanup: shouldn't set player action here
   
   public onRightMouseButtonDown(): void {
      latencyGameState.playerAction = TribeMemberAction.charge_bow;
      Player.instance!.action = TribeMemberAction.charge_bow;
      Player.instance!.lastActionTicks = Board.ticks;
      
      showChargeMeter();
   }

   public onRightMouseButtonUp(): void {
      this.sendUsePacket();
      latencyGameState.playerAction = TribeMemberAction.none;
      Player.instance!.action = TribeMemberAction.none;
   }

   public onDeselect(): void {
      latencyGameState.playerAction = TribeMemberAction.none
      Player.instance!.action = TribeMemberAction.none;
   }
}

export default BowItem;