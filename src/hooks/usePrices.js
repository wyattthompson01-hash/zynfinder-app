import { useState, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

export function usePrices(storeId) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    if (!storeId || !SUPABASE_URL) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/prices?store_id=eq.${storeId}&order=reported_at.asc&limit=50`,
        { headers }
      );
      const data = await res.json();
      if (Array.isArray(data)) setPrices(data);
    } catch (e) {
      console.warn("Prices fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const submitPrice = useCallback(async ({ storeId, price, canSize = 15, userId = null }) => {
    if (!SUPABASE_URL || !price) return;
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) return;

    // Insert price record
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/prices`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          store_id: storeId,
          price: priceVal,
          can_size: canSize,
          reported_by: userId || null,
        }),
      });

      // Denormalize latest price onto the store row for fast list display
      await fetch(`${SUPABASE_URL}/rest/v1/stores?id=eq.${storeId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ latest_price: priceVal, latest_can_size: canSize }),
      });

      // Append optimistically to local state
      setPrices((prev) => [
        ...prev,
        { price: priceVal, can_size: canSize, reported_at: new Date().toISOString() },
      ]);

      return { success: true };
    } catch (e) {
      console.warn("Price submit failed:", e);
      return { success: false, error: e.message };
    }
  }, []);

  return { prices, loading, fetchPrices, submitPrice };
}
