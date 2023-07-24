import Game from "../Game";
import { updateHealthBar } from "../components/game/HealthBar";
import { hideNerdVision } from "../components/game/nerd-vision/NerdVision";
import Player from "../entities/Player";
import GameState from "./game-state";

const killPlayer = (): void => {
   if (Player.instance === null) return;

   // Remove the player from the game
   Game.board.removeGameObject(Player.instance);
   Player.instance = null;

   hideNerdVision();
}

/** Stores the definite, 100% known correct information about the game state. */
class DefiniteGameState extends GameState {
   /** Username of the player. Empty string if the player's name has not yet been assigned. */
   public playerUsername: string = "";

   /** Health of the instance player */
   private _playerHealth: number = Player.MAX_HEALTH;

   public get playerHealth(): number {
      return this._playerHealth;
   }

   public setPlayerHealth(newHealth: number): void {
      const healthHasChanged = newHealth !== this._playerHealth;

      this._playerHealth = newHealth;

      if (healthHasChanged && typeof updateHealthBar !== "undefined") {
         updateHealthBar(this._playerHealth);
      }

      if (this._playerHealth <= 0) {
         killPlayer();
      }
   }

   public playerIsDead(): boolean {
      return this._playerHealth <= 0;
   }
}

export default DefiniteGameState;