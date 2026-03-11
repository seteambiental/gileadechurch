import { useState, useEffect } from "react";

// Igreja Gileade: Rua Araças 103, Uberaba, Curitiba, PR
const CHURCH_LAT = -25.4523;
const CHURCH_LNG = -49.2327;
const MAX_DISTANCE_METERS = 100;

function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation() {
  const [isNearChurch, setIsNearChurch] = useState(true); // TODO: reativar geolocalização após testes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      setError("Geolocalização não suportada");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const distance = getDistanceInMeters(
          position.coords.latitude,
          position.coords.longitude,
          CHURCH_LAT,
          CHURCH_LNG
        );
        setIsNearChurch(distance <= MAX_DISTANCE_METERS);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { isNearChurch, loading, error };
}
