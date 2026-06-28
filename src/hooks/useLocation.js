import { useState, useEffect } from "react";

export function useLocation() {
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) { setCoords({ lat: 43.6532, lng: -79.3832 }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 43.6532, lng: -79.3832 }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);
  return { coords };
}
