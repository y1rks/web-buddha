export interface GpsState {
  status: "idle" | "acquiring" | "active" | "error";
  origin: { lat: number; lon: number } | null;
  current: { lat: number; lon: number; accuracy: number } | null;
  rawDistance: number;
  smoothedDistance: number;
  speed: number;
  errorMessage: string;
}

const SMOOTHING_FACTOR = 0.3;
const DEAD_ZONE = 3; // meters
const PERIOD = 20; // meters
const SPEED_MIN = 0.25;
const SPEED_MAX = 2.0;

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceToSpeed(distance: number): number {
  if (distance < DEAD_ZONE) return 1.0;

  // Sine wave: 0m→1.0x, 5m→2.0x, 10m→1.0x, 15m→0.25x, 20m→1.0x
  const mid = (SPEED_MAX + SPEED_MIN) / 2; // 1.125
  const amp = (SPEED_MAX - SPEED_MIN) / 2; // 0.875
  const phase = ((distance - DEAD_ZONE) / PERIOD) * 2 * Math.PI;
  return mid + amp * Math.sin(phase);
}

export function startGpsTracking(
  callback: (state: GpsState) => void,
): () => void {
  const state: GpsState = {
    status: "acquiring",
    origin: null,
    current: null,
    rawDistance: 0,
    smoothedDistance: 0,
    speed: 1.0,
    errorMessage: "",
  };

  callback({ ...state });

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      if (!state.origin) {
        state.origin = { lat: latitude, lon: longitude };
      }

      state.current = { lat: latitude, lon: longitude, accuracy };
      state.status = "active";

      const raw = haversineDistance(
        state.origin.lat,
        state.origin.lon,
        latitude,
        longitude,
      );
      state.rawDistance = raw;

      // Exponential moving average for smoothing
      state.smoothedDistance =
        state.smoothedDistance * (1 - SMOOTHING_FACTOR) + raw * SMOOTHING_FACTOR;

      state.speed = distanceToSpeed(state.smoothedDistance);
      state.errorMessage = "";

      callback({ ...state });
    },
    (error) => {
      state.status = "error";
      state.errorMessage = error.message;
      callback({ ...state });
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
