import { gl } from "../webgl";

class ObjectBufferContainer {
   private readonly objectsPerBuffer: number;
   private readonly objectSize: number;

   private readonly buffers = new Array<WebGLBuffer>();

   private readonly objectEntryIndexes: Record<number, number> = {};

   private readonly availableIndexes = new Array<number>();
   
   constructor(objectsPerBuffer: number, objectSize: number) {
      this.objectsPerBuffer = objectsPerBuffer;
      this.objectSize = objectSize;

      this.createNewBuffer();
   }

   private createNewBuffer(): void {
      // Make the data empty for now
      const data = new Float32Array(this.objectsPerBuffer * this.objectSize);
      
      // Create buffer
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

      this.buffers.push(buffer);

      // Add available indexes
      const bufferIdx = this.buffers.length - 1;
      for (let i = bufferIdx * this.objectsPerBuffer; i < (bufferIdx + 1) * this.objectsPerBuffer; i++) {
         this.availableIndexes.push(i);
      }
   }

   public addObjectData(objectID: number, data: Float32Array): void {
      const dataLength = data.byteLength / Float32Array.BYTES_PER_ELEMENT;
      if (dataLength !== this.objectSize) {
         throw new Error("Object data length (" + dataLength + ") didn't match objectSize (" + this.objectSize + ").");
      }

      // @Incomplete - Expand the buffer
      if (this.availableIndexes.length === 0) {
         throw new Error();
      }
      
      // Choose an available index to add the object to
      const index = this.availableIndexes[0];
      this.objectEntryIndexes[objectID] = index;
      
      const bufferIndex = Math.floor(index / this.objectsPerBuffer);
      const buffer = this.buffers[bufferIndex];

      
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const indexInBuffer = index % this.objectsPerBuffer;
      // @Temporary
      if (indexInBuffer >= this.objectsPerBuffer) {
         console.warn("AAA");
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, indexInBuffer * this.objectSize * Float32Array.BYTES_PER_ELEMENT, data)

      this.availableIndexes.splice(0, 1);
   }

   public removeObject(objectID: number) {
      if (!this.objectEntryIndexes.hasOwnProperty(objectID)) {
         throw new Error("No index for entity with ID " + objectID + ".");
      }
      
      const index = this.objectEntryIndexes[objectID];

      const blankData = new Float32Array(this.objectSize);

      const bufferIndex = Math.floor(index / this.objectsPerBuffer);
      const buffer = this.buffers[bufferIndex];

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const indexInBuffer = index % this.objectsPerBuffer;
      // @Temporary
      if (indexInBuffer >= this.objectsPerBuffer) {
         console.warn("BBB");
      }
      gl.bufferSubData(gl.ARRAY_BUFFER, indexInBuffer * this.objectSize * Float32Array.BYTES_PER_ELEMENT, blankData);

      delete this.objectEntryIndexes[objectID];
      this.availableIndexes.push(index);
   }

   public getBuffers(): ReadonlyArray<WebGLBuffer> {
      return this.buffers;
   }
}

export default ObjectBufferContainer;