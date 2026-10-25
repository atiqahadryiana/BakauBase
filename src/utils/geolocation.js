export const CHECK_IN_RADIUS_METRES = 30;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceInMetres(pointA, pointB) {
  if (!pointA || !pointB) return Number.POSITIVE_INFINITY;

  const earthRadius = 6371000;
  const latDelta = toRadians(pointB.lat - pointA.lat);
  const lngDelta = toRadians(pointB.lng - pointA.lng);
  const latA = toRadians(pointA.lat);
  const latB = toRadians(pointB.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: Math.round(coords.accuracy),
      }),
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000, ...options },
    );
  });
}
