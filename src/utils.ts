import { randFloat } from "webgl-test-shared";

export class Point3 {
   public x: number;
   public y: number;
   public z: number;

   constructor(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
   }

   public add(other: Point3): Point3 {
      return new Point3(
         this.x + other.x,
         this.y + other.y,
         this.z + other.z
      );
   };

   public subtract(other: Point3): Point3 {
      return new Point3(
         this.x - other.x,
         this.y - other.y,
         this.z - other.z
      );
   }

   public dot(other: Point3): number {
      return this.x * other.x + this.y * other.y + this.z * other.z;
   }

   public distanceFrom(other: Point3): number {
      const distance = Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2) + Math.pow(this.z - other.z, 2));
      return distance;
   };

   public copy(): Point3 {
      return new Point3(this.x, this.y, this.z);
   }

   public convertToVector(other?: Point3): Vector3 {
      const x = this.x - (typeof other !== "undefined" ? other.x : 0);
      const y = this.y - (typeof other !== "undefined" ? other.y : 0);
      const z = this.z - (typeof other !== "undefined" ? other.z : 0);

      const radius = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));

      const inclination = Math.acos(z / radius);
      
      let azimuth!: number;
      if (x > 0) {
         azimuth = Math.atan(y / x);
      } else if (x < 0 && y >= 0) {
         azimuth = Math.atan(y / x) + Math.PI;
      } else if (x < 0 && y < 0) {
         azimuth = Math.atan(y / x) - Math.PI;
      } else if (x === 0 && y > 0) {
         azimuth = Math.PI / 2;
      } else if (x === 0 && y < 0) {
         azimuth = -Math.PI / 2;
      } else { // x = 0, y = 0
         // Angle doesn't really matter
         azimuth = 0;
      }

      return new Vector3(radius, inclination, azimuth);
   }
}

// Uses a spherical point system (pain)
export class Vector3 {
   public radius: number;
   public inclination: number;
   public azimuth: number;

   constructor(radius: number, inclination: number, azimuth: number) {
      this.radius = radius;
      this.inclination = inclination;
      this.azimuth = azimuth;
   }

   public convertToPoint(): Point3 {
      const x = this.radius * Math.cos(this.azimuth) * Math.sin(this.inclination);
      const y = this.radius * Math.sin(this.azimuth) * Math.sin(this.inclination);
      const z = this.radius * Math.cos(this.inclination);
      return new Point3(x, y, z);
   }

   public add(other: Vector3): Vector3 {
      return (this.convertToPoint().add(other.convertToPoint())).convertToVector();
   }

   public copy(): Vector3 {
      return new Vector3(this.radius, this.inclination, this.azimuth);
   }

   public static randomUnitVector(): Vector3 {
      const inclination = randFloat(0, Math.PI * 2);
      const azimuth = randFloat(0, Math.PI * 2);
      return new Vector3(1, inclination, azimuth);
   }
}

export function imageIsLoaded(image: HTMLImageElement): Promise<boolean> {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   });
}

const isDevBool = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
/**
 * Checks if the game is in development mode.
 * @returns If the game is in development mode.
 */
 export function isDev(): boolean {
   return isDevBool;
}

export function lerp(start: number, end: number, amount: number): number {
   return start * (1 - amount) + end * amount;
}

type SleepResolve = {
   resolve(value: void | PromiseLike<void>): void;
   timeRemaining: number;
}

let sleepFunctionResolves = new Array<SleepResolve>();

const INTERVAL_TIME = 2;
setInterval(() => {
   for (let i = 0; i < sleepFunctionResolves.length; i++) {
      const sleepResolve = sleepFunctionResolves[i];

      sleepResolve.timeRemaining -= INTERVAL_TIME;
      if (sleepResolve.timeRemaining <= 0) {
         sleepResolve.resolve();
         sleepFunctionResolves.splice(i, 1);
      }
   }
}, INTERVAL_TIME);

export function sleep(ms: number): Promise<void> {
   return new Promise(resolve => {
      sleepFunctionResolves.push({
         resolve: resolve,
         timeRemaining: ms
      });
   });
}