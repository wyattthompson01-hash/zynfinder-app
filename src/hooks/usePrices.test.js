import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePrices } from "./usePrices";

function ok(data) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
}

describe("usePrices", () => {
  describe("initial state", () => {
    it("starts with empty prices and loading=false", () => {
      const { result } = renderHook(() => usePrices("store-1"));
      expect(result.current.prices).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("fetchPrices", () => {
    it("fetches prices for the given storeId", async () => {
      const mockPrices = [
        { price: 22.99, can_size: 15, reported_at: "2025-01-01T00:00:00Z" },
        { price: 21.50, can_size: 15, reported_at: "2025-01-15T00:00:00Z" },
      ];
      ok(mockPrices);

      const { result } = renderHook(() => usePrices("store-1"));

      await act(async () => { await result.current.fetchPrices(); });

      expect(result.current.prices).toEqual(mockPrices);
    });

    it("returns early without fetching when storeId is falsy", async () => {
      const { result } = renderHook(() => usePrices(null));
      const callsBefore = global.fetch.mock.calls.length;

      await act(async () => { await result.current.fetchPrices(); });

      expect(global.fetch.mock.calls.length).toBe(callsBefore);
    });

    it("sets loading=true during fetch and resets to false after", async () => {
      let resolveResponse;
      global.fetch.mockResolvedValueOnce(
        new Promise((r) => { resolveResponse = r; })
      );

      const { result } = renderHook(() => usePrices("store-1"));

      act(() => { result.current.fetchPrices(); });
      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveResponse({ ok: true, json: () => Promise.resolve([]) });
      });
      expect(result.current.loading).toBe(false);
    });
  });

  describe("submitPrice", () => {
    it("posts price and appends optimistic entry to local state", async () => {
      ok({});  // POST prices
      ok({});  // PATCH stores (denormalize)

      const { result } = renderHook(() => usePrices("store-1"));

      let res;
      await act(async () => {
        res = await result.current.submitPrice({ storeId: "store-1", price: "22.99", canSize: 15 });
      });

      expect(res.success).toBe(true);
      expect(result.current.prices).toHaveLength(1);
      expect(result.current.prices[0].price).toBe(22.99);
      expect(result.current.prices[0].can_size).toBe(15);
    });

    it("returns early without fetching when price is falsy", async () => {
      const { result } = renderHook(() => usePrices("store-1"));
      const callsBefore = global.fetch.mock.calls.length;

      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "" });
      });

      expect(global.fetch.mock.calls.length).toBe(callsBefore);
    });

    it("returns early when price is 0 or negative", async () => {
      const { result } = renderHook(() => usePrices("store-1"));
      const callsBefore = global.fetch.mock.calls.length;

      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "0" });
      });
      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "-5" });
      });

      expect(global.fetch.mock.calls.length).toBe(callsBefore);
    });

    it("returns early when price is not a number", async () => {
      const { result } = renderHook(() => usePrices("store-1"));
      const callsBefore = global.fetch.mock.calls.length;

      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "abc" });
      });

      expect(global.fetch.mock.calls.length).toBe(callsBefore);
    });

    it("sends userId when provided", async () => {
      ok({});
      ok({});

      const { result } = renderHook(() => usePrices("store-1"));

      await act(async () => {
        await result.current.submitPrice({
          storeId: "store-1",
          price: "20",
          canSize: 15,
          userId: "user-abc",
        });
      });

      const postBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(postBody.reported_by).toBe("user-abc");
    });

    it("defaults can_size to 15 when not provided", async () => {
      ok({});
      ok({});

      const { result } = renderHook(() => usePrices("store-1"));

      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "20" });
      });

      const postBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(postBody.can_size).toBe(15);
    });

    it("denormalizes latest_price onto the store row", async () => {
      ok({});
      ok({});

      const { result } = renderHook(() => usePrices("store-1"));

      await act(async () => {
        await result.current.submitPrice({ storeId: "store-1", price: "18.50", canSize: 20 });
      });

      const patchCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes("/stores?id=eq.store-1") && opts?.method === "PATCH"
      );
      expect(patchCall).toBeTruthy();
      const patchBody = JSON.parse(patchCall[1].body);
      expect(patchBody.latest_price).toBe(18.5);
      expect(patchBody.latest_can_size).toBe(20);
    });
  });
});
