import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

const SEED_STORES = [
  { id: "1", name: "Petro-Canada", address: "320 Bloor St W, Toronto, ON", lat: 43.6649, lng: -79.4102, type: "gas", status: "verified", confirmations: 12, reports: 14, flavors: ["Cool Mint", "Citrus"], strength: "Both", last_seen: "2024-11-20T10:00:00Z", reported_at: "2024-10-01T10:00:00Z", latest_price: null },
  { id: "2", name: "Mac's Convenience", address: "88 College St, Toronto, ON", lat: 43.6588, lng: -79.4008, type: "convenience", status: "verified", confirmations: 8, reports: 9, flavors: ["Cool Mint", "Spearmint"], strength: "3mg", last_seen: "2024-11-18T14:00:00Z", reported_at: "2024-10-05T10:00:00Z", latest_price: null },
];

// Worldwide geocoding — no country restriction
async function geocodeAddress(address) {
  try {
    const query = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "SnusWorld/1.0" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { return null; }
}

export function useStores(coords) {
  const [stores, setStores] = useState(SEED_STORES);
  const [loading, setLoading] = useState(false);

  const fetchStores = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/stores?status=neq.gone&order=reported_at.desc&limit=500`,
        { headers }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      if (data.length > 0) setStores(data);
    } catch (err) {
      console.warn("Using seed data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const addStore = useCallback(async (storeData) => {
    let lat = storeData.lat;
    let lng = storeData.lng;

    const geo = await geocodeAddress(storeData.address);
    if (geo) { lat = geo.lat; lng = geo.lng; }

    const optimistic = {
      id: `temp-${Date.now()}`,
      ...storeData, lat, lng,
      status: "unverified", confirmations: 0, reports: 1,
      latest_price: storeData.price ? parseFloat(storeData.price) : null,
      latest_can_size: storeData.canSize || 15,
    };
    setStores((prev) => [optimistic, ...prev]);

    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/stores`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: storeData.name,
          address: storeData.address,
          lat, lng,
          type: storeData.type,
          flavors: storeData.flavors,
          strength: storeData.strength,
          notes: storeData.notes,
          status: "unverified",
          confirmations: 0,
          reports: 1,
          latest_price: storeData.price ? parseFloat(storeData.price) : null,
          latest_can_size: storeData.canSize || 15,
        }),
      });
      if (res.ok) {
        const [created] = await res.json();
        setStores((prev) => prev.map((s) => s.id === optimistic.id ? created : s));

        // Also insert into prices table if a price was provided
        if (storeData.price && created?.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/prices`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              store_id: created.id,
              price: parseFloat(storeData.price),
              can_size: storeData.canSize || 15,
            }),
          });
        }
      }
    } catch (err) { console.warn("Saved locally:", err.message); }
  }, []);

  const verifyStore = useCallback(async (storeId, confirmed) => {
    setStores((prev) =>
      prev.map((s) => {
        if (s.id !== storeId) return s;
        const confirmations = confirmed ? s.confirmations + 1 : s.confirmations;
        const reports = s.reports + 1;
        const status = confirmations >= 3 ? "verified" : (reports - confirmations) >= 3 ? "gone" : "pending";
        return { ...s, confirmations, reports, status, last_seen: confirmed ? new Date().toISOString() : s.last_seen };
      })
    );
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/verifications`, {
        method: "POST", headers,
        body: JSON.stringify({ store_id: storeId, confirmed }),
      });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/verifications?store_id=eq.${storeId}&select=confirmed`, { headers });
      const verifs = await res.json();
      const yesCount = verifs.filter((v) => v.confirmed).length;
      const noCount  = verifs.filter((v) => !v.confirmed).length;
      const newStatus = yesCount >= 3 ? "verified" : noCount >= 3 && noCount > yesCount ? "gone" : "pending";
      await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`, {
        method: "PATCH", headers,
        body: JSON.stringify({
          confirmations: yesCount,
          reports: verifs.length,
          status: newStatus,
          ...(confirmed ? { last_seen: new Date().toISOString() } : {}),
        }),
      });
    } catch (err) { console.warn("Verify saved locally:", err.message); }
  }, []);

  // Call this after submitting a price so the store list reflects the new price immediately
  const updateStorePrice = useCallback((storeId, price, canSize) => {
    setStores((prev) =>
      prev.map((s) => s.id === storeId || String(s.id) === String(storeId)
        ? { ...s, latest_price: price, latest_can_size: canSize }
        : s
      )
    );
  }, []);

  return { stores, loading, addStore, verifyStore, fetchStores, updateStorePrice };
}
