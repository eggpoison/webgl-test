import Board from "./Board";
import Player from "./entities/Player";

const PLAYERS: { [key: string]: Player } = {};

export function addPlayer(clientID: string, player: Player): void {
   if (PLAYERS.hasOwnProperty(clientID)) {
      throw new Error("Tried to add player twice");
   }

   PLAYERS[clientID] = player;
}

export function removePlayer(clientID: string): void {
   // Remove the player from the game
   const player = PLAYERS[clientID];
   console.log(player);
   Board.removeEntity(player);

   delete PLAYERS[clientID];
}

export function getPlayer(clientID: string): Player | null {
   if (PLAYERS.hasOwnProperty(clientID)) {
      return PLAYERS[clientID];
   }

   return null;
}