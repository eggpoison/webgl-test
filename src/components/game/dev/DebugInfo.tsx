import { useEffect, useReducer, useRef, useState } from "react";
import { EntityDebugData, ServerComponentType, Settings, TileType, roundNum } from "webgl-test-shared";
import Entity from "../../../Entity";
import Board from "../../../Board";
import { Tile } from "../../../Tile";

export let updateDebugInfoTile: (tile: Tile | null) => void = () => {};

export let updateDebugInfoEntity: (entity: Entity | null) => void = () => {};

export let setDebugInfoDebugData: (debugData: EntityDebugData | null) => void = () => {};

export let refreshDebugInfo: () => void = () => {};

interface TileDebugInfoProps {
   readonly tile: Tile;
}
const TileDebugInfo = ({ tile }: TileDebugInfoProps) => {
   const chunkX = Math.floor(tile.x / Settings.CHUNK_SIZE);
   const chunkY = Math.floor(tile.y / Settings.CHUNK_SIZE);

   return <>
      <div className="title"><span className="highlight">{tile.type}</span> tile</div>
      
      <p>x: <span className="highlight">{tile.x}</span>, y: <span className="highlight">{tile.y}</span></p>

      <p>Chunk: <span className="highlight">{chunkX}-{chunkY}</span></p>

      <p>Biome: <span className="highlight">{tile.biomeName}</span></p>

      {tile.type === TileType.water ? <>
         <p>Flow direction: <span className="highlight">{Board.getRiverFlowDirection(tile.x, tile.y)}</span></p>
      </> : undefined}

      {tile.type === TileType.grass ? <>
         <p>Temperature: <span className="highlight">{Board.grassInfo[tile.x][tile.y].temperature}</span></p>
         <p>Humidity: <span className="highlight">{Board.grassInfo[tile.x][tile.y].humidity}</span></p>
      </> : undefined}

      <br />
   </>;
}

interface EntityDebugInfoProps {
   readonly entity: Entity;
   readonly debugData: EntityDebugData | null;
}
const EntityDebugInfo = ({ entity, debugData }: EntityDebugInfoProps) => {
   const displayX = roundNum(entity.position.x, 0);
   const displayY = roundNum(entity.position.y, 0);

   const displayVelocityMagnitude = roundNum(entity.velocity.length(), 0);
   const displayAccelerationMagnitude = roundNum(entity.acceleration.length(), 0);

   const chunks = Array.from(entity.chunks).map(chunk => `${chunk.x}-${chunk.y}`);
   const chunkDisplayText = chunks.reduce((previousValue, chunk, idx) => {
      const newItems = previousValue.slice();
      newItems.push(
         <span key={idx} className="highlight">{chunk}</span>
      );

      if (idx < chunks.length - 1) {
         newItems.push(
            ", "
         );
      }

      return newItems;
   }, [] as Array<JSX.Element | string>);

   return <>
      <div className="title">{entity.type}<span className="id">#{entity.id}</span></div>
      
      <p>x: <span className="highlight">{displayX}</span>, y: <span className="highlight">{displayY}</span></p>

      <p>Velocity: <span className="highlight">{displayVelocityMagnitude}</span></p>
      <p>Acceleration: <span className="highlight">{displayAccelerationMagnitude}</span></p>

      <p>Rotation: <span className="highlight">{entity.rotation.toFixed(2)}</span></p>

      <p>Chunks: {chunkDisplayText}</p>

      {entity.hasServerComponent(ServerComponentType.health) ? (() => {
         const healthComponent = entity.getServerComponent(ServerComponentType.health);

         return <>
            <p>Health: <span className="highlight">{healthComponent.health}/{healthComponent.maxHealth}</span></p>
         </>;
      })() : undefined}

      {debugData !== null ? debugData.debugEntries.map((str, i) => {
         return <p key={i}>{str}</p>;
      }) : undefined}

      <br />
   </>;
}

const DebugInfo = () => {
   const [tile, setTile] = useState<Tile | null>(null);
   const [entity, setEntity] = useState<Entity | null>(null);
   const debugData = useRef<EntityDebugData | null>(null);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      updateDebugInfoTile = (tile: Tile | null): void => {
         setTile(tile);
      }
      
      updateDebugInfoEntity = (entity: Entity | null): void => {
         setEntity(entity);
      }

      refreshDebugInfo = (): void => {
         forceUpdate();
      }

      setDebugInfoDebugData = (newDebugData: EntityDebugData | null): void => {
         debugData.current = newDebugData;
      }
   }, []);

   return <div id="debug-info">
      {tile !== null ? <TileDebugInfo tile={tile} /> : undefined}
      {entity !== null ? <EntityDebugInfo entity={entity} debugData={debugData.current} /> : undefined}
   </div>;
}

export default DebugInfo;