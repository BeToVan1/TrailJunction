import type { Coordinate, MapExtent } from "./trail-catalog.ts";

export function webMercator([longitude, latitude]: Coordinate): [number, number] {
  const radius = 6378137;
  const radians = Math.PI / 180;
  const clampedLatitude = Math.max(-85.051129, Math.min(85.051129, latitude));
  return [radius * longitude * radians, radius * Math.asinh(Math.tan(clampedLatitude * radians))];
}

export function mapPoint(point: Coordinate, extent: MapExtent, width: number, height: number) {
  const [x, y] = webMercator(point);
  return [
    (x - extent.west) * width / (extent.east - extent.west),
    (extent.north - y) * height / (extent.north - extent.south),
  ];
}

export function squareTrailExtent(lines: Coordinate[][]): MapExtent {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const line of lines) {
    for (const point of line) {
      const [x, y] = webMercator(point);
      west = Math.min(west, x);
      south = Math.min(south, y);
      east = Math.max(east, x);
      north = Math.max(north, y);
    }
  }
  // A square export preserves the requested bounds at a square image size.
  const half = Math.max(650, (east - west) * .63, (north - south) * .63);
  const centerX = (west + east) / 2;
  const centerY = (south + north) / 2;
  return { west: centerX - half, south: centerY - half, east: centerX + half, north: centerY + half };
}
