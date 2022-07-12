import Player from "./entities/Player";

const PLAYERS: { [key: string]: Player } = {};

export function addPlayerToObject(clientID: string, player: Player): void {
   if (PLAYERS.hasOwnProperty(clientID)) {
      throw new Error("Tried to add player twice");
   }

   PLAYERS[clientID] = player;
}

export function getPlayer(clientID: string): Player | null {
   if (PLAYERS.hasOwnProperty(clientID)) {
      return PLAYERS[clientID];
   }

   return null;
}