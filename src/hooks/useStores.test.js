import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useStores } from "./useStores";

// Mirrors the SEED_STORES constants in the source file
const SEED_STORE_1 = { id: "1", name: "Petro-Canada", confirmations: 12, reports: 14, status: "verified" };
const SEED_STORE_2 = { id: "2", name: "Mac's Convenience", confirmations: 8, reports: 9, status: "verified" };

function ok(data) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
}

async function mountedHook(coords = null) {
  const hook = renderHook(() => useStores(coords));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe("useStores", () => {
  describe("initial load", () => {
    it("starts with seed stores when server fetch fails", async () => {
      const { result } = await mountedHook();
      expect(result.current.stores.length).toBeGreaterThanOrEqual(2);
      expect(result.current.stores[0].name).toBe("Petro-Canada");
    });

    it("replaces seed data with server data on successful fetch", async () => {
      const serverStores = [
        { id: "s1", name: "Server Store", status: "verified", confirmations: 5, reports: 6 },
      ];
      ok(serverStores); // must be queued BEFORE renderHook since fetchStores runs on mount
      const hook = renderHook(() => useStores(null));
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      expect(hook.result.current.stores).toEqual(serverStores);
    });

    it("keeps seed data if server returns empty array", async () => {
      ok([]); // empty → hook guards with `if (data.length > 0)`
      const hook = renderHook(() => useStores(null));
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      expect(hook.result.current.stores.length).toBeGreaterThan(0);
    });
  });

  describe("verifyStore — optimistic counter updates", () => {
    // Status logic: confirmations>=3 → "verified"  (checked first)
    //               (reports-confirmations)>=3 → "gone"
    //               else → "pending"
    //
    // Both SEED_STORES have confirmations>=3, so they always stay "verified"
    // in the optimistic update.  The "gone" path is only reachable for stores
    // with confirmations < 3.

    it("increments confirmations and reports when vote is confirmed", async () => {
      const { result } = await mountedHook();

      await act(async () => {
        await result.current.verifyStore("1", true);
      });

      const store = result.current.stores.find((s) => s.id === "1");
      expect(store.confirmations).toBe(SEED_STORE_1.confirmations + 1);
      expect(store.reports).toBe(SEED_STORE_1.reports + 1);
      expect(store.status).toBe("verified"); // 13 >= 3 → stays verified
    });

    it("increments reports (not confirmations) when vote is not confirmed", async () => {
      const { result } = await mountedHook();

      await act(async () => {
        await result.current.verifyStore("1", false);
      });

      const store = result.current.stores.find((s) => s.id === "1");
      expect(store.confirmations).toBe(SEED_STORE_1.confirmations); // unchanged
      expect(store.reports).toBe(SEED_STORE_1.reports + 1);
    });

    it("does not touch other stores when verifying one", async () => {
      const { result } = await mountedHook();

      await act(async () => {
        await result.current.verifyStore("1", false);
      });

      const untouched = result.current.stores.find((s) => s.id === "2");
      expect(untouched.confirmations).toBe(SEED_STORE_2.confirmations);
      expect(untouched.reports).toBe(SEED_STORE_2.reports);
    });

    it("updates last_seen when vote is confirmed", async () => {
      const { result } = await mountedHook();
      const before = result.current.stores.find((s) => s.id === "1").last_seen;

      await act(async () => {
        await result.current.verifyStore("1", true);
      });

      const after = result.current.stores.find((s) => s.id === "1").last_seen;
      expect(after).not.toBe(before);
    });

    it("does not update last_seen when vote is not confirmed", async () => {
      const { result } = await mountedHook();
      const before = result.current.stores.find((s) => s.id === "1").last_seen;

      await act(async () => {
        await result.current.verifyStore("1", false);
      });

      const after = result.current.stores.find((s) => s.id === "1").last_seen;
      expect(after).toBe(before);
    });
  });

  describe("verifyStore — server sync", () => {
    it("POSTs the vote to the verifications table", async () => {
      const { result } = await mountedHook();
      // Queue server mocks AFTER mount so fetchStores doesn't consume them
      ok({}); // POST verifications
      ok([]);  // GET verifications (returns empty — caught gracefully)
      ok({}); // PATCH stores

      await act(async () => {
        await result.current.verifyStore("1", true);
      });

      const postCall = global.fetch.mock.calls.find(
        ([url, opts]) =>
          url.includes("/verifications") && opts?.method === "POST"
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall[1].body);
      expect(body.store_id).toBe("1");
      expect(body.confirmed).toBe(true);
    });

    it("PATCHes store status to 'verified' when server counts reach threshold", async () => {
      const { result } = await mountedHook();
      ok({});  // POST
      ok([{ confirmed: true }, { confirmed: true }, { confirmed: true }]); // GET
      ok({});  // PATCH

      await act(async () => {
        await result.current.verifyStore("1", true);
      });

      const patchCall = global.fetch.mock.calls.find(
        ([url, opts]) =>
          url.includes("/stores?id=eq.1") && opts?.method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(patchCall[1].body);
      expect(body.status).toBe("verified");
    });

    it("PATCHes store status to 'gone' when no-votes dominate on the server", async () => {
      const { result } = await mountedHook();
      ok({});  // POST
      ok([{ confirmed: false }, { confirmed: false }, { confirmed: false }]); // GET — 3 no's
      ok({});  // PATCH

      await act(async () => {
        await result.current.verifyStore("1", false);
      });

      const patchCall = global.fetch.mock.calls.find(
        ([url, opts]) =>
          url.includes("/stores?id=eq.1") && opts?.method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse(patchCall[1].body);
      expect(body.status).toBe("gone");
    });
  });

  describe("addStore", () => {
    it("sends a POST to the stores table with the correct fields", async () => {
      const { result } = await mountedHook();
      ok(null);   // Nominatim geocoding — no result
      ok([{ id: "new-1", name: "New Store", status: "unverified", confirmations: 0, reports: 1 }]);

      await act(async () => {
        await result.current.addStore({
          name: "New Store",
          address: "123 Test St, Toronto, ON",
          type: "convenience",
          flavors: ["Cool Mint"],
          strength: "3mg",
          notes: "test",
          price: null,
          canSize: 15,
        });
      });

      const postCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes("/stores") && opts?.method === "POST"
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall[1].body);
      expect(body.name).toBe("New Store");
      expect(body.status).toBe("unverified");
      expect(body.confirmations).toBe(0);
    });

    it("replaces the temp optimistic entry with the server-returned store", async () => {
      const { result } = await mountedHook();
      ok(null); // geocoding
      ok([{ id: "server-99", name: "New Store", status: "unverified" }]);

      await act(async () => {
        await result.current.addStore({
          name: "New Store",
          address: "1 Test St",
          type: "gas",
          flavors: [],
          strength: "Unsure",
          notes: "",
          price: null,
          canSize: 15,
        });
      });

      expect(result.current.stores.find((s) => s.id === "server-99")).toBeTruthy();
      expect(result.current.stores.find((s) => String(s.id).startsWith("temp-"))).toBeFalsy();
    });

    it("uses geocoded coordinates when Nominatim returns a result", async () => {
      const { result } = await mountedHook();
      // Nominatim returns coordinates
      ok([{ lat: "43.7", lon: "-79.4" }]); // geocodeAddress fetches from Nominatim
      ok([{ id: "g1", name: "Geo Store", lat: 43.7, lng: -79.4, status: "unverified" }]);

      await act(async () => {
        await result.current.addStore({
          name: "Geo Store",
          address: "123 Anywhere St",
          type: "gas",
          flavors: [],
          strength: "Unsure",
          notes: "",
          price: null,
          lat: 0,
          lng: 0,
          canSize: 15,
        });
      });

      const postCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes("/stores") && opts?.method === "POST"
      );
      const body = JSON.parse(postCall[1].body);
      expect(body.lat).toBe(43.7);
      expect(body.lng).toBe(-79.4);
    });

    it("also posts to the prices table when a price is provided", async () => {
      const { result } = await mountedHook();
      ok(null);  // geocoding
      ok([{ id: "p1", name: "Price Store", status: "unverified" }]); // POST stores
      ok({});    // POST prices

      await act(async () => {
        await result.current.addStore({
          name: "Price Store",
          address: "1 Main St",
          type: "gas",
          flavors: [],
          strength: "3mg",
          notes: "",
          price: "22.99",
          canSize: 15,
        });
      });

      const pricePost = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes("/prices") && opts?.method === "POST"
      );
      expect(pricePost).toBeTruthy();
      const body = JSON.parse(pricePost[1].body);
      expect(body.price).toBe(22.99);
      expect(body.can_size).toBe(15);
    });
  });

  describe("updateStorePrice", () => {
    it("updates latest_price and latest_can_size in local state", async () => {
      const { result } = await mountedHook();

      act(() => {
        result.current.updateStorePrice("1", 24.99, 20);
      });

      const store = result.current.stores.find((s) => s.id === "1");
      expect(store.latest_price).toBe(24.99);
      expect(store.latest_can_size).toBe(20);
    });

    it("matches store id when passed as a number", async () => {
      const { result } = await mountedHook();

      act(() => {
        result.current.updateStorePrice(1, 19.99, 15); // numeric id vs string "1"
      });

      const store = result.current.stores.find((s) => s.id === "1");
      expect(store.latest_price).toBe(19.99);
    });

    it("does not modify other stores", async () => {
      const { result } = await mountedHook();

      act(() => {
        result.current.updateStorePrice("1", 24.99, 20);
      });

      const other = result.current.stores.find((s) => s.id === "2");
      expect(other.latest_price).toBe(SEED_STORE_2.latest_price ?? null);
    });
  });
});
