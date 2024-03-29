import { SETTINGS, TileType, distance, randInt } from "webgl-test-shared";
import Camera from "./Camera";
import Board from "./Board";

const AUDIO_FILE_PATHS = [
   "item-pickup.mp3",
   "rock-hit-1.mp3",
   "rock-hit-2.mp3",
   "rock-hit-3.mp3",
   "rock-hit-4.mp3",
   "rock-hit-5.mp3",
   "rock-hit-6.mp3",
   "rock-destroy-1.mp3",
   "rock-destroy-2.mp3",
   "rock-destroy-3.mp3",
   "tree-hit-1.mp3",
   "tree-hit-2.mp3",
   "tree-hit-3.mp3",
   "tree-hit-4.mp3",
   "tree-destroy-1.mp3",
   "tree-destroy-2.mp3",
   "tree-destroy-3.mp3",
   "tree-destroy-4.mp3",
   "goblin-hurt-1.mp3",
   "goblin-hurt-2.mp3",
   "goblin-hurt-3.mp3",
   "goblin-hurt-4.mp3",
   "goblin-hurt-5.mp3",
   "goblin-die-1.mp3",
   "goblin-die-2.mp3",
   "goblin-die-3.mp3",
   "goblin-die-4.mp3",
   "goblin-angry-1.mp3",
   "goblin-angry-2.mp3",
   "goblin-angry-3.mp3",
   "goblin-angry-4.mp3",
   "goblin-escape-1.mp3",
   "goblin-escape-2.mp3",
   "goblin-escape-3.mp3",
   "goblin-ambient-1.mp3",
   "goblin-ambient-2.mp3",
   "goblin-ambient-3.mp3",
   "goblin-ambient-4.mp3",
   "goblin-ambient-5.mp3",
   "plainsperson-hurt-1.mp3",
   "plainsperson-hurt-2.mp3",
   "plainsperson-hurt-3.mp3",
   "plainsperson-die-1.mp3",
   "barbarian-hurt-1.mp3",
   "barbarian-hurt-2.mp3",
   "barbarian-hurt-3.mp3",
   "barbarian-die-1.mp3",
   "barbarian-ambient-1.mp3",
   "barbarian-ambient-2.mp3",
   "barbarian-angry-1.mp3",
   "sand-walk-1.mp3",
   "sand-walk-2.mp3",
   "sand-walk-3.mp3",
   "sand-walk-4.mp3",
   "rock-walk-1.mp3",
   "rock-walk-2.mp3",
   "rock-walk-3.mp3",
   "rock-walk-4.mp3",
   "zombie-ambient-1.mp3",
   "zombie-ambient-2.mp3",
   "zombie-ambient-3.mp3",
   "zombie-hurt-1.mp3",
   "zombie-hurt-2.mp3",
   "zombie-hurt-3.mp3",
   "zombie-die-1.mp3",
   "zombie-dig-2.mp3",
   "zombie-dig-3.mp3",
   "zombie-dig-4.mp3",
   "zombie-dig-5.mp3",
   "cow-ambient-1.mp3",
   "cow-ambient-2.mp3",
   "cow-ambient-3.mp3",
   "cow-hurt-1.mp3",
   "cow-hurt-2.mp3",
   "cow-hurt-3.mp3",
   "cow-die-1.mp3",
   "grass-walk-1.mp3",
   "grass-walk-2.mp3",
   "grass-walk-3.mp3",
   "grass-walk-4.mp3",
   "snow-walk-1.mp3",
   "snow-walk-2.mp3",
   "snow-walk-3.mp3",
   "building-hit-1.mp3",
   "building-hit-2.mp3",
   "building-destroy-1.mp3",
   "water-flowing-1.mp3",
   "water-flowing-2.mp3",
   "water-flowing-3.mp3",
   "water-flowing-4.mp3",
   "water-splash-1.mp3",
   "water-splash-2.mp3",
   "water-splash-3.mp3",
   "berry-bush-hit-1.mp3",
   "berry-bush-hit-2.mp3",
   "berry-bush-hit-3.mp3",
   "berry-bush-destroy-1.mp3",
   "fish-hurt-1.mp3",
   "fish-hurt-2.mp3",
   "fish-hurt-3.mp3",
   "fish-hurt-4.mp3",
   "fish-die-1.mp3"
] as const;

export type AudioFilePath = typeof AUDIO_FILE_PATHS[number];

// @Memory
export const ROCK_HIT_SOUNDS: ReadonlyArray<AudioFilePath> = ["rock-hit-1.mp3", "rock-hit-2.mp3", "rock-hit-3.mp3", "rock-hit-4.mp3", "rock-hit-5.mp3", "rock-hit-6.mp3"];
export const ROCK_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath> = ["rock-destroy-1.mp3", "rock-destroy-2.mp3", "rock-destroy-3.mp3"];

let audioContext: AudioContext;
let audioBuffers: Record<AudioFilePath, AudioBuffer>;

interface Sound {
   readonly volume: number;
   x: number;
   y: number;
   readonly gainNode: GainNode;
}

const activeSounds = new Array<Sound>();

// Must be called after a user action
export function createAudioContext(): void {
   audioContext = new AudioContext()
}

export async function setupAudio(): Promise<void> {
   const tempAudioBuffers: Partial<Record<AudioFilePath, AudioBuffer>> = {};
   for (const filePath of AUDIO_FILE_PATHS) {
      const response = await fetch(require("./sounds/" + filePath));
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      tempAudioBuffers[filePath] = audioBuffer;
   }
   audioBuffers = tempAudioBuffers as Record<AudioFilePath, AudioBuffer>;
}

const calculateSoundVolume = (volume: number, x: number, y: number): number => {
   // Calculate final volume accounting for distance
   let distanceFromPlayer = distance(Camera.position.x, Camera.position.y, x, y);
   distanceFromPlayer /= 150;
   if (distanceFromPlayer < 1) {
      distanceFromPlayer = 1;
   }

   const finalVolume = volume / (distanceFromPlayer * distanceFromPlayer);
   return finalVolume;
}

export function playSound(filePath: AudioFilePath, volume: number, sourceX: number, sourceY: number): void {
   const audioBuffer = audioBuffers[filePath];

   const gainNode = audioContext.createGain();
   gainNode.gain.value = calculateSoundVolume(volume, sourceX, sourceY);
   gainNode.connect(audioContext.destination);
   
   const trackSource = audioContext.createBufferSource();
   trackSource.buffer = audioBuffer;
   trackSource.connect(gainNode);

   trackSource.start();

   const soundInfo = {
      volume: volume,
      x: sourceX,
      y: sourceY,
      gainNode: gainNode
   };
   activeSounds.push(soundInfo);

   trackSource.onended = () => {
      const idx = activeSounds.indexOf(soundInfo);
      if (idx !== -1) {
         activeSounds.splice(idx, 1);
      }
   }
}

export function updateSoundEffectVolume(): void {
   for (let i = 0; i < activeSounds.length; i++) {
      const sound = activeSounds[i];
      sound.gainNode.gain.value = calculateSoundVolume(sound.volume, sound.x, sound.y);
   }
}

export function playBuildingHitSound(sourceX: number, sourceY: number): void {
   playSound(("building-hit-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.2, sourceX, sourceY);
}

export function playRiverSounds(): void {
   const minTileX = Camera.minVisibleChunkX * SETTINGS.CHUNK_SIZE;
   const maxTileX = (Camera.maxVisibleChunkX + 1) * SETTINGS.CHUNK_SIZE - 1;
   const minTileY = Camera.minVisibleChunkY * SETTINGS.CHUNK_SIZE;
   const maxTileY = (Camera.maxVisibleChunkY + 1) * SETTINGS.CHUNK_SIZE - 1;

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getEdgeTile(tileX, tileY);
         if (tile === null) {
            continue;
         }

         if (tile.type === TileType.water && Math.random() < 0.1 / SETTINGS.TPS) {
            const x = (tileX + Math.random()) * SETTINGS.TILE_SIZE;
            const y = (tileY + Math.random()) * SETTINGS.TILE_SIZE;
            playSound(("water-flowing-" + randInt(1, 4) + ".mp3") as AudioFilePath, 0.2, x, y);
         }
      }
   }
}