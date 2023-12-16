import { distance } from "webgl-test-shared";
import Camera from "./Camera";

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
   "zombie-ambient-3.mp3"
] as const;

export type AudioFilePath = typeof AUDIO_FILE_PATHS[number];

// @Memory
export const ROCK_HIT_SOUNDS: ReadonlyArray<AudioFilePath> = ["rock-hit-1.mp3", "rock-hit-2.mp3", "rock-hit-3.mp3", "rock-hit-4.mp3", "rock-hit-5.mp3", "rock-hit-6.mp3"];
export const ROCK_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath> = ["rock-destroy-1.mp3", "rock-destroy-2.mp3", "rock-destroy-3.mp3"];

let audioContext: AudioContext;
let audioBuffers: Record<AudioFilePath, AudioBuffer>;

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

export function playSound(filePath: AudioFilePath, volume: number, sourceX: number, sourceY: number): void {
   const audioBuffer = audioBuffers[filePath];

   // Calculate final volume accounting for distance
   let distanceFromPlayer = distance(Camera.position.x, Camera.position.y, sourceX, sourceY);
   distanceFromPlayer /= 150;
   if (distanceFromPlayer < 1) {
      distanceFromPlayer = 1;
   }
   const finalVolume = volume / (distanceFromPlayer * distanceFromPlayer);

   const gainNode = audioContext.createGain();
   gainNode.gain.value = finalVolume;
   gainNode.connect(audioContext.destination);
   
   const trackSource = audioContext.createBufferSource();
   trackSource.buffer = audioBuffer;
   trackSource.connect(gainNode);

   trackSource.start();
}