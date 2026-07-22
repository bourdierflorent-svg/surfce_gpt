export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type PolygonRing = [longitude: number, latitude: number][];

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInMeters(a: GeoPoint, b: GeoPoint): number {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function isPointInPolygon(point: GeoPoint, ring: PolygonRing): boolean {
  if (ring.length < 3) return false;

  let inside = false;
  for (
    let currentIndex = 0, previousIndex = ring.length - 1;
    currentIndex < ring.length;
    previousIndex = currentIndex++
  ) {
    const current = ring[currentIndex];
    const previous = ring[previousIndex];
    if (!current || !previous) continue;

    const [currentLng, currentLat] = current;
    const [previousLng, previousLat] = previous;
    const crossesLatitude = currentLat > point.latitude !== previousLat > point.latitude;
    const intersectionLongitude =
      ((previousLng - currentLng) * (point.latitude - currentLat)) /
        (previousLat - currentLat || Number.EPSILON) +
      currentLng;

    if (crossesLatitude && point.longitude < intersectionLongitude) inside = !inside;
  }

  return inside;
}

export function createCircleRing(center: GeoPoint, radiusMeters: number, steps = 64): PolygonRing {
  const latitudeRadius = radiusMeters / 111_320;
  const longitudeRadius = radiusMeters / (111_320 * Math.cos(toRadians(center.latitude)));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [
      center.longitude + longitudeRadius * Math.cos(angle),
      center.latitude + latitudeRadius * Math.sin(angle),
    ];
  });
}

export function closePolygonRing(ring: PolygonRing): PolygonRing {
  if (ring.length === 0) return [];
  const first = ring[0];
  const last = ring.at(-1);
  if (!first || !last) return ring;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}
