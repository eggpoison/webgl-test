import Game from "../Game";
import { updateHealthBar } from "../components/game/HealthBar";
import Player from "../entities/Player";
import GameState from "./game-state";

const killPlayer = (): void => {
   if (Player.instance === null) return;

   // Remove the player from the game
   delete Game.board.entities[Player.instance.id];
   Player.instance = null;
}

abstract class DefiniteGameState extends GameState {
   /** Username of the player. Empty string if the player's name has not yet been assigned. */
   public static playerUsername: string = "";

   /** Health of the instance player */
   private static _playerHealth: number = Player.MAX_HEALTH;

   public static get playerHealth(): number {
      return this._playerHealth;
   }

   public static setPlayerHealth(newHealth: number): void {
      const healthHasChanged = newHealth !== this._playerHealth;

      this._playerHealth = newHealth;

      if (healthHasChanged && typeof updateHealthBar !== "undefined") {
         updateHealthBar(this._playerHealth);
      }

      if (this._playerHealth <= 0) {
         killPlayer();
      }
   }

   public static playerIsDead(): boolean {
      return this._playerHealth <= 0;
   }
}

export default DefiniteGameState;

/** Stores the definite, 100% known correct information about the game state. */
// const definiteGameState = new DefiniteGameState();

// export default definiteGameState;