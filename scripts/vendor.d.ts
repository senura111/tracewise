// Minimal types for the two small, untyped dev-only packages used by scripts/screenshots.ts.

declare module "gifenc" {
  type Palette = number[][];
  const gifenc: {
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): Palette;
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette): Uint8Array;
    GIFEncoder(): {
      writeFrame(index: Uint8Array, width: number, height: number, options: { palette: Palette; delay?: number }): void;
      finish(): void;
      bytes(): Uint8Array;
    };
  };
  export default gifenc;
}

declare module "pngjs" {
  const pngjs: {
    PNG: { sync: { read(buffer: Buffer): { width: number; height: number; data: Uint8Array } } };
  };
  export default pngjs;
}
