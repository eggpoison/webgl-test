import { TileInfo, TileType } from "./Tile";

export type BiomeName = "grasslands" | "desert" | "tundra" | "swamp" | "mountains" | "magmaFields";

type TileGenerationInfo = {
   readonly info: Omit<TileInfo, "biome" | "fogAmount">;
   readonly minWeight?: number;
   readonly maxWeight?: number;
   /** The minimum number of tiles from the end of the biome */
   readonly minDist?: number;
   /** The maximum number of tiles from the end of the biome */
   readonly maxDist?: number;
}

type BiomeGenerationInfo = {
   readonly minHeight?: number;
   readonly maxHeight?: number;
   readonly minTemperature?: number;
   readonly maxTemperature?: number;
   readonly minHumidity?: number;
   readonly maxHumidity?: number;
}

type Biome = {
   readonly name: BiomeName;
   readonly generationInfo?: Readonly<BiomeGenerationInfo>;
   readonly tiles: ReadonlyArray<TileGenerationInfo>;
}

const BIOMES: ReadonlyArray<Biome> = [
   {
      name: "magmaFields",
      tiles: [
         {
            info: {
               type: TileType.lava,
               isWall: false
            },
            minWeight: 0.2,
            minDist: 3
         },
         {
            info: {
               type: TileType.magma,
               isWall: false
            }
         }
      ]
   },
   {
      name: "mountains",
      generationInfo: {
         minHeight: 0.8
      },
      tiles: [
         {
            info: {
               type: TileType.rock,
               isWall: true
            },
            minWeight: 0.8,
            minDist: 2
         },
         {
            info: {
               type: TileType.rock,
               isWall: false
            }
         }
      ]
   },
   {
      name: "tundra",
      generationInfo: {
         maxTemperature: 0.3,
         maxHumidity: 0.5
      },
      tiles: [
         {
            info: {
               type: TileType.rock,
               isWall: true
            },
            minWeight: 0.8,
            minDist: 4
         },
         {
            info: {
               type: TileType.ice,
               isWall: false
            },
            minWeight: 0.6,
            minDist: 3
         },
         {
            info: {
               type: TileType.snow,
               isWall: false
            }
         }
      ]
   },
   {
      name: "desert",
      generationInfo: {
         minTemperature: 0.7,
         maxHumidity: 0.5
      },
      tiles: [
         {
            info: {
               type: TileType.sandstone,
               isWall: true
            },
            minWeight: 0.6,
            minDist: 2
         },
         {
            info: {
               type: TileType.sandstone,
               isWall: false
            },
            minWeight: 0.5,
            minDist: 1
         },
         {
            info: {
               type: TileType.sand,
               isWall: false
            }
         }
      ]
   },
   {
      name: "swamp",
      generationInfo: {
         minTemperature: 0.7,
         minHumidity: 0.7
      },
      tiles: [
         {
            info: {
               type: TileType.dirt,
               isWall: false
            },
            minWeight: 0.5,
            minDist: 2
         },
         {
            info: {
               type: TileType.sludge,
               isWall: false
            }
         }
      ]
   },
   {
      name: "grasslands",
      generationInfo: {},
      tiles: [
         {
            info: {
               type: TileType.grass,
               isWall: false
            }
         }
      ]
   }
];

export default BIOMES;