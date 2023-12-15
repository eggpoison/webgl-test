const AUDIO_FILE_PATHS = [
   "item-pickup.mp3"
] as const;

type AudioFilePath = typeof AUDIO_FILE_PATHS[number];

let audioContext: AudioContext;
let audioBuffers: Record<AudioFilePath, AudioBuffer>;

// Must be called after a user action
export function createAudioContext(): void {
   audioContext = new AudioContext()
}

export async function setupAudio(): Promise<void> {
   if(1+1===2)return;
   console.log(audioContext);
   const tempAudioBuffers: Partial<Record<AudioFilePath, AudioBuffer>> = {};
   for (const filePath of AUDIO_FILE_PATHS) {
      const response = await fetch("http://localhost:3000/src/sounds/" + filePath);
      console.log(response);
      const arrayBuffer = await response.arrayBuffer();
      console.log(arrayBuffer);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      tempAudioBuffers[filePath] = audioBuffer;
   }
   audioBuffers = tempAudioBuffers as Record<AudioFilePath, AudioBuffer>;
}

export function playSound(filePath: AudioFilePath): void {
   if(1+1===2)return;
   const audioBuffer = audioBuffers[filePath];
   
   const trackSource = audioContext.createBufferSource();
   trackSource.buffer = audioBuffer;
   trackSource.connect(audioContext.destination);

   trackSource.start();
}