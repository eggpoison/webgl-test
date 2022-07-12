export function randFloat(min: number, max: number): number {
   return Math.random() * (max - min) + min;
}

export type Coordinates = [number, number];

/**
 * Returns a random integer inclusively.
 * @param min The minimum value of the random number.
 * @param max The maximum value of the random number.
 * @returns A random integer between the min and max values.
 */
export function randInt(min: number, max: number): number {
   return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Point {
   public x: number;
   public y: number;

   constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
   }

   public add(other: Point): Point {
      return new Point(
         this.x + other.x,
         this.y + other.y
      );
   };

   public subtract(other: Point): Point {
      return new Point(
         this.x - other.x,
         this.y - other.y
      );
   }

   public dot(other: Point): number {
      return this.x * other.x + this.y * other.y;
   }

   public distanceFrom(other: Point): number {
      const distance = Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
      return distance;
   }

   public copy(): Point {
      return new Point(this.x, this.y);
   }

   public distanceFromRectangle(minX: number, maxX: number, minY: number, maxY: number): number {
      const dx = Math.max(minX - this.x, 0, this.x - maxX);
      const dy = Math.max(minY - this.y, 0, this.y - maxY);
      return Math.sqrt(dx*dx + dy*dy);
   }

   public angleBetween(other: Point): number {
      const angle = Math.atan2(other.y - this.y, other.x - this.x);
      return angle;
   }

   public convertToVector(other?: Point): Vector {
      const targetPoint = other || new Point(0, 0);

      const distance = this.distanceFrom(targetPoint);
      const angle = targetPoint.angleBetween(this);
      return new Vector(distance, angle);
   }

   public convertTo3D(): Point3 {
      return new Point3(this.x, this.y, 0);
   }
}

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

   public convertTo2D(): Point {
      return new Point(this.x, this.y);
   }
}

export function getRandomAngle() {
   return Math.random() * 360;
}

export class Vector {
   public magnitude: number;
   public direction: number;

   constructor(magnitude: number, direction: number) {
      this.magnitude = magnitude;
      this.direction = direction;
   }

   public convertToPoint(): Point {
      const x = Math.cos(this.direction) * this.magnitude;
      const y = Math.sin(this.direction) * this.magnitude;
      return new Point(x, y);
   }

   public convertTo3D(): Vector3 {
      const point3 = this.convertToPoint().convertTo3D();
      return point3.convertToVector();
   }

   public add(other: Vector): Vector {
      return (this.convertToPoint().add(other.convertToPoint())).convertToVector();
   }

   public copy(): Vector {
      return new Vector(this.magnitude, this.direction);
   }

   public static randomUnitVector(): Vector {
      const theta = randFloat(0, 360);
      return new Vector(1, theta);
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