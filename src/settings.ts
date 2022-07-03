interface SettingsType {
   /** The number of times that the game ticks every second */
   readonly tps: number;
   /** The colour of the background visible near the borders */
   readonly backgroundColour: string;
   /** The game's starting time, in in-game hours */
   readonly startTime: number;
   /** The number of seconds it takes for fog of war to be revealed after the player steps on it */
   readonly fogRevealTime: number;
   /** How long an entity is invulnerable after being hit, in seconds */
   readonly entityInvulnerabilityDuration: number;
   /** Whether the fog of war is shown */
   readonly showFogOfWar: boolean;
   /** The colour of wall outlines */
   readonly wallOutlineWidth: number;
   /** The IP address of the server */
   readonly serverIPAddress: string;
   /** Which port the server is hosted in */
   readonly serverPort: number;
}

const SETTINGS: SettingsType = {
   tps: 60,
   startTime: 8,
   fogRevealTime: 0.5,
   entityInvulnerabilityDuration: 0.15,
   showFogOfWar: false,
   backgroundColour: "#09120b",
   wallOutlineWidth: 5,
   serverIPAddress: "172.22.69.13",
   serverPort: 8000
};

export default SETTINGS;